export type Ppm = number;

export type RateBasis = "equivalent" | "nominal_12";

export function percentToPpm(percent: number): Ppm {
  return Math.round(percent * 10_000);
}

export function ppmToPercent(ppm: Ppm): number {
  return ppm / 10_000;
}

export function ppmToRate(ppm: Ppm): number {
  return ppm / 1_000_000;
}

export function monthlyRate(annualPpm: Ppm, basis: RateBasis): number {
  const annual = ppmToRate(annualPpm);

  if (basis === "nominal_12") {
    return annual / 12;
  }

  return Math.pow(1 + annual, 1 / 12) - 1;
}

export function ratioToPpm(numerator: number, denominator: number): Ppm | null {
  if (denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 1_000_000);
}

export function formatPercent(ppm: Ppm, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ppmToRate(ppm));
}
