import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateQrCodeDataUrl } from "@/services/tickets/ticket-service";
import { formatEventDateTimeFull } from "@/lib/timezone";

export const metadata: Metadata = {
  title: "Digital Match Pass",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SingleTicketPage({
  params,
}: {
  params: { ticketId: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?returnUrl=/tickets/${params.ticketId}`);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.ticketId },
    include: {
      event: { include: { venue: true } },
      ticketType: true,
      order: true,
    },
  });

  if (!ticket) {
    notFound();
  }

  const isStaff = [
    "SUPER_ADMIN",
    "FINANCE_MANAGER",
    "SUPPORT_AGENT",
    "EVENT_MANAGER",
  ].includes(user.role);

  if (ticket.userId !== user.id && !isStaff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-[#F8FAFC]">Access Denied</h1>
        <p className="text-xs text-[#94A3B8]">
          You do not have permission to view another customer&apos;s match ticket.
        </p>
        <Link href="/tickets" className="t254-btn-primary">
          Back to My Tickets
        </Link>
      </div>
    );
  }

  const qrDataUrl = await generateQrCodeDataUrl(ticket.qrOpaqueToken);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Tickets
      </Link>

      <div className="t254-card overflow-hidden border-[#35D399]/40">
        <div className="bg-[#111827] border-b border-[#293548] p-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#35D399]">
              {ticket.event.competition}
            </span>
            <h1 className="text-xl font-extrabold text-[#F8FAFC] mt-0.5">
              {ticket.event.title}
            </h1>
          </div>
          <span className="rounded-full bg-[#35D399]/15 px-3 py-1 text-xs font-bold text-[#35D399]">
            {ticket.status}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {ticket.isSimulated && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2 text-center text-[11px] font-bold text-amber-300">
              SAMPLE / SIMULATED TICKET — FOR PLATFORM DEMONSTRATION ONLY
            </div>
          )}

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code for ${ticket.ticketNumber}`}
                className="h-52 w-52"
              />
            </div>
            <p className="font-mono text-sm font-extrabold text-[#F8FAFC]">
              {ticket.ticketNumber}
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] text-[#35D399]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Opaque signed QR reference • Zero personal info encoded
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#293548] bg-[#0B1020] p-4 text-xs">
            <div>
              <span className="text-[#94A3B8]">Booking Reference</span>
              <p className="font-mono font-bold text-[#F8FAFC] mt-0.5">
                {ticket.order.bookingReference}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Category</span>
              <p className="font-bold text-[#60A5FA] mt-0.5">
                {ticket.ticketType.name}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Kick-off</span>
              <p className="font-semibold text-[#F8FAFC] mt-0.5">
                {formatEventDateTimeFull(
                  ticket.event.kickoffAt,
                  ticket.event.timezone
                )}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Seat / Section</span>
              <p className="font-semibold text-[#F8FAFC] mt-0.5">
                {ticket.seatSection}
                {ticket.seatRow ? ` • Row ${ticket.seatRow}` : ""}
                {ticket.seatNumber ? ` • Seat ${ticket.seatNumber}` : ""}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Venue</span>
              <p className="font-semibold text-[#F8FAFC] mt-0.5">
                {ticket.event.venue.name}, {ticket.event.venue.city}
              </p>
            </div>
            <div>
              <span className="text-[#94A3B8]">Issued Date</span>
              <p className="font-semibold text-[#F8FAFC] mt-0.5">
                {ticket.issuedAt.toISOString().slice(0, 10)} UTC
              </p>
            </div>
          </div>

          <div className="text-xs text-[#94A3B8] space-y-1">
            <strong className="text-[#F8FAFC]">Entry Instructions:</strong>
            <p className="leading-relaxed">{ticket.event.entryInstructions}</p>
          </div>

          <a
            href={`/api/tickets/${ticket.id}/pdf`}
            className="t254-btn-primary w-full py-3"
          >
            <Download className="h-4 w-4" />
            Download Official PDF Ticket
          </a>
        </div>
      </div>
    </div>
  );
}
