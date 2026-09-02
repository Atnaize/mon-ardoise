import { roundToCents, type Cents } from "./money";
import { ratioToPpm } from "./rate";
import { buildSchedule } from "./schedule";
import type {
  IndicatorOptions,
  Indicators,
  MonthlyProjection,
  ProjectionInput,
} from "./types";

const WINDOW = 12;

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

function windowFrom(
  projection: readonly MonthlyProjection[],
  startIndex: number,
): MonthlyProjection[] {
  if (projection.length <= WINDOW) {
    return [...projection];
  }

  const clamped = Math.max(0, Math.min(startIndex, projection.length - WINDOW));

  return projection.slice(clamped, clamped + WINDOW);
}

function indexOfMonth(projection: readonly MonthlyProjection[], month: number): number {
  const index = projection.findIndex((entry) => entry.month >= month);

  return index === -1 ? 0 : index;
}

function upfrontCosts(input: ProjectionInput, until: number): Cents {
  return input.lines
    .filter(
      (line) =>
        line.kind === "expense" &&
        line.recurrence === "one_off" &&
        line.amountMode === "fixed" &&
        line.startMonth <= until,
    )
    .reduce((total, line) => total + line.amount, 0);
}

export function computeIndicators(
  projection: readonly MonthlyProjection[],
  input: ProjectionInput,
  options: IndicatorOptions = {},
): Indicators {
  const referenceIndex =
    options.referenceMonth == null ? 0 : indexOfMonth(projection, options.referenceMonth);
  const reference = windowFrom(projection, referenceIndex);

  const firstRentIndex = projection.findIndex((entry) => entry.rent > 0);
  const rented = firstRentIndex === -1 ? [] : windowFrom(projection, firstRentIndex);

  const annualRent = sum(rented.map((month) => month.rent));
  const rentedExpenses = sum(rented.map((month) => month.expenses));
  const rentedTax = sum(rented.map((month) => month.tax));
  const rentedNet = sum(rented.map((month) => month.net));

  const acquisitionCost =
    (input.property.purchasePrice ?? 0) + upfrontCosts(input, input.startMonth + WINDOW - 1);
  const financed = input.loans.reduce(
    (total, loan) => total + buildSchedule(loan).financedPrincipal,
    0,
  );
  const cashInvested = Math.max(0, acquisitionCost - financed);
  const hasRent = annualRent > 0;

  const startedNegative = (projection[0]?.cumulative ?? 0) < 0;
  const breakEven = projection.find((month) => month.cumulative >= 0);

  return {
    referenceMonth: reference[0]?.month ?? input.startMonth,
    rentStartMonth: firstRentIndex === -1 ? null : projection[firstRentIndex].month,
    monthlyEffort: -roundToCents(sum(reference.map((month) => month.share)) / Math.max(1, reference.length)),
    averageMonthlyNet: roundToCents(
      sum(projection.map((month) => month.net)) / Math.max(1, projection.length),
    ),
    referenceYearNet: sum(reference.map((month) => month.net)),
    annualRent,
    acquisitionCost,
    cashInvested,
    grossYieldPpm: hasRent ? ratioToPpm(annualRent, acquisitionCost) : null,
    netYieldPpm: hasRent ? ratioToPpm(annualRent - rentedExpenses, acquisitionCost) : null,
    netNetYieldPpm: hasRent
      ? ratioToPpm(annualRent - rentedExpenses - rentedTax, acquisitionCost)
      : null,
    cashOnCashPpm: hasRent ? ratioToPpm(rentedNet, cashInvested) : null,
    breakEvenMonth: startedNegative ? (breakEven?.month ?? null) : (projection[0]?.month ?? null),
    worstCumulative: Math.min(0, ...projection.map((month) => month.cumulative)),
    totalInterest: sum(projection.map((month) => month.interest)),
    totalInsurance: sum(projection.map((month) => month.loanInsurance)),
    totalPenalties: sum(projection.map((month) => month.loanPenalty)),
    totalCreditCost: sum(
      projection.map((month) => month.interest + month.loanInsurance + month.loanPenalty),
    ),
    finalOutstandingBalance: projection.at(-1)?.outstandingBalance ?? 0,
    finalNetWorth: projection.at(-1)?.netWorth ?? 0,
  };
}
