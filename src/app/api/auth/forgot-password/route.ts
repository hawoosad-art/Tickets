import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRandomToken, sha256Hex } from "@/lib/crypto-tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getClientIp,
  getRequestBaseUrl,
  handleApiError,
} from "@/lib/http";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/schemas";
import { hashPassword, revokeAllUserSessions } from "@/lib/auth";
import { enqueueAndSendEmail } from "@/services/email/email-service";
import { emailTemplates } from "@/services/email/templates";
import { recordAuditLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit("auth:forgot", ip, 6, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    // Always return identical success message to prevent email enumeration
    if (user && !user.isSuspended) {
      const rawToken = generateRandomToken(32);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256Hex(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const baseUrl = getRequestBaseUrl(req);
      await enqueueAndSendEmail({
        deduplicationKey: `pw-reset:${user.id}:${rawToken.slice(0, 8)}`,
        recipientEmail: user.email,
        userId: user.id,
        templateType: "PASSWORD_RESET",
        rendered: emailTemplates.passwordReset({
          firstName: user.firstName,
          resetUrl: `${baseUrl}/forgot-password?token=${encodeURIComponent(rawToken)}`,
        }),
      });
    }

    return NextResponse.json({
      message:
        "If an account exists for that email address, password reset instructions have been sent.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.parse(body);
    const tokenHash = sha256Hex(parsed.token);

    const resetRec = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetRec ||
      resetRec.consumedAt ||
      resetRec.expiresAt.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired password reset token." },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(parsed.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRec.userId },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRec.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    await revokeAllUserSessions(resetRec.userId);
    await recordAuditLog({
      actorUserId: resetRec.userId,
      actorRole: resetRec.user.role,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: resetRec.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
