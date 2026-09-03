import { z } from "zod";

import { eurosToCents } from "@/engine/money";
import { percentToPpm } from "@/engine/rate";

function parseDecimal(raw: string | number): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  const cleaned = raw.replace(/[\s ]/g, "").replace(",", ".");

  if (cleaned === "") {
    return null;
  }

  const value = Number(cleaned);

  return Number.isFinite(value) ? value : null;
}

export function decimalField(message: string) {
  return z.union([z.string(), z.number()]).transform((raw, ctx) => {
    const value = parseDecimal(raw);

    if (value == null) {
      ctx.addIssue({ code: "custom", message });

      return z.NEVER;
    }

    return value;
  });
}

export const euros = decimalField("Montant invalide").transform(eurosToCents);

export const optionalEuros = z
  .union([z.string(), z.number()])
  .transform((raw) => (typeof raw === "string" && raw.trim() === "" ? null : raw))
  .pipe(z.union([euros, z.null()]));

export const percent = decimalField("Pourcentage invalide").transform(percentToPpm);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");

export const optionalIsoDate = z
  .union([isoDate, z.literal("")])
  .transform((value) => (value === "" ? null : value));

export const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

export const propertySchema = z.object({
  name: z.string().trim().min(1, "Donne un nom au bien").max(120),
  type: z.enum(["house", "apartment"]),
  region: z.enum(["wallonie", "bruxelles", "flandre"]),
  status: z.enum(["preparing", "rented", "occupied"]),
  acquisitionDate: optionalIsoDate,
  purchasePrice: optionalEuros,
  currentValue: optionalEuros,
  valueGrowthRate: percent,
  horizonYears: z.coerce.number().int().min(1).max(50),
});

export const loanSchema = z.object({
  label: z.string().trim().min(1, "Donne un nom au prêt").max(120),
  principal: euros,
  startDate: isoDate,
  termMonths: z.coerce.number().int().min(1).max(600),
  annualRate: percent,
  rateBasis: z.enum(["nominal_12", "equivalent"]).default("nominal_12"),
  amortization: z.enum(["annuity", "constant_principal"]).default("annuity"),
  deferralMonths: z.coerce.number().int().min(0).max(120).default(0),
  deferralType: z.enum(["none", "interest_only", "full"]).default("none"),
});

export const leaseSchema = z.object({
  tenantLabel: z.string().trim().min(1, "Indique le locataire").max(120),
  kind: z.enum(["one_year", "three_six_nine"]),
  startDate: isoDate,
  endDate: optionalIsoDate,
  monthlyRent: euros,
  indexationRate: percent,
  status: z.enum(["planned", "active", "ended"]),
});

export const NATURES = ["upfront", "one_off", "recurring"] as const;

export type Nature = (typeof NATURES)[number];

const flowLineFields = z.object({
  kind: z.enum(["expense", "income"]),
  label: z.string().trim().min(1, "Donne un libellé").max(120),
  amount: decimalField("Montant invalide"),
  amountMode: z.enum(["fixed", "percent_of_rent"]),
  nature: z.enum(NATURES),
  periodicity: z.enum(["monthly", "quarterly", "yearly", "every_n_years"]).optional(),
  recurrenceInterval: z.coerce.number().int().min(1).max(50),
  startDate: isoDate,
  endDate: optionalIsoDate,
  indexationRate: percent,
  capitalize: checkbox,
  amortizationYears: z
    .union([z.coerce.number().int().min(1).max(50), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
});

export const flowLineSchema = flowLineFields.transform((data) => ({
  ...data,
  amount:
    data.amountMode === "percent_of_rent"
      ? percentToPpm(data.amount)
      : eurosToCents(data.amount),
  recurrence: data.nature === "recurring" ? (data.periodicity ?? "yearly") : ("one_off" as const),
  isAcquisitionCost: data.nature === "upfront",
  indexationRate: data.nature === "recurring" ? data.indexationRate : 0,
}));

export const rentPaymentSchema = z.object({
  dueMonth: z.coerce.number().int().min(0),
  amount: euros,
  date: isoDate,
  leaseId: z.union([z.uuid(), z.literal("")]).transform((value) => (value === "" ? null : value)),
});

export const wizardSchema = z.object({
  property: propertySchema,
  loan: loanSchema.optional(),
  lease: leaseSchema.optional(),
});

export type PropertyInput = z.output<typeof propertySchema>;
export type LoanInput = z.output<typeof loanSchema>;
export type LeaseInput = z.output<typeof leaseSchema>;
export type FlowLineInput = z.output<typeof flowLineSchema>;
export type RentPaymentInput = z.output<typeof rentPaymentSchema>;
