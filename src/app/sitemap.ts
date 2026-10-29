import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ticket254.co.ke";

  const staticRoutes = [
    "",
    "/matches",
    "/help",
    "/contact",
    "/about",
    "/terms",
    "/privacy",
    "/refund-policy",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const publishedEvents = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });

    const eventRoutes = publishedEvents.map((ev) => ({
      url: `${baseUrl}/matches/${ev.slug}`,
      lastModified: ev.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    }));

    return [...staticRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
