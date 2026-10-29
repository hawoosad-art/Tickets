import React from "react";
import { prisma } from "@/lib/db";

export default async function AdminAuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Immutable Security & Financial Audit Log
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Tracks authentication events, event modifications, order creations,
          verified payments, refunds, settlements, and RBAC changes.
        </p>
      </div>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Timestamp UTC</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="p-4 font-mono text-[#94A3B8]">
                    {log.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="p-4 text-[#F8FAFC]">
                    {log.actor?.email || log.actorRole || "SYSTEM"}
                  </td>
                  <td className="p-4 font-mono font-bold text-[#35D399]">
                    {log.action}
                  </td>
                  <td className="p-4 text-[#60A5FA]">
                    {log.entityType} ({log.entityId.slice(0, 10)})
                  </td>
                  <td className="p-4 font-mono text-[11px] text-[#94A3B8] max-w-md truncate">
                    {JSON.stringify(log.metadata)}
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
