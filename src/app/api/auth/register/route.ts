import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createUserSession,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { generateRandomToken, sha256Hex } from "@/lib/crypto-tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getClientIp,
  getRequestBaseUrl,
  handleApiError,
} from "@/lib/http";
import { registerSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/logger";
import { enqueueAndSendEmail } from "@/services/email/email-service";
import { emailTemplates } from "@/services/email/templates";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit("auth:register", ip, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: parsed.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.password);
    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone || null,
        countryCode: parsed.countryCode.toUpperCase(),
        role: "CUSTOMER",
      },
    });

    const rawVerifyToken = generateRandomToken(32);
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(rawVerifyToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = getRequestBaseUrl(req);
    await enqueueAndSendEmail({
      deduplicationKey: `welcome:${user.id}`,
      recipientEmail: user.email,
      userId: user.id,
      templateType: "WELCOME",
      rendered: emailTemplates.welcome({
        firstName: user.firstName,
        loginUrl: `${baseUrl}/account`,
      }),
    });

    await enqueueAndSendEmail({
      deduplicationKey: `verify-email:${user.id}:${rawVerifyToken.slice(0, 8)}`,
      recipientEmail: user.email,
      userId: user.id,
      templateType: "EMAIL_VERIFICATION",
      rendered: emailTemplates.emailVerification({
        firstName: user.firstName,
        verifyUrl: `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(rawVerifyToken)}`,
      }),
    });

    const session = await createUserSession({
      userId: user.id,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    });
    setSessionCookie(session.rawToken, session.expiresAt);

    await recordAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
