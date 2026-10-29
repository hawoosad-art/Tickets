import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { generateFinancialReconciliation } from "@/services/reconciliation/reconciliation-service";
import { CreateSettlementFormClient } from "@/components/admin/CreateSettlementFormClient";

export default async function AdminReconciliationPage() {
  const [summaries, settlements] = await Promise.all([
    generateFinancialReconciliation(),
    prisma.settlement.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Financial Reconciliation & Settlements
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Verify that confirmed Order totals match verified Payment captures and
          processed Refunds in integer minor units.
        </p>
      </div>

      {summaries.map((s) => (
        <div key={s.currency} className="t254-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#F8FAFC]">
              {s.currency} Ledger Balance Check
            </h2>
            {s.unreconciledDiscrepancies.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#35D399]">
                <CheckCircle2 className="h-4 w-4" />0 Discrepancies — Balanced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                {s.unreconciledDiscrepancies.length} Discrepancies Flagged
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#94A3B8]">Confirmed Order Gross</span>
              <p className="text-base font-extrabold text-[#F8FAFC]">
                {formatMoney(s.grossSalesMinor, s.currency)}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Verified Payments Sum</span>
              <p className="text-base font-extrabold text-[#60A5FA]">
                {formatMoney(s.verifiedPaymentsMinor, s.currency)}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Processed Refunds</span>
              <p className="text-base font-extrabold text-amber-300">
                {formatMoney(s.refundsTotalMinor, s.currency)}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Net Collected Amount</span>
              <p className="text-base font-extrabold text-[#35D399]">
                {formatMoney(s.netCollectedMinor, s.currency)}
              </p>
            </div>
          </div>
        </div>
      ))}

      <CreateSettlementFormClient />

      <div className="t254-card p-6 space-y-3">
        <h2 className="text-sm font-bold text-[#F8FAFC]">
          Recorded Settlement Batches ({settlements.length})
        </h2>
        <div className="divide-y divide-[#293548] text-xs">
          {settlements.map((stl) => (
            <div
              key={stl.id}
              className="py-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="font-mono font-bold text-[#60A5FA]">
                  {stl.settlementReference}
                </span>{" "}
                • <span className="font-bold">{stl.provider}</span> • Net:{" "}
                <strong className="text-[#35D399]">
                  {formatMoney(stl.netCollectedMinor, stl.currency)}
                </strong>
              </div>
              <div className="text-[#94A3B8]">
                Status:{" "}
                <strong className="text-[#F8FAFC]">{stl.status}</strong> •
                Discrepancy:{" "}
                {formatMoney(stl.discrepancyMinor, stl.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
