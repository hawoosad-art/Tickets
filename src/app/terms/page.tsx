import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-[#F8FAFC]">
        Terms of Service
      </h1>
      <div className="t254-card p-7 space-y-5 text-sm text-[#94A3B8] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            1. Platform Role & Organiser Authority
          </h2>
          <p>
            Ticket254 facilitates digital ticket sales for authorised football
            event organisers. Event schedules, stadium entry rules, purchase
            limits, and refund eligibility windows are set by the respective
            match organiser and displayed on each event page prior to checkout.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            2. Reservations, Pricing & Payment Verification
          </h2>
          <p>
            Selecting tickets initiates a time-limited inventory reservation.
            All prices, applicable taxes, and booking fees are calculated
            server-side in explicit currencies. A browser redirect does not
            constitute proof of payment; tickets are issued solely upon verified
            confirmation from the payment provider.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            3. Digital Ticket Usage & Anti-Duplication
          </h2>
          <p>
            Each digital ticket contains a unique cryptographically signed QR
            token valid for a single admission to the specified match and gate
            category. Sharing or duplicating QR codes will result in subsequent
            scans being automatically rejected at the turnstile.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            4. Account Security & Acceptable Conduct
          </h2>
          <p>
            Automated scraping, scalping beyond stated per-customer purchase
            limits, or tampering with QR tokens or checkout endpoints may result
            in immediate account suspension and ticket invalidation.
          </p>
        </section>
      </div>
    </div>
  );
}
