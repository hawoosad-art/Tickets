import {
  convertKesMinorToUsdMinor,
  formatMinorToDecimalString,
  toMinorUnits,
} from "@/lib/money";
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

const PAYPAL_SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP"]);

let cachedToken: { token: string; expiresAtMs: number } | null = null;

function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal API credentials are not configured.");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAtMs: Date.now() + Math.max(60, data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

export const paypalPaymentProvider: PaymentProviderAdapter = {
  provider: "PAYPAL",

  isAvailable(): boolean {
    return (
      process.env.PAYPAL_ENABLED === "true" &&
      Boolean(process.env.PAYPAL_CLIENT_ID) &&
      Boolean(process.env.PAYPAL_CLIENT_SECRET)
    );
  },

  async initiateCheckout(
    input: InitiateCheckoutInput
  ): Promise<InitiateCheckoutOutput> {
    const accessToken = await getPayPalAccessToken();
    const upperCurrency = input.currency.toUpperCase();

    // PayPal Orders v2 supports USD, EUR, GBP natively; KES is not a PayPal Checkout currency.
    let settledCurrency = upperCurrency;
    let settledAmountMinor = input.amountMinor;
    let fxRateApplied: string | undefined;

    if (!PAYPAL_SUPPORTED_CURRENCIES.has(upperCurrency)) {
      if (upperCurrency === "KES") {
        const converted = convertKesMinorToUsdMinor(input.amountMinor);
        settledCurrency = "USD";
        settledAmountMinor = converted.usdMinor;
        fxRateApplied = converted.rateApplied;
      } else {
        throw new Error(
          `Currency ${upperCurrency} is not supported by PayPal Checkout.`
        );
      }
    }

    const returnUrl = `${input.appBaseUrl}/checkout/success?ref=${encodeURIComponent(input.bookingReference)}&token=${encodeURIComponent(input.bookingAccessToken)}&provider=PAYPAL`;
    const cancelUrl = `${input.appBaseUrl}/checkout/cancelled?ref=${encodeURIComponent(input.bookingReference)}&token=${encodeURIComponent(input.bookingAccessToken)}`;

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.bookingReference,
          custom_id: input.orderId,
          invoice_id: input.bookingReference,
          description: `Ticket254 — ${input.eventTitle}`.slice(0, 127),
          amount: {
            currency_code: settledCurrency,
            value: formatMinorToDecimalString(settledAmountMinor),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Ticket254",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    };

    const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.idempotencyKey,
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PayPal Create Order failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      id: string;
      status: string;
      links?: Array<{ href: string; rel: string }>;
    };

    const approveLink =
      data.links?.find((l) => l.rel === "payer-action")?.href ||
      data.links?.find((l) => l.rel === "approve")?.href;

    if (!approveLink) {
      throw new Error("PayPal response did not include a payer approval URL.");
    }

    return {
      provider: "PAYPAL",
      providerOrderId: data.id,
      providerReference: input.bookingReference,
      checkoutUrl: approveLink,
      settledCurrency,
      settledAmountMinor,
      fxRateApplied,
      isSimulated: false,
      rawResponse: data as unknown as Record<string, unknown>,
    };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    const accessToken = await getPayPalAccessToken();

    // First inspect order state on PayPal
    const orderRes = await fetch(
      `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(input.providerOrderId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      return {
        verified: false,
        status: "FAILED",
        providerOrderId: input.providerOrderId,
        amountMinor: 0,
        currency: input.expectedCurrency,
        failureMessage: `PayPal lookup failed (${orderRes.status}): ${errText}`,
      };
    }

    let orderData = (await orderRes.json()) as {
      id: string;
      status: string;
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{
            id: string;
            status: string;
            amount: { currency_code: string; value: string };
          }>;
        };
      }>;
    };

    // If buyer approved on PayPal hosted page, capture the order server-side now
    if (orderData.status === "APPROVED") {
      const captureRes = await fetch(
        `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(input.providerOrderId)}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `capture-${input.providerOrderId}`,
          },
          body: "{}",
        }
      );

      if (!captureRes.ok) {
        const errText = await captureRes.text();
        return {
          verified: false,
          status: "FAILED",
          providerOrderId: input.providerOrderId,
          amountMinor: 0,
          currency: input.expectedCurrency,
          failureCode: `HTTP_${captureRes.status}`,
          failureMessage: `PayPal capture failed: ${errText}`,
        };
      }
      orderData = await captureRes.json();
    }

    if (orderData.status === "COMPLETED") {
      const capture = orderData.purchase_units?.[0]?.payments?.captures?.[0];
      if (!capture || capture.status !== "COMPLETED") {
        return {
          verified: false,
          status: "PENDING",
          providerOrderId: orderData.id,
          amountMinor: 0,
          currency: input.expectedCurrency,
          rawResponse: orderData as unknown as Record<string, unknown>,
        };
      }

      const capturedMinor = toMinorUnits(Number(capture.amount.value));
      const capturedCurrency = capture.amount.currency_code.toUpperCase();

      if (
        capturedCurrency !== input.expectedCurrency.toUpperCase() ||
        capturedMinor < input.expectedAmountMinor
      ) {
        return {
          verified: false,
          status: "FAILED",
          providerOrderId: orderData.id,
          providerCaptureId: capture.id,
          amountMinor: capturedMinor,
          currency: capturedCurrency,
          failureCode: "AMOUNT_OR_CURRENCY_MISMATCH",
          failureMessage: `Expected ${input.expectedCurrency} ${input.expectedAmountMinor}, received ${capturedCurrency} ${capturedMinor}`,
          rawResponse: orderData as unknown as Record<string, unknown>,
        };
      }

      return {
        verified: true,
        status: "SUCCEEDED",
        providerOrderId: orderData.id,
        providerCaptureId: capture.id,
        amountMinor: capturedMinor,
        currency: capturedCurrency,
        rawResponse: orderData as unknown as Record<string, unknown>,
      };
    }

    if (orderData.status === "VOIDED") {
      return {
        verified: false,
        status: "CANCELLED",
        providerOrderId: orderData.id,
        amountMinor: 0,
        currency: input.expectedCurrency,
        rawResponse: orderData as unknown as Record<string, unknown>,
      };
    }

    return {
      verified: false,
      status: "PENDING",
      providerOrderId: orderData.id,
      amountMinor: 0,
      currency: input.expectedCurrency,
      rawResponse: orderData as unknown as Record<string, unknown>,
    };
  },

  async verifyAndParseWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedWebhookEvent> {
    const payload = JSON.parse(rawBody) as {
      id: string;
      event_type: string;
      resource?: Record<string, unknown>;
    };

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");
    const transmissionSig = headers.get("paypal-transmission-sig");

    let signatureVerified = false;

    if (
      webhookId &&
      transmissionId &&
      transmissionTime &&
      certUrl &&
      authAlgo &&
      transmissionSig
    ) {
      const accessToken = await getPayPalAccessToken();
      const verifyRes = await fetch(
        `${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: webhookId,
            webhook_event: payload,
          }),
        }
      );

      if (verifyRes.ok) {
        const vData = (await verifyRes.json()) as {
          verification_status?: string;
        };
        signatureVerified = vData.verification_status === "SUCCESS";
      }
    }

    const resource = (payload.resource || {}) as Record<string, unknown>;
    const supplementary = (resource.supplementary_data || {}) as {
      related_ids?: { order_id?: string };
    };

    const eventType = payload.event_type || "UNKNOWN";
    let outcome: ParsedWebhookEvent["outcome"] = "IGNORED";
    let providerOrderId: string | undefined;
    let providerCaptureId: string | undefined;
    let amountMinor: number | undefined;
    let currency: string | undefined;
    let bookingReference: string | undefined =
      typeof resource.invoice_id === "string" ? resource.invoice_id : undefined;

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      outcome = "PAYMENT_SUCCEEDED";
      providerCaptureId = String(resource.id || "");
      providerOrderId = supplementary.related_ids?.order_id;
      const amt = resource.amount as
        | { value?: string; currency_code?: string }
        | undefined;
      if (amt?.value && amt?.currency_code) {
        amountMinor = toMinorUnits(Number(amt.value));
        currency = amt.currency_code.toUpperCase();
      }
    } else if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.DECLINED"
    ) {
      outcome = "PAYMENT_FAILED";
      providerCaptureId = String(resource.id || "");
      providerOrderId = supplementary.related_ids?.order_id;
    } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      outcome = "REFUND_SUCCEEDED";
      providerOrderId = supplementary.related_ids?.order_id;
    }

    return {
      signatureVerified,
      providerEventId: payload.id || `pp-${Date.now()}`,
      eventType,
      providerOrderId,
      providerCaptureId,
      bookingReference,
      outcome,
      amountMinor,
      currency,
      rawPayload: payload as unknown as Record<string, unknown>,
    };
  },

  async processRefund(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    if (!input.providerCaptureId) {
      return {
        succeeded: false,
        status: "FAILED",
        failureReason: "Missing PayPal capture ID for refund.",
      };
    }

    const accessToken = await getPayPalAccessToken();
    const res = await fetch(
      `${getPayPalBaseUrl()}/v2/payments/captures/${encodeURIComponent(input.providerCaptureId)}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": input.idempotencyKey,
        },
        body: JSON.stringify({
          amount: {
            value: formatMinorToDecimalString(input.amountMinor),
            currency_code: input.currency.toUpperCase(),
          },
          note_to_payer: input.reason.slice(0, 255),
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return {
        succeeded: false,
        status: "FAILED",
        failureReason: `PayPal Refund failed (${res.status}): ${errText}`,
      };
    }

    const data = (await res.json()) as { id: string; status: string };
    const completed = data.status === "COMPLETED";
    return {
      succeeded: completed || data.status === "PENDING",
      providerRefundId: data.id,
      status: completed ? "SUCCEEDED" : "PROCESSING",
      rawResponse: data as unknown as Record<string, unknown>,
    };
  },
};
