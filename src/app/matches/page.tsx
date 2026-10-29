import React from "react";
import type { Metadata } from "next";
import { getPublishedMatchCards } from "@/services/events/event-queries";
import { MatchDiscoveryClient } from "@/components/matches/MatchDiscoveryClient";

export const metadata: Metadata = {
  title: "Browse Football Matches",
  description:
    "Search and filter upcoming football matches in Kenya and internationally on Ticket254.",
  alternates: { canonical: "/matches" },
};

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const { cards, cities, competitions } = await getPublishedMatchCards();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
          Fixture Directory
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC]">
          Explore Football Matches
        </h1>
        <p className="text-sm text-[#94A3B8] max-w-2xl">
          Filter by club, competition, city, or kick-off date. All event times
          are displayed in the stadium&apos;s local timezone.
        </p>
      </div>

      <MatchDiscoveryClient
        matches={cards}
        cities={cities}
        competitions={competitions}
      />
    </div>
  );
}
