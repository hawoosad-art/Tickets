import { NextRequest, NextResponse } from "next/server";
import { handleIncomingPaymentWebhook } from "@/services/orders/order-service";
import { logStructured } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const result = await handleIncomingPaymentWebhook({
      provider: "PAYSTACK",
      rawBody,
      headers: req.headers,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook failed";
    logStructured("error", "paystack_webhook_error", { error: msg });
    const status = msg.includes("signature") ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
