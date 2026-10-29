import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { enqueueAndSendEmail } from "@/services/email/email-service";
import { emailTemplates } from "@/services/email/templates";
import { recordAuditLog } from "@/lib/logger";

const replySupportSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  staffReply: z.string().trim().min(2).max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await requireUserPermission("support:manage");
    const body = await req.json();
    const parsed = replySupportSchema.parse(body);

    const existing = await prisma.supportRequest.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Support request not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const updated = await prisma.supportRequest.update({
      where: { id: params.id },
      data: {
        status: parsed.status,
        assignedToUserId: agent.id,
        ...(parsed.staffReply
          ? { staffReply: parsed.staffReply, repliedAt: now }
          : {}),
        ...(parsed.status === "RESOLVED" || parsed.status === "CLOSED"
          ? { resolvedAt: now }
          : {}),
      },
    });

    if (parsed.staffReply) {
      await enqueueAndSendEmail({
        deduplicationKey: `support-reply:${updated.id}:${now.getTime()}`,
        recipientEmail: updated.email,
        userId: updated.userId,
        templateType: "SUPPORT_CONFIRMATION",
        rendered: emailTemplates.supportConfirmation({
          customerName: updated.name,
          ticketReference: updated.ticketReference,
          subjectLine: updated.subject,
          staffReply: parsed.staffReply,
        }),
      });
    }

    await recordAuditLog({
      actorUserId: agent.id,
      actorRole: agent.role,
      action: "SUPPORT_REQUEST_UPDATED",
      entityType: "SupportRequest",
      entityId: updated.id,
      metadata: { status: parsed.status },
    });

    return NextResponse.json({ support: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
