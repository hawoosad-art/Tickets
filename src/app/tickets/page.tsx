import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, QrCode, Ticket } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatEventDateTimeFull } from "@/lib/timezone";

export const metadata: Metadata = {
  title: "My Digital Tickets",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TicketsWalletPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnUrl=/tickets");
  }

  const tickets = await prisma.ticket.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
    include: {
      event: { include: { venue: true } },
      ticketType: true,
      order: { select: { bookingReference: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
            Digital Ticket Wallet
          </span>
          <h1 className="text-3xl font-extrabold text-[#F8FAFC] mt-1">
            My Match Tickets
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Signed QR digital passes linked to {user.email}.
          </p>
        </div>
        <Link href="/matches" className="t254-btn-primary text-xs">
          Book More Matches
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="t254-card p-12 text-center space-y-4">
          <Ticket className="mx-auto h-10 w-10 text-[#35D399]" />
          <p className="text-base font-bold text-[#F8FAFC]">
            You don&apos;t have any digital tickets yet.
          </p>
          <p className="text-xs text-[#94A3B8]">
            Once you book a match, your downloadable PDF and QR tickets appear
            here automatically.
          </p>
          <Link href="/matches" className="t254-btn-primary">
            Explore Upcoming Matches
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="t254-card p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#60A5FA]">
                    {t.ticketNumber} • {t.order.bookingReference}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      t.status === "VALID"
                        ? "bg-[#35D399]/15 text-[#35D399]"
                        : t.status === "USED"
                          ? "bg-[#60A5FA]/15 text-[#60A5FA]"
                          : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-[#F8FAFC]">
                  {t.event.title}
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  {formatEventDateTimeFull(
                    t.event.kickoffAt,
                    t.event.timezone
                  )}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {t.event.venue.name} • {t.ticketType.name}
                  {t.seatRow ? ` • Row ${t.seatRow} Seat ${t.seatNumber}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-[#293548] pt-4">
                <Link
                  href={`/tickets/${t.id}`}
                  className="t254-btn-primary text-xs px-4 py-2"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Open QR Pass
                </Link>
                <a
                  href={`/api/tickets/${t.id}/pdf`}
                  className="t254-btn-secondary text-xs px-4 py-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
