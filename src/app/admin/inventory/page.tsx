import React from "react";
import { prisma } from "@/lib/db";
import { computeAvailableStock } from "@/services/inventory/inventory-service";
import { InventoryReapButtonClient } from "@/components/admin/InventoryReapButtonClient";

export default async function AdminInventoryPage() {
  const [allocations, activeHolds] = await Promise.all([
    prisma.inventoryAllocation.findMany({
      include: {
        ticketType: {
          include: { event: { select: { title: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.inventoryReservation.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            Inventory & Allocations
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Native delegated allocations & external organiser feed tracking •{" "}
            <strong className="text-[#60A5FA]">
              {activeHolds} active checkout reservation(s)
            </strong>
          </p>
        </div>
        <InventoryReapButtonClient />
      </div>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Event & Category</th>
                <th className="p-4">Source Mode</th>
                <th className="p-4">Authorised Capacity</th>
                <th className="p-4">Active Reserved</th>
                <th className="p-4">Sold</th>
                <th className="p-4">Blocked</th>
                <th className="p-4">Net Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {allocations.map((a) => (
                <tr key={a.id}>
                  <td className="p-4">
                    <p className="font-bold text-[#F8FAFC]">
                      {a.ticketType.name}
                    </p>
                    <p className="text-[#94A3B8]">
                      {a.ticketType.event.title}
                    </p>
                  </td>
                  <td className="p-4 text-[#60A5FA] font-semibold">
                    {a.sourceType}
                  </td>
                  <td className="p-4 font-bold text-[#F8FAFC]">
                    {a.authorisedCapacity}
                  </td>
                  <td className="p-4 text-amber-300 font-semibold">
                    {a.reservedCount}
                  </td>
                  <td className="p-4 text-[#35D399] font-semibold">
                    {a.soldCount}
                  </td>
                  <td className="p-4 text-[#94A3B8]">{a.blockedCount}</td>
                  <td className="p-4 font-extrabold text-[#F8FAFC]">
                    {computeAvailableStock(a)}
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
