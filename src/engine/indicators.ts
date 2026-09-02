import { roundToCents, type Cents } from "./money";
import { ratioToPpm } from "./rate";
import { buildSchedule } from "./schedule";
import type { Indicators, MonthlyProjection, ProjectionInput } from "./types";

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

function upfrontCosts(input: ProjectionInput): Cents {
  const firstYearEnd = input.startMonth + 11;

  return input.lines
    .filter(
      (line) =>
        line.kind === "expense" &&
        line.recurrence === "one_off" &&
        line.amountMode === "fixed" &&
        line.startMonth <= firstYearEnd,
    )
    .reduce((total, line) => total + line.amount, 0);
}

export function computeIndicators(
  projection: readonly MonthlyProjection[],
  input: ProjectionInput,
): Indicators {
  const firstYear = projection.slice(0, 12);

  const firstYearRent = sum(firstYear.map((m) => m.rent));
  const firstYearNet = sum(firstYear.map((m) => m.net));
  const firstYearExpenses = sum(firstYear.map((m) => m.expenses));
  const firstYearTax = sum(firstYear.map((m) => m.tax));

  const acquisitionCost = (input.property.purchasePrice ?? 0) + upfrontCosts(input);
  const financed = input.loans.reduce(
    (total, loan) => total + buildSchedule(loan).financedPrincipal,
    0,
  );
  const cashInvested = Math.max(0, acquisitionCost - financed);

  const hasRent = firstYearRent > 0;
  const breakEven = projection.find((m) => m.cumulative >= 0);
  const startedNegative = projection[0]?.cumulative < 0;

  return {
    firstYearMonthlyEffort: -roundToCents(sum(firstYear.map((m) => m.share)) / firstYear.length),
    averageMonthlyNet: roundToCents(sum(projection.map((m) => m.net)) / Math.max(1, projection.length)),
    firstYearNet,
    firstYearRent,
    acquisitionCost,
    cashInvested,
    grossYieldPpm: hasRent ? ratioToPpm(firstYearRent, acquisitionCost) : null,
    netYieldPpm: hasRent ? ratioToPpm(firstYearRent - firstYearExpenses, acquisitionCost) : null,
    netNetYieldPpm: hasRent
      ? ratioToPpm(firstYearRent - firstYearExpenses - firstYearTax, acquisitionCost)
      : null,
    cashOnCashPpm: hasRent ? ratioToPpm(firstYearNet, cashInvested) : null,
    breakEvenMonth: startedNegative ? (breakEven?.month ?? null) : (projection[0]?.month ?? null),
    worstCumulative: Math.min(0, ...projection.map((m) => m.cumulative)),
    totalInterest: sum(projection.map((m) => m.interest)),
    totalInsurance: sum(projection.map((m) => m.loanInsurance)),
    totalPenalties: sum(projection.map((m) => m.loanPenalty)),
    totalCreditCost: sum(projection.map((m) => m.interest + m.loanInsurance + m.loanPenalty)),
    finalOutstandingBalance: projection.at(-1)?.outstandingBalance ?? 0,
    finalNetWorth: projection.at(-1)?.netWorth ?? 0,
  };
}
