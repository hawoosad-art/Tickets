"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { PublicPaymentMethodOption } from "@/services/payments/types";
import { PricedCheckoutBreakdown } from "@/services/orders/order-service";

const customerStepSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  email: z.string().trim().email("Valid email address is required"),
  phone: z.string().trim().min(7, "Phone number is required"),
  countryCode: z.string().trim().length(2, "2-letter country code (e.g. KE, US, GB)"),
  billingAddressLine1: z.string().trim().optional(),
  billingCity: z.string().trim().optional(),
  billingPostalCode: z.string().trim().optional(),
});

type CustomerStepValues = z.infer<typeof customerStepSchema>;

export function CheckoutWizardClient({
  prefillUser,
}: {
  prefillUser: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
  } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const simStep = searchParams.get("step");
  const simRef = searchParams.get("ref");
  const simToken = searchParams.get("token");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quote, setQuote] = useState<PricedCheckoutBreakdown | null>(null);
  const [methods, setMethods] = useState<PublicPaymentMethodOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<
    "PAYPAL" | "PAYSTACK" | "SIMULATED" | null
  >(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(
    () => `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const form = useForm<CustomerStepValues>({
    resolver: zodResolver(customerStepSchema),
    defaultValues: {
      firstName: prefillUser?.firstName || "",
      lastName: prefillUser?.lastName || "",
      email: prefillUser?.email || "",
      phone: prefillUser?.phone || "",
      countryCode: prefillUser?.countryCode || "KE",
      billingAddressLine1: "",
      billingCity: "",
      billingPostalCode: "",
    },
  });

  useEffect(() => {
    if (simStep === "simulate") {
      setLoadingQuote(false);
      return;
    }

    async function loadServerQuote() {
      setLoadingQuote(true);
      setError(null);
      try {
        let eventId = searchParams.get("eventId") || "";
        const itemsParam = searchParams.get("items") || "";
        let items: Array<{ ticketTypeId: string; quantity: number }> = [];

        if (eventId && itemsParam) {
          items = itemsParam
            .split(",")
            .map((pair) => {
              const [ticketTypeId, q] = pair.split(":");
              return { ticketTypeId, quantity: Number(q) };
            })
            .filter((i) => i.ticketTypeId && i.quantity > 0);
        } else {
          const saved = window.sessionStorage.getItem("t254_checkout_draft");
          if (saved) {
            const parsed = JSON.parse(saved) as {
              eventId: string;
              items: Array<{ ticketTypeId: string; quantity: number }>;
            };
            eventId = parsed.eventId;
            items = parsed.items;
          }
        }

        if (!eventId || items.length === 0) {
          setError(
            "Your ticket selection is empty. Please choose a match and ticket category first."
          );
          setLoadingQuote(false);
          return;
        }

        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, items }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to calculate order summary.");
        }
        setQuote(data.quote);
        setMethods(data.availablePaymentMethods || []);
        if (data.availablePaymentMethods?.length > 0) {
          setSelectedProvider(data.availablePaymentMethods[0].provider);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quote.");
      } finally {
        setLoadingQuote(false);
      }
    }

    loadServerQuote();
  }, [searchParams, simStep]);

  async function handleSimulatorDecision(
    outcome: "APPROVE" | "FAIL" | "CANCEL"
  ) {
    if (!simRef) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingReference: simRef,
          accessToken: simToken || undefined,
          outcome,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Simulation request failed.");
      }

      if (outcome === "APPROVE") {
        router.push(
          `/checkout/success?ref=${encodeURIComponent(simRef)}&token=${encodeURIComponent(simToken || "")}&provider=SIMULATED`
        );
      } else if (outcome === "CANCEL") {
        router.push(
          `/checkout/cancelled?ref=${encodeURIComponent(simRef)}&token=${encodeURIComponent(simToken || "")}`
        );
      } else {
        setError(
          "Simulated payment declined. Inventory reservation has been safely released."
        );
        setSubmitting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation error.");
      setSubmitting(false);
    }
  }

  async function handleInitiatePayment() {
    if (!quote || !selectedProvider) return;
    const valid = await form.trigger();
    if (!valid) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const values = form.getValues();
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: quote.eventId,
          items: quote.items.map((it) => ({
            ticketTypeId: it.ticketTypeId,
            quantity: it.quantity,
          })),
          customer: values,
          provider: selectedProvider,
          paymentMethod: selectedProvider.toLowerCase(),
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout initiation failed.");
      }

      // Redirect to hosted payment gateway (PayPal / Paystack) or simulator confirmation view
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment initiation failed.");
      setSubmitting(false);
    }
  }

  // Dedicated Step 4 Hosted Sandbox Simulator Screen (only in non-production dev mode)
  if (simStep === "simulate" && simRef) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="t254-card border-amber-400/50 p-7 space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold uppercase tracking-wider">
                Development Sandbox Payment Simulator
              </p>
              <p className="mt-1">
                No real card or M-Pesa account is charged here. Approving triggers
                a cryptographically signed webhook to test end-to-end payment
                verification and QR PDF ticket generation.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-[#94A3B8]">Booking Reference</span>
            <p className="text-xl font-extrabold font-mono text-[#F8FAFC]">
              {simRef}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSimulatorDecision("APPROVE")}
              className="t254-btn-primary w-full py-3"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Simulate Verified Payment Success
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSimulatorDecision("FAIL")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 transition"
            >
              <XCircle className="h-4 w-4" />
              Simulate Payment Failure (Releases Stock)
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSimulatorDecision("CANCEL")}
              className="t254-btn-secondary w-full"
            >
              Cancel Checkout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingQuote) {
    return (
      <div className="t254-card p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#35D399]" />
        <p className="text-sm text-[#94A3B8]">
          Verifying live ticket availability & server-side pricing...
        </p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="t254-card p-10 text-center space-y-4">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-400" />
        <p className="text-base font-bold text-[#F8FAFC]">
          {error || "No active ticket selection found."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/matches")}
          className="t254-btn-primary"
        >
          Browse Matches
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* LEFT: MULTI-STEP WIZARD */}
      <div className="lg:col-span-7 space-y-6">
        {/* Stepper Header */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1, label: "1. Order Summary" },
            { num: 2, label: "2. Customer Details" },
            { num: 3, label: "3. Secure Payment" },
          ].map((s) => (
            <div
              key={s.num}
              className={`rounded-xl border px-3 py-2.5 text-center text-xs font-bold transition ${
                step === s.num
                  ? "border-[#35D399] bg-[#35D399]/15 text-[#35D399]"
                  : step > s.num
                    ? "border-[#35D399]/40 bg-[#161E2E] text-[#F8FAFC]"
                    : "border-[#293548] bg-[#161E2E] text-[#94A3B8]"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ORDER SUMMARY */}
        {step === 1 && (
          <div className="t254-card p-6 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
                Step 1 of 3
              </span>
              <h2 className="text-xl font-extrabold text-[#F8FAFC] mt-1">
                Review Your Match Selection
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {quote.eventTitle}
              </p>
            </div>

            <div className="divide-y divide-[#293548] border-y border-[#293548]">
              {quote.items.map((item) => (
                <div
                  key={item.ticketTypeId}
                  className="py-3.5 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-bold text-[#F8FAFC]">
                      {item.ticketTypeName}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {item.quantity} ×{" "}
                      {formatMoney(item.unitPriceMinor, quote.currency)}
                    </p>
                  </div>
                  <span className="font-bold text-[#F8FAFC]">
                    {formatMoney(item.lineTotalMinor, quote.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="t254-btn-primary"
              >
                Continue to Customer Details
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CUSTOMER DETAILS */}
        {step === 2 && (
          <form
            onSubmit={form.handleSubmit(() => setStep(3))}
            className="t254-card p-6 space-y-5"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
                Step 2 of 3
              </span>
              <h2 className="text-xl font-extrabold text-[#F8FAFC] mt-1">
                Attendee & Delivery Details
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Digital PDF tickets and QR codes will be delivered to this email
                address.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  First Name *
                </label>
                <input
                  {...form.register("firstName")}
                  className="t254-input"
                  placeholder="Brian"
                />
                {form.formState.errors.firstName && (
                  <p className="mt-1 text-xs text-rose-400">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Last Name *
                </label>
                <input
                  {...form.register("lastName")}
                  className="t254-input"
                  placeholder="Kamau"
                />
                {form.formState.errors.lastName && (
                  <p className="mt-1 text-xs text-rose-400">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  {...form.register("email")}
                  className="t254-input"
                  placeholder="you@example.com"
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-rose-400">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Phone Number *
                </label>
                <input
                  {...form.register("phone")}
                  className="t254-input"
                  placeholder="+254712345678"
                />
                {form.formState.errors.phone && (
                  <p className="mt-1 text-xs text-rose-400">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Country of Residence (ISO-2) *
                </label>
                <input
                  {...form.register("countryCode")}
                  maxLength={2}
                  className="t254-input uppercase"
                  placeholder="KE"
                />
                {form.formState.errors.countryCode && (
                  <p className="mt-1 text-xs text-rose-400">
                    {form.formState.errors.countryCode.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Billing City (Optional)
                </label>
                <input
                  {...form.register("billingCity")}
                  className="t254-input"
                  placeholder="Nairobi"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="t254-btn-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button type="submit" className="t254-btn-primary">
                Continue to Payment
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PAYMENT PROVIDER SELECTION */}
        {step === 3 && (
          <div className="t254-card p-6 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#35D399]">
                Step 3 of 3
              </span>
              <h2 className="text-xl font-extrabold text-[#F8FAFC] mt-1">
                Select Secure Payment Method
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Only payment gateways actively configured for this merchant are
                displayed. Raw card numbers or CVV values never touch Ticket254
                servers.
              </p>
            </div>

            {methods.length === 0 ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-200">
                No live or sandbox payment provider is currently enabled. Please
                configure PayPal or Paystack credentials in environment settings.
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition ${
                      selectedProvider === m.provider
                        ? "border-[#35D399] bg-[#35D399]/10"
                        : "border-[#293548] bg-[#0B1020] hover:border-[#60A5FA]/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentProvider"
                      checked={selectedProvider === m.provider}
                      onChange={() => setSelectedProvider(m.provider)}
                      className="mt-1 accent-[#35D399]"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#F8FAFC]">
                          {m.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {m.badges.map((b) => (
                            <span
                              key={b}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                m.isSimulated
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-[#161E2E] border border-[#293548] text-[#60A5FA]"
                              }`}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[#94A3B8]">{m.sublabel}</p>
                      {m.currencyNote && (
                        <p className="text-[11px] text-[#60A5FA] pt-0.5">
                          {m.currencyNote}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="t254-btn-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={submitting || !selectedProvider}
                onClick={handleInitiatePayment}
                className="t254-btn-primary px-6 py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reserving & Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {formatMoney(quote.totalMinor, quote.currency)}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: AUTHORITATIVE PRICE BREAKDOWN */}
      <aside className="lg:col-span-5">
        <div className="t254-card p-6 space-y-4 sticky top-24">
          <h3 className="text-base font-extrabold text-[#F8FAFC]">
            Order Price Summary
          </h3>
          <p className="text-xs text-[#60A5FA] font-semibold">
            {quote.eventTitle}
          </p>

          <div className="space-y-2 border-y border-[#293548] py-4 text-xs">
            <div className="flex justify-between text-[#94A3B8]">
              <span>Tickets ({quote.totalTickets})</span>
              <span className="text-[#F8FAFC] font-semibold">
                {formatMoney(quote.subtotalMinor, quote.currency)}
              </span>
            </div>
            <div className="flex justify-between text-[#94A3B8]">
              <span>Booking Fees</span>
              <span className="text-[#F8FAFC] font-semibold">
                {formatMoney(quote.bookingFeeMinor, quote.currency)}
              </span>
            </div>
            <div className="flex justify-between text-[#94A3B8]">
              <span>Applicable Taxes ({quote.taxLabel})</span>
              <span className="text-[#F8FAFC] font-semibold">
                {formatMoney(quote.taxMinor, quote.currency)}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-[#F8FAFC]">
              Total ({quote.currency})
            </span>
            <span className="text-2xl font-extrabold text-[#35D399]">
              {formatMoney(quote.totalMinor, quote.currency)}
            </span>
          </div>

          <div className="rounded-xl bg-[#111827] border border-[#293548] p-3.5 space-y-1.5 text-[11px] text-[#94A3B8]">
            <p className="flex items-center gap-1.5 text-[#F8FAFC] font-semibold">
              <Lock className="h-3.5 w-3.5 text-[#35D399]" />
              15-Minute Atomic Inventory Hold
            </p>
            <p>
              Tickets are reserved atomically when you initiate payment and
              issued only after server-verified payment confirmation.
            </p>
            <p className="flex items-center gap-1.5 text-[#35D399] pt-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Zero raw card or CVV storage on Ticket254
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
