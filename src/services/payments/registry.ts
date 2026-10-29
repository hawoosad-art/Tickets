import { PaymentProviderType } from "@prisma/client";
import { paypalPaymentProvider } from "@/services/payments/paypal-provider";
import { paystackPaymentProvider } from "@/services/payments/paystack-provider";
import { simulatedPaymentProvider } from "@/services/payments/simulated-provider";
import {
  PaymentProviderAdapter,
  PublicPaymentMethodOption,
} from "@/services/payments/types";

const ADAPTERS: Record<PaymentProviderType, PaymentProviderAdapter> = {
  PAYPAL: paypalPaymentProvider,
  PAYSTACK: paystackPaymentProvider,
  SIMULATED: simulatedPaymentProvider,
};

export function getPaymentProviderAdapter(
  provider: PaymentProviderType
): PaymentProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter || !adapter.isAvailable()) {
    throw new Error(
      `Payment provider ${provider} is not currently enabled or configured.`
    );
  }
  return adapter;
}

export function getRawPaymentAdapterForWebhook(
  provider: PaymentProviderType
): PaymentProviderAdapter {
  return ADAPTERS[provider];
}

/**
 * Strictly returns ONLY payment methods whose merchant credentials are genuinely configured.
 */
export function getAvailablePaymentMethods(
  orderCurrency?: string
): PublicPaymentMethodOption[] {
  const methods: PublicPaymentMethodOption[] = [];

  if (paypalPaymentProvider.isAvailable()) {
    const isKes = orderCurrency?.toUpperCase() === "KES";
    methods.push({
      provider: "PAYPAL",
      id: "paypal-checkout",
      label: "PayPal & International Cards",
      sublabel:
        "Pay securely via PayPal Wallet, Visa, Mastercard, or American Express (Hosted 3DS2 Checkout)",
      badges: ["PayPal", "Visa", "Mastercard"],
      isSimulated: false,
      currencyNote: isKes
        ? `KES orders are settled in USD via PayPal at 1 USD = ${process.env.PAYPAL_KES_TO_USD_RATE || "129.50"} KES.`
        : undefined,
    });
  }

  if (paystackPaymentProvider.isAvailable()) {
    methods.push({
      provider: "PAYSTACK",
      id: "paystack-mpesa-card",
      label: "M-Pesa & Bank Cards (Paystack)",
      sublabel:
        "Instant Safaricom M-Pesa STK Push, Visa, Mastercard & Apple Pay",
      badges: ["M-Pesa", "Visa", "Mastercard"],
      isSimulated: false,
    });
  }

  if (simulatedPaymentProvider.isAvailable()) {
    methods.push({
      provider: "SIMULATED",
      id: "simulated-dev",
      label: "Development Sandbox Simulator (Test Only)",
      sublabel:
        "Safe non-production test adapter to simulate instant payment approval or failure without charging real money.",
      badges: ["DEV SANDBOX", "NO REAL CHARGE"],
      isSimulated: true,
    });
  }

  return methods;
}
