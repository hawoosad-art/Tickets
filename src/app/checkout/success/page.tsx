import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  verifyOrderOwnershipOrToken,
  verifyOrderPaymentServerSide,
} from "@/services/orders/order-service";
import { formatMoney } from "@/lib/money";
import { formatEventDateTimeFull } from "@/lib/timezone";

export const metadata: Metadata = {
  title: "Booking Confirmation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { ref?: string; token?: string };
}) {
  const ref = searchParams.ref || "";
  const token = searchParams.token || "";
  const user = await getCurrentUser();

  if (!ref) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <p className="text-lg font-bold text-[#F8FAFC]">
          Missing booking reference.
        </p>
        <Link href="/matches" className="t254-btn-primary">
          Explore Matches
        </Link>
      </div>
    );
  }

  const allowed = await verifyOrderOwnershipOrToken({
    bookingReference: ref,
    currentUserId: user?.id ?? null,
    currentUserRole: user?.role ?? null,
    accessToken: token || null,
  });

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <XCircle className="mx-auto h-10 w-10 text-rose-400" />
        <h1 className="text-xl font-bold text-[#F8FAFC]">
          Booking Access Restricted
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Please sign in with the customer account that placed this booking or
          use your secure booking link.
        </p>
        <Link href="/login" className="t254-btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  // CRITICAL: Server-side payment verification (NEVER trust browser redirect alone!)
  await verifyOrderPaymentServerSide(ref).catch(() => null);

  const order = await prisma.order.findUnique({
    where: { bookingReference: ref },
    include: {
      event: { include: { venue: true } },
      tickets: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-base font-bold text-[#F8FAFC]">Booking not found.</p>
      </div>
    );
  }

  const isConfirmed =
    order.status === "TICKETS_ISSUED" || order.status === "PAID";
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 space-y-6">
      {order.isSimulated && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            <strong>Simulated Sandbox Transaction:</strong> This booking was
            completed using the non-production simulator or on a demonstration
            event. No real money was charged.
          </span>
        </div>
      )}

      <div className="t254-card p-8 space-y-6">
        <div className="flex items-start gap-4">
          {isConfirmed ? (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#35D399]/15 text-[#35D399] shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </span>
          ) : (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 shrink-0">
              <Clock className="h-7 w-7" />
            </span>
          )}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
              {isConfirmed ? "Step 5 • Confirmed" : "Awaiting Provider Confirmation"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
              {isConfirmed
                ? "Your Match Tickets Are Ready!"
                : "Verifying Your Payment..."}
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Booking Reference:{" "}
              <strong className="font-mono text-[#F8FAFC]">
                {order.bookingReference}
              </strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-[#293548] bg-[#0B1020] p-5 text-xs">
          <div>
            <span className="text-[#94A3B8]">Match Event</span>
            <p className="font-bold text-[#F8FAFC] text-sm mt-0.5">
              {order.event.title}
            </p>
            <p className="text-[#94A3B8] mt-0.5">
              {formatEventDateTimeFull(
                order.event.kickoffAt,
                order.event.timezone
              )}
            </p>
            <p className="text-[#94A3B8]">
              {order.event.venue.name}, {order.event.venue.city}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Ticket Quantity:</span>
              <span className="font-bold text-[#F8FAFC]">
                {order.tickets.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Total Paid:</span>
              <span className="font-bold text-[#35D399]">
                {formatMoney(order.totalMinor, order.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Payment Status:</span>
              <span className="font-bold text-[#F8FAFC]">
                {order.payments[0]?.status || order.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Ticket Delivery Status:</span>
              <span className="font-bold text-[#35D399]">
                {order.tickets.length > 0
                  ? `Issued & Emailed (${order.customerEmail})`
                  : "Pending Payment Verification"}
              </span>
            </div>
          </div>
        </div>

        {order.tickets.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#F8FAFC]">
              Download Digital PDF Tickets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {order.tickets.map((t) => (
                <a
                  key={t.id}
                  href={`/api/tickets/${t.id}/pdf${tokenParam}`}
                  className="flex items-center justify-between rounded-xl border border-[#293548] bg-[#111827] px-4 py-3 text-xs hover:border-[#35D399] transition"
                >
                  <div>
                    <p className="font-mono font-bold text-[#F8FAFC]">
                      {t.ticketNumber}
                    </p>
                    <p className="text-[#94A3B8]">{t.seatSection}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#35D399]">
                    <Download className="h-4 w-4" />
                    PDF
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`/booking/${encodeURIComponent(order.bookingReference)}${tokenParam}`}
            className="t254-btn-primary"
          >
            View Booking & QR Codes
            <ExternalLink className="h-4 w-4" />
          </Link>
          {order.tickets[0] && (
            <a
              href={`/api/tickets/${order.tickets[0].id}/pdf${tokenParam}`}
              className="t254-btn-secondary"
            >
              <Download className="h-4 w-4" />
              Download Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
