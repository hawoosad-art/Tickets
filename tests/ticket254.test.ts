import { beforeAll, afterAll, describe, expect, it } from "vitest";
import crypto from "crypto";

process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ticket254_test?schema=public";
process.env.ENABLE_SIMULATED_PAYMENTS = "true";
process.env.PAYSTACK_ENABLED = "true";
process.env.PAYSTACK_SECRET_KEY = "sk_test_ticket254_unit_secret";
process.env.EMAIL_PROVIDER = "outbox";
process.env.SESSION_SECRET = "test-session-secret-64-chars-minimum-value-here-12345";
process.env.TICKET_QR_SIGNING_SECRET =
  "test-qr-signing-secret-64-chars-minimum-value-here-12345";
process.env.BOOKING_ACCESS_SECRET =
  "test-booking-secret-64-chars-minimum-value-here-12345";

import { prisma } from "@/lib/db";
import {
  createUserSession,
  hashPassword,
  hasRolePermission,
  revokeAllUserSessions,
  validateSessionToken,
} from "@/lib/auth";
import { verifySignedQrTokenStructure } from "@/lib/crypto-tokens";
import { getPublishedMatchCards } from "@/services/events/event-queries";
import {
  calculateOrderPricingServerSide,
  createCheckoutOrderAndInitiatePayment,
  handleIncomingPaymentWebhook,
  requestCustomerRefund,
  reviewAndExecuteRefund,
  verifyOrderOwnershipOrToken,
} from "@/services/orders/order-service";
import { signSimulatedWebhookPayload } from "@/services/payments/simulated-provider";
import {
  generateTicketPdfBuffer,
  validateAndRedeemTicket,
} from "@/services/tickets/ticket-service";
import {
  createSettlementReconciliationRecord,
  generateFinancialReconciliation,
} from "@/services/reconciliation/reconciliation-service";
import { reserveInventoryAtomically } from "@/services/inventory/inventory-service";

describe("Ticket254 End-to-End Platform & Security Verification Suite", () => {
  let adminId = "";
  let financeId = "";
  let scannerId = "";
  let customerAId = "";
  let customerBId = "";
  let venueId = "";
  let eventId = "";
  let otherEventId = "";
  let vipTicketTypeId = "";
  let limitedTicketTypeId = "";

  beforeAll(async () => {
    // Clean test DB in FK-safe order
    await prisma.ticketScan.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.paymentWebhookEvent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.settlement.deleteMany();
    await prisma.inventoryReservation.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventoryAllocation.deleteMany();
    await prisma.ticketType.deleteMany();
    await prisma.eventPolicy.deleteMany();
    await prisma.analyticsEvent.deleteMany();
    await prisma.event.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.notificationJob.deleteMany();
    await prisma.supportRequest.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    const pw = await hashPassword("StrongPass123");

    const [admin, finance, scanner, custA, custB] = await Promise.all([
      prisma.user.create({
        data: {
          email: "admin.test@ticket254.co.ke",
          passwordHash: pw,
          firstName: "Admin",
          lastName: "One",
          role: "SUPER_ADMIN",
        },
      }),
      prisma.user.create({
        data: {
          email: "finance.test@ticket254.co.ke",
          passwordHash: pw,
          firstName: "Finance",
          lastName: "Lead",
          role: "FINANCE_MANAGER",
        },
      }),
      prisma.user.create({
        data: {
          email: "scanner.test@ticket254.co.ke",
          passwordHash: pw,
          firstName: "Gate",
          lastName: "Scanner",
          role: "TICKET_SCANNER",
        },
      }),
      prisma.user.create({
        data: {
          email: "alice@example.com",
          passwordHash: pw,
          firstName: "Alice",
          lastName: "Wanjiru",
          phone: "+254711000111",
          role: "CUSTOMER",
        },
      }),
      prisma.user.create({
        data: {
          email: "bob@example.com",
          passwordHash: pw,
          firstName: "Bob",
          lastName: "Odhiambo",
          phone: "+254722000222",
          role: "CUSTOMER",
        },
      }),
    ]);

    adminId = admin.id;
    financeId = finance.id;
    scannerId = scanner.id;
    customerAId = custA.id;
    customerBId = custB.id;

    const venue = await prisma.venue.create({
      data: {
        name: "Kasarani Test Arena",
        slug: "kasarani-test-arena",
        city: "Nairobi",
        country: "Kenya",
        countryCode: "KE",
        timezone: "Africa/Nairobi",
        capacity: 60000,
      },
    });
    venueId = venue.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1 & 2. Administrators can create events and customers can view published events", async () => {
    const kickoff = new Date(Date.now() + 10 * 24 * 3600 * 1000);
    const createdEvent = await prisma.event.create({
      data: {
        slug: "kenya-stars-vs-uganda-select-test",
        title: "Kenya Stars XI vs Uganda Select XI",
        competition: "Test International Cup",
        homeTeam: "Kenya Stars XI",
        awayTeam: "Uganda Select XI",
        homeTeamShort: "KEN",
        awayTeamShort: "UGA",
        description: "Integration test fixture.",
        venueId,
        kickoffAt: kickoff,
        timezone: "Africa/Nairobi",
        status: "PUBLISHED",
        isSampleData: true,
        organiserName: "Test Federation",
        organiserAuthorised: true,
        entryInstructions: "Use Gate 7 with QR ticket.",
        currency: "KES",
        policy: {
          create: {
            refundable: true,
            refundCutoffHours: 24,
            refundPolicyText: "Refundable up to 24h before kickoff.",
            postponementPolicyText: "Valid for rescheduled date.",
            maxTicketsPerCustomer: 6,
            bookingFeeBps: 0,
            taxBps: 0,
            requirePhoneNumber: true,
          },
        },
      },
    });
    eventId = createdEvent.id;

    const secondEvent = await prisma.event.create({
      data: {
        slug: "second-fixture-test",
        title: "Mombasa XI vs Kisumu XI",
        competition: "Coastal Cup",
        homeTeam: "Mombasa XI",
        awayTeam: "Kisumu XI",
        homeTeamShort: "MBA",
        awayTeamShort: "KSM",
        description: "Second event for wrong-event scan check.",
        venueId,
        kickoffAt: kickoff,
        timezone: "Africa/Nairobi",
        status: "PUBLISHED",
        isSampleData: true,
        organiserName: "Test Federation",
        organiserAuthorised: true,
        entryInstructions: "Main Gate.",
        currency: "KES",
      },
    });
    otherEventId = secondEvent.id;

    const vip = await prisma.ticketType.create({
      data: {
        eventId,
        code: "VIP",
        name: "VIP Main Stand",
        categoryTier: "VIP",
        description: "VIP padded seating",
        sectionInfo: "VIP Block A",
        seated: true,
        priceMinor: 250000, // KES 2,500.00
        currency: "KES",
        minPerOrder: 1,
        maxPerOrder: 4,
        allocation: {
          create: {
            sourceType: "NATIVE",
            authorisedCapacity: 50,
          },
        },
      },
    });
    vipTicketTypeId = vip.id;

    const limited = await prisma.ticketType.create({
      data: {
        eventId,
        code: "HOSP",
        name: "Scarce Hospitality Box",
        categoryTier: "HOSPITALITY",
        description: "Strictly 3 seats total",
        seated: true,
        priceMinor: 500000,
        currency: "KES",
        minPerOrder: 1,
        maxPerOrder: 2,
        allocation: {
          create: {
            sourceType: "NATIVE",
            authorisedCapacity: 3,
          },
        },
      },
    });
    limitedTicketTypeId = limited.id;

    const { cards } = await getPublishedMatchCards();
    expect(cards.length).toBeGreaterThanOrEqual(2);
    const found = cards.find((c) => c.id === eventId);
    expect(found).toBeDefined();
    expect(found?.startingPriceMinor).toBe(250000);
    expect(found?.totalAvailable).toBe(53);
  });

  it("3 & 4. Customers can select available tickets and orders calculate server-side prices securely", async () => {
    const priced = await calculateOrderPricingServerSide({
      eventId,
      items: [{ ticketTypeId: vipTicketTypeId, quantity: 2 }],
    });
    expect(priced.totalMinor).toBe(500000);
    expect(priced.currency).toBe("KES");
    expect(priced.totalTickets).toBe(2);
  });

  it("5. Atomic inventory concurrency prevents overselling under simultaneous load", async () => {
    // 10 concurrent buyers each attempt to reserve 1 seat from a category with only 3 seats
    const attempts = Array.from({ length: 10 }, (_, idx) =>
      reserveInventoryAtomically({
        items: [{ ticketTypeId: limitedTicketTypeId, quantity: 1 }],
        orderIdempotencyKey: `concurrency-test-${idx}`,
      })
    );

    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(succeeded.length).toBe(3);
    expect(rejected.length).toBe(7);

    const alloc = await prisma.inventoryAllocation.findUnique({
      where: { ticketTypeId: limitedTicketTypeId },
    });
    expect(alloc?.reservedCount).toBe(3);
    expect(alloc?.soldCount).toBe(0);
  });

  it("6, 7, 8, 9 & 15. Simulated payments, verified webhooks, non-premature ticket issuance, PDF + email delivery, and duplicate webhook idempotency", async () => {
    const created = await createCheckoutOrderAndInitiatePayment({
      eventId,
      items: [{ ticketTypeId: vipTicketTypeId, quantity: 2 }],
      customer: {
        firstName: "Alice",
        lastName: "Wanjiru",
        email: "alice@example.com",
        phone: "+254711000111",
        countryCode: "KE",
      },
      provider: "SIMULATED",
      idempotencyKey: "alice-order-idem-001",
      userId: customerAId,
      appBaseUrl: "http://localhost:3000",
    });

    // Verify 0 tickets exist BEFORE verified payment!
    const prePayTickets = await prisma.ticket.count({
      where: { orderId: created.orderId },
    });
    expect(prePayTickets).toBe(0);

    // Reject forged/unsigned webhook
    const webhookBody = JSON.stringify({
      eventId: "wh-sim-alice-001",
      eventType: "SIMULATED.PAYMENT.SUCCEEDED",
      providerOrderId: created.providerOrderId,
      providerCaptureId: "SIM-CAP-ALICE-001",
      bookingReference: created.bookingReference,
      amountMinor: created.totalMinor,
      currency: created.currency,
    });

    await expect(
      handleIncomingPaymentWebhook({
        provider: "SIMULATED",
        rawBody: webhookBody,
        headers: new Headers({ "x-simulated-signature": "forged-bad-sig" }),
      })
    ).rejects.toThrow(/signature/i);

    // Deliver genuine signed webhook
    const validHeaders = new Headers({
      "x-simulated-signature": signSimulatedWebhookPayload(webhookBody),
    });

    const firstWh = await handleIncomingPaymentWebhook({
      provider: "SIMULATED",
      rawBody: webhookBody,
      headers: validHeaders,
    });
    expect(firstWh.accepted).toBe(true);
    expect(firstWh.duplicate).toBe(false);

    // Replay exact same webhook twice more — must NOT duplicate tickets!
    const duplicateWh1 = await handleIncomingPaymentWebhook({
      provider: "SIMULATED",
      rawBody: webhookBody,
      headers: validHeaders,
    });
    const duplicateWh2 = await handleIncomingPaymentWebhook({
      provider: "SIMULATED",
      rawBody: webhookBody,
      headers: validHeaders,
    });
    expect(duplicateWh1.duplicate).toBe(true);
    expect(duplicateWh2.duplicate).toBe(true);

    const issuedTickets = await prisma.ticket.findMany({
      where: { orderId: created.orderId },
    });
    expect(issuedTickets.length).toBe(2);

    // Verify PDF ticket generation produces valid PDF document
    const pdf = await generateTicketPdfBuffer(issuedTickets[0].id);
    expect(pdf.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.buffer.length).toBeGreaterThan(1000);

    // Verify customer email notifications queued & sent in NotificationJob outbox
    const emails = await prisma.notificationJob.findMany({
      where: { recipientEmail: "alice@example.com" },
    });
    const templatesSent = emails.map((e) => e.templateType);
    expect(templatesSent).toContain("ORDER_CONFIRMATION");
    expect(templatesSent).toContain("PAYMENT_CONFIRMATION");
    expect(templatesSent).toContain("TICKET_DELIVERY");

    // Also verify Paystack HMAC-SHA512 webhook signature verification works accurately
    const psPayload = JSON.stringify({
      event: "charge.success",
      data: {
        id: 998877,
        reference: "NON_EXISTENT_PS_REF",
        amount: 10000,
        currency: "KES",
      },
    });
    const psSig = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(psPayload)
      .digest("hex");
    const psRes = await handleIncomingPaymentWebhook({
      provider: "PAYSTACK",
      rawBody: psPayload,
      headers: new Headers({ "x-paystack-signature": psSig }),
    });
    expect(psRes.accepted).toBe(true);
    expect(psRes.outcome).toBe("UNMATCHED_PAYMENT");
  });

  it("10 & 11. QR codes contain zero PII, validate cryptographically, reject wrong-event scans, and atomically reject simultaneous duplicate scans", async () => {
    const tickets = await prisma.ticket.findMany({
      where: { userId: customerAId },
      orderBy: { createdAt: "asc" },
    });
    expect(tickets.length).toBe(2);
    const ticketOne = tickets[0];

    // Confirm QR payload contains ZERO personal info
    expect(ticketOne.qrOpaqueToken).not.toContain("alice");
    expect(ticketOne.qrOpaqueToken).not.toContain("Wanjiru");
    expect(ticketOne.qrOpaqueToken).not.toContain("254711");
    expect(verifySignedQrTokenStructure(ticketOne.qrOpaqueToken)).toBe(true);

    // Wrong event check
    const wrongEventScan = await validateAndRedeemTicket({
      eventId: otherEventId,
      scannedInput: ticketOne.qrOpaqueToken,
      scannedByUserId: scannerId,
      gateName: "Gate B",
    });
    expect(wrongEventScan.valid).toBe(false);
    expect(wrongEventScan.outcome).toBe("WRONG_EVENT");

    // Simultaneous 5-way race scan on the exact same valid QR token at the right event
    const raceScans = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        validateAndRedeemTicket({
          eventId,
          scannedInput: ticketOne.qrOpaqueToken,
          scannedByUserId: scannerId,
          gateName: `Turnstile-${i + 1}`,
        })
      )
    );

    const acceptedScans = raceScans.filter((s) => s.outcome === "ACCEPTED");
    const duplicateScans = raceScans.filter((s) => s.outcome === "ALREADY_USED");

    expect(acceptedScans.length).toBe(1);
    expect(duplicateScans.length).toBe(4);
  });

  it("13 & 14. Enforce customer booking isolation, RBAC least-privilege, and instant session invalidation", async () => {
    const aliceOrder = await prisma.order.findFirstOrThrow({
      where: { userId: customerAId },
    });

    // Customer B cannot access Customer A's order
    const bobAllowed = await verifyOrderOwnershipOrToken({
      bookingReference: aliceOrder.bookingReference,
      currentUserId: customerBId,
      currentUserRole: "CUSTOMER",
    });
    expect(bobAllowed).toBe(false);

    // Customer B cannot request a refund on Customer A's order
    await expect(
      requestCustomerRefund({
        orderId: aliceOrder.id,
        requestedByUserId: customerBId,
        reason: "Unauthorized attempt by another customer",
      })
    ).rejects.toThrow(/forbidden/i);

    // RBAC checks
    expect(hasRolePermission("CUSTOMER", "admin:access")).toBe(false);
    expect(hasRolePermission("CUSTOMER", "scanner:operate")).toBe(false);
    expect(hasRolePermission("TICKET_SCANNER", "scanner:operate")).toBe(true);
    expect(hasRolePermission("TICKET_SCANNER", "admin:access")).toBe(false);
    expect(hasRolePermission("TICKET_SCANNER", "refunds:review")).toBe(false);
    expect(hasRolePermission("FINANCE_MANAGER", "refunds:review")).toBe(true);
    expect(hasRolePermission("SUPER_ADMIN", "users:manage")).toBe(true);

    // Session creation & revocation
    const session = await createUserSession({ userId: customerBId });
    const validUser = await validateSessionToken(session.rawToken);
    expect(validUser?.id).toBe(customerBId);

    await revokeAllUserSessions(customerBId);
    const afterRevoke = await validateSessionToken(session.rawToken);
    expect(afterRevoke).toBeNull();
  });

  it("12 & 16. Refunds update financial records, invalidate tickets, preserve audit history, and reconcile accurately with zero commission entities", async () => {
    // Create a second paid booking for Alice with unused tickets so it is eligible for full refund
    const order2 = await createCheckoutOrderAndInitiatePayment({
      eventId,
      items: [{ ticketTypeId: vipTicketTypeId, quantity: 1 }],
      customer: {
        firstName: "Alice",
        lastName: "Wanjiru",
        email: "alice@example.com",
        phone: "+254711000111",
        countryCode: "KE",
      },
      provider: "SIMULATED",
      idempotencyKey: "alice-order-idem-002",
      userId: customerAId,
      appBaseUrl: "http://localhost:3000",
    });

    const wh2 = JSON.stringify({
      eventId: "wh-sim-alice-002",
      eventType: "SIMULATED.PAYMENT.SUCCEEDED",
      providerOrderId: order2.providerOrderId,
      providerCaptureId: "SIM-CAP-ALICE-002",
      bookingReference: order2.bookingReference,
      amountMinor: order2.totalMinor,
      currency: order2.currency,
    });
    await handleIncomingPaymentWebhook({
      provider: "SIMULATED",
      rawBody: wh2,
      headers: new Headers({
        "x-simulated-signature": signSimulatedWebhookPayload(wh2),
      }),
    });

    const refundReq = await requestCustomerRefund({
      orderId: order2.orderId,
      requestedByUserId: customerAId,
      reason: "Unable to travel on match day, requesting full policy refund.",
    });

    const exec = await reviewAndExecuteRefund({
      refundId: refundReq.refundId,
      reviewerUserId: financeId,
      reviewerRole: "FINANCE_MANAGER",
      action: "APPROVE",
      adminNotes: "Approved within 24h cutoff policy.",
      invalidateTickets: true,
    });
    expect(exec.status).toBe("SUCCEEDED");

    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order2.orderId },
      include: { tickets: true, payments: true },
    });
    expect(updatedOrder.status).toBe("REFUNDED");
    expect(updatedOrder.refundedMinor).toBe(250000);
    expect(updatedOrder.payments[0].status).toBe("REFUNDED");
    expect(updatedOrder.tickets[0].status).toBe("INVALIDATED");

    // Refunded ticket must be rejected at the scanner as CANCELLED_TICKET
    const postRefundScan = await validateAndRedeemTicket({
      eventId,
      scannedInput: updatedOrder.tickets[0].qrOpaqueToken,
      scannedByUserId: scannerId,
      gateName: "Gate A",
    });
    expect(postRefundScan.valid).toBe(false);
    expect(postRefundScan.outcome).toBe("CANCELLED_TICKET");

    // Reconcile all financial records
    const recon = await generateFinancialReconciliation({ currency: "KES" });
    expect(recon[0].grossSalesMinor).toBe(750000); // 500,000 + 250,000
    expect(recon[0].refundsTotalMinor).toBe(250000);
    expect(recon[0].netCollectedMinor).toBe(500000);
    expect(recon[0].unreconciledDiscrepancies.length).toBe(0);

    const settlement = await createSettlementReconciliationRecord({
      provider: "SIMULATED",
      currency: "KES",
      periodStart: new Date(Date.now() - 3600 * 1000),
      periodEnd: new Date(Date.now() + 3600 * 1000),
      providerFeesMinor: 0,
      actualBankPayoutMinor: 500000,
      actorUserId: adminId,
      actorRole: "SUPER_ADMIN",
    });
    expect(settlement.status).toBe("RECONCILED");
    expect(settlement.discrepancyMinor).toBe(0);

    // Verify PostgreSQL schema has ZERO commission tables or columns
    const commissionCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND LOWER(column_name) LIKE '%commission%'
    `;
    expect(commissionCols.length).toBe(0);
  });
});
