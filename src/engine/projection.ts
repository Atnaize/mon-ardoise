import { applyShare, roundToCents, type Cents } from "./money";
import type { YearMonth } from "./month";
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

function valueByMonth(input: ProjectionInput): Cents[] {
  const { horizonMonths, property } = input;
  const base = property.currentValue ?? property.purchasePrice ?? 0;
  const growth = ppmToRate(property.valueGrowthRatePpm);

  return Array.from({ length: horizonMonths }, (_, offset) =>
    growth === 0 ? base : roundToCents(base * Math.pow(1 + growth, offset / 12)),
  );
}

interface Acquisition {
  offset: number;
  downPayment: Cents;
}

/**
 * L'apport sur le prix — ce que les prêts ne financent pas — ne passe par aucune ligne de
 * frais : sans lui le cumul de trésorerie sous-estime ce qui est sorti de la poche. Il sort
 * au mois de l'acquisition, pas au premier mois de la projection, qui peut être antérieur.
 */
function acquisitionOf(
  input: ProjectionInput,
  schedules: readonly Schedule[],
  horizonMonths: number,
): Acquisition {
  const { purchasePrice, acquisitionMonth } = input.property;
  const financed = schedules.reduce((total, schedule) => total + schedule.financedPrincipal, 0);
  const starts = input.loans.map((loan) => loan.startMonth);
  const month =
    acquisitionMonth ?? (starts.length > 0 ? Math.min(...starts) : input.startMonth);

  return {
    offset: Math.min(Math.max(month - input.startMonth, 0), horizonMonths - 1),
    downPayment: purchasePrice == null ? 0 : purchasePrice - financed,
  };
}

export function project(input: ProjectionInput): MonthlyProjection[] {
  const { startMonth, horizonMonths } = input;
  const share = input.sharePermille ?? 1000;

  const rents = rentByMonth(input.leases, startMonth, horizonMonths);
  const rentAt = (month: YearMonth) => rents[month - startMonth] ?? 0;

  const expenseLines = input.lines.filter((line) => line.kind === "expense");
  const expenses = totalsByMonth(expenseLines, startMonth, horizonMonths, rentAt);
  const recurringExpenses = totalsByMonth(
    expenseLines.filter((line) => line.recurrence !== "one_off"),
    startMonth,
    horizonMonths,
    rentAt,
  );
  const acquisitionExpenses = totalsByMonth(
    expenseLines.filter((line) => line.isAcquisitionCost && line.recurrence === "one_off"),
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

  const schedules = input.loans.map(buildSchedule);
  const loans = aggregateLoans(schedules, startMonth, horizonMonths);
  const values = valueByMonth(input);
  const acquisition = acquisitionOf(input, schedules, horizonMonths);

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
      loans.prepayment[offset];

    cumulative += net;

    // Avant l'acquisition il n'y a pas encore de bien à revendre, seulement des frais engagés.
    const owned = offset >= acquisition.offset;
    const cashInjected = (owned ? acquisition.downPayment : 0) - cumulative;
    const netWorth = values[offset] - loans.balance[offset];

    projection.push({
      month: startMonth + offset,
      rent: rents[offset],
      otherIncome: otherIncome[offset],
      income,
      expenses: expenses[offset],
      recurringExpenses: recurringExpenses[offset],
      acquisitionExpenses: acquisitionExpenses[offset],
      loanPayment: loans.payment[offset],
      loanInsurance: loans.insurance[offset],
      loanPenalty: loans.penalty[offset],
      loanPrepayment: loans.prepayment[offset],
      interest: loans.interest[offset],
      principal: loans.principal[offset],
      net,
      cumulative,
      outstandingBalance: loans.balance[offset],
      propertyValue: values[offset],
      netWorth,
      cashInjected,
      netPosition: (owned ? netWorth : 0) - cashInjected,
      share: applyShare(net, share),
    });
  }

  return projection;
}
