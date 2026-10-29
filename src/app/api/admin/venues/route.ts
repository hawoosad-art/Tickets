import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { adminVenueSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireUserPermission("events:write");
    const body = await req.json();
    const parsed = adminVenueSchema.parse(body);

    const venue = await prisma.venue.create({
      data: {
        name: parsed.name,
        slug: parsed.slug,
        city: parsed.city,
        country: parsed.country,
        countryCode: parsed.countryCode.toUpperCase(),
        address: parsed.address || null,
        timezone: parsed.timezone,
        capacity: parsed.capacity,
        description: parsed.description || null,
        entryGuidelines: parsed.entryGuidelines || null,
        gatesInfo: parsed.gatesInfo || null,
      },
    });

    await recordAuditLog({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "VENUE_CREATED",
      entityType: "Venue",
      entityId: venue.id,
      metadata: { name: venue.name, city: venue.city },
    });

    return NextResponse.json({ venue });
  } catch (err) {
    return handleApiError(err);
  }
}
