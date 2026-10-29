export type SupportedCurrency = "KES" | "USD" | "EUR" | "GBP";

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  "KES",
  "USD",
  "EUR",
  "GBP",
];

// Indicative FX rates relative to 1 USD for optional UI display conversion ONLY.
// Authoritative checkout pricing ALWAYS uses the exact event TicketType minor units & currency from PostgreSQL.
const INDICATIVE_USD_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  KES: 129.5,
  EUR: 0.92,
  GBP: 0.79,
};

export function formatMoney(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase();
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      minimumFractionDigits: code === "KES" && amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${code} ${major.toFixed(2)}`;
  }
}

export function formatMinorToDecimalString(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

export function formatDisplayCurrency(
  amountMinor: number,
  sourceCurrency: string,
  displayCurrency?: string
): { primary: string; indicative?: string } {
  const src = sourceCurrency.toUpperCase() as SupportedCurrency;
  const primary = formatMoney(amountMinor, src);

  if (
    !displayCurrency ||
    displayCurrency.toUpperCase() === src ||
    !INDICATIVE_USD_RATES[src] ||
    !INDICATIVE_USD_RATES[displayCurrency.toUpperCase() as SupportedCurrency]
  ) {
    return { primary };
  }

  const target = displayCurrency.toUpperCase() as SupportedCurrency;
  const usdMajor = amountMinor / 100 / INDICATIVE_USD_RATES[src];
  const convertedMinor = Math.round(usdMajor * INDICATIVE_USD_RATES[target] * 100);

  return {
    primary,
    indicative: `~${formatMoney(convertedMinor, target)}`,
  };
}

export function convertKesMinorToUsdMinor(
  kesMinor: number,
  rateOverride?: number
): { usdMinor: number; rateApplied: string } {
  const envRate = Number(process.env.PAYPAL_KES_TO_USD_RATE || "129.50");
  const rate =
    rateOverride && rateOverride > 0
      ? rateOverride
      : Number.isFinite(envRate) && envRate > 0
        ? envRate
        : 129.5;
  const kesMajor = kesMinor / 100;
  const usdMajor = kesMajor / rate;
  const usdMinor = Math.max(100, Math.round(usdMajor * 100));
  return {
    usdMinor,
    rateApplied: `1 USD = ${rate.toFixed(2)} KES`,
  };
}
