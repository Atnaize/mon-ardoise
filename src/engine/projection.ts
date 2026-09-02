import { applyShare, roundToCents, type Cents } from "./money";
import { monthOf, type YearMonth } from "./month";
import { ppmToRate } from "./rate";
import { rentByMonth } from "./rent";
import { totalsByMonth } from "./recurrence";
import { buildSchedule } from "./schedule";
import type { MonthlyProjection, ProjectionInput, Schedule } from "./types";

interface LoanTotals {
  payment: Cents[];
  insurance: Cents[];
  penalty: Cents[];
  prepayment: Cents[];
  interest: Cents[];
  principal: Cents[];
  balance: Cents[];
}

function aggregateLoans(
  schedules: readonly Schedule[],
  startMonth: YearMonth,
  horizonMonths: number,
): LoanTotals {
  const blank = () => new Array<Cents>(horizonMonths).fill(0);
  const totals: LoanTotals = {
    payment: blank(),
    insurance: blank(),
    penalty: blank(),
    prepayment: blank(),
    interest: blank(),
    principal: blank(),
    balance: blank(),
  };

  for (const schedule of schedules) {
    for (const installment of schedule.installments) {
      const offset = installment.month - startMonth;

      if (offset < 0 || offset >= horizonMonths) {
        continue;
      }

      totals.payment[offset] += installment.payment;
      totals.insurance[offset] += installment.insurance;
      totals.penalty[offset] += installment.penalty;
      totals.prepayment[offset] += installment.prepayment;
      totals.interest[offset] += installment.interest;
      totals.principal[offset] += installment.principal;
      totals.balance[offset] += installment.closingBalance;
    }
  }

  return totals;
}

function taxByMonth(input: ProjectionInput): Cents[] {
  const { horizonMonths, property, startMonth } = input;
  const taxes = new Array<Cents>(horizonMonths).fill(0);

  if (property.estimatedTaxYearly === 0) {
    return taxes;
  }

  if (property.taxMode === "monthly_provision") {
    const monthly = roundToCents(property.estimatedTaxYearly / 12);

    return taxes.map(() => monthly);
  }

  const dueMonth = property.taxMonth ?? 12;

  for (let offset = 0; offset < horizonMonths; offset += 1) {
    if (monthOf(startMonth + offset) === dueMonth) {
      taxes[offset] = property.estimatedTaxYearly;
    }
  }

  return taxes;
}

function valueByMonth(input: ProjectionInput): Cents[] {
  const { horizonMonths, property } = input;
  const base = property.currentValue ?? property.purchasePrice ?? 0;
  const growth = ppmToRate(property.valueGrowthRatePpm);

  return Array.from({ length: horizonMonths }, (_, offset) =>
    growth === 0 ? base : roundToCents(base * Math.pow(1 + growth, offset / 12)),
  );
}

export function project(input: ProjectionInput): MonthlyProjection[] {
  const { startMonth, horizonMonths } = input;
  const share = input.sharePermille ?? 1000;

  const rents = rentByMonth(input.leases, startMonth, horizonMonths);
  const rentAt = (month: YearMonth) => rents[month - startMonth] ?? 0;

  const expenses = totalsByMonth(
    input.lines.filter((line) => line.kind === "expense"),
    startMonth,
    horizonMonths,
    rentAt,
  );
  const otherIncome = totalsByMonth(
    input.lines.filter((line) => line.kind === "income"),
    startMonth,
    horizonMonths,
    rentAt,
  );

  const loans = aggregateLoans(
    input.loans.map(buildSchedule),
    startMonth,
    horizonMonths,
  );
  const taxes = taxByMonth(input);
  const values = valueByMonth(input);

  const projection: MonthlyProjection[] = [];
  let cumulative: Cents = 0;

  for (let offset = 0; offset < horizonMonths; offset += 1) {
    const income = rents[offset] + otherIncome[offset];
    const net =
      income -
      expenses[offset] -
      loans.payment[offset] -
      loans.insurance[offset] -
      loans.penalty[offset] -
      loans.prepayment[offset] -
      taxes[offset];

    cumulative += net;

    projection.push({
      month: startMonth + offset,
      rent: rents[offset],
      otherIncome: otherIncome[offset],
      income,
      expenses: expenses[offset],
      loanPayment: loans.payment[offset],
      loanInsurance: loans.insurance[offset],
      loanPenalty: loans.penalty[offset],
      loanPrepayment: loans.prepayment[offset],
      interest: loans.interest[offset],
      principal: loans.principal[offset],
      tax: taxes[offset],
      net,
      cumulative,
      outstandingBalance: loans.balance[offset],
      propertyValue: values[offset],
      netWorth: values[offset] - loans.balance[offset],
      share: applyShare(net, share),
    });
  }

  return projection;
}
