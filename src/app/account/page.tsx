import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Calendar, QrCode, Settings, Ticket, UserCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnUrl=/account");
  }

  const [orders, validTicketsCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { event: true, tickets: true },
    }),
    prisma.ticket.count({
      where: { userId: user.id, status: "VALID" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
            Customer Portal • {user.role}
          </span>
          <h1 className="text-3xl font-extrabold text-[#F8FAFC] mt-1">
            Welcome back, {user.firstName}
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            {user.email} •{" "}
            {user.emailVerifiedAt
              ? "Verified Email"
              : "Email Verification Pending"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/account/bookings" className="t254-btn-secondary text-xs">
            <Calendar className="h-4 w-4" />
            All Bookings
          </Link>
          <Link href="/tickets" className="t254-btn-secondary text-xs">
            <QrCode className="h-4 w-4" />
            Digital Tickets ({validTicketsCount})
          </Link>
          <Link href="/account/profile" className="t254-btn-primary text-xs">
            <Settings className="h-4 w-4" />
            Profile Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="t254-card p-6 space-y-1">
          <Ticket className="h-5 w-5 text-[#35D399]" />
          <span className="text-xs text-[#94A3B8] block pt-2">
            Valid Match Tickets
          </span>
          <p className="text-2xl font-extrabold text-[#F8FAFC]">
            {validTicketsCount}
          </p>
        </div>
        <div className="t254-card p-6 space-y-1">
          <Calendar className="h-5 w-5 text-[#60A5FA]" />
          <span className="text-xs text-[#94A3B8] block pt-2">
            Recent Bookings
          </span>
          <p className="text-2xl font-extrabold text-[#F8FAFC]">
            {orders.length}
          </p>
        </div>
        <div className="t254-card p-6 space-y-1">
          <UserCheck className="h-5 w-5 text-[#35D399]" />
          <span className="text-xs text-[#94A3B8] block pt-2">
            Preferred Currency
          </span>
          <p className="text-2xl font-extrabold text-[#F8FAFC]">
            {user.preferredCurrency}
          </p>
        </div>
      </div>

      <div className="t254-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#F8FAFC]">
            Recent Bookings
          </h2>
          <Link
            href="/account/bookings"
            className="text-xs font-semibold text-[#35D399] hover:underline"
          >
            Manage Bookings & Refunds →
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-[#94A3B8] py-6 text-center">
            No bookings placed yet.{" "}
            <Link href="/matches" className="text-[#35D399] underline">
              Explore matches
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-[#293548]">
            {orders.map((o) => (
              <div
                key={o.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-[#60A5FA]">
                    {o.bookingReference}
                  </span>
                  <p className="text-sm font-bold text-[#F8FAFC]">
                    {o.event.title}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-[#F8FAFC]">
                    {formatMoney(o.totalMinor, o.currency)}
                  </span>
                  <span className="rounded-full bg-[#111827] border border-[#293548] px-2.5 py-0.5 text-[10px] font-bold text-[#35D399]">
                    {o.status}
                  </span>
                  <Link
                    href={`/booking/${o.bookingReference}`}
                    className="t254-btn-secondary text-xs py-1.5 px-3"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
