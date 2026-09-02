import type { InferSelectModel } from "drizzle-orm";

import type {
  flowLine,
  lease,
  loan,
  loanInsurance,
  loanPrepayment,
  loanRatePeriod,
  property,
  propertyMember,
} from "@/db/schema";
import { fromIsoDate, type YearMonth } from "@/engine/month";
import type { FlowLine, Lease, Loan, ProjectionInput } from "@/engine/types";

type PropertyRow = InferSelectModel<typeof property>;
type MemberRow = InferSelectModel<typeof propertyMember>;
type LoanRow = InferSelectModel<typeof loan>;
type RatePeriodRow = InferSelectModel<typeof loanRatePeriod>;
type InsuranceRow = InferSelectModel<typeof loanInsurance>;
type PrepaymentRow = InferSelectModel<typeof loanPrepayment>;
type FlowLineRow = InferSelectModel<typeof flowLine>;
type LeaseRow = InferSelectModel<typeof lease>;

export interface LoanBundle {
  loan: LoanRow;
  ratePeriods: RatePeriodRow[];
  insurances: InsuranceRow[];
  prepayments: PrepaymentRow[];
}

export interface PropertyBundle {
  property: PropertyRow;
  member?: MemberRow | null;
  loans: LoanBundle[];
  lines: FlowLineRow[];
  leases: LeaseRow[];
}

function monthOrNull(iso: string | null): YearMonth | null {
  return iso == null ? null : fromIsoDate(iso);
}

export function earliestMonth(bundle: PropertyBundle, fallback: YearMonth): YearMonth {
  const candidates = [
    monthOrNull(bundle.property.acquisitionDate),
    ...bundle.loans.map((entry) => fromIsoDate(entry.loan.startDate)),
    ...bundle.leases.map((entry) => fromIsoDate(entry.startDate)),
    ...bundle.lines.map((entry) => fromIsoDate(entry.startDate)),
  ].filter((month): month is YearMonth => month != null);

  return candidates.length === 0 ? fallback : Math.min(...candidates);
}

function toLoan(bundle: LoanBundle): Loan {
  const startMonth = fromIsoDate(bundle.loan.startDate);
  const periods = bundle.ratePeriods.length > 0 ? bundle.ratePeriods : [];

  return {
    id: bundle.loan.id,
    label: bundle.loan.label,
    principal: bundle.loan.principal,
    startMonth,
    termMonths: bundle.loan.termMonths,
    amortization: bundle.loan.amortization,
    deferralMonths: bundle.loan.deferralMonths,
    deferralType: bundle.loan.deferralType,
    ratePeriods: periods.map((period) => ({
      startMonth: period.startMonth,
      annualRatePpm: period.annualRatePpm,
      basis: period.rateBasis,
    })),
    insurances: bundle.insurances.map((insurance) => ({
      kind: insurance.kind,
      premiumMode: insurance.premiumMode,
      amount: insurance.amount,
      startMonth: monthOrNull(insurance.startDate),
      endMonth: monthOrNull(insurance.endDate),
    })),
    prepayments: bundle.prepayments.map((prepayment) => ({
      month: fromIsoDate(prepayment.date),
      amount: prepayment.amount,
      penaltyMode: prepayment.penaltyMode,
      penaltyValue: prepayment.penaltyValue,
      effect: prepayment.effect,
    })),
  };
}

function toFlowLine(row: FlowLineRow): FlowLine {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    amount: row.amount,
    amountMode: row.amountMode,
    recurrence: row.recurrence,
    recurrenceInterval: row.recurrenceInterval,
    startMonth: fromIsoDate(row.startDate),
    endMonth: monthOrNull(row.endDate),
    indexationRatePpm: row.indexationRatePpm,
    indexationMonth: row.indexationMonth,
    capitalize: row.capitalize,
    amortizationYears: row.amortizationYears,
    isAcquisitionCost: row.isAcquisitionCost,
  };
}

function toLease(row: LeaseRow): Lease {
  return {
    id: row.id,
    startMonth: fromIsoDate(row.startDate),
    endMonth: monthOrNull(row.endDate),
    monthlyRent: row.monthlyRent,
    indexationRatePpm: row.indexationRatePpm,
  };
}

export function toProjectionInput(
  bundle: PropertyBundle,
  startMonth: YearMonth,
): ProjectionInput {
  const contribution = bundle.member?.contributionSharePermille ?? 0;

  return {
    startMonth,
    horizonMonths: bundle.property.horizonYears * 12,
    property: {
      purchasePrice: bundle.property.purchasePrice,
      currentValue: bundle.property.currentValue,
      valueGrowthRatePpm: bundle.property.valueGrowthRatePpm,
      estimatedTaxYearly: bundle.property.estimatedTaxYearly,
      taxMode: "monthly_provision",
      taxMonth: null,
    },
    loans: bundle.loans.map(toLoan),
    lines: bundle.lines.map(toFlowLine),
    leases: bundle.leases.map(toLease),
    sharePermille: contribution > 0 ? contribution : 1000,
  };
}
