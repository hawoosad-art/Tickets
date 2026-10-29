import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function AdminPaymentsPage() {
  const [payments, webhooks] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { order: { select: { id: true, bookingReference: true } } },
    }),
    prisma.paymentWebhookEvent.findMany({
      orderBy: { receivedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Payment Transactions & Webhook Log
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Inspect provider order IDs, capture references, payment failures, and
          idempotent webhook deliveries.
        </p>
      </div>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Booking</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Provider Reference</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Verified At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-4 font-mono">
                    <Link
                      href={`/admin/orders/${p.order.id}`}
                      className="text-[#60A5FA] hover:underline font-bold"
                    >
                      {p.order.bookingReference}
                    </Link>
                  </td>
                  <td className="p-4 font-bold text-[#F8FAFC]">
                    {p.provider}
                    {p.isSimulated && (
                      <span className="ml-1 text-[10px] text-amber-300">
                        (SIM)
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-mono text-[#94A3B8]">
                    {p.providerOrderId || "—"}
                  </td>
                  <td className="p-4 font-bold text-[#F8FAFC]">
                    {formatMoney(p.amountMinor, p.currency)}
                    {p.fxRateApplied && (
                      <span className="block text-[10px] text-[#94A3B8]">
                        Settled:{" "}
                        {formatMoney(
                          p.settledAmountMinor || 0,
                          p.settledCurrency || "USD"
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        p.status === "SUCCEEDED"
                          ? "bg-[#35D399]/15 text-[#35D399]"
                          : p.status === "FAILED"
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.failureMessage && (
                      <span className="block text-[10px] text-rose-300 mt-0.5">
                        {p.failureMessage}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-[#94A3B8]">
                    {p.verifiedAt
                      ? p.verifiedAt.toISOString().slice(0, 19).replace("T", " ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="t254-card p-6 space-y-3">
        <h2 className="text-sm font-bold text-[#F8FAFC]">
          Idempotent Webhook Event Log ({webhooks.length})
        </h2>
        <div className="divide-y divide-[#293548] text-xs">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="py-2.5 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="font-bold text-[#60A5FA]">{wh.provider}</span>{" "}
                • <span className="text-[#F8FAFC]">{wh.eventType}</span> •{" "}
                <span className="font-mono text-[#94A3B8]">
                  {wh.providerEventId}
                </span>
              </div>
              <div className="text-[#94A3B8]">
                {wh.processed ? (
                  <span className="text-[#35D399] font-semibold">
                    Verified & Processed
                  </span>
                ) : (
                  <span className="text-amber-300">
                    {wh.processingError || "Pending"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
