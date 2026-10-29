import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { HelpCircle, Mail, QrCode, RotateCcw, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Help Centre & Matchday FAQs",
  description:
    "Answers to common questions about Ticket254 football bookings, payment verification, digital PDF tickets, QR entry, and refunds.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  const sections = [
    {
      icon: QrCode,
      title: "Digital Tickets & Stadium Entry",
      items: [
        {
          q: "How do I use my digital ticket at the stadium gate?",
          a: "Present the QR code from your PDF ticket or your Ticket254 Digital Wallet at the gate printed on your pass. Set your phone screen brightness to 100% before approaching the optical scanner.",
        },
        {
          q: "Can a screenshot of a QR code be shared with multiple people?",
          a: "No. Every QR code is validated atomically against our database at the turnstile. The first valid scan marks the ticket USED immediately; any duplicate scan is rejected with the timestamp of the original entry.",
        },
      ],
    },
    {
      icon: ShieldCheck,
      title: "Payments & Booking Verification",
      items: [
        {
          q: "Why does Ticket254 verify payments server-side before issuing tickets?",
          a: "To protect fans and event organisers against spoofed redirects and duplicate charges, tickets are issued only when an authenticated payment provider API or verified cryptographic webhook confirms settlement.",
        },
        {
          q: "Does Ticket254 store my credit/debit card details?",
          a: "Never. All card and mobile money authorisations take place on hosted PCI-DSS compliant payment pages. Raw card numbers and CVV values never pass through Ticket254 servers.",
        },
      ],
    },
    {
      icon: RotateCcw,
      title: "Refunds, Postponements & Cancellations",
      items: [
        {
          q: "How do I request a refund?",
          a: "Sign in to My Account → My Bookings and select 'Request Refund' on any eligible booking prior to the event's cutoff window. Approved refunds are returned to the original payment source and automatically invalidate associated QR codes.",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 space-y-10">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
          Support Knowledgebase
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC]">
          Ticket254 Help Centre
        </h1>
        <p className="text-sm text-[#94A3B8] max-w-2xl">
          Everything you need for booking match tickets, downloading digital QR
          passes, and preparing for kick-off.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <div key={sec.title} className="space-y-4">
              <h2 className="text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                <Icon className="h-5 w-5 text-[#35D399]" />
                {sec.title}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sec.items.map((item) => (
                  <div key={item.q} className="t254-card p-6 space-y-2">
                    <h3 className="text-sm font-bold text-[#F8FAFC]">
                      {item.q}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#94A3B8]">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="t254-card p-7 bg-[#111827] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-6 w-6 text-[#60A5FA] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Still need help with a booking?
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Open a tracked support request with your booking reference and our
              support agents will assist you.
            </p>
          </div>
        </div>
        <Link href="/contact" className="t254-btn-primary shrink-0">
          <Mail className="h-4 w-4" />
          Contact Support
        </Link>
      </div>
    </div>
  );
}
