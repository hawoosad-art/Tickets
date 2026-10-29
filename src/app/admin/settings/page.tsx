import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { paypalPaymentProvider } from "@/services/payments/paypal-provider";
import { paystackPaymentProvider } from "@/services/payments/paystack-provider";
import { simulatedPaymentProvider } from "@/services/payments/simulated-provider";

export default async function AdminSettingsPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
  const emailOutboxCount = await prisma.notificationJob.count();

  const providers = [
    {
      name: "PayPal REST API v2 (Wallet + Visa/Mastercard)",
      active: paypalPaymentProvider.isAvailable(),
      mode: process.env.PAYPAL_MODE || "sandbox",
      webhookUrl: `${appUrl}/api/webhooks/paypal`,
      envVars: "PAYPAL_ENABLED, PAYPAL_MODE, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID",
    },
    {
      name: "Paystack Kenya (M-Pesa STK Push + Visa/Mastercard)",
      active: paystackPaymentProvider.isAvailable(),
      mode: process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")
        ? "live"
        : "test / unconfigured",
      webhookUrl: `${appUrl}/api/webhooks/paystack`,
      envVars: "PAYSTACK_ENABLED, PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY",
    },
    {
      name: "Development Sandbox Simulator (Non-Production Only)",
      active: simulatedPaymentProvider.isAvailable(),
      mode: process.env.NODE_ENV || "development",
      webhookUrl: "Internal HMAC-SHA256 Signed Pipeline",
      envVars: "ENABLE_SIMULATED_PAYMENTS (must be false in production)",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC]">
          Platform & Payment Gateway Settings
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Read-only security & environment readiness inspector. Secrets are
          managed strictly via server environment variables.
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((p) => (
          <div key={p.name} className="t254-card p-6 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F8FAFC]">{p.name}</h2>
              {p.active ? (
                <span className="inline-flex items-center gap-1 font-bold text-[#35D399]">
                  <CheckCircle2 className="h-4 w-4" />
                  ENABLED ({p.mode})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-[#94A3B8]">
                  <XCircle className="h-4 w-4" />
                  NOT CONFIGURED
                </span>
              )}
            </div>
            <p className="text-[#94A3B8]">
              Webhook Listener:{" "}
              <code className="text-[#60A5FA]">{p.webhookUrl}</code>
            </p>
            <p className="text-[#94A3B8]">
              Required Env Keys: <code>{p.envVars}</code>
            </p>
          </div>
        ))}
      </div>

      <div className="t254-card p-6 space-y-2 text-xs">
        <h2 className="text-sm font-bold text-[#F8FAFC]">
          Transactional Email Outbox & Reservation Policy
        </h2>
        <p className="text-[#94A3B8]">
          Active Email Provider:{" "}
          <strong className="text-[#35D399]">
            {(process.env.EMAIL_PROVIDER || "outbox").toUpperCase()}
          </strong>{" "}
          • Total Queued/Sent Jobs in Outbox:{" "}
          <strong className="text-[#F8FAFC]">{emailOutboxCount}</strong>
        </p>
        <p className="text-[#94A3B8]">
          Reservation Expiry Window:{" "}
          <strong className="text-[#F8FAFC]">
            {process.env.RESERVATION_TTL_MINUTES || "15"} minutes
          </strong>
        </p>
      </div>
    </div>
  );
}
