import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateRandomToken, sha256Hex } from "@/lib/crypto-tokens";

export const SESSION_COOKIE_NAME = "t254_session";
const SESSION_DURATION_DAYS = 7;

export type Permission =
  | "admin:access"
  | "events:read"
  | "events:write"
  | "inventory:manage"
  | "orders:read"
  | "orders:export"
  | "tickets:resend"
  | "payments:read"
  | "refunds:review"
  | "reconciliation:manage"
  | "customers:read"
  | "customers:suspend"
  | "scanner:operate"
  | "reports:read"
  | "reports:export"
  | "support:manage"
  | "users:manage"
  | "settings:manage"
  | "audit:read";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CUSTOMER: [],
  TICKET_SCANNER: ["scanner:operate"],
  SUPPORT_AGENT: [
    "admin:access",
    "orders:read",
    "tickets:resend",
    "customers:read",
    "support:manage",
  ],
  EVENT_MANAGER: [
    "admin:access",
    "events:read",
    "events:write",
    "inventory:manage",
    "orders:read",
    "scanner:operate",
    "reports:read",
  ],
  FINANCE_MANAGER: [
    "admin:access",
    "orders:read",
    "orders:export",
    "payments:read",
    "refunds:review",
    "reconciliation:manage",
    "reports:read",
    "reports:export",
    "audit:read",
  ],
  SUPER_ADMIN: [
    "admin:access",
    "events:read",
    "events:write",
    "inventory:manage",
    "orders:read",
    "orders:export",
    "tickets:resend",
    "payments:read",
    "refunds:review",
    "reconciliation:manage",
    "customers:read",
    "customers:suspend",
    "scanner:operate",
    "reports:read",
    "reports:export",
    "support:manage",
    "users:manage",
    "settings:manage",
    "audit:read",
  ],
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 12);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function hasRolePermission(
  role: UserRole,
  permission: Permission,
  extraPermissions: string[] = []
): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (ROLE_PERMISSIONS[role]?.includes(permission)) return true;
  return extraPermissions.includes(permission);
}

export async function createUserSession(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRandomToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: params.userId },
    data: { lastLoginAt: new Date() },
  });

  return { rawToken, expiresAt };
}

export async function validateSessionToken(
  rawToken: string
): Promise<(User & { permissions: string[] }) | null> {
  if (!rawToken || rawToken.length < 20) return null;
  const tokenHash = sha256Hex(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          permissionGrants: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (session.user.isSuspended) return null;

  const extra = session.user.permissionGrants.map((g) => g.permission);
  return {
    ...session.user,
    permissions: Array.from(
      new Set([...(ROLE_PERMISSIONS[session.user.role] || []), ...extra])
    ),
  };
}

export async function getCurrentUser(): Promise<
  (User & { permissions: string[] }) | null
> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) return null;
    return await validateSessionToken(raw);
  } catch {
    return null;
  }
}

export async function revokeSessionByRawToken(rawToken: string): Promise<void> {
  const tokenHash = sha256Hex(rawToken);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function setSessionCookie(rawToken: string, expiresAt: Date): void {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAuthenticatedUser(): Promise<
  User & { permissions: string[] }
> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required.", 401);
  }
  return user;
}

export async function requireUserPermission(
  permission: Permission
): Promise<User & { permissions: string[] }> {
  const user = await requireAuthenticatedUser();
  if (!hasRolePermission(user.role, permission, user.permissions)) {
    throw new AuthError("Forbidden: insufficient permissions.", 403);
  }
  return user;
}
