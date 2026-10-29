import { prisma } from "@/lib/db";
import { computeAvailableStock } from "@/services/inventory/inventory-service";
import { MatchCardData } from "@/components/matches/MatchCard";

export async function getPublishedMatchCards(): Promise<{
  cards: MatchCardData[];
  cities: string[];
  competitions: string[];
}> {
  const events = await prisma.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "POSTPONED"] },
    },
    orderBy: { kickoffAt: "asc" },
    include: {
      venue: true,
      ticketTypes: {
        where: { isActive: true },
        include: { allocation: true },
        orderBy: { priceMinor: "asc" },
      },
    },
  });

  const citySet = new Set<string>();
  const compSet = new Set<string>();

  const cards: MatchCardData[] = events.map((ev) => {
    citySet.add(ev.venue.city);
    compSet.add(ev.competition);

    let startingPriceMinor: number | null = null;
    let totalAvailable = 0;

    for (const tt of ev.ticketTypes) {
      if (startingPriceMinor === null || tt.priceMinor < startingPriceMinor) {
        startingPriceMinor = tt.priceMinor;
      }
      if (tt.allocation) {
        totalAvailable += computeAvailableStock(tt.allocation);
      }
    }

    return {
      id: ev.id,
      slug: ev.slug,
      title: ev.title,
      competition: ev.competition,
      homeTeam: ev.homeTeam,
      awayTeam: ev.awayTeam,
      homeTeamShort: ev.homeTeamShort,
      awayTeamShort: ev.awayTeamShort,
      homeBadgeColor: ev.homeBadgeColor,
      awayBadgeColor: ev.awayBadgeColor,
      kickoffAtIso: ev.kickoffAt.toISOString(),
      timezone: ev.timezone,
      venueName: ev.venue.name,
      city: ev.venue.city,
      country: ev.venue.country,
      currency: ev.currency,
      startingPriceMinor,
      totalAvailable,
      isSampleData: ev.isSampleData,
      status: ev.status,
    };
  });

  return {
    cards,
    cities: Array.from(citySet).sort(),
    competitions: Array.from(compSet).sort(),
  };
}
