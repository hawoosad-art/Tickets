import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/http";
import {
  handleIncomingPaymentWebhook,
  markPaymentFailedAndReleaseStock,
  verifyOrderOwnershipOrToken,
} from "@/services/orders/order-service";
import {
  signSimulatedWebhookPayload,
  simulatedPaymentProvider,
} from "@/services/payments/simulated-provider";

const simulateActionSchema = z.object({
  bookingReference: z.string().min(4),
  accessToken: z.string().optional(),
  outcome: z.enum(["APPROVE", "FAIL", "CANCEL"]),
});

export async function POST(req: NextRequest) {
  try {
    if (!simulatedPaymentProvider.isAvailable()) {
      return NextResponse.json(
        { error: "Simulated payments are disabled." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = simulateActionSchema.parse(body);
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

    const order = await prisma.order.findUnique({
      where: { bookingReference: parsed.bookingReference },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const payment = order?.payments[0];
    if (!order || !payment || payment.provider !== "SIMULATED") {
      return NextResponse.json(
        { error: "Simulated payment session not found." },
        { status: 404 }
      );
    }

    if (parsed.outcome === "CANCEL") {
      await markPaymentFailedAndReleaseStock({
        paymentId: payment.id,
        failureMessage: "Customer cancelled checkout in simulator.",
        cancelled: true,
      });
      return NextResponse.json({ status: "CANCELLED" });
    }

    // Exercise the exact signed webhook pipeline so simulated orders follow identical production guarantees!
    const rawWebhookPayload = JSON.stringify({
      eventId: `sim-evt-${payment.id}-${parsed.outcome}`,
      eventType:
        parsed.outcome === "APPROVE"
          ? "SIMULATED.PAYMENT.SUCCEEDED"
          : "SIMULATED.PAYMENT.FAILED",
      providerOrderId: payment.providerOrderId,
      providerCaptureId: `SIM-CAP-${payment.id}`,
      bookingReference: order.bookingReference,
      amountMinor: payment.settledAmountMinor ?? payment.amountMinor,
      currency: payment.settledCurrency ?? payment.currency,
    });

    const headers = new Headers({
      "x-simulated-signature": signSimulatedWebhookPayload(rawWebhookPayload),
    });

    const result = await handleIncomingPaymentWebhook({
      provider: "SIMULATED",
      rawBody: rawWebhookPayload,
      headers,
    });

    return NextResponse.json({
      status: parsed.outcome === "APPROVE" ? "TICKETS_ISSUED" : "PAYMENT_FAILED",
      webhookResult: result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
