import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { formatEventDateTimeFull } from "@/lib/timezone";
import { RefundRequestButton } from "@/components/tickets/RefundRequestButton";

export const metadata: Metadata = {
  title: "My Bookings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountBookingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnUrl=/account/bookings");
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      event: { include: { venue: true } },
      items: true,
      tickets: true,
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
            Order History
          </span>
          <h1 className="text-3xl font-extrabold text-[#F8FAFC] mt-1">
            My Match Bookings
          </h1>
        </div>
        <Link href="/account" className="t254-btn-secondary text-xs">
          ← Account Overview
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="t254-card p-10 text-center space-y-3">
          <p className="text-sm text-[#94A3B8]">
            You have not placed any match bookings yet.
          </p>
          <Link href="/matches" className="t254-btn-primary">
            Browse Matches
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((o) => {
            const canRequestRefund =
              ["PAID", "TICKETS_ISSUED", "PARTIALLY_REFUNDED"].includes(
                o.status
              ) &&
              o.refunds.every((r) =>
                ["REJECTED", "SUCCEEDED", "FAILED"].includes(r.status)
              ) &&
              o.refundedMinor < o.totalMinor;

            return (
              <div key={o.id} className="t254-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#293548] pb-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#60A5FA]">
                      {o.bookingReference}
                    </span>
                    <h2 className="text-lg font-extrabold text-[#F8FAFC]">
                      {o.event.title}
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                      {formatEventDateTimeFull(
                        o.event.kickoffAt,
                        o.event.timezone
                      )}{" "}
                      • {o.event.venue.name}
                    </p>
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <span className="inline-block rounded-full bg-[#35D399]/15 px-3 py-0.5 text-xs font-bold text-[#35D399]">
                      {o.status}
                    </span>
                    <p className="text-base font-extrabold text-[#F8FAFC]">
                      {formatMoney(o.totalMinor, o.currency)}
                    </p>
                    {o.refundedMinor > 0 && (
                      <p className="text-xs text-amber-300">
                        Refunded: {formatMoney(o.refundedMinor, o.currency)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[#94A3B8]">
                    {o.items
                      .map((it) => `${it.quantity}× ${it.ticketTypeName}`)
                      .join(", ")}{" "}
                    • {o.tickets.length} ticket(s) issued
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/booking/${o.bookingReference}`}
                      className="t254-btn-primary text-xs py-1.5 px-3.5"
                    >
                      View Booking & QR Tickets
                    </Link>
                  </div>
                </div>

                {o.refunds.length > 0 && (
                  <div className="rounded-xl bg-[#111827] border border-[#293548] p-3 text-xs space-y-1">
                    {o.refunds.map((r) => (
                      <p key={r.id} className="text-[#94A3B8]">
                        Refund{" "}
                        <strong className="font-mono text-[#F8FAFC]">
                          {r.refundReference}
                        </strong>
                        : {formatMoney(r.amountMinor, r.currency)} —{" "}
                        <strong className="text-[#60A5FA]">{r.status}</strong>
                      </p>
                    ))}
                  </div>
                )}

                {canRequestRefund && <RefundRequestButton orderId={o.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
