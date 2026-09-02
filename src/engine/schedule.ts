import { paymentFromMonthlyRate } from "./annuity";
import { roundToCents, type Cents } from "./money";
import { monthlyRate } from "./rate";
import type { Insurance, Installment, Loan, Prepayment, RatePeriod, Schedule } from "./types";

function rateAt(periods: readonly RatePeriod[], monthIndex: number): number {
  const applicable = periods
    .filter((period) => period.startMonth <= monthIndex)
    .sort((a, b) => a.startMonth - b.startMonth)
    .at(-1);

  if (!applicable) {
    throw new Error("A loan needs at least one rate period starting at month 0");
  }

  return monthlyRate(applicable.annualRatePpm, applicable.basis);
}

function financedByInsurance(insurances: readonly Insurance[]): Cents {
  return insurances
    .filter((insurance) => insurance.premiumMode === "single_financed")
    .reduce((total, insurance) => total + insurance.amount, 0);
}

function insuranceDue(
  insurances: readonly Insurance[],
  loanStart: number,
  month: number,
): Cents {
  return insurances.reduce((total, insurance) => {
    if (insurance.premiumMode === "single_financed") {
      return total;
    }

    const start = insurance.startMonth ?? loanStart;

    if (month < start) {
      return total;
    }

    if (insurance.endMonth != null && month > insurance.endMonth) {
      return total;
    }

    const step = insurance.premiumMode === "annual" ? 12 : insurance.premiumMode === "quarterly" ? 3 : 1;

    return (month - start) % step === 0 ? total + insurance.amount : total;
  }, 0);
}

function penaltyFor(prepayment: Prepayment, rate: number): Cents {
  switch (prepayment.penaltyMode) {
    case "months_of_interest":
      return roundToCents(prepayment.amount * rate * prepayment.penaltyValue);
    case "percent":
      return roundToCents((prepayment.amount * prepayment.penaltyValue) / 1_000_000);
    case "fixed":
      return prepayment.penaltyValue;
    case "none":
      return 0;
  }
}

export function buildSchedule(loan: Loan): Schedule {
  const financedPrincipal = loan.principal + financedByInsurance(loan.insurances);
  const deferralMonths = loan.deferralType === "none" ? 0 : loan.deferralMonths;

  if (deferralMonths >= loan.termMonths) {
    throw new Error("Deferral cannot cover the whole term");
  }

  const amortMonths = loan.termMonths - deferralMonths;
  const prepaymentsByMonth = new Map<number, Prepayment[]>();

  for (const prepayment of loan.prepayments) {
    const existing = prepaymentsByMonth.get(prepayment.month) ?? [];
    existing.push(prepayment);
    prepaymentsByMonth.set(prepayment.month, existing);
  }

  const installments: Installment[] = [];

  let balance = financedPrincipal;
  let payment = 0;
  let constantPrincipal = 0;
  let previousRate = Number.NaN;
  let amortIndex = 0;

  for (let monthIndex = 0; monthIndex < loan.termMonths; monthIndex += 1) {
    const month = loan.startMonth + monthIndex;
    const rate = rateAt(loan.ratePeriods, monthIndex);
    const openingBalance = balance;
    const interest = roundToCents(balance * rate);

    let periodPayment = 0;
    let principal = 0;

    if (monthIndex < deferralMonths) {
      if (loan.deferralType === "interest_only") {
        periodPayment = interest;
      }

      if (loan.deferralType === "full") {
        balance += interest;
      }
    } else {
      const monthsLeft = amortMonths - amortIndex;
      const rateChanged = rate !== previousRate;

      if (loan.amortization === "annuity") {
        if (rateChanged || payment === 0) {
          payment = paymentFromMonthlyRate(balance, monthsLeft, rate);
        }

        principal = Math.min(payment - interest, balance);
        periodPayment = principal + interest;
      } else {
        if (rateChanged || constantPrincipal === 0) {
          constantPrincipal = roundToCents(balance / monthsLeft);
        }

        principal = Math.min(constantPrincipal, balance);
        periodPayment = principal + interest;
      }

      if (monthsLeft === 1) {
        principal = balance;
        periodPayment = principal + interest;
      }

      balance -= principal;
      amortIndex += 1;
    }

    previousRate = rate;

    let prepaid: Cents = 0;
    let penalty: Cents = 0;

    for (const prepayment of prepaymentsByMonth.get(month) ?? []) {
      const applied = Math.min(prepayment.amount, balance);

      if (applied <= 0) {
        continue;
      }

      prepaid += applied;
      penalty += penaltyFor({ ...prepayment, amount: applied }, rate);
      balance -= applied;

      if (prepayment.effect === "reduce_payment") {
        payment = 0;
        constantPrincipal = 0;
      }
    }

    installments.push({
      month,
      openingBalance,
      payment: periodPayment,
      interest,
      principal,
      insurance: insuranceDue(loan.insurances, loan.startMonth, month),
      prepayment: prepaid,
      penalty,
      closingBalance: balance,
    });

    if (balance <= 0) {
      break;
    }
  }

  return { loanId: loan.id, financedPrincipal, installments };
}
