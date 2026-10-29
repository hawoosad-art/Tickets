"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Minus, Plus, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { PriceText } from "@/components/matches/PriceText";

export interface TicketCategoryView {
  id: string;
  name: string;
  code: string;
  categoryTier: string;
  description: string;
  sectionInfo: string | null;
  seated: boolean;
  priceMinor: number;
  currency: string;
  minPerOrder: number;
  maxPerOrder: number;
  availableCount: number;
}

export function TicketSelectorClient({
  eventId,
  eventSlug,
  eventTitle,
  currency,
  maxTicketsPerCustomer,
  isPurchasable,
  categories,
}: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  currency: string;
  maxTicketsPerCustomer: number;
  isPurchasable: boolean;
  categories: TicketCategoryView[];
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "EVENT_VIEW", eventId }),
    }).catch(() => {});
  }, [eventId]);

  const summary = useMemo(() => {
    let totalQty = 0;
    let totalMinor = 0;
    const selected: Array<{
      ticketTypeId: string;
      name: string;
      quantity: number;
      unitPriceMinor: number;
    }> = [];

    for (const cat of categories) {
      const q = quantities[cat.id] || 0;
      if (q > 0) {
        totalQty += q;
        totalMinor += q * cat.priceMinor;
        selected.push({
          ticketTypeId: cat.id,
          name: cat.name,
          quantity: q,
          unitPriceMinor: cat.priceMinor,
        });
      }
    }
    return { totalQty, totalMinor, selected };
  }, [categories, quantities]);

  function adjustQty(cat: TicketCategoryView, delta: number) {
    setError(null);
    const current = quantities[cat.id] || 0;
    let next = current + delta;
    if (next < 0) next = 0;
    if (delta > 0 && current === 0 && cat.minPerOrder > 1) {
      next = cat.minPerOrder;
    }
    if (delta < 0 && next > 0 && next < cat.minPerOrder) {
      next = 0;
    }

    const maxAllowedForTier = Math.min(cat.maxPerOrder, cat.availableCount);
    if (next > maxAllowedForTier) {
      setError(
        `Maximum ${maxAllowedForTier} tickets available per order in ${cat.name}.`
      );
      return;
    }

    const otherQty = summary.totalQty - current;
    if (otherQty + next > maxTicketsPerCustomer) {
      setError(
        `Purchase limit is ${maxTicketsPerCustomer} tickets per customer for this match.`
      );
      return;
    }

    setQuantities((prev) => ({ ...prev, [cat.id]: next }));
  }

  function proceedToCheckout() {
    if (summary.selected.length === 0) {
      setError("Please select at least one available ticket category.");
      return;
    }

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "TICKET_SELECTION",
        eventId,
        metadata: { totalQty: summary.totalQty },
      }),
    }).catch(() => {});

    try {
      window.sessionStorage.setItem(
        "t254_checkout_draft",
        JSON.stringify({
          eventId,
          eventSlug,
          eventTitle,
          currency,
          items: summary.selected,
        })
      );
    } catch {
      // ignore storage errors
    }

    const itemsParam = summary.selected
      .map((i) => `${i.ticketTypeId}:${i.quantity}`)
      .join(",");
    router.push(
      `/checkout?eventId=${encodeURIComponent(eventId)}&items=${encodeURIComponent(itemsParam)}`
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const qty = quantities[cat.id] || 0;
        const soldOut = !isPurchasable || cat.availableCount <= 0;

        return (
          <div
            key={cat.id}
            className={`t254-card p-5 transition ${
              qty > 0 ? "border-[#35D399]" : ""
            } ${soldOut ? "opacity-65" : ""}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#111827] border border-[#293548] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#60A5FA]">
                    {cat.categoryTier}
                  </span>
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    {cat.name}
                  </h3>
                  {cat.seated && (
                    <span className="text-[11px] text-[#35D399]">
                      • Reserved Seat
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94A3B8]">{cat.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#94A3B8] pt-1">
                  {cat.sectionInfo && <span>Section: {cat.sectionInfo}</span>}
                  <span>
                    Limit: {cat.minPerOrder}–{cat.maxPerOrder} per order
                  </span>
                  <span
                    className={
                      soldOut
                        ? "font-semibold text-rose-400"
                        : "font-semibold text-[#35D399]"
                    }
                  >
                    {soldOut
                      ? "Unavailable / Sold Out"
                      : `${cat.availableCount} available`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#293548]">
                <div className="text-left sm:text-right">
                  <PriceText
                    amountMinor={cat.priceMinor}
                    currency={cat.currency}
                    className="text-lg font-extrabold text-[#F8FAFC] block"
                  />
                  <span className="text-[11px] text-[#94A3B8]">
                    per ticket ({cat.currency})
                  </span>
                </div>

                {soldOut ? (
                  <span className="rounded-xl border border-[#293548] bg-[#111827] px-3.5 py-2 text-xs font-semibold text-[#94A3B8]">
                    Unavailable
                  </span>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#293548] bg-[#0B1020] p-1">
                    <button
                      type="button"
                      onClick={() => adjustQty(cat, -1)}
                      disabled={qty === 0}
                      aria-label={`Decrease ${cat.name} quantity`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#F8FAFC] hover:bg-[#161E2E] disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold text-[#F8FAFC]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustQty(cat, 1)}
                      disabled={
                        qty >= Math.min(cat.maxPerOrder, cat.availableCount)
                      }
                      aria-label={`Increase ${cat.name} quantity`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#35D399]/15 text-[#35D399] hover:bg-[#35D399]/25 disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="t254-card bg-[#111827] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-[#94A3B8]">
            Selected ({summary.totalQty} ticket{summary.totalQty === 1 ? "" : "s"})
          </span>
          <p className="text-2xl font-extrabold text-[#F8FAFC]">
            {formatMoney(summary.totalMinor, currency)}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#35D399] mt-0.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Final fees & inventory verified server-side at checkout
          </span>
        </div>

        <button
          type="button"
          disabled={!isPurchasable || summary.totalQty === 0}
          onClick={proceedToCheckout}
          className="t254-btn-primary w-full sm:w-auto px-6 py-3 text-sm"
        >
          Continue to Checkout
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
