import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-[#F8FAFC]">Privacy Policy</h1>
      <div className="t254-card p-7 space-y-5 text-sm text-[#94A3B8] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            1. Data Collected for Ticketing Fulfillment
          </h2>
          <p>
            Ticket254 collects customer name, email address, phone number (where
            required for M-Pesa or matchday notices), and country of residence
            solely to issue digital tickets, deliver event updates, prevent
            fraud, and fulfil statutory financial record-keeping in accordance
            with the Kenya Data Protection Act, 2019 and international privacy
            standards.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            2. Payment Card & Mobile Money Security
          </h2>
          <p>
            Ticket254 never collects or stores raw payment card numbers, CVV
            codes, or M-Pesa PINs. Payment credentials are handled directly by
            PCI-DSS compliant payment providers. We store only transaction
            references, settlement statuses, and minor-unit amounts required for
            reconciliation and refunds.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#F8FAFC]">
            3. Zero Personal Information in QR Codes
          </h2>
          <p>
            Digital ticket QR codes encode an opaque, HMAC-signed token
            reference rather than your name, email, or phone number, protecting
            your privacy if your ticket pass is photographed or inspected.
          </p>
        </section>
      </div>
    </div>
  );
}
