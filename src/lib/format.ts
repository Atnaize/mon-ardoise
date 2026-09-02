import { centsToEuros, type Cents } from "@/engine/money";
import { monthOf, yearOf, type YearMonth } from "@/engine/month";
import { ppmToRate, type Ppm } from "@/engine/rate";

export function money(cents: Cents, locale: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(centsToEuros(cents));
}

export function percent(ppm: Ppm | null, locale: string): string {
  if (ppm == null) {
    return "—";
  }

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ppmToRate(ppm));
}

export function monthLabel(month: YearMonth, locale: string): string {
  const date = new Date(Date.UTC(yearOf(month), monthOf(month) - 1, 1));

  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
}

export function toneOf(cents: Cents): "positive" | "negative" | "neutral" {
  if (cents > 0) {
    return "positive";
  }

  if (cents < 0) {
    return "negative";
  }

  return "neutral";
}
