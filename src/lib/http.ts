import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { logStructured } from "@/lib/logger";

export function getRequestBaseUrl(req: NextRequest): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  if (host) {
    const proto =
      forwardedProto || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      {
        error: first
          ? `${first.path.join(".") ? first.path.join(".") + ": " : ""}${first.message}`
          : "Validation error",
        issues: err.issues,
      },
      { status: 400 }
    );
  }
  const message =
    err instanceof Error ? err.message : "An unexpected server error occurred.";
  logStructured("error", "api_error", { message });
  const isClientErr =
    /not found|unavailable|insufficient|exceeded|closed|opened|minimum|maximum|required|already|non-refundable|prior to kick-off|forbidden|invalid/i.test(
      message
    );
  return NextResponse.json(
    { error: message },
    { status: isClientErr ? 400 : 500 }
  );
}
