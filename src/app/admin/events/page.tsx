import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { computeAvailableStock } from "@/services/inventory/inventory-service";
import { formatEventDateTimeFull } from "@/lib/timezone";

export default async function AdminEventsListPage() {
  const events = await prisma.event.findMany({
    orderBy: { kickoffAt: "asc" },
    include: {
      venue: true,
      ticketTypes: { include: { allocation: true } },
      _count: { select: { orders: true, tickets: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            Event Management
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Create, publish, postpone, or cancel football fixtures.
          </p>
        </div>
        <Link href="/admin/events/new" className="t254-btn-primary text-xs">
          <Plus className="h-4 w-4" />
          New Event
        </Link>
      </div>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Match</th>
                <th className="p-4">Venue & Kick-off</th>
                <th className="p-4">Status</th>
                <th className="p-4">Available Stock</th>
                <th className="p-4">Issued Tickets</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {events.map((ev) => {
                const avail = ev.ticketTypes.reduce(
                  (acc, tt) =>
                    acc +
                    (tt.allocation ? computeAvailableStock(tt.allocation) : 0),
                  0
                );
                return (
                  <tr key={ev.id}>
                    <td className="p-4">
                      <p className="font-bold text-[#F8FAFC]">{ev.title}</p>
                      <p className="text-[#60A5FA]">{ev.competition}</p>
                      {ev.isSampleData && (
                        <span className="text-[10px] text-amber-300 font-bold">
                          [SAMPLE EVENT]
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-[#94A3B8]">
                      <p className="text-[#F8FAFC]">{ev.venue.name}</p>
                      <p>
                        {formatEventDateTimeFull(ev.kickoffAt, ev.timezone)}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[#35D399]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#35D399]">
                        {ev.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[#F8FAFC]">{avail}</td>
                    <td className="p-4 font-bold text-[#60A5FA]">
                      {ev._count.tickets}
                    </td>
                    <td className="p-4 space-x-3">
                      <Link
                        href={`/admin/events/${ev.id}`}
                        className="font-semibold text-[#35D399] hover:underline"
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/matches/${ev.slug}`}
                        className="text-[#94A3B8] hover:text-[#F8FAFC]"
                      >
                        Public View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
