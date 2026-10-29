import React from "react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { CreateTicketTypeFormClient } from "@/components/admin/CreateTicketTypeFormClient";

export default async function AdminTicketTypesPage() {
  const [events, types] = await Promise.all([
    prisma.event.findMany({
      orderBy: { kickoffAt: "asc" },
      select: { id: true, title: true, currency: true },
    }),
    prisma.ticketType.findMany({
      orderBy: [{ eventId: "asc" }, { sortOrder: "asc" }],
      include: {
        event: { select: { title: true } },
        allocation: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Ticket Categories & Pricing
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Configure Standard, Premium, VIP, and Hospitality categories backed by
          minor-unit prices and authorised inventory allocations.
        </p>
      </div>

      <CreateTicketTypeFormClient events={events} />

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Match</th>
                <th className="p-4">Tier</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Order Limits</th>
                <th className="p-4">Capacity / Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {types.map((tt) => (
                <tr key={tt.id}>
                  <td className="p-4 text-[#F8FAFC]">{tt.event.title}</td>
                  <td className="p-4 text-[#60A5FA] font-bold">
                    {tt.categoryTier}
                  </td>
                  <td className="p-4 font-bold text-[#F8FAFC]">
                    {tt.name} ({tt.code})
                  </td>
                  <td className="p-4 text-[#35D399] font-bold">
                    {formatMoney(tt.priceMinor, tt.currency)}
                  </td>
                  <td className="p-4 text-[#94A3B8]">
                    {tt.minPerOrder}–{tt.maxPerOrder}
                  </td>
                  <td className="p-4 text-[#F8FAFC]">
                    {tt.allocation?.authorisedCapacity ?? 0} /{" "}
                    <span className="text-[#35D399]">
                      {tt.allocation?.soldCount ?? 0} sold
                    </span>
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
