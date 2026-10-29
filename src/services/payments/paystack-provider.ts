import crypto from "crypto";
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

const PAYSTACK_API = "https://api.paystack.co";

export const paystackPaymentProvider: PaymentProviderAdapter = {
  provider: "PAYSTACK",

  isAvailable(): boolean {
    return (
      process.env.PAYSTACK_ENABLED === "true" &&
      Boolean(process.env.PAYSTACK_SECRET_KEY)
    );
  },

  async initiateCheckout(
    input: InitiateCheckoutInput
  ): Promise<InitiateCheckoutOutput> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new Error("Paystack secret key is not configured.");
    }

    const reference = `${input.bookingReference}-${input.idempotencyKey.slice(0, 8)}`;
    const callbackUrl = `${input.appBaseUrl}/checkout/success?ref=${encodeURIComponent(input.bookingReference)}&token=${encodeURIComponent(input.bookingAccessToken)}&provider=PAYSTACK&trxref=${encodeURIComponent(reference)}`;

    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.customerEmail,
        amount: input.amountMinor,
        currency: input.currency.toUpperCase(),
        reference,
        callback_url: callbackUrl,
        channels: ["mobile_money", "card"],
        metadata: {
          order_id: input.orderId,
          booking_reference: input.bookingReference,
          event_title: input.eventTitle,
          cancel_action: `${input.appBaseUrl}/checkout/cancelled?ref=${encodeURIComponent(input.bookingReference)}&token=${encodeURIComponent(input.bookingAccessToken)}`,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Paystack initialize failed (${res.status}): ${errText}`);
    }

    const json = (await res.json()) as {
      status: boolean;
      message: string;
      data?: { authorization_url: string; reference: string; access_code: string };
    };

    if (!json.status || !json.data?.authorization_url) {
      throw new Error(json.message || "Paystack failed to create checkout URL.");
    }

    return {
      provider: "PAYSTACK",
      providerOrderId: json.data.reference,
      providerReference: json.data.reference,
      checkoutUrl: json.data.authorization_url,
      settledCurrency: input.currency.toUpperCase(),
      settledAmountMinor: input.amountMinor,
      isSimulated: false,
      rawResponse: json as unknown as Record<string, unknown>,
    };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new Error("Paystack secret key is not configured.");
    }

    const ref = input.providerReference || input.providerOrderId;
    const res = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(ref)}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return {
        verified: false,
        status: "FAILED",
        providerOrderId: ref,
        amountMinor: 0,
        currency: input.expectedCurrency,
        failureMessage: `Paystack verify HTTP ${res.status}: ${errText}`,
      };
    }

    const json = (await res.json()) as {
      status: boolean;
      data?: {
        id: number;
        status: string;
        reference: string;
        amount: number;
        currency: string;
        gateway_response?: string;
      };
    };

    const tx = json.data;
    if (!tx) {
      return {
        verified: false,
        status: "FAILED",
        providerOrderId: ref,
        amountMinor: 0,
        currency: input.expectedCurrency,
        failureMessage: "Missing transaction payload from Paystack.",
      };
    }

    if (tx.status === "success") {
      if (
        tx.currency.toUpperCase() !== input.expectedCurrency.toUpperCase() ||
        tx.amount < input.expectedAmountMinor
      ) {
        return {
          verified: false,
          status: "FAILED",
          providerOrderId: tx.reference,
          providerCaptureId: String(tx.id),
          amountMinor: tx.amount,
          currency: tx.currency,
          failureCode: "AMOUNT_OR_CURRENCY_MISMATCH",
          failureMessage: "Verified Paystack amount/currency did not match order.",
          rawResponse: json as unknown as Record<string, unknown>,
        };
      }

      return {
        verified: true,
        status: "SUCCEEDED",
        providerOrderId: tx.reference,
        providerCaptureId: String(tx.id),
        amountMinor: tx.amount,
        currency: tx.currency.toUpperCase(),
        rawResponse: json as unknown as Record<string, unknown>,
      };
    }

    if (tx.status === "failed" || tx.status === "abandoned") {
      return {
        verified: false,
        status: tx.status === "abandoned" ? "CANCELLED" : "FAILED",
        providerOrderId: tx.reference,
        amountMinor: tx.amount,
        currency: tx.currency.toUpperCase(),
        failureMessage: tx.gateway_response || `Transaction ${tx.status}`,
        rawResponse: json as unknown as Record<string, unknown>,
      };
    }

    return {
      verified: false,
      status: "PENDING",
      providerOrderId: tx.reference,
      amountMinor: tx.amount,
      currency: tx.currency.toUpperCase(),
      rawResponse: json as unknown as Record<string, unknown>,
    };
  },

  async verifyAndParseWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedWebhookEvent> {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    const sig = headers.get("x-paystack-signature") || "";

    let signatureVerified = false;
    if (secret && sig) {
      const computed = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");
      const a = Buffer.from(sig);
      const b = Buffer.from(computed);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        signatureVerified = true;
      }
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      data?: {
        id?: number;
        reference?: string;
        amount?: number;
        currency?: string;
        metadata?: { booking_reference?: string };
      };
    };

    const eventType = payload.event || "unknown";
    const ref = payload.data?.reference;
    const txId = payload.data?.id ? String(payload.data.id) : undefined;
    let outcome: ParsedWebhookEvent["outcome"] = "IGNORED";

    if (eventType === "charge.success") {
      outcome = "PAYMENT_SUCCEEDED";
    } else if (eventType === "charge.failed") {
      outcome = "PAYMENT_FAILED";
    } else if (eventType === "refund.processed") {
      outcome = "REFUND_SUCCEEDED";
    }

    return {
      signatureVerified,
      providerEventId: `${eventType}:${ref || txId || Date.now()}`,
      eventType,
      providerOrderId: ref,
      providerCaptureId: txId,
      bookingReference: payload.data?.metadata?.booking_reference,
      outcome,
      amountMinor: payload.data?.amount,
      currency: payload.data?.currency?.toUpperCase(),
      rawPayload: payload as unknown as Record<string, unknown>,
    };
  },

  async processRefund(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return {
        succeeded: false,
        status: "FAILED",
        failureReason: "Paystack secret key is not configured.",
      };
    }

    const transaction = input.providerOrderId || input.providerCaptureId;
    if (!transaction) {
      return {
        succeeded: false,
        status: "FAILED",
        failureReason: "Missing Paystack transaction reference for refund.",
      };
    }

    const res = await fetch(`${PAYSTACK_API}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction,
        amount: input.amountMinor,
        currency: input.currency.toUpperCase(),
        merchant_note: input.reason.slice(0, 200),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        succeeded: false,
        status: "FAILED",
        failureReason: `Paystack Refund failed (${res.status}): ${errText}`,
      };
    }

    const json = (await res.json()) as {
      status: boolean;
      data?: { id?: number; status?: string };
    };

    return {
      succeeded: Boolean(json.status),
      providerRefundId: json.data?.id ? String(json.data.id) : `ps-ref-${Date.now()}`,
      status: json.data?.status === "processed" ? "SUCCEEDED" : "PROCESSING",
      rawResponse: json as unknown as Record<string, unknown>,
    };
  },
};
