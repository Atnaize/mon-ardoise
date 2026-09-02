import type { Cents } from "./money";
import type { YearMonth } from "./month";
import type { Indicators, ProjectionResult } from "./types";

export interface MonthlyDelta {
  month: YearMonth;
  net: Cents;
  cumulative: Cents;
  outstandingBalance: Cents;
  netWorth: Cents;
}

export type IndicatorDeltas = {
  [K in keyof Indicators]: number | null;
};

export interface Comparison {
  months: MonthlyDelta[];
  indicators: IndicatorDeltas;
}

function delta(variant: number | null, baseline: number | null): number | null {
  if (variant == null || baseline == null) {
    return null;
  }

  return variant - baseline;
}

export function compare(baseline: ProjectionResult, variant: ProjectionResult): Comparison {
  const length = Math.min(baseline.projection.length, variant.projection.length);
  const months: MonthlyDelta[] = [];

  for (let offset = 0; offset < length; offset += 1) {
    const base = baseline.projection[offset];
    const other = variant.projection[offset];

    months.push({
      month: other.month,
      net: other.net - base.net,
      cumulative: other.cumulative - base.cumulative,
      outstandingBalance: other.outstandingBalance - base.outstandingBalance,
      netWorth: other.netWorth - base.netWorth,
    });
  }

  const indicators = {} as IndicatorDeltas;

  for (const key of Object.keys(baseline.indicators) as (keyof Indicators)[]) {
    indicators[key] = delta(variant.indicators[key], baseline.indicators[key]);
  }

  return { months, indicators };
}
