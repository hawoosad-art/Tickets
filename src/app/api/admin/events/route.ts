import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { adminEventSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireUserPermission("events:write");
    const body = await req.json();
    const parsed = adminEventSchema.parse(body);

    const created = await prisma.event.create({
      data: {
        title: parsed.title,
        slug: parsed.slug,
        competition: parsed.competition,
        homeTeam: parsed.homeTeam,
        awayTeam: parsed.awayTeam,
        homeTeamShort: parsed.homeTeamShort,
        awayTeamShort: parsed.awayTeamShort,
        homeBadgeColor: parsed.homeBadgeColor,
        awayBadgeColor: parsed.awayBadgeColor,
        description: parsed.description,
        venueId: parsed.venueId,
        kickoffAt: new Date(parsed.kickoffAt),
        gatesOpenAt: parsed.gatesOpenAt ? new Date(parsed.gatesOpenAt) : null,
        timezone: parsed.timezone,
        status: parsed.status,
        isFeatured: parsed.isFeatured,
        isSampleData: parsed.isSampleData,
        sampleDataNotice: parsed.sampleDataNotice || null,
        organiserName: parsed.organiserName,
        organiserAuthorised: parsed.organiserAuthorised,
        entryInstructions: parsed.entryInstructions,
        purchaseRestrictions: parsed.purchaseRestrictions || null,
        officialStatusNotice: parsed.officialStatusNotice || null,
        currency: parsed.currency,
        policy: {
          create: {
            refundable: parsed.refundable,
            refundCutoffHours: parsed.refundCutoffHours,
            refundPolicyText: parsed.refundPolicyText,
            postponementPolicyText: parsed.postponementPolicyText,
            maxTicketsPerCustomer: parsed.maxTicketsPerCustomer,
            bookingFeeBps: parsed.bookingFeeBps,
            bookingFeeFlatMinor: parsed.bookingFeeFlatMinor,
            taxBps: parsed.taxBps,
            taxLabel: parsed.taxLabel,
          },
        },
      },
    });

    await recordAuditLog({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "EVENT_CREATED",
      entityType: "Event",
      entityId: created.id,
      metadata: { slug: created.slug, title: created.title },
    });

    return NextResponse.json({ event: created });
  } catch (err) {
    return handleApiError(err);
  }
}
