import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAvailablePaymentMethods } from "@/services/payments/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const methods = getAvailablePaymentMethods();
    return NextResponse.json({
      status: "healthy",
      service: "ticket254",
      database: "connected",
      timestamp: new Date().toISOString(),
      paymentProvidersConfigured: methods.map((m) => ({
        provider: m.provider,
        isSimulated: m.isSimulated,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unreachable",
        error: err instanceof Error ? err.message : "Database check failed",
      },
      { status: 503 }
    );
  }
}
