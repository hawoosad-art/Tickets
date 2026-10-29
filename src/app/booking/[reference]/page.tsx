import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Lock, QrCode } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyOrderOwnershipOrToken } from "@/services/orders/order-service";
import { generateQrCodeDataUrl } from "@/services/tickets/ticket-service";
import { formatMoney } from "@/lib/money";
import { formatEventDateTimeFull } from "@/lib/timezone";
import { BookingActionsClient } from "@/components/tickets/BookingActionsClient";

export const metadata: Metadata = {
  title: "Booking Details",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BookingReferencePage({
  params,
  searchParams,
}: {
  params: { reference: string };
  searchParams: { token?: string };
}) {
  const user = await getCurrentUser();
  const order = await prisma.order.findUnique({
    where: { bookingReference: params.reference },
    include: {
      event: { include: { venue: true } },
      items: true,
      tickets: { include: { ticketType: true } },
      payments: { orderBy: { createdAt: "desc" } },
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    notFound();
  }

  const allowed = await verifyOrderOwnershipOrToken({
    bookingReference: order.bookingReference,
    currentUserId: user?.id ?? null,
    currentUserRole: user?.role ?? null,
    accessToken: searchParams.token ?? null,
  });

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <Lock className="mx-auto h-10 w-10 text-[#60A5FA]" />
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Private Booking Record
        </h1>
        <p className="text-sm text-[#94A3B8]">
          For your security, customers can only view their own bookings. Sign in
          to the account that placed booking{" "}
          <strong className="text-[#F8FAFC]">{params.reference}</strong> or open
          the signed link from your confirmation email.
        </p>
        <Link href="/login" className="t254-btn-primary">
          Sign In to View Booking
        </Link>
      </div>
    );
  }

  const qrMap = new Map<string, string>();
  for (const t of order.tickets) {
    qrMap.set(t.id, await generateQrCodeDataUrl(t.qrOpaqueToken));
  }

  const tokenQuery = searchParams.token
    ? `?token=${encodeURIComponent(searchParams.token)}`
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="t254-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#293548] pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
              Booking Reference
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F8FAFC]">
              {order.bookingReference}
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Status:{" "}
              <strong className="text-[#35D399]">{order.status}</strong> •
              Total: {formatMoney(order.totalMinor, order.currency)}
            </p>
          </div>

          <BookingActionsClient
            orderId={order.id}
            bookingReference={order.bookingReference}
            accessToken={searchParams.token}
            canVerify={order.status === "AWAITING_PAYMENT"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1">
            <span className="text-[#94A3B8] uppercase font-bold">Match</span>
            <p className="text-base font-bold text-[#F8FAFC]">
              {order.event.title}
            </p>
            <p className="text-[#60A5FA]">
              {formatEventDateTimeFull(
                order.event.kickoffAt,
                order.event.timezone
              )}
            </p>
            <p className="text-[#94A3B8]">
              {order.event.venue.name} • {order.event.venue.city},{" "}
              {order.event.venue.country}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[#94A3B8] uppercase font-bold">
              Customer & Entry Instructions
            </span>
            <p className="text-sm font-bold text-[#F8FAFC]">
              {order.customerFirstName} {order.customerLastName} (
              {order.customerEmail})
            </p>
            <p className="text-[#94A3B8] leading-relaxed">
              {order.event.entryInstructions}
            </p>
          </div>
        </div>
      </div>

      {/* ISSUED DIGITAL TICKETS */}
      {order.tickets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#F8FAFC] flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#35D399]" />
            Issued Digital Match Tickets ({order.tickets.length})
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {order.tickets.map((t) => (
              <div
                key={t.id}
                className="t254-card p-6 flex flex-col sm:flex-row items-center gap-5"
              >
                <div className="rounded-xl bg-white p-2.5 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrMap.get(t.id)}
                    alt={`QR code for ticket ${t.ticketNumber}`}
                    className="h-32 w-32"
                  />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono text-sm font-extrabold text-[#F8FAFC]">
                      {t.ticketNumber}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        t.status === "VALID"
                          ? "bg-[#35D399]/15 text-[#35D399]"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#60A5FA]">
                    {t.ticketType.name}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {t.seatSection}
                    {t.seatRow ? ` • Row ${t.seatRow}` : ""}
                    {t.seatNumber ? ` • Seat ${t.seatNumber}` : ""}
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                    <a
                      href={`/api/tickets/${t.id}/pdf${tokenQuery}`}
                      className="t254-btn-primary text-xs px-3 py-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF Ticket
                    </a>
                    {user && (
                      <Link
                        href={`/tickets/${t.id}`}
                        className="t254-btn-secondary text-xs px-3 py-1.5"
                      >
                        Full Pass
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
