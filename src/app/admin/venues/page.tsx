import React from "react";
import { prisma } from "@/lib/db";
import { CreateVenueFormClient } from "@/components/admin/CreateVenueFormClient";

export default async function AdminVenuesPage() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Venues & Stadiums
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Configure stadium capacity, local IANA timezone, and turnstile entry
          rules.
        </p>
      </div>

      <CreateVenueFormClient />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {venues.map((v) => (
          <div key={v.id} className="t254-card p-5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#F8FAFC]">{v.name}</h3>
              <span className="font-mono text-[#60A5FA]">{v.timezone}</span>
            </div>
            <p className="text-[#94A3B8]">
              {v.city}, {v.country} ({v.countryCode}) • Capacity:{" "}
              <strong className="text-[#F8FAFC]">
                {v.capacity.toLocaleString()}
              </strong>
            </p>
            {v.gatesInfo && <p className="text-[#35D399]">{v.gatesInfo}</p>}
            <p className="text-[#94A3B8]">
              Linked fixtures: {v._count.events}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
