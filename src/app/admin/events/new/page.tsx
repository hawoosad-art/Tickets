import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateEventFormClient } from "@/components/admin/CreateEventFormClient";

export default async function AdminNewEventPage() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, timezone: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            Create New Match Event
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Configure venue, timezone, pricing currency, and refund policy. Add
            ticket categories immediately after saving.
          </p>
        </div>
        <Link href="/admin/events" className="t254-btn-secondary text-xs">
          ← All Events
        </Link>
      </div>

      <CreateEventFormClient venues={venues} />
    </div>
  );
}
