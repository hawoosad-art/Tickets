import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import {
  verifyOrderOwnershipOrToken,
  verifyOrderPaymentServerSide,
} from "@/services/orders/order-service";

const verifySchema = z.object({
  bookingReference: z.string().min(4),
  accessToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.parse(body);
    const user = await getCurrentUser();

    const allowed = await verifyOrderOwnershipOrToken({
      bookingReference: parsed.bookingReference,
      currentUserId: user?.id ?? null,
      currentUserRole: user?.role ?? null,
      accessToken: parsed.accessToken ?? null,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: invalid booking credentials." },
        { status: 403 }
      );
    }

    const result = await verifyOrderPaymentServerSide(parsed.bookingReference);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
