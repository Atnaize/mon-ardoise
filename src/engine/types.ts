import type { Cents } from "./money";
import type { Ppm, RateBasis } from "./rate";
import type { YearMonth } from "./month";

export type Amortization = "annuity" | "constant_principal";
export type DeferralType = "none" | "interest_only" | "full";
export type InsuranceKind = "outstanding_balance" | "fire" | "other";
export type PremiumMode = "in_payment" | "annual" | "quarterly" | "single_financed";
export type PenaltyMode = "months_of_interest" | "percent" | "fixed" | "none";
export type PrepaymentEffect = "reduce_term" | "reduce_payment";
export type FlowKind = "expense" | "income";
export type AmountMode = "fixed" | "percent_of_rent";
export type Recurrence = "one_off" | "monthly" | "quarterly" | "yearly" | "every_n_years";

export interface RatePeriod {
  startMonth: number;
  annualRatePpm: Ppm;
  basis: RateBasis;
}

export interface Insurance {
  kind: InsuranceKind;
  premiumMode: PremiumMode;
  amount: Cents;
  startMonth?: YearMonth | null;
  endMonth?: YearMonth | null;
}

export interface Prepayment {
  month: YearMonth;
  amount: Cents;
  penaltyMode: PenaltyMode;
  penaltyValue: number;
  effect: PrepaymentEffect;
}

export interface Loan {
  id: string;
  label: string;
  principal: Cents;
  startMonth: YearMonth;
  termMonths: number;
  amortization: Amortization;
  deferralMonths: number;
  deferralType: DeferralType;
  ratePeriods: RatePeriod[];
  insurances: Insurance[];
  prepayments: Prepayment[];
}

export interface Installment {
  month: YearMonth;
  openingBalance: Cents;
  payment: Cents;
  interest: Cents;
  principal: Cents;
  insurance: Cents;
  prepayment: Cents;
  penalty: Cents;
  closingBalance: Cents;
}

export interface Schedule {
  loanId: string;
  financedPrincipal: Cents;
  installments: Installment[];
}

export interface FlowLine {
  id: string;
  kind: FlowKind;
  label: string;
  amount: Cents;
  amountMode: AmountMode;
  recurrence: Recurrence;
  recurrenceInterval: number;
  startMonth: YearMonth;
  endMonth?: YearMonth | null;
  indexationRatePpm: Ppm;
  indexationMonth?: number | null;
  capitalize: boolean;
  amortizationYears?: number | null;
  /** Entre dans le coût d'acquisition, dénominateur des rendements, au lieu d'être une charge d'exploitation. */
  isAcquisitionCost: boolean;
}

export interface Lease {
  id: string;
  startMonth: YearMonth;
  endMonth?: YearMonth | null;
  monthlyRent: Cents;
  indexationRatePpm: Ppm;
}

export interface PropertyAssumptions {
  purchasePrice?: Cents | null;
  currentValue?: Cents | null;
  valueGrowthRatePpm: Ppm;
}

export interface ProjectionInput {
  startMonth: YearMonth;
  horizonMonths: number;
  property: PropertyAssumptions;
  loans: Loan[];
  lines: FlowLine[];
  leases: Lease[];
  sharePermille?: number;
}

export interface MonthlyProjection {
  month: YearMonth;
  rent: Cents;
  otherIncome: Cents;
  income: Cents;
  expenses: Cents;
  /** Part des charges qui se répète : ce qui fait un rendement, par opposition aux frais ponctuels. */
  recurringExpenses: Cents;
  /** Part des charges qui relève de l'acquisition du bien. */
  acquisitionExpenses: Cents;
  loanPayment: Cents;
  loanInsurance: Cents;
  loanPenalty: Cents;
  loanPrepayment: Cents;
  interest: Cents;
  principal: Cents;
  net: Cents;
  cumulative: Cents;
  outstandingBalance: Cents;
  propertyValue: Cents;
  netWorth: Cents;
  share: Cents;
}

export interface Indicators {
  referenceMonth: YearMonth;
  rentStartMonth: YearMonth | null;
  monthlyEffort: Cents;
  averageMonthlyNet: Cents;
  referenceYearNet: Cents;
  annualRent: Cents;
  acquisitionCost: Cents;
  cashInvested: Cents;
  grossYieldPpm: Ppm | null;
  netYieldPpm: Ppm | null;
  cashOnCashPpm: Ppm | null;
  /** Frais engagés pour acquérir le bien : notaire, enregistrement, agence, mise en location. */
  upfrontCosts: Cents;
  /** Frais ponctuels survenus après la mise en location. */
  rentalPeriodCosts: Cents;
  /** Cumul des charges récurrentes sur tout l'horizon. */
  recurringCosts: Cents;
  /** Prix d'acquisition, tous frais et coût du crédit compris, sur l'horizon. */
  totalCostOfOwnership: Cents;
  breakEvenMonth: YearMonth | null;
  worstCumulative: Cents;
  totalInterest: Cents;
  totalInsurance: Cents;
  totalPenalties: Cents;
  totalCreditCost: Cents;
  finalOutstandingBalance: Cents;
  finalNetWorth: Cents;
}

export interface IndicatorOptions {
  referenceMonth?: YearMonth;
}

export interface ProjectionResult {
  projection: MonthlyProjection[];
  indicators: Indicators;
}
