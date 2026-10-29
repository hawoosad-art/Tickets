"use client";

import React, { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { MatchCard, MatchCardData } from "@/components/matches/MatchCard";

export function MatchDiscoveryClient({
  matches,
  cities,
  competitions,
}: {
  matches: MatchCardData[];
  cities: string[];
  competitions: string[];
}) {
  const [teamQuery, setTeamQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [competitionFilter, setCompetitionFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"DATE_ASC" | "PRICE_ASC" | "PRICE_DESC">(
    "DATE_ASC"
  );

  const filtered = useMemo(() => {
    return matches
      .filter((m) => {
        if (teamQuery.trim()) {
          const q = teamQuery.toLowerCase();
          const teamHit =
            m.homeTeam.toLowerCase().includes(q) ||
            m.awayTeam.toLowerCase().includes(q) ||
            m.homeTeamShort.toLowerCase().includes(q) ||
            m.awayTeamShort.toLowerCase().includes(q);
          if (!teamHit) return false;
        }
        if (eventQuery.trim()) {
          const q = eventQuery.toLowerCase();
          const eventHit =
            m.title.toLowerCase().includes(q) ||
            m.venueName.toLowerCase().includes(q) ||
            m.competition.toLowerCase().includes(q);
          if (!eventHit) return false;
        }
        if (dateFilter) {
          const matchDay = m.kickoffAtIso.slice(0, 10);
          if (matchDay !== dateFilter) return false;
        }
        if (cityFilter !== "ALL" && m.city !== cityFilter) {
          return false;
        }
        if (
          competitionFilter !== "ALL" &&
          m.competition !== competitionFilter
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "DATE_ASC") {
          return (
            new Date(a.kickoffAtIso).getTime() -
            new Date(b.kickoffAtIso).getTime()
          );
        }
        const pa = a.startingPriceMinor ?? Number.MAX_SAFE_INTEGER;
        const pb = b.startingPriceMinor ?? Number.MAX_SAFE_INTEGER;
        return sortBy === "PRICE_ASC" ? pa - pb : pb - pa;
      });
  }, [
    matches,
    teamQuery,
    eventQuery,
    dateFilter,
    cityFilter,
    competitionFilter,
    sortBy,
  ]);

  return (
    <div className="space-y-6">
      <div className="t254-card p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={teamQuery}
              onChange={(e) => setTeamQuery(e.target.value)}
              placeholder="Search by team..."
              aria-label="Search by team"
              className="t254-input pl-10"
            />
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={eventQuery}
              onChange={(e) => setEventQuery(e.target.value)}
              placeholder="Search event or venue..."
              aria-label="Search by event"
              className="t254-input pl-10"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by match date"
              className="t254-input"
            />
          </div>

          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              aria-label="Filter by city"
              className="t254-input"
            >
              <option value="ALL">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
              aria-label="Filter by competition"
              className="t254-input"
            >
              <option value="ALL">All Competitions</option>
              {competitions.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "DATE_ASC" | "PRICE_ASC" | "PRICE_DESC"
                )
              }
              aria-label="Sort matches"
              className="t254-input"
            >
              <option value="DATE_ASC">Sort: Kick-Off Date</option>
              <option value="PRICE_ASC">Sort: Lowest Price</option>
              <option value="PRICE_DESC">Sort: Highest Price</option>
            </select>
          </div>
        </div>

        {(teamQuery ||
          eventQuery ||
          dateFilter ||
          cityFilter !== "ALL" ||
          competitionFilter !== "ALL") && (
          <div className="mt-3 flex items-center justify-between border-t border-[#293548] pt-3 text-xs text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#35D399]" />
              Showing {filtered.length} of {matches.length} published fixtures
            </span>
            <button
              type="button"
              onClick={() => {
                setTeamQuery("");
                setEventQuery("");
                setDateFilter("");
                setCityFilter("ALL");
                setCompetitionFilter("ALL");
              }}
              className="font-semibold text-[#35D399] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="t254-card p-12 text-center">
          <p className="text-base font-semibold text-[#F8FAFC]">
            No matches match your current search filters.
          </p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Try clearing a date, city, or competition filter to view all
            upcoming fixtures.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
