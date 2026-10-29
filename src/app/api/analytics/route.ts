import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackAnalyticsEvent } from "@/lib/logger";
import { handleApiError } from "@/lib/http";

const analyticsSchema = z.object({
  eventType: z.enum(["EVENT_VIEW", "TICKET_SELECTION"]),
  eventId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = analyticsSchema.parse(body);
    await trackAnalyticsEvent({
      eventType: parsed.eventType,
      eventId: parsed.eventId ?? null,
      metadata: parsed.metadata,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
