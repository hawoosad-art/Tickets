import React from "react";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function AdminReportsPage() {
  const [
    analyticsGroups,
    eventsWithSales,
    paymentsTotal,
    paymentsSucceeded,
    supportCounts,
  ] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    }),
    prisma.event.findMany({
      include: {
        orders: {
          where: {
            status: {
              in: ["PAID", "TICKETS_ISSUED", "PARTIALLY_REFUNDED", "REFUNDED"],
            },
          },
        },
        tickets: true,
      },
    }),
    prisma.payment.count(),
    prisma.payment.count({
      where: { status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] } },
    }),
    prisma.supportRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByType = new Map(
    analyticsGroups.map((g) => [g.eventType, g._count._all])
  );
  const successRate =
    paymentsTotal > 0
      ? ((paymentsSucceeded / paymentsTotal) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            Reports & Conversion Analytics
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Funnel telemetry, ticket sales by event & category, payment success
            rates, ticket redemption, and support desk activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/exports/reports?type=sales-by-event"
            className="t254-btn-secondary text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export Event Sales CSV
          </a>
          <a
            href="/api/admin/exports/reports?type=sales-by-category"
            className="t254-btn-secondary text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export Category Sales CSV
          </a>
        </div>
      </div>

      {/* Funnel Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Event Page Views",
            value: countByType.get("EVENT_VIEW") || 0,
          },
          {
            label: "Ticket Selections",
            value: countByType.get("TICKET_SELECTION") || 0,
          },
          {
            label: "Checkouts Initiated",
            value: countByType.get("CHECKOUT_INITIATED") || 0,
          },
          {
            label: "Payment Success Rate",
            value: `${successRate}%`,
          },
        ].map((card) => (
          <div key={card.label} className="t254-card p-5 space-y-1">
            <span className="text-xs text-[#94A3B8]">{card.label}</span>
            <p className="text-2xl font-extrabold text-[#35D399]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ticket Sales & Redemption by Event */}
      <div className="t254-card p-6 space-y-4">
        <h2 className="text-base font-bold text-[#F8FAFC]">
          Ticket Sales, Refunds & Redemption by Event
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Confirmed Orders</th>
                <th className="py-2 pr-4">Tickets Issued</th>
                <th className="py-2 pr-4">Redeemed</th>
                <th className="py-2 pr-4">Gross Sales</th>
                <th className="py-2 pr-4">Refunded</th>
                <th className="py-2">Net Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {eventsWithSales.map((ev) => {
                const gross = ev.orders.reduce((s, o) => s + o.totalMinor, 0);
                const refunded = ev.orders.reduce(
                  (s, o) => s + o.refundedMinor,
                  0
                );
                const redeemed = ev.tickets.filter(
                  (t) => t.status === "USED"
                ).length;

                return (
                  <tr key={ev.id}>
                    <td className="py-3 pr-4 font-bold text-[#F8FAFC]">
                      {ev.title}
                    </td>
                    <td className="py-3 pr-4">{ev.orders.length}</td>
                    <td className="py-3 pr-4">{ev.tickets.length}</td>
                    <td className="py-3 pr-4 text-[#60A5FA]">{redeemed}</td>
                    <td className="py-3 pr-4 font-bold">
                      {formatMoney(gross, ev.currency)}
                    </td>
                    <td className="py-3 pr-4 text-amber-300">
                      {formatMoney(refunded, ev.currency)}
                    </td>
                    <td className="py-3 font-extrabold text-[#35D399]">
                      {formatMoney(gross - refunded, ev.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Support Activity */}
      <div className="t254-card p-6 space-y-2 text-xs">
        <h2 className="text-base font-bold text-[#F8FAFC]">
          Customer Support Activity Summary
        </h2>
        <div className="flex flex-wrap gap-6 text-[#94A3B8]">
          {supportCounts.length === 0 ? (
            <span>No support tickets recorded yet.</span>
          ) : (
            supportCounts.map((s) => (
              <span key={s.status}>
                {s.status}:{" "}
                <strong className="text-[#F8FAFC]">{s._count._all}</strong>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
