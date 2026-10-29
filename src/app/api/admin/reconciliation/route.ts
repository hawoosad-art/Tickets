import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserPermission } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import { createSettlementReconciliationRecord } from "@/services/reconciliation/reconciliation-service";

const settlementSchema = z.object({
  provider: z.enum(["PAYPAL", "PAYSTACK", "SIMULATED"]),
  currency: z.enum(["KES", "USD", "EUR", "GBP"]),
  eventId: z.string().optional().or(z.literal("")),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  providerFeesMinor: z.number().int().min(0).default(0),
  actualBankPayoutMinor: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const finance = await requireUserPermission("reconciliation:manage");
    const body = await req.json();
    const parsed = settlementSchema.parse(body);

    const settlement = await createSettlementReconciliationRecord({
      provider: parsed.provider,
      currency: parsed.currency,
      eventId: parsed.eventId || null,
      periodStart: new Date(parsed.periodStart),
      periodEnd: new Date(parsed.periodEnd),
      providerFeesMinor: parsed.providerFeesMinor,
      actualBankPayoutMinor: parsed.actualBankPayoutMinor,
      notes: parsed.notes,
      actorUserId: finance.id,
      actorRole: finance.role,
    });

    return NextResponse.json({ settlement });
  } catch (err) {
    return handleApiError(err);
  }
}
