import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  revokeSessionByRawToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST() {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    await revokeSessionByRawToken(raw);
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
