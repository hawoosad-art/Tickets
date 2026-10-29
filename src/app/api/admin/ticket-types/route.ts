import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { adminTicketTypeSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireUserPermission("events:write");
    const body = await req.json();
    const parsed = adminTicketTypeSchema.parse(body);

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: parsed.eventId,
        name: parsed.name,
        code: parsed.code,
        categoryTier: parsed.categoryTier,
        description: parsed.description,
        sectionInfo: parsed.sectionInfo || null,
        seated: parsed.seated,
        priceMinor: parsed.priceMinor,
        currency: parsed.currency,
        minPerOrder: parsed.minPerOrder,
        maxPerOrder: parsed.maxPerOrder,
        isActive: parsed.isActive,
        sortOrder: parsed.sortOrder,
        allocation: {
          create: {
            sourceType: parsed.sourceType,
            authorisedCapacity: parsed.authorisedCapacity,
            externalEventRef: parsed.externalEventRef || null,
            externalAllocationRef: parsed.externalAllocationRef || null,
            externalEndpointUrl: parsed.externalEndpointUrl || null,
          },
        },
      },
      include: { allocation: true },
    });

    await recordAuditLog({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "TICKET_TYPE_CREATED",
      entityType: "TicketType",
      entityId: ticketType.id,
      metadata: {
        eventId: ticketType.eventId,
        name: ticketType.name,
        priceMinor: ticketType.priceMinor,
        authorisedCapacity: parsed.authorisedCapacity,
      },
    });

    return NextResponse.json({ ticketType });
  } catch (err) {
    return handleApiError(err);
  }
}
