import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, handleApiError } from "@/lib/http";
import { supportRequestSchema } from "@/lib/validation/schemas";
import { enqueueAndSendEmail } from "@/services/email/email-service";
import { emailTemplates } from "@/services/email/templates";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit("support:create", ip, 8, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many support submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = supportRequestSchema.parse(body);
    const user = await getCurrentUser();

    const ticketReference = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const support = await prisma.supportRequest.create({
      data: {
        ticketReference,
        userId: user?.id ?? null,
        bookingReference: parsed.bookingReference || null,
        name: parsed.name,
        email: parsed.email,
        category: parsed.category,
        subject: parsed.subject,
        message: parsed.message,
        status: "OPEN",
      },
    });

    await enqueueAndSendEmail({
      deduplicationKey: `support-created:${support.id}`,
      recipientEmail: support.email,
      userId: user?.id ?? null,
      templateType: "SUPPORT_CONFIRMATION",
      rendered: emailTemplates.supportConfirmation({
        customerName: support.name,
        ticketReference: support.ticketReference,
        subjectLine: support.subject,
      }),
    });

    return NextResponse.json({
      ticketReference: support.ticketReference,
      status: support.status,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
