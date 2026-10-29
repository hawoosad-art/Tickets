import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSettingsForm } from "@/components/tickets/ProfileSettingsForm";

export const metadata: Metadata = {
  title: "Profile Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnUrl=/account/profile");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
            Account Preferences
          </span>
          <h1 className="text-3xl font-extrabold text-[#F8FAFC] mt-1">
            Profile & Security
          </h1>
        </div>
        <Link href="/account" className="t254-btn-secondary text-xs">
          ← Account Overview
        </Link>
      </div>

      <ProfileSettingsForm
        initial={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || "",
          countryCode: user.countryCode,
          preferredCurrency: user.preferredCurrency,
        }}
      />
    </div>
  );
}
