import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Postponement Policy",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-[#F8FAFC]">
        Refund, Postponement & Cancellation Policy
      </h1>
      <div className="t254-card p-7 space-y-5 text-sm text-[#94A3B8] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            1. Standard Refund Eligibility
          </h2>
          <p>
            Each match event displays its specific organiser-approved refund
            cutoff window (typically 48 to 72 hours prior to kick-off). Tickets
            that have already been scanned/redeemed at a venue gate are not
            eligible for refund.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            2. Postponed or Rescheduled Matches
          </h2>
          <p>
            When an event is officially postponed by the organiser, Ticket254
            updates the event status, displays official instructions on the
            match page, and emails all affected ticket holders. Issued digital
            tickets remain valid for the rescheduled date unless a refund is
            requested under the organiser&apos;s rescheduling terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            3. Cancelled Matches & Ticket Invalidation
          </h2>
          <p>
            If a match is cancelled, affected customers receive official
            cancellation instructions and face-value refunds processed back to
            their original payment method. Once a full refund is completed,
            associated digital tickets are automatically marked INVALIDATED.
          </p>
        </section>
      </div>
    </div>
  );
}
