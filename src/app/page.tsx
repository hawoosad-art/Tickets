import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  HelpCircle,
  Lock,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { getPublishedMatchCards } from "@/services/events/event-queries";
import { MatchDiscoveryClient } from "@/components/matches/MatchDiscoveryClient";
import { TeamCrest } from "@/components/ui/TeamCrest";
import { PriceText } from "@/components/matches/PriceText";
import { formatEventDate, formatEventTime } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { cards, cities, competitions } = await getPublishedMatchCards();
  const featured =
    cards.find((c) => c.totalAvailable > 0) || cards[0] || null;

  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[#293548] bg-gradient-to-b from-[#111827] via-[#0B1020] to-[#0B1020] pt-14 pb-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(53,211,153,0.18), transparent 45%), radial-gradient(circle at 80% 10%, rgba(96,165,250,0.16), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#35D399]/30 bg-[#35D399]/10 px-3.5 py-1.5 text-xs font-semibold text-[#35D399]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Kenyan & International Football Ticketing</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-[#F8FAFC] sm:text-5xl lg:text-6xl leading-[1.08]">
                Be There for Every Moment.
              </h1>

              <p className="max-w-2xl text-lg text-[#94A3B8] leading-relaxed">
                Discover football events, book your tickets securely, and get
                ready for match day.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/matches"
                  className="t254-btn-primary px-7 py-3.5 text-base"
                >
                  Explore Matches
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="t254-btn-secondary px-7 py-3.5 text-base"
                >
                  How It Works
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#293548]/80 max-w-xl">
                <div>
                  <p className="text-sm font-bold text-[#F8FAFC]">
                    Atomic Stock
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Zero overselling holds
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#F8FAFC]">
                    Verified Webhooks
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Server-verified checkout
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#F8FAFC]">
                    Signed QR PDF
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Zero PII inside QR codes
                  </p>
                </div>
              </div>
            </div>

            {/* FEATURED MATCH SHOWCASE */}
            <div className="lg:col-span-5">
              {featured ? (
                <div className="t254-card border-[#35D399]/40 bg-gradient-to-br from-[#161E2E] to-[#111827] p-6 sm:p-7 shadow-2xl shadow-black/40 space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#35D399]">
                      <Ticket className="h-3.5 w-3.5" />
                      Featured Match
                    </span>
                    {featured.isSampleData && (
                      <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        Sample Demo Event
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#60A5FA]">
                      {featured.competition}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="flex flex-col items-center text-center gap-2 flex-1">
                        <TeamCrest
                          shortCode={featured.homeTeamShort}
                          accentColor={featured.homeBadgeColor}
                          size="lg"
                        />
                        <span className="text-base font-bold text-[#F8FAFC]">
                          {featured.homeTeam}
                        </span>
                        <span className="text-[11px] uppercase text-[#94A3B8]">
                          Home
                        </span>
                      </div>

                      <div className="rounded-xl border border-[#293548] bg-[#0B1020] px-3 py-1.5 text-xs font-extrabold text-[#94A3B8]">
                        VS
                      </div>

                      <div className="flex flex-col items-center text-center gap-2 flex-1">
                        <TeamCrest
                          shortCode={featured.awayTeamShort}
                          accentColor={featured.awayBadgeColor}
                          size="lg"
                        />
                        <span className="text-base font-bold text-[#F8FAFC]">
                          {featured.awayTeam}
                        </span>
                        <span className="text-[11px] uppercase text-[#94A3B8]">
                          Away
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#293548] bg-[#0B1020]/70 p-4 space-y-2 text-xs text-[#94A3B8]">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#35D399]" />
                        {formatEventDate(
                          featured.kickoffAtIso,
                          featured.timezone
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[#F8FAFC] font-semibold">
                        <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                        Kick-off:{" "}
                        {formatEventTime(
                          featured.kickoffAtIso,
                          featured.timezone
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <MapPin className="h-3.5 w-3.5 text-[#35D399] shrink-0" />
                      <span>
                        {featured.venueName} • {featured.city}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-[#94A3B8]">
                        Starting Ticket Price
                      </span>
                      {featured.startingPriceMinor !== null ? (
                        <PriceText
                          amountMinor={featured.startingPriceMinor}
                          currency={featured.currency}
                          className="text-xl font-extrabold text-[#F8FAFC]"
                        />
                      ) : (
                        <span className="text-base font-bold text-[#94A3B8]">
                          TBA
                        </span>
                      )}
                      <span className="block text-[11px] text-[#35D399] mt-0.5">
                        {featured.totalAvailable > 0
                          ? `${featured.totalAvailable} authorised tickets available`
                          : "Currently Sold Out"}
                      </span>
                    </div>

                    <Link
                      href={`/matches/${featured.slug}`}
                      className="t254-btn-primary"
                    >
                      View Tickets
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="t254-card p-8 text-center">
                  <p className="text-sm text-[#94A3B8]">
                    No published fixtures yet. Authorised organisers can publish
                    events from the Admin Dashboard.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MATCH DISCOVERY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
              Upcoming Football Matches
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Search by club, competition, city, or match date. Sample
              demonstration fixtures are clearly badged.
            </p>
          </div>
          <Link
            href="/matches"
            className="text-sm font-semibold text-[#35D399] hover:underline inline-flex items-center gap-1"
          >
            View full match directory <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <MatchDiscoveryClient
          matches={cards}
          cities={cities}
          competitions={competitions}
        />
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-y border-[#293548] bg-[#111827] py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
              Simple 4-Step Matchday Access
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-[#F8FAFC]">
              How Ticket254 Works
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Choose your match",
                desc: "Browse published local and international football fixtures with verified kick-off times in the stadium's local timezone.",
                icon: Calendar,
              },
              {
                step: "02",
                title: "Select your tickets",
                desc: "Pick from live organiser-authorised categories (Standard, Premium, VIP, Hospitality) with instant atomic inventory hold.",
                icon: Ticket,
              },
              {
                step: "03",
                title: "Pay securely",
                desc: "Complete hosted PCI-safe payment via configured providers without Ticket254 ever storing card numbers or CVV codes.",
                icon: CreditCard,
              },
              {
                step: "04",
                title: "Receive your digital tickets",
                desc: "Download PDF match tickets and cryptographically signed QR codes immediately after server-verified payment.",
                icon: QrCode,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="t254-card p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#35D399]/15 text-[#35D399]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-extrabold text-[#60A5FA]">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#94A3B8]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRUST & SECURITY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="t254-card p-6 space-y-3">
            <ShieldCheck className="h-7 w-7 text-[#35D399]" />
            <h3 className="text-lg font-bold text-[#F8FAFC]">
              Authorised Inventory Controls
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Ticket availability reflects live database allocations or external
              organiser feeds. Atomic reservations prevent overselling and
              automatically release abandoned holds.
            </p>
          </div>
          <div className="t254-card p-6 space-y-3">
            <Lock className="h-7 w-7 text-[#60A5FA]" />
            <h3 className="text-lg font-bold text-[#F8FAFC]">
              Server-Verified Payments
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Order totals are calculated exclusively server-side in integer
              minor units. Browser redirects never trigger ticket issuance
              without authenticated provider API or signed webhook verification.
            </p>
          </div>
          <div className="t254-card p-6 space-y-3">
            <CheckCircle2 className="h-7 w-7 text-[#35D399]" />
            <h3 className="text-lg font-bold text-[#F8FAFC]">
              Privacy-Preserving QR Entry
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Every digital ticket uses an opaque HMAC-SHA256 signed QR token
              containing zero personal customer information, validated
              atomically at venue gates.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ & CUSTOMER SUPPORT */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-2xl font-extrabold text-[#F8FAFC]">
              Frequently Asked Questions
            </h2>
            {[
              {
                q: "When do I receive my digital football tickets?",
                a: "Tickets are generated immediately once your payment is verified server-side via the payment provider API or signed webhook. You can download PDF tickets right away and access them from your account or booking link.",
              },
              {
                q: "What payment methods are supported?",
                a: "Checkout displays only payment providers actively enabled for the merchant setup — including PayPal & International Cards (Visa/Mastercard) and Paystack (M-Pesa STK Push & Cards) when live credentials are configured.",
              },
              {
                q: "Does my QR code expose my name, phone, or email?",
                a: "No. Ticket254 encodes only a random, cryptographically signed opaque reference inside the QR code. Personal details are never stored inside the QR payload.",
              },
              {
                q: "What happens if a match is postponed or cancelled?",
                a: "Affected ticket holders are notified automatically by email with official organiser instructions, and eligible refunds are processed directly back to the original payment method.",
              },
            ].map((faq) => (
              <div key={faq.q} className="t254-card p-5 space-y-1.5">
                <h3 className="text-sm font-bold text-[#F8FAFC]">{faq.q}</h3>
                <p className="text-xs leading-relaxed text-[#94A3B8]">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5">
            <div className="t254-card p-7 bg-gradient-to-b from-[#161E2E] to-[#111827] space-y-4 h-full flex flex-col justify-between">
              <div className="space-y-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#60A5FA]/15 text-[#60A5FA]">
                  <HelpCircle className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-extrabold text-[#F8FAFC]">
                  Dedicated Matchday Customer Support
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Need help retrieving a booking, resending digital tickets, or
                  submitting a policy-eligible refund request? Our support desk
                  tracks every ticket inquiry end-to-end.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <Link href="/contact" className="t254-btn-primary">
                  Contact Support
                </Link>
                <Link href="/help" className="t254-btn-secondary">
                  Visit Help Centre
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
