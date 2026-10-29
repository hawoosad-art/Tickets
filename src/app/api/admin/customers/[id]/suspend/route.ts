import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserPermission, revokeAllUserSessions } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { recordAuditLog } from "@/lib/logger";

const suspendSchema = z.object({
  suspend: z.boolean(),
  reason: z.string().max(300).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireUserPermission("customers:suspend");
    const body = await req.json();
    const parsed = suspendSchema.parse(body);

    if (params.id === admin.id) {
      return NextResponse.json(
        { error: "Cannot suspend your own administrator account." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        isSuspended: parsed.suspend,
        suspendedReason: parsed.suspend ? parsed.reason || "Administrative suspension" : null,
      },
    });

    if (parsed.suspend) {
      await revokeAllUserSessions(updated.id);
    }

    await recordAuditLog({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: parsed.suspend ? "USER_SUSPENDED" : "USER_UNSUSPENDED",
      entityType: "User",
      entityId: updated.id,
      metadata: { reason: parsed.reason },
    });

    return NextResponse.json({
      id: updated.id,
      isSuspended: updated.isSuspended,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
