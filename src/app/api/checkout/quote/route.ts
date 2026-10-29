import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkoutItemSchema } from "@/lib/validation/schemas";
import { handleApiError } from "@/lib/http";
import { calculateOrderPricingServerSide } from "@/services/orders/order-service";
import { getAvailablePaymentMethods } from "@/services/payments/registry";

const quoteSchema = z.object({
  eventId: z.string().min(1),
  items: z.array(checkoutItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = quoteSchema.parse(body);
    const quote = await calculateOrderPricingServerSide(parsed);
    const availableMethods = getAvailablePaymentMethods(quote.currency);
    return NextResponse.json({
      quote,
      availablePaymentMethods: availableMethods,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
