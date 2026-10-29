import React from "react";
import type { Metadata } from "next";
import { Globe, QrCode, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "About Ticket254",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 space-y-8">
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
          Platform Overview
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC]">
          About Ticket254
        </h1>
        <p className="text-base text-[#94A3B8] leading-relaxed">
          Ticket254 is a football ticketing platform engineered in Nairobi to
          serve match-goers across Kenya, East Africa, and international venues
          with verifiable inventory, server-validated payments, and instant
          cryptographic QR passes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="t254-card p-6 space-y-2">
          <Globe className="h-6 w-6 text-[#60A5FA]" />
          <h2 className="text-base font-bold text-[#F8FAFC]">
            Local & International Ready
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Built with multi-currency integer minor-unit ledgers and venue-local
            timezone scheduling for seamless domestic and cross-border fixtures.
          </p>
        </div>
        <div className="t254-card p-6 space-y-2">
          <ShieldCheck className="h-6 w-6 text-[#35D399]" />
          <h2 className="text-base font-bold text-[#F8FAFC]">
            Organiser-Authorised Only
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Ticket254 never invents ticket allocations. Inventory is governed
            directly by authorised event administrators or external organiser
            APIs.
          </p>
        </div>
        <div className="t254-card p-6 space-y-2">
          <QrCode className="h-6 w-6 text-[#35D399]" />
          <h2 className="text-base font-bold text-[#F8FAFC]">
            Turnstile Integrity
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Atomic PostgreSQL validation rejects simultaneous duplicate gate
            scans while keeping personal data completely out of QR barcodes.
          </p>
        </div>
      </div>

      <div className="t254-card p-6 text-xs text-[#94A3B8] leading-relaxed">
        <strong className="text-[#F8FAFC]">Affiliation Disclosure:</strong>{" "}
        Ticket254 operates strictly as an independent ticketing technology
        platform. Ticket254 does not claim official affiliation with any
        football club, national federation, or stadium unless explicitly
        authorised in writing for a specific published event.
      </div>
    </div>
  );
}
