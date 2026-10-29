import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { computeAvailableStock } from "@/services/inventory/inventory-service";
import { EditEventControlsClient } from "@/components/admin/EditEventControlsClient";

export default async function AdminEventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      venue: true,
      policy: true,
      ticketTypes: {
        include: { allocation: true },
        orderBy: { sortOrder: "asc" },
      },
      orders: {
        where: {
          status: {
            in: ["PAID", "TICKETS_ISSUED", "PARTIALLY_REFUNDED", "REFUNDED"],
          },
        },
      },
    },
  });

  if (!event) notFound();

  const grossMinor = event.orders.reduce((s, o) => s + o.totalMinor, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
            {event.competition}
          </span>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            {event.title}
          </h1>
          <p className="text-xs text-[#94A3B8]">
            {event.venue.name} • Confirmed Gross Sales:{" "}
            <strong className="text-[#35D399]">
              {formatMoney(grossMinor, event.currency)}
            </strong>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/ticket-types"
            className="t254-btn-primary text-xs"
          >
            + Add Ticket Category
          </Link>
          <Link href="/admin/events" className="t254-btn-secondary text-xs">
            ← Events
          </Link>
        </div>
      </div>

      <EditEventControlsClient
        eventId={event.id}
        initialStatus={event.status}
        initialNotice={event.officialStatusNotice || ""}
        initialBookingFeeBps={event.policy?.bookingFeeBps ?? 0}
        initialTaxBps={event.policy?.taxBps ?? 0}
      />

      <div className="t254-card p-6 space-y-4">
        <h2 className="text-base font-bold text-[#F8FAFC]">
          Configured Ticket Categories & Inventory
        </h2>
        {event.ticketTypes.length === 0 ? (
          <p className="text-xs text-[#94A3B8]">
            No ticket categories added yet. Visit Ticket Categories to configure
            Standard, Premium, VIP, or Hospitality allocations.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#293548] text-[#94A3B8]">
                <tr>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Capacity</th>
                  <th className="py-2 pr-4">Reserved</th>
                  <th className="py-2 pr-4">Sold</th>
                  <th className="py-2">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#293548]">
                {event.ticketTypes.map((tt) => (
                  <tr key={tt.id}>
                    <td className="py-3 pr-4 font-bold text-[#F8FAFC]">
                      {tt.name} ({tt.code})
                    </td>
                    <td className="py-3 pr-4 text-[#F8FAFC]">
                      {formatMoney(tt.priceMinor, tt.currency)}
                    </td>
                    <td className="py-3 pr-4 text-[#60A5FA]">
                      {tt.allocation?.sourceType}
                    </td>
                    <td className="py-3 pr-4">
                      {tt.allocation?.authorisedCapacity ?? 0}
                    </td>
                    <td className="py-3 pr-4 text-amber-300">
                      {tt.allocation?.reservedCount ?? 0}
                    </td>
                    <td className="py-3 pr-4 text-[#35D399]">
                      {tt.allocation?.soldCount ?? 0}
                    </td>
                    <td className="py-3 font-extrabold text-[#F8FAFC]">
                      {tt.allocation ? computeAvailableStock(tt.allocation) : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
