import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  requireUserPermission,
  revokeAllUserSessions,
} from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { recordAuditLog } from "@/lib/logger";

const manageUserSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE_ROLE"),
    userId: z.string().min(1),
    role: z.enum([
      "CUSTOMER",
      "SUPPORT_AGENT",
      "TICKET_SCANNER",
      "EVENT_MANAGER",
      "FINANCE_MANAGER",
      "SUPER_ADMIN",
    ]),
  }),
  z.object({
    action: z.literal("CREATE_STAFF"),
    email: z.string().email().toLowerCase(),
    firstName: z.string().min(2).max(60),
    lastName: z.string().min(2).max(60),
    password: z.string().min(8).max(128),
    role: z.enum([
      "SUPPORT_AGENT",
      "TICKET_SCANNER",
      "EVENT_MANAGER",
      "FINANCE_MANAGER",
      "SUPER_ADMIN",
    ]),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const superAdmin = await requireUserPermission("users:manage");
    const body = await req.json();
    const parsed = manageUserSchema.parse(body);

    if (parsed.action === "UPDATE_ROLE") {
      if (parsed.userId === superAdmin.id && parsed.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Cannot demote your own Super Administrator session." },
          { status: 400 }
        );
      }

      const updated = await prisma.user.update({
        where: { id: parsed.userId },
        data: { role: parsed.role },
      });

      await revokeAllUserSessions(updated.id);

      await recordAuditLog({
        actorUserId: superAdmin.id,
        actorRole: superAdmin.role,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: updated.id,
        metadata: { newRole: parsed.role },
      });

      return NextResponse.json({
        id: updated.id,
        email: updated.email,
        role: updated.role,
      });
    }

    const passwordHash = await hashPassword(parsed.password);
    const created = await prisma.user.create({
      data: {
        email: parsed.email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        passwordHash,
        role: parsed.role,
        emailVerifiedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorUserId: superAdmin.id,
      actorRole: superAdmin.role,
      action: "STAFF_USER_CREATED",
      entityType: "User",
      entityId: created.id,
      metadata: { email: created.email, role: created.role },
    });

    return NextResponse.json({
      id: created.id,
      email: created.email,
      role: created.role,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
