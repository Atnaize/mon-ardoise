import { distribute, roundToCents, type Cents } from "./money";
import { yearMonth, yearOf, type YearMonth } from "./month";
import { ppmToRate } from "./rate";
import type { FlowLine, Recurrence } from "./types";

export interface MonthlyAmount {
  month: YearMonth;
  amount: Cents;
}

const MONTHS_PER_STEP: Record<Recurrence, number> = {
  one_off: 0,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
  every_n_years: 12,
};

export function occurrenceMonths(line: FlowLine, horizonEnd: YearMonth): YearMonth[] {
  const last = line.endMonth == null ? horizonEnd : Math.min(line.endMonth, horizonEnd);

  if (line.startMonth > last) {
    return [];
  }

  if (line.recurrence === "one_off") {
    return [line.startMonth];
  }

  const step = MONTHS_PER_STEP[line.recurrence] * Math.max(1, line.recurrenceInterval);
  const months: YearMonth[] = [];

  for (let month = line.startMonth; month <= last; month += step) {
    months.push(month);
  }

  return months;
}

export function indexationSteps(line: FlowLine, month: YearMonth): number {
  if (line.indexationRatePpm === 0) {
    return 0;
  }

  if (line.indexationMonth == null) {
    return Math.floor((month - line.startMonth) / 12);
  }

  const sameYear = yearMonth(yearOf(line.startMonth), line.indexationMonth);
  const first = sameYear > line.startMonth ? sameYear : yearMonth(yearOf(line.startMonth) + 1, line.indexationMonth);

  if (month < first) {
    return 0;
  }

  return Math.floor((month - first) / 12) + 1;
}

function indexedAmount(line: FlowLine, month: YearMonth): Cents {
  const steps = indexationSteps(line, month);

  if (steps === 0) {
    return line.amount;
  }

  return roundToCents(line.amount * Math.pow(1 + ppmToRate(line.indexationRatePpm), steps));
}

export function expandLine(
  line: FlowLine,
  horizonEnd: YearMonth,
  rentAt: (month: YearMonth) => Cents = () => 0,
): MonthlyAmount[] {
  const result: MonthlyAmount[] = [];

  for (const month of occurrenceMonths(line, horizonEnd)) {
    const due =
      line.amountMode === "percent_of_rent"
        ? roundToCents((rentAt(month) * line.amount) / 1_000_000)
        : indexedAmount(line, month);

    if (due === 0) {
      continue;
    }

    const spreadMonths = line.capitalize ? Math.max(1, (line.amortizationYears ?? 0) * 12) : 1;

    if (spreadMonths === 1) {
      result.push({ month, amount: due });
      continue;
    }

    const parts = distribute(due, Array.from({ length: spreadMonths }, () => 1));

    parts.forEach((amount, offset) => {
      const target = month + offset;

      if (target <= horizonEnd && amount !== 0) {
        result.push({ month: target, amount });
      }
    });
  }

  return result;
}

export function totalsByMonth(
  lines: readonly FlowLine[],
  startMonth: YearMonth,
  horizonMonths: number,
  rentAt: (month: YearMonth) => Cents,
): Cents[] {
  const totals = new Array<Cents>(horizonMonths).fill(0);
  const horizonEnd = startMonth + horizonMonths - 1;

  for (const line of lines) {
    for (const { month, amount } of expandLine(line, horizonEnd, rentAt)) {
      const offset = month - startMonth;

      if (offset >= 0 && offset < horizonMonths) {
        totals[offset] += amount;
      }
    }
  }

  return totals;
}
