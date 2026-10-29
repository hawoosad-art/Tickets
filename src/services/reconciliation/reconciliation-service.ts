import { PaymentProviderType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/logger";

export interface ReconciliationSummary {
  currency: string;
  grossSalesMinor: number;
  bookingFeesMinor: number;
  taxesCollectedMinor: number;
  verifiedPaymentsMinor: number;
  refundsTotalMinor: number;
  netCollectedMinor: number;
  confirmedOrdersCount: number;
  ticketsIssuedCount: number;
  ticketsRedeemedCount: number;
  pendingPaymentsCount: number;
  failedPaymentsCount: number;
  unreconciledDiscrepancies: Array<{
    orderId: string;
    bookingReference: string;
    issue: string;
    orderTotalMinor: number;
    paymentTotalMinor: number;
  }>;
}

export async function generateFinancialReconciliation(params?: {
  currency?: string;
  eventId?: string;
}): Promise<ReconciliationSummary[]> {
  const orders = await prisma.order.findMany({
    where: {
      ...(params?.currency ? { currency: params.currency.toUpperCase() } : {}),
      ...(params?.eventId ? { eventId: params.eventId } : {}),
    },
    include: {
      payments: true,
      refunds: { where: { status: "SUCCEEDED" } },
      tickets: true,
    },
  });

  const byCurrency = new Map<string, ReconciliationSummary>();

  const ensureBucket = (cur: string): ReconciliationSummary => {
    const code = cur.toUpperCase();
    let bucket = byCurrency.get(code);
    if (!bucket) {
      bucket = {
        currency: code,
        grossSalesMinor: 0,
        bookingFeesMinor: 0,
        taxesCollectedMinor: 0,
        verifiedPaymentsMinor: 0,
        refundsTotalMinor: 0,
        netCollectedMinor: 0,
        confirmedOrdersCount: 0,
        ticketsIssuedCount: 0,
        ticketsRedeemedCount: 0,
        pendingPaymentsCount: 0,
        failedPaymentsCount: 0,
        unreconciledDiscrepancies: [],
      };
      byCurrency.set(code, bucket);
    }
    return bucket;
  };

  for (const order of orders) {
    const bucket = ensureBucket(order.currency);

    const succeededPayments = order.payments.filter((p) =>
      ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status)
    );
    const pendingPayments = order.payments.filter((p) =>
      ["INITIATED", "PENDING"].includes(p.status)
    );
    const failedPayments = order.payments.filter(
      (p) => p.status === "FAILED"
    );

    bucket.pendingPaymentsCount += pendingPayments.length;
    bucket.failedPaymentsCount += failedPayments.length;

    const paymentSumMinor = succeededPayments.reduce(
      (acc, p) => acc + p.amountMinor,
      0
    );
    const refundSumMinor = order.refunds.reduce(
      (acc, r) => acc + r.amountMinor,
      0
    );

    const isConfirmedOrder = [
      "PAID",
      "TICKETS_ISSUED",
      "PARTIALLY_REFUNDED",
      "REFUNDED",
    ].includes(order.status);

    if (isConfirmedOrder) {
      bucket.confirmedOrdersCount += 1;
      bucket.grossSalesMinor += order.totalMinor;
      bucket.bookingFeesMinor += order.bookingFeeMinor;
      bucket.taxesCollectedMinor += order.taxMinor;
    }

    bucket.verifiedPaymentsMinor += paymentSumMinor;
    bucket.refundsTotalMinor += refundSumMinor;
    bucket.ticketsIssuedCount += order.tickets.length;
    bucket.ticketsRedeemedCount += order.tickets.filter(
      (t) => t.status === "USED"
    ).length;

    // Flag any ledger mismatch between Order state and verified Payment/Refund records
    if (isConfirmedOrder && paymentSumMinor !== order.totalMinor) {
      bucket.unreconciledDiscrepancies.push({
        orderId: order.id,
        bookingReference: order.bookingReference,
        issue: "Confirmed order total does not match verified payment ledger sum.",
        orderTotalMinor: order.totalMinor,
        paymentTotalMinor: paymentSumMinor,
      });
    } else if (!isConfirmedOrder && paymentSumMinor > 0) {
      bucket.unreconciledDiscrepancies.push({
        orderId: order.id,
        bookingReference: order.bookingReference,
        issue: `Order is in state ${order.status} despite verified payment on file.`,
        orderTotalMinor: order.totalMinor,
        paymentTotalMinor: paymentSumMinor,
      });
    } else if (order.refundedMinor !== refundSumMinor) {
      bucket.unreconciledDiscrepancies.push({
        orderId: order.id,
        bookingReference: order.bookingReference,
        issue: "Order refundedMinor differs from succeeded Refund records.",
        orderTotalMinor: order.refundedMinor,
        paymentTotalMinor: refundSumMinor,
      });
    }
  }

  for (const bucket of Array.from(byCurrency.values())) {
    bucket.netCollectedMinor =
      bucket.verifiedPaymentsMinor - bucket.refundsTotalMinor;
  }

  if (byCurrency.size === 0) {
    ensureBucket("KES");
  }

  return Array.from(byCurrency.values());
}

export async function createSettlementReconciliationRecord(params: {
  provider: PaymentProviderType;
  currency: string;
  eventId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  providerFeesMinor?: number;
  actualBankPayoutMinor?: number;
  notes?: string;
  actorUserId: string;
  actorRole: string;
}) {
  const currency = params.currency.toUpperCase();
  const payments = await prisma.payment.findMany({
    where: {
      provider: params.provider,
      currency,
      status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] },
      verifiedAt: {
        gte: params.periodStart,
        lte: params.periodEnd,
      },
      ...(params.eventId ? { order: { eventId: params.eventId } } : {}),
    },
    include: {
      order: true,
      refunds: { where: { status: "SUCCEEDED" } },
    },
  });

  const grossSalesMinor = payments.reduce((s, p) => s + p.amountMinor, 0);
  const bookingFeesMinor = payments.reduce(
    (s, p) => s + p.order.bookingFeeMinor,
    0
  );
  const taxesCollectedMinor = payments.reduce(
    (s, p) => s + p.order.taxMinor,
    0
  );
  const refundsTotalMinor = payments.reduce(
    (s, p) => s + p.refunds.reduce((rs, r) => rs + r.amountMinor, 0),
    0
  );
  const providerFeesMinor = params.providerFeesMinor ?? 0;
  const netCollectedMinor = grossSalesMinor - refundsTotalMinor;
  const expectedBankPayoutMinor = netCollectedMinor - providerFeesMinor;
  const actualBankPayoutMinor = params.actualBankPayoutMinor ?? null;
  const discrepancyMinor =
    actualBankPayoutMinor !== null
      ? actualBankPayoutMinor - expectedBankPayoutMinor
      : 0;

  const status =
    actualBankPayoutMinor === null
      ? "DRAFT"
      : discrepancyMinor === 0
        ? "RECONCILED"
        : "DISCREPANCY_FLAGGED";

  const settlementReference = `STL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const settlement = await prisma.settlement.create({
    data: {
      settlementReference,
      eventId: params.eventId ?? null,
      provider: params.provider,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      currency,
      grossSalesMinor,
      bookingFeesMinor,
      taxesCollectedMinor,
      refundsTotalMinor,
      providerFeesMinor,
      netCollectedMinor,
      expectedBankPayoutMinor,
      actualBankPayoutMinor,
      discrepancyMinor,
      status,
      notes: params.notes ?? null,
      reconciledAt: status === "RECONCILED" ? new Date() : null,
    },
  });

  if (payments.length > 0) {
    await prisma.payment.updateMany({
      where: { id: { in: payments.map((p) => p.id) } },
      data: {
        settlementId: settlement.id,
        reconciledAt: status === "RECONCILED" ? new Date() : null,
      },
    });
  }

  await recordAuditLog({
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    action: "SETTLEMENT_RECONCILED",
    entityType: "Settlement",
    entityId: settlement.id,
    metadata: {
      settlementReference,
      grossSalesMinor,
      refundsTotalMinor,
      netCollectedMinor,
      discrepancyMinor,
      status,
    },
  });

  return settlement;
}
