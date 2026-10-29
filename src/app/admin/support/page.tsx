import React from "react";
import { prisma } from "@/lib/db";
import { SupportReplyFormClient } from "@/components/admin/SupportReplyFormClient";

export default async function AdminSupportPage() {
  const requests = await prisma.supportRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Customer Support Queue
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Respond to customer support inquiries and dispatch email updates.
        </p>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="t254-card p-8 text-center text-xs text-[#94A3B8]">
            No customer support requests open.
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="t254-card p-5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-[#60A5FA]">
                    {req.ticketReference}
                  </span>{" "}
                  • <strong className="text-[#F8FAFC]">{req.subject}</strong>
                </div>
                <span className="rounded-full bg-[#35D399]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#35D399]">
                  {req.status}
                </span>
              </div>
              <p className="text-[#94A3B8]">
                From: {req.name} ({req.email}){" "}
                {req.bookingReference ? `• Booking: ${req.bookingReference}` : ""}
              </p>
              <p className="rounded-xl bg-[#0B1020] border border-[#293548] p-3 text-[#F8FAFC]">
                {req.message}
              </p>
              {req.staffReply && (
                <p className="text-[#35D399]">
                  Last Staff Reply: {req.staffReply}
                </p>
              )}
              <SupportReplyFormClient
                supportId={req.id}
                currentStatus={req.status}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
