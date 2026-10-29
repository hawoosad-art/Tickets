"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SUPPORTED_CURRENCIES, SupportedCurrency } from "@/lib/money";

interface CurrencyContextValue {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "KES",
  setCurrency: () => {},
});

export function CurrencyProvider({
  children,
  initialCurrency = "KES",
}: {
  children: React.ReactNode;
  initialCurrency?: SupportedCurrency;
}) {
  const [currency, setCurrencyState] =
    useState<SupportedCurrency>(initialCurrency);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("t254_currency");
      if (
        saved &&
        SUPPORTED_CURRENCIES.includes(saved as SupportedCurrency)
      ) {
        setCurrencyState(saved as SupportedCurrency);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setCurrency = (next: SupportedCurrency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem("t254_currency", next);
    } catch {
      // ignore
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
