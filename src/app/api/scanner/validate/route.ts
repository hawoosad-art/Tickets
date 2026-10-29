import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserPermission } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, handleApiError } from "@/lib/http";
import { scannerValidateSchema } from "@/lib/validation/schemas";
import { validateAndRedeemTicket } from "@/services/tickets/ticket-service";

export async function GET(req: NextRequest) {
  try {
    await requireUserPermission("scanner:operate");
    const eventId = req.nextUrl.searchParams.get("eventId");

    const scans = await prisma.ticketScan.findMany({
      where: eventId ? { eventId } : undefined,
      orderBy: { scannedAt: "desc" },
      take: 40,
      include: {
        ticket: { select: { ticketNumber: true, holderName: true } },
        scannedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ scans });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const operator = await requireUserPermission("scanner:operate");
    const ip = getClientIp(req);

    // Rate-limit scanner endpoint per operator/IP to prevent brute-force token probing
    const rl = checkRateLimit(
      "scanner:validate",
      `${operator.id}:${ip}`,
      60,
      60 * 1000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Scanner rate limit exceeded. Wait ${rl.retryAfterSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = scannerValidateSchema.parse(body);

    const result = await validateAndRedeemTicket({
      eventId: parsed.eventId,
      scannedInput: parsed.scannedInput,
      scannedByUserId: operator.id,
      gateName: parsed.gateName,
      ipAddress: ip,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
