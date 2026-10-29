import React from "react";
import Link from "next/link";
import { Plus, QrCode } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { generateFinancialReconciliation } from "@/services/reconciliation/reconciliation-service";

export default async function AdminDashboardPage() {
  const summaries = await generateFinancialReconciliation();
  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { event: { select: { title: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
            Live Financial & Ticketing Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] mt-1">
            Executive Dashboard
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            All metrics below are computed directly from live PostgreSQL
            minor-unit records (zero invented figures).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/events/new" className="t254-btn-primary text-xs">
            <Plus className="h-4 w-4" />
            Create Match Event
          </Link>
          <Link href="/scanner" className="t254-btn-secondary text-xs">
            <QrCode className="h-4 w-4" />
            Open Gate Scanner
          </Link>
        </div>
      </div>

      {summaries.map((sum) => (
        <div key={sum.currency} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
            Ledger Currency: {sum.currency}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                label: "Gross Ticket Sales",
                value: formatMoney(sum.grossSalesMinor, sum.currency),
                accent: "text-[#F8FAFC]",
              },
              {
                label: "Net Collected Amount",
                value: formatMoney(sum.netCollectedMinor, sum.currency),
                accent: "text-[#35D399]",
              },
              {
                label: "Refund Totals",
                value: formatMoney(sum.refundsTotalMinor, sum.currency),
                accent: "text-amber-300",
              },
              {
                label: "Confirmed Orders",
                value: String(sum.confirmedOrdersCount),
                accent: "text-[#F8FAFC]",
              },
              {
                label: "Tickets Issued",
                value: String(sum.ticketsIssuedCount),
                accent: "text-[#60A5FA]",
              },
              {
                label: "Tickets Redeemed",
                value: String(sum.ticketsRedeemedCount),
                accent: "text-[#35D399]",
              },
              {
                label: "Pending Payments",
                value: String(sum.pendingPaymentsCount),
                accent: "text-amber-300",
              },
              {
                label: "Failed Payments",
                value: String(sum.failedPaymentsCount),
                accent: "text-rose-400",
              },
            ].map((metric) => (
              <div key={metric.label} className="t254-card p-5 space-y-1">
                <span className="text-xs text-[#94A3B8]">{metric.label}</span>
                <p className={`text-xl font-extrabold ${metric.accent}`}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="t254-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#F8FAFC]">
            Latest Bookings
          </h2>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-[#35D399] hover:underline"
          >
            View All Orders →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="py-2.5 pr-4">Reference</th>
                <th className="py-2.5 pr-4">Event</th>
                <th className="py-2.5 pr-4">Customer</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 pr-4">Total</th>
                <th className="py-2.5">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="py-3 pr-4 font-mono font-bold text-[#60A5FA]">
                    {o.bookingReference}
                  </td>
                  <td className="py-3 pr-4 text-[#F8FAFC]">{o.event.title}</td>
                  <td className="py-3 pr-4 text-[#94A3B8]">
                    {o.customerEmail}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-[#111827] border border-[#293548] px-2.5 py-0.5 text-[10px] font-bold text-[#35D399]">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-bold text-[#F8FAFC]">
                    {formatMoney(o.totalMinor, o.currency)}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-[#35D399] hover:underline font-semibold"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
