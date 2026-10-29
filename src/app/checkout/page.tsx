import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutWizardClient } from "@/components/checkout/CheckoutWizardClient";

export const metadata: Metadata = {
  title: "Secure Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
          Encrypted Match Booking
        </span>
        <h1 className="text-3xl font-extrabold text-[#F8FAFC] mt-1">
          Complete Your Booking
        </h1>
      </div>

      <Suspense
        fallback={
          <div className="t254-card p-10 text-center text-sm text-[#94A3B8]">
            Loading secure checkout...
          </div>
        }
      >
        <CheckoutWizardClient
          prefillUser={
            user
              ? {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  phone: user.phone || "",
                  countryCode: user.countryCode,
                }
              : null
          }
        />
      </Suspense>
    </div>
  );
}
