import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Checkout Cancelled",
  robots: { index: false, follow: false },
};

export default function CheckoutCancelledPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <div className="t254-card p-8 text-center space-y-4">
        <XCircle className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Payment Was Cancelled
        </h1>
        <p className="text-sm text-[#94A3B8]">
          {searchParams.ref
            ? `Booking ${searchParams.ref} was not charged, and any temporary ticket hold has been released.`
            : "Your checkout was cancelled before payment completed. No payment was taken."}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-3">
          <Link href="/matches" className="t254-btn-primary">
            Return to Matches
          </Link>
          <Link href="/help" className="t254-btn-secondary">
            Need Help?
          </Link>
        </div>
      </div>
    </div>
  );
}
