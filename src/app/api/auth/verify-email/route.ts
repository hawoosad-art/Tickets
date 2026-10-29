import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto-tokens";
import { getRequestBaseUrl } from "@/lib/http";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const baseUrl = getRequestBaseUrl(req);

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?verified=invalid`);
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: sha256Hex(token) },
  });

  if (
    !record ||
    record.consumedAt ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.redirect(`${baseUrl}/login?verified=expired`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return NextResponse.redirect(`${baseUrl}/account?verified=success`);
}
