import React from "react";
import { prisma } from "@/lib/db";
import { UsersAdminClient } from "@/components/admin/UsersAdminClient";

export default async function AdminUsersPage() {
  const staff = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: { role: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Administrative Roles & Staff Access
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Manage least-privilege access across Super Administrator, Finance
          Manager, Event Manager, Support Agent, and Ticket Scanner roles.
        </p>
      </div>

      <UsersAdminClient />

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {staff.map((u) => (
                <tr key={u.id}>
                  <td className="p-4 font-bold text-[#F8FAFC]">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="p-4 text-[#94A3B8]">{u.email}</td>
                  <td className="p-4 font-mono font-bold text-[#35D399]">
                    {u.role}
                  </td>
                  <td className="p-4 text-[#94A3B8]">
                    {u.lastLoginAt
                      ? u.lastLoginAt.toISOString().slice(0, 19).replace("T", " ")
                      : "Never"}
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
