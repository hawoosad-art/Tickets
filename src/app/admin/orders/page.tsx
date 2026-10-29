import React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = (searchParams.q || "").trim();
  const statusFilter = searchParams.status || "";

  const orders = await prisma.order.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter as never } : {}),
      ...(q
        ? {
            OR: [
              { bookingReference: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
              { customerLastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      event: { select: { title: true } },
      _count: { select: { tickets: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            Order Management
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Search customer bookings, inspect payment & ticket states, or export
            permitted CSV reports.
          </p>
        </div>

        <a
          href="/api/admin/exports/orders"
          className="t254-btn-secondary text-xs"
        >
          <Download className="h-4 w-4" />
          Export Orders CSV
        </a>
      </div>

      <form method="GET" className="t254-card p-4 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search booking reference, email, surname..."
          className="t254-input text-xs flex-1 min-w-[220px]"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="t254-input text-xs w-48"
        >
          <option value="">All Order States</option>
          {[
            "PENDING",
            "AWAITING_PAYMENT",
            "PAID",
            "TICKETS_ISSUED",
            "PARTIALLY_REFUNDED",
            "REFUNDED",
            "CANCELLED",
            "EXPIRED",
            "PAYMENT_FAILED",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="t254-btn-primary text-xs">
          Filter
        </button>
      </form>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Reference</th>
                <th className="p-4">Event</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Status</th>
                <th className="p-4">Total</th>
                <th className="p-4">Tickets</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-4 font-mono font-bold text-[#60A5FA]">
                    {o.bookingReference}
                  </td>
                  <td className="p-4 text-[#F8FAFC]">{o.event.title}</td>
                  <td className="p-4 text-[#94A3B8]">
                    {o.customerFirstName} {o.customerLastName}
                    <br />
                    {o.customerEmail}
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-[#35D399]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#35D399]">
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-[#F8FAFC]">
                    {formatMoney(o.totalMinor, o.currency)}
                  </td>
                  <td className="p-4 text-[#F8FAFC]">{o._count.tickets}</td>
                  <td className="p-4">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-semibold text-[#35D399] hover:underline"
                    >
                      Inspect
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
