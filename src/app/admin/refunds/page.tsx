import React from "react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { RefundReviewButtonsClient } from "@/components/admin/RefundReviewButtonsClient";

export default async function AdminRefundsPage() {
  const refunds = await prisma.refund.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      order: { include: { event: { select: { title: true } } } },
      payment: { select: { provider: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Refund Review & Provider Execution
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Review customer refund requests, execute provider refunds, invalidate
          tickets, and maintain full financial history.
        </p>
      </div>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Refund Ref</th>
                <th className="p-4">Booking & Event</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Status</th>
                <th className="p-4">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#94A3B8]">
                    No refund requests recorded yet.
                  </td>
                </tr>
              ) : (
                refunds.map((r) => (
                  <tr key={r.id}>
                    <td className="p-4 font-mono font-bold text-[#60A5FA]">
                      {r.refundReference}
                    </td>
                    <td className="p-4">
                      <p className="font-mono font-bold text-[#F8FAFC]">
                        {r.order.bookingReference}
                      </p>
                      <p className="text-[#94A3B8]">{r.order.event.title}</p>
                    </td>
                    <td className="p-4 font-bold text-[#F8FAFC]">
                      {formatMoney(r.amountMinor, r.currency)} (
                      {r.payment.provider})
                    </td>
                    <td className="p-4 text-[#94A3B8] max-w-xs">{r.reason}</td>
                    <td className="p-4 font-bold text-[#35D399]">{r.status}</td>
                    <td className="p-4">
                      {r.status === "REQUESTED" ||
                      r.status === "UNDER_REVIEW" ? (
                        <RefundReviewButtonsClient refundId={r.id} />
                      ) : (
                        <span className="text-[#94A3B8]">
                          {r.providerRefundId || "Finalized"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
