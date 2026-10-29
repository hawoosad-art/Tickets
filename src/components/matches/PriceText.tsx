"use client";

import React from "react";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { formatDisplayCurrency } from "@/lib/money";

export function PriceText({
  amountMinor,
  currency,
  className = "",
}: {
  amountMinor: number;
  currency: string;
  className?: string;
}) {
  const { currency: preferred } = useCurrency();
  const formatted = formatDisplayCurrency(amountMinor, currency, preferred);

  return (
    <span className={className}>
      <span>{formatted.primary}</span>
      {formatted.indicative && (
        <span
          className="ml-1.5 text-xs font-normal text-[#94A3B8]"
          title="Indicative converted estimate; checkout charges authoritative event currency"
        >
          ({formatted.indicative})
        </span>
      )}
    </span>
  );
}
