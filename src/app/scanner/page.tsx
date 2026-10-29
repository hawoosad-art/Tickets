import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser, hasRolePermission } from "@/lib/auth";
import { ScannerConsoleClient } from "@/components/scanner/ScannerConsoleClient";

export const metadata: Metadata = {
  title: "Turnstile QR Scanner",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnUrl=/scanner");
  }

  if (!hasRolePermission(user.role, "scanner:operate", user.permissions)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-400" />
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Scanner Staff Authorisation Required
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Your account ({user.role}) does not hold the{" "}
          <code>scanner:operate</code> permission required to validate stadium
          entry tickets.
        </p>
        <Link href="/" className="t254-btn-primary">
          Return Home
        </Link>
      </div>
    );
  }

  const events = await prisma.event.findMany({
    where: { status: { in: ["PUBLISHED", "POSTPONED"] } },
    orderBy: { kickoffAt: "asc" },
    select: { id: true, title: true, kickoffAt: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
          Stadium Access Control
        </span>
        <h1 className="text-3xl font-extrabold text-[#F8FAFC] mt-1">
          QR Turnstile Validation Scanner
        </h1>
      </div>

      <ScannerConsoleClient
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          kickoffIso: e.kickoffAt.toISOString(),
        }))}
        operatorName={`${user.firstName} ${user.lastName} (${user.role})`}
        isDevMode={process.env.NODE_ENV !== "production"}
      />
    </div>
  );
}
