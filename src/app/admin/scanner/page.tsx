import React from "react";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function AdminScannerOpsPage() {
  const [scans, totalAccepted, totalRejected] = await Promise.all([
    prisma.ticketScan.findMany({
      orderBy: { scannedAt: "desc" },
      take: 60,
      include: {
        event: { select: { title: true } },
        ticket: { select: { ticketNumber: true } },
        scannedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.ticketScan.count({ where: { outcome: "ACCEPTED" } }),
    prisma.ticketScan.count({ where: { outcome: { not: "ACCEPTED" } } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
            Turnstile Scanner Operations
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Accepted scans:{" "}
            <strong className="text-[#35D399]">{totalAccepted}</strong> •
            Rejected duplicate/invalid attempts:{" "}
            <strong className="text-rose-400">{totalRejected}</strong>
          </p>
        </div>
        <Link href="/scanner" className="t254-btn-primary text-xs">
          <QrCode className="h-4 w-4" />
          Launch Scanner Terminal
        </Link>
      </div>

      <div className="t254-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#293548] text-[#94A3B8]">
              <tr>
                <th className="p-4">Timestamp UTC</th>
                <th className="p-4">Event</th>
                <th className="p-4">Ticket / Input</th>
                <th className="p-4">Gate & Staff</th>
                <th className="p-4">Outcome</th>
                <th className="p-4">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#293548]">
              {scans.map((s) => (
                <tr key={s.id}>
                  <td className="p-4 font-mono text-[#94A3B8]">
                    {s.scannedAt.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="p-4 text-[#F8FAFC]">{s.event.title}</td>
                  <td className="p-4 font-mono font-bold text-[#60A5FA]">
                    {s.ticket?.ticketNumber || s.scannedInputRef}
                  </td>
                  <td className="p-4 text-[#94A3B8]">
                    {s.gateName} ({s.scannedBy.firstName})
                  </td>
                  <td className="p-4">
                    <span
                      className={`font-bold ${
                        s.outcome === "ACCEPTED"
                          ? "text-[#35D399]"
                          : "text-rose-400"
                      }`}
                    >
                      {s.outcome}
                    </span>
                  </td>
                  <td className="p-4 text-[#94A3B8]">{s.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
