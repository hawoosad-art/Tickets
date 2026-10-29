import React from "react";
import { prisma } from "@/lib/db";
import { CustomerSuspendButtonClient } from "@/components/admin/CustomerSuspendButtonClient";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").trim();

  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { orders: true, tickets: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Customer Directory
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Search customer accounts, inspect booking counts, or suspend abusive
          accounts (instantly revoking active sessions).
        </p>
      </div>

      <form method="GET" className="t254-card p-4 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search customer email or name..."
          className="t254-input text-xs flex-1"
        />
        <button type="submit" className="t254-btn-primary text-xs">
          Search
        </button>
      </form>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email & Phone</th>
                <th className="p-4">Bookings</th>
                <th className="p-4">Tickets</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="p-4 font-bold text-[#F8FAFC]">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="p-4 text-[#94A3B8]">
                    {c.email}
                    <br />
                    {c.phone || "—"}
                  </td>
                  <td className="p-4 font-bold text-[#60A5FA]">
                    {c._count.orders}
                  </td>
                  <td className="p-4 text-[#F8FAFC]">{c._count.tickets}</td>
                  <td className="p-4">
                    {c.isSuspended ? (
                      <span className="text-rose-400 font-bold">SUSPENDED</span>
                    ) : (
                      <span className="text-[#35D399] font-bold">ACTIVE</span>
                    )}
                  </td>
                  <td className="p-4">
                    <CustomerSuspendButtonClient
                      userId={c.id}
                      isSuspended={c.isSuspended}
                    />
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
