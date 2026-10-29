import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Info,
  LifeBuoy,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { computeAvailableStock } from "@/services/inventory/inventory-service";
import { formatEventDate, formatEventTime } from "@/lib/timezone";
import { TeamCrest } from "@/components/ui/TeamCrest";
import { TicketSelectorClient } from "@/components/matches/TicketSelectorClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: { venue: true },
  });
  if (!event) {
    return { title: "Match Not Found" };
  }
  return {
    title: `${event.homeTeam} vs ${event.awayTeam} Tickets`,
    description: `${event.competition} at ${event.venue.name}, ${event.venue.city}. Book verified digital tickets on Ticket254.`,
    alternates: { canonical: `/matches/${event.slug}` },
    openGraph: {
      title: `${event.homeTeam} vs ${event.awayTeam} | Ticket254`,
      description: event.description,
    },
  };
}

export default async function MatchDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      venue: true,
      policy: true,
      ticketTypes: {
        where: { isActive: true },
        include: { allocation: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!event || event.status === "DRAFT") {
    notFound();
  }

  const categories = event.ticketTypes.map((tt) => ({
    id: tt.id,
    name: tt.name,
    code: tt.code,
    categoryTier: tt.categoryTier,
    description: tt.description,
    sectionInfo: tt.sectionInfo,
    seated: tt.seated,
    priceMinor: tt.priceMinor,
    currency: tt.currency,
    minPerOrder: tt.minPerOrder,
    maxPerOrder: tt.maxPerOrder,
    availableCount: tt.allocation ? computeAvailableStock(tt.allocation) : 0,
  }));

  const isPurchasable =
    event.status === "PUBLISHED" &&
    event.organiserAuthorised &&
    event.kickoffAt.getTime() > Date.now();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.title,
    description: event.description,
    startDate: event.kickoffAt.toISOString(),
    eventStatus:
      event.status === "CANCELLED"
        ? "https://schema.org/EventCancelled"
        : event.status === "POSTPONED"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    location: {
      "@type": "StadiumOrArena",
      name: event.venue.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.venue.city,
        addressCountry: event.venue.countryCode,
      },
    },
    homeTeam: { "@type": "SportsTeam", name: event.homeTeam },
    awayTeam: { "@type": "SportsTeam", name: event.awayTeam },
    organizer: { "@type": "Organization", name: event.organiserName },
  };

  return (
    <div className="pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* EVENT BANNER */}
      <section className="border-b border-[#293548] bg-gradient-to-b from-[#161E2E] to-[#0B1020] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {event.isSampleData && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Development Sample Event:</strong>{" "}
                {event.sampleDataNotice ||
                  "This fixture uses demonstration inventory and pricing for platform walkthroughs."}
              </span>
            </div>
          )}

          {event.officialStatusNotice && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#60A5FA]/50 bg-[#60A5FA]/10 px-4 py-3 text-xs text-[#F8FAFC]">
              <Info className="h-4 w-4 shrink-0 text-[#60A5FA] mt-0.5" />
              <span>
                <strong>Official Match Notice ({event.status}):</strong>{" "}
                {event.officialStatusNotice}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#60A5FA]">
            <span>{event.competition}</span>
            <span>•</span>
            <span className="text-[#94A3B8]">
              Organiser: {event.organiserName}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-2">
            <div className="flex items-center gap-5 sm:gap-8">
              <div className="flex flex-col items-center gap-2 text-center">
                <TeamCrest
                  shortCode={event.homeTeamShort}
                  accentColor={event.homeBadgeColor}
                  size="lg"
                />
                <span className="text-sm sm:text-lg font-extrabold text-[#F8FAFC]">
                  {event.homeTeam}
                </span>
              </div>

              <span className="rounded-xl border border-[#293548] bg-[#0B1020] px-3.5 py-2 text-xs font-extrabold text-[#94A3B8]">
                VS
              </span>

              <div className="flex flex-col items-center gap-2 text-center">
                <TeamCrest
                  shortCode={event.awayTeamShort}
                  accentColor={event.awayBadgeColor}
                  size="lg"
                />
                <span className="text-sm sm:text-lg font-extrabold text-[#F8FAFC]">
                  {event.awayTeam}
                </span>
              </div>
            </div>

            <div className="t254-card bg-[#0B1020]/80 p-5 space-y-2 text-xs text-[#94A3B8] min-w-[280px]">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold">
                <Calendar className="h-4 w-4 text-[#35D399]" />
                <span>{formatEventDate(event.kickoffAt, event.timezone)}</span>
              </div>
              <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold">
                <Clock className="h-4 w-4 text-[#60A5FA]" />
                <span>
                  Kick-off: {formatEventTime(event.kickoffAt, event.timezone)} (
                  {event.timezone})
                </span>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="h-4 w-4 text-[#35D399] shrink-0 mt-0.5" />
                <span>
                  {event.venue.name}
                  <br />
                  {event.venue.city}, {event.venue.country}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT + TICKET CATEGORIES */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-[#F8FAFC]">
              Available Ticket Categories
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Select quantities from live organiser-authorised inventory. Prices
              are billed in {event.currency}.
            </p>
          </div>

          <TicketSelectorClient
            eventId={event.id}
            eventSlug={event.slug}
            eventTitle={event.title}
            currency={event.currency}
            maxTicketsPerCustomer={event.policy?.maxTicketsPerCustomer ?? 8}
            isPurchasable={isPurchasable}
            categories={categories}
          />
        </div>

        <aside className="lg:col-span-5 space-y-5">
          <div className="t254-card p-6 space-y-3">
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Match Overview
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {event.description}
            </p>
          </div>

          <div className="t254-card p-6 space-y-3">
            <h3 className="text-base font-bold text-[#F8FAFC]">
              Venue & Entry Instructions
            </h3>
            <p className="text-xs text-[#F8FAFC] font-semibold">
              {event.venue.name} ({event.venue.city}, {event.venue.country})
            </p>
            {event.venue.gatesInfo && (
              <p className="text-xs text-[#60A5FA]">{event.venue.gatesInfo}</p>
            )}
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {event.entryInstructions}
            </p>
            {event.venue.entryGuidelines && (
              <p className="text-xs text-[#94A3B8] leading-relaxed border-t border-[#293548] pt-2">
                {event.venue.entryGuidelines}
              </p>
            )}
          </div>

          <div className="t254-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#35D399]" />
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Purchase Restrictions & Refund Policy
              </h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              <strong>Purchase Limits:</strong>{" "}
              {event.purchaseRestrictions ||
                `Up to ${event.policy?.maxTicketsPerCustomer ?? 8} tickets per customer.`}
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              <strong>Refund Policy:</strong>{" "}
              {event.policy?.refundPolicyText ||
                "Subject to event refund policy; see /refund-policy for full terms."}
            </p>
            {event.policy?.postponementPolicyText && (
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                <strong>Postponement Policy:</strong>{" "}
                {event.policy.postponementPolicyText}
              </p>
            )}
          </div>

          <div className="t254-card p-6 space-y-3 bg-[#111827]">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-[#60A5FA]" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Need Assistance Before Booking?
              </h3>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Contact Ticket254 Customer Support for group accessibility seating
              or booking assistance.
            </p>
            <Link
              href="/contact"
              className="inline-block text-xs font-semibold text-[#35D399] hover:underline"
            >
              Contact Support Desk →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
