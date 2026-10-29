import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  InitiateCheckoutInput,
  InitiateCheckoutOutput,
  ParsedWebhookEvent,
  PaymentProviderAdapter,
  RefundPaymentInput,
  RefundPaymentOutput,
  VerifyPaymentInput,
  VerifyPaymentOutput,
} from "@/services/payments/types";

function getSimulatedWebhookSecret(): string {
  return process.env.SESSION_SECRET || "dev-simulated-webhook-secret";
}

export function signSimulatedWebhookPayload(rawBody: string): string {
  return crypto
    .createHmac("sha256", getSimulatedWebhookSecret())
    .update(rawBody)
    .digest("hex");
}

export const simulatedPaymentProvider: PaymentProviderAdapter = {
  provider: "SIMULATED",

  isAvailable(): boolean {
    return (
      process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_SIMULATED_PAYMENTS === "true"
    );
  },

  async initiateCheckout(
    input: InitiateCheckoutInput
  ): Promise<InitiateCheckoutOutput> {
    if (!this.isAvailable()) {
      throw new Error(
        "Simulated payments are disabled in production environments."
      );
    }

    const simOrderId = `SIM-ORD-${input.bookingReference}-${input.idempotencyKey.slice(0, 6).toUpperCase()}`;
    const checkoutUrl = `${input.appBaseUrl}/checkout?step=simulate&ref=${encodeURIComponent(input.bookingReference)}&token=${encodeURIComponent(input.bookingAccessToken)}&simOrderId=${encodeURIComponent(simOrderId)}`;

    return {
      provider: "SIMULATED",
      providerOrderId: simOrderId,
      providerReference: simOrderId,
      checkoutUrl,
      settledCurrency: input.currency.toUpperCase(),
      settledAmountMinor: input.amountMinor,
      isSimulated: true,
      rawResponse: {
        mode: "SIMULATED_DEVELOPMENT_ADAPTER",
        simOrderId,
      },
    };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    if (!this.isAvailable()) {
      return {
        verified: false,
        status: "FAILED",
        providerOrderId: input.providerOrderId,
        amountMinor: 0,
        currency: input.expectedCurrency,
        failureMessage: "Simulated adapter is disabled.",
      };
    }

    const payment = await prisma.payment.findUnique({
      where: { providerOrderId: input.providerOrderId },
    });

    if (!payment) {
      return {
        verified: false,
        status: "FAILED",
        providerOrderId: input.providerOrderId,
        amountMinor: 0,
        currency: input.expectedCurrency,
        failureMessage: "Simulated payment record not found.",
      };
    }

    if (payment.status === "SUCCEEDED") {
      return {
        verified: true,
        status: "SUCCEEDED",
        providerOrderId: input.providerOrderId,
        providerCaptureId: payment.providerCaptureId || `SIM-CAP-${payment.id}`,
        amountMinor: payment.settledAmountMinor ?? payment.amountMinor,
        currency: payment.settledCurrency ?? payment.currency,
      };
    }

    if (payment.status === "FAILED" || payment.status === "CANCELLED") {
      return {
        verified: false,
        status: payment.status === "CANCELLED" ? "CANCELLED" : "FAILED",
        providerOrderId: input.providerOrderId,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        failureMessage: payment.failureMessage || "Simulated payment declined.",
      };
    }

    return {
      verified: false,
      status: "PENDING",
      providerOrderId: input.providerOrderId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
    };
  },

  async verifyAndParseWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedWebhookEvent> {
    const sig = headers.get("x-simulated-signature") || "";
    const expected = signSimulatedWebhookPayload(rawBody);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    const signatureVerified =
      this.isAvailable() &&
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    const payload = JSON.parse(rawBody) as {
      eventId: string;
      eventType: "SIMULATED.PAYMENT.SUCCEEDED" | "SIMULATED.PAYMENT.FAILED";
      providerOrderId: string;
      providerCaptureId?: string;
      bookingReference?: string;
      amountMinor?: number;
      currency?: string;
    };

    return {
      signatureVerified,
      providerEventId: payload.eventId,
      eventType: payload.eventType,
      providerOrderId: payload.providerOrderId,
      providerCaptureId:
        payload.providerCaptureId || `SIM-CAP-${payload.providerOrderId}`,
      bookingReference: payload.bookingReference,
      outcome:
        payload.eventType === "SIMULATED.PAYMENT.SUCCEEDED"
          ? "PAYMENT_SUCCEEDED"
          : "PAYMENT_FAILED",
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      rawPayload: payload as unknown as Record<string, unknown>,
    };
  },

  async processRefund(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    if (!this.isAvailable()) {
      return {
        succeeded: false,
        status: "FAILED",
        failureReason: "Simulated refunds disabled in production.",
      };
    }

    return {
      succeeded: true,
      providerRefundId: `SIM-RFD-${input.idempotencyKey.slice(0, 12).toUpperCase()}`,
      status: "SUCCEEDED",
      rawResponse: {
        simulated: true,
        amountMinor: input.amountMinor,
        currency: input.currency,
      },
    };
  },
};
