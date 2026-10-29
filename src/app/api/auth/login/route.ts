import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createUserSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, handleApiError } from "@/lib/http";
import { loginSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit("auth:login", ip, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rl.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(parsed.password, user.passwordHash);
    if (!valid) {
      await recordAuditLog({
        actorUserId: user.id,
        actorRole: user.role,
        action: "USER_LOGIN_FAILED",
        entityType: "User",
        entityId: user.id,
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }

    if (user.isSuspended) {
      return NextResponse.json(
        {
          error:
            "This account has been suspended. Please contact Ticket254 Customer Support.",
        },
        { status: 403 }
      );
    }

    const session = await createUserSession({
      userId: user.id,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    });
    setSessionCookie(session.rawToken, session.expiresAt);

    await recordAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      action: "USER_LOGGED_IN",
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
