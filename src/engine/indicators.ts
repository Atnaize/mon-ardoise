import { applyShare, roundToCents } from "./money";
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
  const rentedExpenses = sum(rented.map((month) => month.recurringExpenses));

  // Un rendement se mesure sur une année stabilisée : les frais ponctuels et les
  // remboursements anticipés sont de la trésorerie, pas des charges d'exploitation.
  const rentedNet = sum(
    rented.map(
      (month) =>
        month.net + (month.expenses - month.recurringExpenses) + month.loanPrepayment + month.loanPenalty,
    ),
  );

  const upfrontCosts = sum(projection.map((month) => month.acquisitionExpenses));
  const recurringCosts = sum(projection.map((month) => month.recurringExpenses));
  const totalCosts = sum(projection.map((month) => month.expenses));
  const rentalPeriodCosts = totalCosts - recurringCosts - upfrontCosts;

  const acquisitionCost = (input.property.purchasePrice ?? 0) + upfrontCosts;
  const financed = input.loans.reduce(
    (total, loan) => total + buildSchedule(loan).financedPrincipal,
    0,
  );
  const cashInvested = Math.max(0, acquisitionCost - financed);
  const hasRent = annualRent > 0;

  // Une projection démarre à la plus ancienne entrée datée, souvent dans le passé.
  // Ce qui est déjà dépensé n'est plus à financer : le cumul se recompte à partir
  // du mois de référence.
  const forward = projection.slice(referenceIndex);
  const base = referenceIndex === 0 ? 0 : (projection[referenceIndex - 1]?.cumulative ?? 0);
  const rebased = forward.map((month) => ({
    month: month.month,
    cumulative: month.cumulative - base,
  }));

  const lowest = rebased.reduce(
    (worst, entry) => (entry.cumulative < worst.cumulative ? entry : worst),
    { month: reference[0]?.month ?? input.startMonth, cumulative: 0 },
  );
  const breakEven = rebased.find(
    (entry) => entry.cumulative >= 0 && entry.month > lowest.month,
  );

  const permille = input.sharePermille ?? 1000;

  const lastLoanMonth = projection.reduce(
    (last, month) => (month.loanPayment > 0 ? month.month : last),
    -1,
  );
  const afterLoans = projection.filter((month) => month.month > lastLoanMonth).slice(0, WINDOW);

  const windowOneOff = sum(reference.map((month) => month.expenses - month.recurringExpenses));
  const recurringNet = sum(reference.map((month) => month.net)) + windowOneOff;

  return {
    referenceMonth: reference[0]?.month ?? input.startMonth,
    rentStartMonth: firstRentIndex === -1 ? null : projection[firstRentIndex].month,
    monthlyEquityBuilt: applyShare(
      roundToCents(sum(reference.map((month) => month.principal)) / Math.max(1, reference.length)),
      permille,
    ),
    monthlyNetAfterLoans:
      afterLoans.length === 0
        ? null
        : applyShare(
            roundToCents(sum(afterLoans.map((month) => month.net)) / afterLoans.length),
            permille,
          ),
    netWorthNow: reference[0]?.netWorth ?? projection[0]?.netWorth ?? 0,
    monthlyEffort: -roundToCents(
      applyShare(recurringNet, permille) / Math.max(1, reference.length),
    ),
    oneOffCostsAhead: applyShare(windowOneOff, permille),
    worstCumulativeMonth: lowest.cumulative < 0 ? lowest.month : null,
    referenceYearNet: sum(reference.map((month) => month.net)),
    annualRent,
    acquisitionCost,
    cashInvested,
    grossYieldPpm: hasRent ? ratioToPpm(annualRent, acquisitionCost) : null,
    netYieldPpm: hasRent ? ratioToPpm(annualRent - rentedExpenses, acquisitionCost) : null,
    cashOnCashPpm: hasRent ? ratioToPpm(rentedNet, cashInvested) : null,
    upfrontCosts,
    rentalPeriodCosts,
    recurringCosts,
    totalCostOfOwnership:
      (input.property.purchasePrice ?? 0) +
      totalCosts +
      sum(
        projection.map(
          (month) => month.interest + month.loanInsurance + month.loanPenalty,
        ),
      ),
    breakEvenMonth: lowest.cumulative < 0 ? (breakEven?.month ?? null) : (reference[0]?.month ?? null),
    worstCumulative: lowest.cumulative,
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
