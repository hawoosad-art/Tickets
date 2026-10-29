import { PaymentProviderType } from "@prisma/client";

export interface InitiateCheckoutInput {
  orderId: string;
  bookingReference: string;
  bookingAccessToken: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  eventTitle: string;
  idempotencyKey: string;
  appBaseUrl: string;
}

export interface InitiateCheckoutOutput {
  provider: PaymentProviderType;
  providerOrderId: string;
  providerReference: string;
  checkoutUrl: string;
  settledCurrency: string;
  settledAmountMinor: number;
  fxRateApplied?: string;
  isSimulated: boolean;
  rawResponse?: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerReference?: string | null;
  expectedAmountMinor: number;
  expectedCurrency: string;
}

export interface VerifyPaymentOutput {
  verified: boolean;
  status: "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELLED";
  providerOrderId: string;
  providerCaptureId?: string;
  amountMinor: number;
  currency: string;
  failureCode?: string;
  failureMessage?: string;
  rawResponse?: Record<string, unknown>;
}

export interface ParsedWebhookEvent {
  signatureVerified: boolean;
  providerEventId: string;
  eventType: string;
  providerOrderId?: string;
  providerCaptureId?: string;
  bookingReference?: string;
  outcome: "PAYMENT_SUCCEEDED" | "PAYMENT_FAILED" | "REFUND_SUCCEEDED" | "IGNORED";
  amountMinor?: number;
  currency?: string;
  rawPayload: Record<string, unknown>;
}

export interface RefundPaymentInput {
  providerCaptureId?: string | null;
  providerOrderId?: string | null;
  amountMinor: number;
  currency: string;
  reason: string;
  idempotencyKey: string;
}

export interface RefundPaymentOutput {
  succeeded: boolean;
  providerRefundId?: string;
  status: "SUCCEEDED" | "PROCESSING" | "FAILED";
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProviderType;
  isAvailable(): boolean;
  initiateCheckout(input: InitiateCheckoutInput): Promise<InitiateCheckoutOutput>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput>;
  verifyAndParseWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedWebhookEvent>;
  processRefund(input: RefundPaymentInput): Promise<RefundPaymentOutput>;
}

export interface PublicPaymentMethodOption {
  provider: PaymentProviderType;
  id: string;
  label: string;
  sublabel: string;
  badges: string[];
  isSimulated: boolean;
  currencyNote?: string;
}
