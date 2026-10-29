import React from "react";
import Link from "next/link";
import { Mail, MapPin, ShieldCheck, Ticket } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#293548] bg-[#111827] text-[#94A3B8]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-extrabold text-[#F8FAFC]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#35D399]/15 border border-[#35D399]/40 text-[#35D399]">
                <Ticket className="h-4 w-4" />
              </span>
              <span>
                TICKET<span className="text-[#35D399]">254</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-[#94A3B8]">
              International & Kenyan football ticketing platform built for
              authorised match organisers, transparent inventory allocation, and
              tamper-evident QR stadium entry.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#35D399]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Hosted PCI-Safe Checkout • Signed QR Tokens</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] mb-3">
              Discover
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/matches" className="hover:text-[#35D399]">
                  Browse Football Matches
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#35D399]">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/tickets" className="hover:text-[#35D399]">
                  Digital Ticket Wallet
                </Link>
              </li>
              <li>
                <Link href="/scanner" className="hover:text-[#35D399]">
                  Staff Gate Scanner
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] mb-3">
              Support & Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="hover:text-[#35D399]">
                  Help Centre & FAQs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#35D399]">
                  Contact Customer Support
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#35D399]">
                  About Ticket254
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#35D399]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#35D399]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-[#35D399]">
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 text-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">
              Contact
            </h3>
            <p className="flex items-start gap-2 text-xs">
              <MapPin className="h-4 w-4 text-[#60A5FA] shrink-0 mt-0.5" />
              <span>Westlands Commercial Hub, Nairobi, Kenya</span>
            </p>
            <p className="flex items-center gap-2 text-xs">
              <Mail className="h-4 w-4 text-[#35D399] shrink-0" />
              <a
                href="mailto:support@ticket254.co.ke"
                className="hover:text-[#F8FAFC]"
              >
                support@ticket254.co.ke
              </a>
            </p>
            <p className="text-[11px] leading-relaxed text-[#94A3B8]/80 pt-2 border-t border-[#293548]">
              Independent Platform Notice: Ticket254 is not affiliated with any
              football club, federation, or venue unless explicitly stated on an
              authorised event listing.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-[#293548] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <p>© {new Date().getFullYear()} Ticket254. All rights reserved.</p>
          <p>UTC Ledger • Venue-Local Kick-Off Times • Minor-Unit Accounting</p>
        </div>
      </div>
    </footer>
  );
}
