import React from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { TeamCrest } from "@/components/ui/TeamCrest";
import { PriceText } from "@/components/matches/PriceText";
import { formatEventDate, formatEventTime } from "@/lib/timezone";

export interface MatchCardData {
  id: string;
  slug: string;
  title: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeBadgeColor: string;
  awayBadgeColor: string;
  kickoffAtIso: string;
  timezone: string;
  venueName: string;
  city: string;
  country: string;
  currency: string;
  startingPriceMinor: number | null;
  totalAvailable: number;
  isSampleData: boolean;
  status: string;
}

export function MatchCard({ match }: { match: MatchCardData }) {
  const availabilityLabel =
    match.status !== "PUBLISHED"
      ? match.status
      : match.totalAvailable <= 0
        ? "Sold Out"
        : match.totalAvailable <= 40
          ? `Limited (${match.totalAvailable} left)`
          : "Tickets Available";

  const availabilityBadgeClass =
    match.status !== "PUBLISHED"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : match.totalAvailable <= 0
        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
        : match.totalAvailable <= 40
          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
          : "bg-[#35D399]/15 text-[#35D399] border-[#35D399]/30";

  return (
    <article className="t254-card flex flex-col justify-between overflow-hidden hover:border-[#35D399]/60 hover:shadow-lg hover:shadow-[#35D399]/5">
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#60A5FA]">
            {match.competition}
          </span>
          <div className="flex items-center gap-1.5">
            {match.isSampleData && (
              <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Sample Demo
              </span>
            )}
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${availabilityBadgeClass}`}
            >
              {availabilityLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex flex-1 flex-col items-center text-center gap-2">
            <TeamCrest
              shortCode={match.homeTeamShort}
              accentColor={match.homeBadgeColor}
            />
            <span className="text-sm font-bold text-[#F8FAFC] leading-tight">
              {match.homeTeam}
            </span>
          </div>

          <div className="flex flex-col items-center px-2">
            <span className="rounded-lg border border-[#293548] bg-[#0B1020] px-2.5 py-1 text-xs font-extrabold text-[#94A3B8]">
              VS
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center text-center gap-2">
            <TeamCrest
              shortCode={match.awayTeamShort}
              accentColor={match.awayBadgeColor}
            />
            <span className="text-sm font-bold text-[#F8FAFC] leading-tight">
              {match.awayTeam}
            </span>
          </div>
        </div>

        <div className="space-y-2 border-t border-[#293548] pt-4 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#35D399] shrink-0" />
            <span>{formatEventDate(match.kickoffAtIso, match.timezone)}</span>
            <Clock className="ml-2 h-3.5 w-3.5 text-[#60A5FA] shrink-0" />
            <span>{formatEventTime(match.kickoffAtIso, match.timezone)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-[#35D399] shrink-0" />
            <span className="truncate">
              {match.venueName} • {match.city}, {match.country}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#293548] bg-[#111827]/70 px-6 py-4">
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-[#94A3B8]">
            Starting From
          </span>
          {match.startingPriceMinor !== null ? (
            <PriceText
              amountMinor={match.startingPriceMinor}
              currency={match.currency}
              className="text-base font-extrabold text-[#F8FAFC]"
            />
          ) : (
            <span className="text-sm font-semibold text-[#94A3B8]">TBA</span>
          )}
        </div>

        <Link
          href={`/matches/${match.slug}`}
          className="t254-btn-primary text-xs px-4 py-2"
        >
          <Ticket className="h-3.5 w-3.5" />
          View Tickets
        </Link>
      </div>
    </article>
  );
}
