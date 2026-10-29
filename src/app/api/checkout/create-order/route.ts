import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getClientIp,
  getRequestBaseUrl,
  handleApiError,
} from "@/lib/http";
import { createCheckoutOrderSchema } from "@/lib/validation/schemas";
import { createCheckoutOrderAndInitiatePayment } from "@/services/orders/order-service";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit("checkout:create", ip, 15, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Checkout rate limit reached. Please wait ${rl.retryAfterSeconds}s before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createCheckoutOrderSchema.parse(body);
    const currentUser = await getCurrentUser();
    const appBaseUrl = getRequestBaseUrl(req);

    const created = await createCheckoutOrderAndInitiatePayment({
      eventId: parsed.eventId,
      items: parsed.items,
      customer: parsed.customer,
      provider: parsed.provider,
      paymentMethod: parsed.paymentMethod,
      idempotencyKey: parsed.idempotencyKey,
      userId: currentUser?.id ?? null,
      appBaseUrl,
      ipAddress: ip,
    });

    return NextResponse.json(created);
  } catch (err) {
    return handleApiError(err);
  }
}
