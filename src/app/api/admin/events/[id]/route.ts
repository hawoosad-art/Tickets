import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { updateEventStatusAndNotifyCustomers } from "@/services/orders/order-service";
import { recordAuditLog } from "@/lib/logger";

const patchEventSchema = z.object({
  title: z.string().min(4).max(160).optional(),
  description: z.string().min(10).max(4000).optional(),
  status: z
    .enum([
      "DRAFT",
      "PUBLISHED",
      "UNPUBLISHED",
      "POSTPONED",
      "CANCELLED",
      "COMPLETED",
    ])
    .optional(),
  isFeatured: z.boolean().optional(),
  organiserAuthorised: z.boolean().optional(),
  kickoffAt: z.string().datetime().optional(),
  officialStatusNotice: z.string().max(1000).optional(),
  entryInstructions: z.string().min(5).max(2000).optional(),
  bookingFeeBps: z.number().int().min(0).max(2500).optional(),
  taxBps: z.number().int().min(0).max(3000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireUserPermission("events:write");
    const body = await req.json();
    const parsed = patchEventSchema.parse(body);

    if (parsed.status === "POSTPONED" || parsed.status === "CANCELLED") {
      const outcome = await updateEventStatusAndNotifyCustomers({
        eventId: params.id,
        newStatus: parsed.status,
        newKickoffAt: parsed.kickoffAt ? new Date(parsed.kickoffAt) : undefined,
        officialInstructions:
          parsed.officialStatusNotice ||
          "Please check your email and booking page for official organiser instructions.",
        actorUserId: admin.id,
        actorRole: admin.role,
      });
      return NextResponse.json({ ok: true, ...outcome });
    }

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined
          ? { description: parsed.description }
          : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.isFeatured !== undefined
          ? { isFeatured: parsed.isFeatured }
          : {}),
        ...(parsed.organiserAuthorised !== undefined
          ? { organiserAuthorised: parsed.organiserAuthorised }
          : {}),
        ...(parsed.kickoffAt !== undefined
          ? { kickoffAt: new Date(parsed.kickoffAt) }
          : {}),
        ...(parsed.officialStatusNotice !== undefined
          ? { officialStatusNotice: parsed.officialStatusNotice }
          : {}),
        ...(parsed.entryInstructions !== undefined
          ? { entryInstructions: parsed.entryInstructions }
          : {}),
      },
    });

    if (parsed.bookingFeeBps !== undefined || parsed.taxBps !== undefined) {
      await prisma.eventPolicy.updateMany({
        where: { eventId: params.id },
        data: {
          ...(parsed.bookingFeeBps !== undefined
            ? { bookingFeeBps: parsed.bookingFeeBps }
            : {}),
          ...(parsed.taxBps !== undefined ? { taxBps: parsed.taxBps } : {}),
        },
      });
    }

    await recordAuditLog({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "EVENT_UPDATED",
      entityType: "Event",
      entityId: updated.id,
      metadata: parsed as Record<string, unknown>,
    });

    return NextResponse.json({ event: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
