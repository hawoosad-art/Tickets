import { PaymentProviderType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createBookingAccessToken,
  createSignedQrToken,
  generateBookingReference,
  generateTicketNumber,
  sha256Hex,
} from "@/lib/crypto-tokens";
import { formatMoney } from "@/lib/money";
import { formatEventDateTimeFull } from "@/lib/timezone";
import {
  logStructured,
  recordAuditLog,
  trackAnalyticsEvent,
} from "@/lib/logger";
import {
  httpOrganiserInventoryProvider,
  releaseOrderReservations,
  reserveInventoryAtomically,
} from "@/services/inventory/inventory-service";
import {
  getPaymentProviderAdapter,
  getRawPaymentAdapterForWebhook,
} from "@/services/payments/registry";
import { enqueueAndSendEmail } from "@/services/email/email-service";
import { emailTemplates } from "@/services/email/templates";

export interface PricedCheckoutBreakdown {
  eventId: string;
  eventTitle: string;
  currency: string;
  isSampleEvent: boolean;
  items: Array<{
    ticketTypeId: string;
    ticketTypeName: string;
    seated: boolean;
    sectionInfo: string | null;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  subtotalMinor: number;
  bookingFeeMinor: number;
  taxMinor: number;
  taxLabel: string;
  totalMinor: number;
  totalTickets: number;
}

export async function calculateOrderPricingServerSide(params: {
  eventId: string;
  items: Array<{ ticketTypeId: string; quantity: number }>;
}): Promise<PricedCheckoutBreakdown> {
  if (!params.items.length) {
    throw new Error("At least one ticket category must be selected.");
  }

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
      policy: true,
      ticketTypes: {
        include: { allocation: true },
      },
    },
  });

  if (!event) {
    throw new Error("Match event not found.");
  }

  if (event.status !== "PUBLISHED") {
    throw new Error(
      `Tickets are not available for sale (event status: ${event.status}).`
    );
  }

  if (!event.organiserAuthorised) {
    throw new Error(
      "Ticket sales require explicit event organiser authorisation."
    );
  }

  const now = new Date();
  if (event.salesStartAt && now < event.salesStartAt) {
    throw new Error("Ticket sales for this match have not opened yet.");
  }
  if (event.salesEndAt && now > event.salesEndAt) {
    throw new Error("Ticket sales for this match have closed.");
  }
  if (now >= event.kickoffAt) {
    throw new Error("Match has already kicked off; online sales are closed.");
  }

  const typeMap = new Map(event.ticketTypes.map((tt) => [tt.id, tt]));
  let subtotalMinor = 0;
  let totalTickets = 0;
  const pricedItems: PricedCheckoutBreakdown["items"] = [];

  for (const reqItem of params.items) {
    const tt = typeMap.get(reqItem.ticketTypeId);
    if (!tt || !tt.isActive) {
      throw new Error("Selected ticket category is unavailable.");
    }
    if (tt.salesStartAt && now < tt.salesStartAt) {
      throw new Error(`Sales for ${tt.name} have not opened yet.`);
    }
    if (tt.salesEndAt && now > tt.salesEndAt) {
      throw new Error(`Sales for ${tt.name} have closed.`);
    }
    if (reqItem.quantity < tt.minPerOrder) {
      throw new Error(
        `Minimum order quantity for ${tt.name} is ${tt.minPerOrder}.`
      );
    }
    if (reqItem.quantity > tt.maxPerOrder) {
      throw new Error(
        `Maximum order quantity for ${tt.name} is ${tt.maxPerOrder}.`
      );
    }
    if (tt.currency.toUpperCase() !== event.currency.toUpperCase()) {
      throw new Error("Ticket currency mismatch on event configuration.");
    }

    const lineTotalMinor = tt.priceMinor * reqItem.quantity;
    subtotalMinor += lineTotalMinor;
    totalTickets += reqItem.quantity;

    pricedItems.push({
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      seated: tt.seated,
      sectionInfo: tt.sectionInfo,
      quantity: reqItem.quantity,
      unitPriceMinor: tt.priceMinor,
      lineTotalMinor,
    });
  }

  const maxPerCustomer = event.policy?.maxTicketsPerCustomer ?? 8;
  if (totalTickets > maxPerCustomer) {
    throw new Error(
      `Maximum ${maxPerCustomer} tickets permitted per customer for this match.`
    );
  }

  const feeBps = event.policy?.bookingFeeBps ?? 0;
  const feeFlat = event.policy?.bookingFeeFlatMinor ?? 0;
  const taxBps = event.policy?.taxBps ?? 0;
  const taxLabel = event.policy?.taxLabel || "VAT";

  const bookingFeeMinor =
    Math.round((subtotalMinor * feeBps) / 10_000) +
    (subtotalMinor > 0 ? feeFlat : 0);
  const taxableMinor = subtotalMinor + bookingFeeMinor;
  const taxMinor = Math.round((taxableMinor * taxBps) / 10_000);
  const totalMinor = subtotalMinor + bookingFeeMinor + taxMinor;

  return {
    eventId: event.id,
    eventTitle: event.title,
    currency: event.currency.toUpperCase(),
    isSampleEvent: event.isSampleData,
    items: pricedItems,
    subtotalMinor,
    bookingFeeMinor,
    taxMinor,
    taxLabel,
    totalMinor,
    totalTickets,
  };
}

export async function createCheckoutOrderAndInitiatePayment(params: {
  eventId: string;
  items: Array<{ ticketTypeId: string; quantity: number }>;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    countryCode: string;
    billingAddressLine1?: string;
    billingCity?: string;
    billingPostalCode?: string;
  };
  provider: PaymentProviderType;
  paymentMethod?: string;
  idempotencyKey: string;
  userId?: string | null;
  appBaseUrl: string;
  ipAddress?: string | null;
}): Promise<{
  orderId: string;
  bookingReference: string;
  bookingAccessToken: string;
  checkoutUrl: string;
  provider: PaymentProviderType;
  providerOrderId: string;
  totalMinor: number;
  currency: string;
  reservationExpiresAt: string;
  isSimulated: boolean;
}> {
  // 1. Check duplicate idempotency key first
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (existingOrder && existingOrder.payments[0]?.checkoutUrl) {
    const p = existingOrder.payments[0];
    return {
      orderId: existingOrder.id,
      bookingReference: existingOrder.bookingReference,
      bookingAccessToken: "existing-session",
      checkoutUrl: p.checkoutUrl!,
      provider: p.provider,
      providerOrderId: p.providerOrderId || "",
      totalMinor: existingOrder.totalMinor,
      currency: existingOrder.currency,
      reservationExpiresAt: existingOrder.reservationExpiresAt.toISOString(),
      isSimulated: existingOrder.isSimulated,
    };
  }

  // 2. Validate payment provider availability BEFORE reserving stock
  const adapter = getPaymentProviderAdapter(params.provider);

  // 3. Server-side authoritative pricing & policy checks
  const priced = await calculateOrderPricingServerSide({
    eventId: params.eventId,
    items: params.items,
  });

  const eventPolicy = await prisma.eventPolicy.findUnique({
    where: { eventId: params.eventId },
  });

  if (eventPolicy?.requirePhoneNumber && !params.customer.phone?.trim()) {
    throw new Error("A valid phone number is required for this match.");
  }

  // Enforce cumulative per-customer ticket purchase limit across active/paid orders
  const maxPerCustomer = eventPolicy?.maxTicketsPerCustomer ?? 8;
  const existingCustomerTickets = await prisma.orderItem.aggregate({
    _sum: { quantity: true },
    where: {
      order: {
        eventId: params.eventId,
        customerEmail: params.customer.email.toLowerCase(),
        status: {
          in: ["AWAITING_PAYMENT", "PAID", "TICKETS_ISSUED", "PARTIALLY_REFUNDED"],
        },
      },
    },
  });
  const priorQty = existingCustomerTickets._sum.quantity ?? 0;
  if (priorQty + priced.totalTickets > maxPerCustomer) {
    throw new Error(
      `Purchase limit exceeded: maximum ${maxPerCustomer} tickets per customer for this match (you already have ${priorQty}).`
    );
  }

  // 4. Atomic inventory reservation (prevents overselling)
  const { reservationIds, expiresAt } = await reserveInventoryAtomically({
    items: params.items,
    userId: params.userId ?? null,
    orderIdempotencyKey: params.idempotencyKey,
  });

  const bookingReference = generateBookingReference();
  const { rawToken: bookingAccessToken, tokenHash: accessTokenHash } =
    createBookingAccessToken(bookingReference);
  const isSimulated = params.provider === "SIMULATED" || priced.isSampleEvent;

  let createdOrderId = "";

  try {
    // 5. Create Order + OrderItems and link reservations inside short transaction
    const order = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          bookingReference,
          accessTokenHash,
          userId: params.userId ?? null,
          eventId: params.eventId,
          status: "AWAITING_PAYMENT",
          customerFirstName: params.customer.firstName.trim(),
          customerLastName: params.customer.lastName.trim(),
          customerEmail: params.customer.email.toLowerCase().trim(),
          customerPhone: params.customer.phone?.trim() || null,
          customerCountry: params.customer.countryCode.toUpperCase(),
          billingAddressLine1: params.customer.billingAddressLine1?.trim() || null,
          billingCity: params.customer.billingCity?.trim() || null,
          billingPostalCode: params.customer.billingPostalCode?.trim() || null,
          currency: priced.currency,
          subtotalMinor: priced.subtotalMinor,
          bookingFeeMinor: priced.bookingFeeMinor,
          taxMinor: priced.taxMinor,
          totalMinor: priced.totalMinor,
          idempotencyKey: params.idempotencyKey,
          isSimulated,
          reservationExpiresAt: expiresAt,
          items: {
            create: priced.items.map((it) => ({
              ticketTypeId: it.ticketTypeId,
              ticketTypeName: it.ticketTypeName,
              quantity: it.quantity,
              unitPriceMinor: it.unitPriceMinor,
              lineTotalMinor: it.lineTotalMinor,
              currency: priced.currency,
            })),
          },
        },
      });

      await tx.inventoryReservation.updateMany({
        where: { id: { in: reservationIds } },
        data: { orderId: ord.id },
      });

      return ord;
    });

    createdOrderId = order.id;

    // 6. Initiate hosted checkout with payment provider (outside DB transaction!)
    const initiated = await adapter.initiateCheckout({
      orderId: order.id,
      bookingReference: order.bookingReference,
      bookingAccessToken,
      amountMinor: order.totalMinor,
      currency: order.currency,
      customerEmail: order.customerEmail,
      customerName: `${order.customerFirstName} ${order.customerLastName}`,
      customerPhone: order.customerPhone,
      eventTitle: priced.eventTitle,
      idempotencyKey: `pay-${params.idempotencyKey}`,
      appBaseUrl: params.appBaseUrl,
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: params.provider,
        method: params.paymentMethod || params.provider.toLowerCase(),
        status: "PENDING",
        amountMinor: order.totalMinor,
        currency: order.currency,
        settledCurrency: initiated.settledCurrency,
        settledAmountMinor: initiated.settledAmountMinor,
        fxRateApplied: initiated.fxRateApplied ?? null,
        providerOrderId: initiated.providerOrderId,
        providerReference: initiated.providerReference,
        checkoutUrl: initiated.checkoutUrl,
        idempotencyKey: `pay-${params.idempotencyKey}`,
        isSimulated: initiated.isSimulated || isSimulated,
        rawProviderResponse: (initiated.rawResponse ?? {}) as Prisma.InputJsonValue,
      },
    });

    await trackAnalyticsEvent({
      eventType: "CHECKOUT_INITIATED",
      eventId: params.eventId,
      orderId: order.id,
      metadata: {
        provider: params.provider,
        totalMinor: order.totalMinor,
        currency: order.currency,
      },
    });

    await recordAuditLog({
      actorUserId: params.userId ?? null,
      actorRole: params.userId ? "CUSTOMER" : "GUEST",
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: order.id,
      ipAddress: params.ipAddress ?? null,
      metadata: {
        bookingReference: order.bookingReference,
        provider: params.provider,
        totalMinor: order.totalMinor,
        currency: order.currency,
      },
    });

    // Send Order Initiated notification asynchronously
    const bookingUrl = `${params.appBaseUrl}/booking/${encodeURIComponent(order.bookingReference)}?token=${encodeURIComponent(bookingAccessToken)}`;
    await enqueueAndSendEmail({
      deduplicationKey: `order-created:${order.id}`,
      recipientEmail: order.customerEmail,
      userId: order.userId,
      templateType: "ORDER_CONFIRMATION",
      rendered: emailTemplates.orderConfirmation({
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        bookingReference: order.bookingReference,
        eventTitle: priced.eventTitle,
        totalFormatted: formatMoney(order.totalMinor, order.currency),
        bookingUrl,
        isSimulated,
      }),
    });

    return {
      orderId: order.id,
      bookingReference: order.bookingReference,
      bookingAccessToken,
      checkoutUrl: initiated.checkoutUrl,
      provider: params.provider,
      providerOrderId: initiated.providerOrderId,
      totalMinor: order.totalMinor,
      currency: order.currency,
      reservationExpiresAt: expiresAt.toISOString(),
      isSimulated: initiated.isSimulated || isSimulated,
    };
  } catch (err) {
    // Release inventory immediately if payment gateway initiation failed
    if (createdOrderId) {
      await releaseOrderReservations(createdOrderId);
      await prisma.order.update({
        where: { id: createdOrderId },
        data: { status: "PAYMENT_FAILED" },
      });
    } else {
      for (const rId of reservationIds) {
        const resv = await prisma.inventoryReservation.findUnique({
          where: { id: rId },
        });
        if (resv && resv.status === "ACTIVE") {
          await prisma.$transaction([
            prisma.inventoryReservation.update({
              where: { id: rId },
              data: { status: "RELEASED", releasedAt: new Date() },
            }),
            prisma.$executeRaw`
              UPDATE "InventoryAllocation"
              SET "reservedCount" = GREATEST(0, "reservedCount" - ${resv.quantity})
              WHERE "id" = ${resv.allocationId}
            `,
          ]);
        }
      }
    }
    throw err;
  }
}

/**
 * Idempotently transitions a verified paid order to PAID -> TICKETS_ISSUED,
 * converts reserved inventory to soldCount, and issues unique signed QR tickets.
 * Safe to call concurrently from both webhook and server-side verification endpoint.
 */
export async function finalizeVerifiedPaymentAndIssueTickets(params: {
  paymentId: string;
  providerCaptureId?: string | null;
  rawProviderResponse?: Record<string, unknown>;
  verificationSource: "WEBHOOK" | "SERVER_API_VERIFY" | "SIMULATOR";
}): Promise<{
  orderId: string;
  bookingReference: string;
  alreadyIssued: boolean;
  ticketCount: number;
}> {
  const paymentSnapshot = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: {
      order: {
        include: {
          items: { include: { ticketType: true } },
          event: { include: { venue: true } },
          reservations: { include: { allocation: true } },
          tickets: true,
        },
      },
    },
  });

  if (!paymentSnapshot) {
    throw new Error("Payment record not found.");
  }

  const order = paymentSnapshot.order;

  // Fast idempotency check
  if (
    order.status === "TICKETS_ISSUED" &&
    order.tickets.length > 0 &&
    paymentSnapshot.status === "SUCCEEDED"
  ) {
    return {
      orderId: order.id,
      bookingReference: order.bookingReference,
      alreadyIssued: true,
      ticketCount: order.tickets.length,
    };
  }

  // Confirm any external organiser holds before finalising DB tickets
  for (const resv of order.reservations) {
    if (
      resv.allocation.sourceType === "EXTERNAL_ORGANISER" &&
      resv.allocation.externalEndpointUrl &&
      resv.externalHoldRef
    ) {
      const ext = await httpOrganiserInventoryProvider.confirmHold({
        endpointUrl: resv.allocation.externalEndpointUrl,
        externalHoldRef: resv.externalHoldRef,
        orderReference: order.bookingReference,
      });
      if (!ext.confirmed) {
        throw new Error(
          "External organiser hold confirmation failed; manual reconciliation required."
        );
      }
    }
  }

  const now = new Date();

  const txOutcome = await prisma.$transaction(async (tx) => {
    // Lock the Order row inside PostgreSQL transaction so concurrent webhook + redirect verify serialize cleanly!
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;

    const freshOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { ticketType: true } },
        tickets: true,
        reservations: true,
      },
    });

    if (!freshOrder) {
      throw new Error("Order vanished during transaction.");
    }

    if (freshOrder.tickets.length > 0) {
      await tx.payment.update({
        where: { id: paymentSnapshot.id },
        data: {
          status: "SUCCEEDED",
          providerCaptureId:
            params.providerCaptureId ?? paymentSnapshot.providerCaptureId,
          verifiedAt: paymentSnapshot.verifiedAt ?? now,
        },
      });
      return {
        alreadyIssued: true,
        ticketNumbers: freshOrder.tickets.map((t) => t.ticketNumber),
      };
    }

    // Convert reservations into soldCount
    for (const resv of freshOrder.reservations) {
      if (resv.status === "ACTIVE") {
        await tx.inventoryReservation.update({
          where: { id: resv.id },
          data: { status: "CONVERTED", convertedAt: now },
        });
        await tx.$executeRaw`
          UPDATE "InventoryAllocation"
          SET "reservedCount" = GREATEST(0, "reservedCount" - ${resv.quantity}),
              "soldCount" = "soldCount" + ${resv.quantity},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE "id" = ${resv.allocationId}
        `;
      } else if (resv.status === "EXPIRED" || resv.status === "RELEASED") {
        // Late payment confirmation after reservation expiry: claim directly if capacity still available
        const claimed = await tx.$executeRaw`
          UPDATE "InventoryAllocation"
          SET "soldCount" = "soldCount" + ${resv.quantity},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE "id" = ${resv.allocationId}
            AND ("authorisedCapacity" - "soldCount" - "reservedCount" - "blockedCount") >= ${resv.quantity}
        `;
        if (claimed !== 1) {
          throw new Error(
            "Late payment received after reservation expired and category sold out; flag for automatic refund."
          );
        }
        await tx.inventoryReservation.update({
          where: { id: resv.id },
          data: { status: "CONVERTED", convertedAt: now },
        });
      }
    }

    await tx.payment.update({
      where: { id: paymentSnapshot.id },
      data: {
        status: "SUCCEEDED",
        providerCaptureId:
          params.providerCaptureId ?? paymentSnapshot.providerCaptureId,
        verifiedAt: now,
        rawProviderResponse: (params.rawProviderResponse ??
          paymentSnapshot.rawProviderResponse ??
          {}) as Prisma.InputJsonValue,
      },
    });

    await tx.order.update({
      where: { id: freshOrder.id },
      data: {
        status: "PAID",
        paidAt: now,
      },
    });

    // Generate unique digital tickets with signed opaque QR tokens (zero PII in QR!)
    const createdTicketNumbers: string[] = [];
    let seq = 0;

    for (const item of freshOrder.items) {
      // Determine starting seat index from existing tickets in this category if seated
      const existingSeatCount = item.ticketType.seated
        ? await tx.ticket.count({ where: { ticketTypeId: item.ticketTypeId } })
        : 0;

      for (let i = 0; i < item.quantity; i++) {
        const ticketNumber = generateTicketNumber(seq);
        const { qrOpaqueToken, qrTokenHash } = createSignedQrToken();
        const seatIndex = existingSeatCount + i + 1;
        const rowLetter = String.fromCharCode(65 + Math.floor((seatIndex - 1) / 25) % 26);
        const seatNum = String(((seatIndex - 1) % 25) + 1);

        await tx.ticket.create({
          data: {
            ticketNumber,
            orderId: freshOrder.id,
            orderItemId: item.id,
            eventId: freshOrder.eventId,
            ticketTypeId: item.ticketTypeId,
            userId: freshOrder.userId,
            holderName: `${freshOrder.customerFirstName} ${freshOrder.customerLastName}`,
            holderEmail: freshOrder.customerEmail,
            seatSection: item.ticketType.sectionInfo || item.ticketType.name,
            seatRow: item.ticketType.seated ? rowLetter : null,
            seatNumber: item.ticketType.seated ? seatNum : null,
            qrTokenHash,
            qrOpaqueToken,
            status: "VALID",
            isSimulated: freshOrder.isSimulated || order.event.isSampleData,
            issuedAt: now,
          },
        });
        createdTicketNumbers.push(ticketNumber);
        seq++;
      }
    }

    await tx.order.update({
      where: { id: freshOrder.id },
      data: {
        status: "TICKETS_ISSUED",
        ticketsIssuedAt: now,
      },
    });

    return {
      alreadyIssued: false,
      ticketNumbers: createdTicketNumbers,
    };
  });

  if (!txOutcome.alreadyIssued) {
    await trackAnalyticsEvent({
      eventType: "CHECKOUT_COMPLETED",
      eventId: order.eventId,
      orderId: order.id,
      metadata: {
        source: params.verificationSource,
        provider: paymentSnapshot.provider,
        amountMinor: order.totalMinor,
      },
    });
    await trackAnalyticsEvent({
      eventType: "TICKETS_ISSUED",
      eventId: order.eventId,
      orderId: order.id,
      metadata: { count: txOutcome.ticketNumbers.length },
    });

    await recordAuditLog({
      actorUserId: order.userId,
      actorRole: "SYSTEM",
      action: "PAYMENT_VERIFIED_AND_TICKETS_ISSUED",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        bookingReference: order.bookingReference,
        verificationSource: params.verificationSource,
        ticketCount: txOutcome.ticketNumbers.length,
      },
    });

    // Email notifications (isolated so any email failure NEVER duplicates tickets!)
    const appBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const bookingUrl = `${appBase}/booking/${encodeURIComponent(order.bookingReference)}`;

    await enqueueAndSendEmail({
      deduplicationKey: `payment-confirmed:${order.id}`,
      recipientEmail: order.customerEmail,
      userId: order.userId,
      templateType: "PAYMENT_CONFIRMATION",
      rendered: emailTemplates.paymentConfirmation({
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        bookingReference: order.bookingReference,
        eventTitle: order.event.title,
        amountFormatted: formatMoney(order.totalMinor, order.currency),
        provider: paymentSnapshot.provider,
        bookingUrl,
        isSimulated: order.isSimulated || order.event.isSampleData,
      }),
    });

    await enqueueAndSendEmail({
      deduplicationKey: `tickets-delivered:${order.id}`,
      recipientEmail: order.customerEmail,
      userId: order.userId,
      templateType: "TICKET_DELIVERY",
      rendered: emailTemplates.ticketDelivery({
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        bookingReference: order.bookingReference,
        eventTitle: order.event.title,
        eventDateFormatted: formatEventDateTimeFull(
          order.event.kickoffAt,
          order.event.timezone
        ),
        venueName: order.event.venue.name,
        ticketNumbers: txOutcome.ticketNumbers,
        bookingUrl,
        isSimulated: order.isSimulated || order.event.isSampleData,
      }),
    });
  }

  return {
    orderId: order.id,
    bookingReference: order.bookingReference,
    alreadyIssued: txOutcome.alreadyIssued,
    ticketCount: txOutcome.ticketNumbers.length,
  };
}

export async function markPaymentFailedAndReleaseStock(params: {
  paymentId: string;
  failureCode?: string;
  failureMessage?: string;
  cancelled?: boolean;
}): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: { order: true },
  });
  if (!payment) return;

  // Never downgrade an already succeeded payment
  if (payment.status === "SUCCEEDED") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: params.cancelled ? "CANCELLED" : "FAILED",
      failureCode: params.failureCode ?? null,
      failureMessage: params.failureMessage ?? null,
    },
  });

  if (
    payment.order.status === "PENDING" ||
    payment.order.status === "AWAITING_PAYMENT"
  ) {
    await releaseOrderReservations(payment.orderId);
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: params.cancelled ? "CANCELLED" : "PAYMENT_FAILED",
        cancelledAt: params.cancelled ? new Date() : null,
      },
    });

    await trackAnalyticsEvent({
      eventType: "PAYMENT_FAILED",
      eventId: payment.order.eventId,
      orderId: payment.orderId,
      metadata: {
        reason: params.failureMessage || (params.cancelled ? "Cancelled" : "Failed"),
      },
    });
  }
}

/**
 * Verifies order payment server-side with the payment provider API.
 * Used when returning from PayPal / Paystack / Simulator redirect — never trusts query params alone!
 */
export async function verifyOrderPaymentServerSide(
  bookingReference: string
): Promise<{
  status: string;
  verified: boolean;
  ticketCount: number;
}> {
  const order = await prisma.order.findUnique({
    where: { bookingReference },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      tickets: true,
    },
  });

  if (!order) {
    throw new Error("Booking not found.");
  }

  if (order.status === "TICKETS_ISSUED" && order.tickets.length > 0) {
    return {
      status: order.status,
      verified: true,
      ticketCount: order.tickets.length,
    };
  }

  const latestPayment = order.payments[0];
  if (!latestPayment || !latestPayment.providerOrderId) {
    return {
      status: order.status,
      verified: false,
      ticketCount: 0,
    };
  }

  const adapter = getPaymentProviderAdapter(latestPayment.provider);
  const verification = await adapter.verifyPayment({
    providerOrderId: latestPayment.providerOrderId,
    providerReference: latestPayment.providerReference,
    expectedAmountMinor:
      latestPayment.settledAmountMinor ?? latestPayment.amountMinor,
    expectedCurrency: latestPayment.settledCurrency ?? latestPayment.currency,
  });

  if (verification.verified && verification.status === "SUCCEEDED") {
    const issued = await finalizeVerifiedPaymentAndIssueTickets({
      paymentId: latestPayment.id,
      providerCaptureId: verification.providerCaptureId,
      rawProviderResponse: verification.rawResponse,
      verificationSource: "SERVER_API_VERIFY",
    });
    return {
      status: "TICKETS_ISSUED",
      verified: true,
      ticketCount: issued.ticketCount,
    };
  }

  if (verification.status === "FAILED" || verification.status === "CANCELLED") {
    await markPaymentFailedAndReleaseStock({
      paymentId: latestPayment.id,
      failureCode: verification.failureCode,
      failureMessage: verification.failureMessage,
      cancelled: verification.status === "CANCELLED",
    });
    return {
      status: verification.status === "CANCELLED" ? "CANCELLED" : "PAYMENT_FAILED",
      verified: false,
      ticketCount: 0,
    };
  }

  return {
    status: order.status,
    verified: false,
    ticketCount: order.tickets.length,
  };
}

/**
 * Handles incoming provider webhooks (PayPal, Paystack, Simulated) with cryptographic signature check
 * and database-enforced idempotency via unique (provider, providerEventId).
 */
export async function handleIncomingPaymentWebhook(params: {
  provider: PaymentProviderType;
  rawBody: string;
  headers: Headers;
}): Promise<{
  accepted: boolean;
  duplicate: boolean;
  outcome: string;
}> {
  const adapter = getRawPaymentAdapterForWebhook(params.provider);
  const parsed = await adapter.verifyAndParseWebhook(
    params.rawBody,
    params.headers
  );

  if (!parsed.signatureVerified) {
    logStructured("warn", "webhook_signature_rejected", {
      provider: params.provider,
      eventId: parsed.providerEventId,
    });
    throw new Error("Invalid webhook signature.");
  }

  // Check if this webhook event was already processed
  const existingWebhook = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: params.provider,
        providerEventId: parsed.providerEventId,
      },
    },
  });

  if (existingWebhook?.processed) {
    return {
      accepted: true,
      duplicate: true,
      outcome: "DUPLICATE_IGNORED",
    };
  }

  // Locate matching Payment
  let payment = parsed.providerOrderId
    ? await prisma.payment.findUnique({
        where: { providerOrderId: parsed.providerOrderId },
      })
    : null;

  if (!payment && parsed.bookingReference) {
    const order = await prisma.order.findUnique({
      where: { bookingReference: parsed.bookingReference },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    payment = order?.payments[0] ?? null;
  }

  const webhookRecord =
    existingWebhook ??
    (await prisma.paymentWebhookEvent.create({
      data: {
        provider: params.provider,
        providerEventId: parsed.providerEventId,
        eventType: parsed.eventType,
        paymentId: payment?.id ?? null,
        signatureVerified: true,
        processed: false,
        payload: parsed.rawPayload as Prisma.InputJsonValue,
      },
    }));

  if (!payment) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        processed: true,
        processedAt: new Date(),
        processingError: "No matching local payment record found.",
      },
    });
    return { accepted: true, duplicate: false, outcome: "UNMATCHED_PAYMENT" };
  }

  try {
    if (parsed.outcome === "PAYMENT_SUCCEEDED") {
      const expectedAmt = payment.settledAmountMinor ?? payment.amountMinor;
      const expectedCur = (
        payment.settledCurrency ?? payment.currency
      ).toUpperCase();

      if (
        (parsed.amountMinor !== undefined && parsed.amountMinor < expectedAmt) ||
        (parsed.currency && parsed.currency.toUpperCase() !== expectedCur)
      ) {
        throw new Error(
          `Webhook amount/currency mismatch: got ${parsed.currency} ${parsed.amountMinor}, expected ${expectedCur} ${expectedAmt}`
        );
      }

      await finalizeVerifiedPaymentAndIssueTickets({
        paymentId: payment.id,
        providerCaptureId: parsed.providerCaptureId,
        rawProviderResponse: parsed.rawPayload,
        verificationSource: "WEBHOOK",
      });
    } else if (parsed.outcome === "PAYMENT_FAILED") {
      await markPaymentFailedAndReleaseStock({
        paymentId: payment.id,
        failureMessage: `Provider webhook reported ${parsed.eventType}`,
      });
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        processed: true,
        processedAt: new Date(),
        processingError: null,
      },
    });

    return { accepted: true, duplicate: false, outcome: parsed.outcome };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        processingError: errMsg.slice(0, 500),
      },
    });
    throw err;
  }
}

export async function verifyOrderOwnershipOrToken(params: {
  bookingReference: string;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  accessToken?: string | null;
}): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { bookingReference: params.bookingReference },
  });
  if (!order) return false;

  if (
    params.currentUserRole &&
    ["SUPER_ADMIN", "FINANCE_MANAGER", "SUPPORT_AGENT", "EVENT_MANAGER"].includes(
      params.currentUserRole
    )
  ) {
    return true;
  }

  if (params.currentUserId && order.userId === params.currentUserId) {
    return true;
  }

  if (params.accessToken) {
    return sha256Hex(params.accessToken) === order.accessTokenHash;
  }

  return false;
}

export async function requestCustomerRefund(params: {
  orderId: string;
  requestedByUserId: string;
  reason: string;
  requestedAmountMinor?: number;
}): Promise<{ refundId: string; refundReference: string }> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      event: { include: { policy: true } },
      payments: { where: { status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } } },
      tickets: true,
      refunds: {
        where: {
          status: { in: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"] },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.userId !== params.requestedByUserId) {
    throw new Error("Forbidden: you can only request refunds for your own bookings.");
  }

  if (order.refunds.length > 0) {
    throw new Error("An active refund request is already pending for this booking.");
  }

  const payment = order.payments[0];
  if (!payment) {
    throw new Error("No completed payment found to refund.");
  }

  const eventCancelledOrPostponed =
    order.event.status === "CANCELLED" || order.event.status === "POSTPONED";
  const policy = order.event.policy;

  if (!eventCancelledOrPostponed) {
    if (policy && !policy.refundable) {
      throw new Error(
        "This match is non-refundable under the organiser's event policy."
      );
    }
    const cutoffHours = policy?.refundCutoffHours ?? 48;
    const msUntilKickoff = order.event.kickoffAt.getTime() - Date.now();
    if (msUntilKickoff < cutoffHours * 3600 * 1000) {
      throw new Error(
        `Refund requests must be submitted at least ${cutoffHours} hours prior to kick-off.`
      );
    }
    const anyUsed = order.tickets.some((t) => t.status === "USED");
    if (anyUsed) {
      throw new Error("Bookings with redeemed match tickets cannot be refunded.");
    }
  }

  const maxRefundableMinor = order.totalMinor - order.refundedMinor;
  if (maxRefundableMinor <= 0) {
    throw new Error("This booking has already been fully refunded.");
  }

  const amountMinor = params.requestedAmountMinor
    ? Math.min(params.requestedAmountMinor, maxRefundableMinor)
    : maxRefundableMinor;

  const refundReference = `RFD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const refund = await prisma.refund.create({
    data: {
      refundReference,
      orderId: order.id,
      paymentId: payment.id,
      requestedByUserId: params.requestedByUserId,
      amountMinor,
      currency: order.currency,
      reason: params.reason,
      status: "REQUESTED",
      isPartial: amountMinor < order.totalMinor,
      invalidateTickets: amountMinor >= maxRefundableMinor,
    },
  });

  await trackAnalyticsEvent({
    eventType: "REFUND_REQUESTED",
    eventId: order.eventId,
    orderId: order.id,
    metadata: { refundReference, amountMinor },
  });

  await recordAuditLog({
    actorUserId: params.requestedByUserId,
    actorRole: "CUSTOMER",
    action: "REFUND_REQUESTED",
    entityType: "Refund",
    entityId: refund.id,
    metadata: { refundReference, orderId: order.id, amountMinor },
  });

  return { refundId: refund.id, refundReference };
}

export async function reviewAndExecuteRefund(params: {
  refundId: string;
  reviewerUserId: string;
  reviewerRole: string;
  action: "APPROVE" | "REJECT";
  adminNotes?: string;
  overrideAmountMinor?: number;
  invalidateTickets?: boolean;
}): Promise<{ status: string; providerRefundId?: string }> {
  const refund = await prisma.refund.findUnique({
    where: { id: params.refundId },
    include: {
      order: {
        include: {
          event: true,
          items: true,
          tickets: true,
        },
      },
      payment: true,
    },
  });

  if (!refund) {
    throw new Error("Refund request not found.");
  }

  if (refund.status === "SUCCEEDED" || refund.status === "REJECTED") {
    throw new Error(`Refund has already been finalized (${refund.status}).`);
  }

  const now = new Date();

  if (params.action === "REJECT") {
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: "REJECTED",
        reviewedByUserId: params.reviewerUserId,
        reviewedAt: now,
        adminNotes: params.adminNotes ?? null,
      },
    });

    await recordAuditLog({
      actorUserId: params.reviewerUserId,
      actorRole: params.reviewerRole,
      action: "REFUND_REJECTED",
      entityType: "Refund",
      entityId: refund.id,
      metadata: { refundReference: refund.refundReference },
    });

    return { status: "REJECTED" };
  }

  const remainingMinor = refund.order.totalMinor - refund.order.refundedMinor;
  const refundAmountMinor = params.overrideAmountMinor
    ? Math.min(params.overrideAmountMinor, remainingMinor)
    : Math.min(refund.amountMinor, remainingMinor);

  if (refundAmountMinor <= 0) {
    throw new Error("Order has zero remaining refundable amount.");
  }

  // Convert order-currency refund amount to settled payment currency if FX applied (e.g., KES -> USD on PayPal)
  let providerRefundAmountMinor = refundAmountMinor;
  const providerCurrency =
    refund.payment.settledCurrency || refund.payment.currency;

  if (
    refund.payment.settledAmountMinor &&
    refund.payment.amountMinor > 0 &&
    providerCurrency.toUpperCase() !== refund.order.currency.toUpperCase()
  ) {
    providerRefundAmountMinor = Math.round(
      (refundAmountMinor / refund.payment.amountMinor) *
        refund.payment.settledAmountMinor
    );
  }

  const adapter = getPaymentProviderAdapter(refund.payment.provider);
  const providerOutcome = await adapter.processRefund({
    providerCaptureId: refund.payment.providerCaptureId,
    providerOrderId: refund.payment.providerOrderId,
    amountMinor: providerRefundAmountMinor,
    currency: providerCurrency,
    reason: refund.reason,
    idempotencyKey: `rfd-${refund.id}`,
  });

  if (!providerOutcome.succeeded) {
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: "FAILED",
        reviewedByUserId: params.reviewerUserId,
        reviewedAt: now,
        adminNotes: params.adminNotes ?? null,
        failureReason: providerOutcome.failureReason || "Provider refund failed.",
      },
    });
    throw new Error(providerOutcome.failureReason || "Provider refund failed.");
  }

  const newRefundedTotal = refund.order.refundedMinor + refundAmountMinor;
  const isFullOrderRefund = newRefundedTotal >= refund.order.totalMinor;
  const shouldInvalidate =
    params.invalidateTickets ?? (isFullOrderRefund || refund.invalidateTickets);

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refund.id },
      data: {
        amountMinor: refundAmountMinor,
        isPartial: !isFullOrderRefund,
        invalidateTickets: shouldInvalidate,
        status: "SUCCEEDED",
        reviewedByUserId: params.reviewerUserId,
        reviewedAt: now,
        processedAt: now,
        adminNotes: params.adminNotes ?? null,
        providerRefundId: providerOutcome.providerRefundId ?? null,
        rawProviderResponse: (providerOutcome.rawResponse ??
          {}) as Prisma.InputJsonValue,
      },
    });

    await tx.order.update({
      where: { id: refund.orderId },
      data: {
        refundedMinor: newRefundedTotal,
        status: isFullOrderRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    await tx.payment.update({
      where: { id: refund.paymentId },
      data: {
        status: isFullOrderRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    if (shouldInvalidate) {
      const validTickets = await tx.ticket.findMany({
        where: { orderId: refund.orderId, status: "VALID" },
      });

      if (validTickets.length > 0) {
        await tx.ticket.updateMany({
          where: { id: { in: validTickets.map((t) => t.id) } },
          data: {
            status: "INVALIDATED",
            invalidatedAt: now,
            invalidatedReason: `Refund ${refund.refundReference}`,
          },
        });

        // Return invalidated unused tickets back to capacity only if match hasn't occurred
        if (isFullOrderRefund && refund.order.event.kickoffAt > now) {
          for (const item of refund.order.items) {
            await tx.$executeRaw`
              UPDATE "InventoryAllocation"
              SET "soldCount" = GREATEST(0, "soldCount" - ${item.quantity}),
                  "version" = "version" + 1,
                  "updatedAt" = NOW()
              WHERE "ticketTypeId" = ${item.ticketTypeId}
            `;
          }
        }
      }
    }
  });

  await recordAuditLog({
    actorUserId: params.reviewerUserId,
    actorRole: params.reviewerRole,
    action: "REFUND_APPROVED_AND_PROCESSED",
    entityType: "Refund",
    entityId: refund.id,
    metadata: {
      refundReference: refund.refundReference,
      amountMinor: refundAmountMinor,
      currency: refund.currency,
      isFullOrderRefund,
      shouldInvalidate,
    },
  });

  await enqueueAndSendEmail({
    deduplicationKey: `refund-confirmed:${refund.id}`,
    recipientEmail: refund.order.customerEmail,
    userId: refund.order.userId,
    templateType: "REFUND_CONFIRMATION",
    rendered: emailTemplates.refundConfirmation({
      customerName: `${refund.order.customerFirstName} ${refund.order.customerLastName}`,
      bookingReference: refund.order.bookingReference,
      refundReference: refund.refundReference,
      amountFormatted: formatMoney(refundAmountMinor, refund.currency),
      eventTitle: refund.order.event.title,
    }),
  });

  return {
    status: "SUCCEEDED",
    providerRefundId: providerOutcome.providerRefundId,
  };
}

export async function updateEventStatusAndNotifyCustomers(params: {
  eventId: string;
  newStatus: "POSTPONED" | "CANCELLED" | "PUBLISHED" | "UNPUBLISHED";
  newKickoffAt?: Date;
  officialInstructions: string;
  actorUserId: string;
  actorRole: string;
}): Promise<{ notifiedBookings: number }> {
  const event = await prisma.event.update({
    where: { id: params.eventId },
    data: {
      status: params.newStatus,
      ...(params.newKickoffAt ? { kickoffAt: params.newKickoffAt } : {}),
      officialStatusNotice: params.officialInstructions,
    },
  });

  await recordAuditLog({
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    action: `EVENT_STATUS_${params.newStatus}`,
    entityType: "Event",
    entityId: event.id,
    metadata: {
      newStatus: params.newStatus,
      officialInstructions: params.officialInstructions,
    },
  });

  if (params.newStatus !== "POSTPONED" && params.newStatus !== "CANCELLED") {
    return { notifiedBookings: 0 };
  }

  const affectedOrders = await prisma.order.findMany({
    where: {
      eventId: event.id,
      status: { in: ["PAID", "TICKETS_ISSUED", "PARTIALLY_REFUNDED"] },
    },
  });

  for (const ord of affectedOrders) {
    if (params.newStatus === "POSTPONED") {
      await enqueueAndSendEmail({
        deduplicationKey: `event-postponed:${event.id}:${ord.id}:${event.kickoffAt.toISOString()}`,
        recipientEmail: ord.customerEmail,
        userId: ord.userId,
        templateType: "EVENT_POSTPONEMENT",
        rendered: emailTemplates.eventPostponement({
          customerName: `${ord.customerFirstName} ${ord.customerLastName}`,
          eventTitle: event.title,
          bookingReference: ord.bookingReference,
          newDateText: formatEventDateTimeFull(event.kickoffAt, event.timezone),
          officialInstructions: params.officialInstructions,
        }),
      });
    } else if (params.newStatus === "CANCELLED") {
      await enqueueAndSendEmail({
        deduplicationKey: `event-cancelled:${event.id}:${ord.id}`,
        recipientEmail: ord.customerEmail,
        userId: ord.userId,
        templateType: "EVENT_CANCELLATION",
        rendered: emailTemplates.eventCancellation({
          customerName: `${ord.customerFirstName} ${ord.customerLastName}`,
          eventTitle: event.title,
          bookingReference: ord.bookingReference,
          officialInstructions: params.officialInstructions,
        }),
      });
    }
  }

  return { notifiedBookings: affectedOrders.length };
}
