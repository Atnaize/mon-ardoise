import { describe, expect, it } from "vitest";

import { eurosToCents } from "@/engine/money";
import { fromIsoDate } from "@/engine/month";
import { percentToPpm } from "@/engine/rate";

import { earliestMonth, toProjectionInput, type PropertyBundle } from "./projection-input";

const NOW = new Date("2026-09-02T00:00:00Z");

function bundle(overrides: Partial<PropertyBundle> = {}): PropertyBundle {
  return {
    property: {
      id: "prop-1",
      name: "Maison",
      type: "house",
      region: "wallonie",
      status: "rented",
      acquisitionDate: "2023-08-31",
      purchasePrice: eurosToCents(250_000),
      currentValue: eurosToCents(320_000),
      valueGrowthRatePpm: percentToPpm(1.5),
      estimatedTaxYearly: eurosToCents(1_800),
      defaultInflationRatePpm: percentToPpm(2),
      horizonYears: 20,
      createdBy: "user-1",
      createdAt: NOW,
      updatedAt: NOW,
    },
    member: null,
    loans: [],
    lines: [],
    leases: [],
    ...overrides,
  };
}

function loanBundle() {
  return {
    loan: {
      id: "loan-1",
      propertyId: "prop-1",
      label: "Prêt hypothécaire",
      principal: eurosToCents(150_000),
      startDate: "2023-10-01",
      termMonths: 241,
      amortization: "annuity" as const,
      paymentDay: 1,
      deferralMonths: 0,
      deferralType: "none" as const,
      createdAt: NOW,
      updatedAt: NOW,
    },
    ratePeriods: [
      {
        id: "rate-1",
        loanId: "loan-1",
        startMonth: 0,
        annualRatePpm: percentToPpm(3.06),
        rateBasis: "nominal_12" as const,
      },
    ],
    insurances: [
      {
        id: "ins-1",
        loanId: "loan-1",
        kind: "outstanding_balance" as const,
        premiumMode: "in_payment" as const,
        amount: eurosToCents(28),
        startDate: null,
        endDate: null,
      },
    ],
    prepayments: [
      {
        id: "pre-1",
        loanId: "loan-1",
        date: "2030-01-01",
        amount: eurosToCents(20_000),
        penaltyMode: "months_of_interest" as const,
        penaltyValue: 3,
        effect: "reduce_term" as const,
      },
    ],
  };
}

describe("earliestMonth", () => {
  it("prend la date la plus ancienne parmi toutes les entrées datées", () => {
    const withLoan = bundle({ loans: [loanBundle()] });

    expect(earliestMonth(withLoan, fromIsoDate("2026-09-01"))).toBe(fromIsoDate("2023-08-01"));
  });

  it("retombe sur la valeur fournie quand rien n'est daté", () => {
    const empty = bundle({ property: { ...bundle().property, acquisitionDate: null } });

    expect(earliestMonth(empty, fromIsoDate("2026-09-01"))).toBe(fromIsoDate("2026-09-01"));
  });
});

describe("toProjectionInput", () => {
  const start = fromIsoDate("2023-10-01");

  it("convertit l'horizon en mois", () => {
    expect(toProjectionInput(bundle(), start).horizonMonths).toBe(240);
  });

  it("traduit les dates en index de mois", () => {
    const input = toProjectionInput(bundle({ loans: [loanBundle()] }), start);

    expect(input.loans[0].startMonth).toBe(fromIsoDate("2023-10-01"));
    expect(input.loans[0].prepayments[0].month).toBe(fromIsoDate("2030-01-01"));
    expect(input.loans[0].insurances[0].startMonth).toBeNull();
  });

  it("reporte la convention de taux sans la réinterpréter", () => {
    const input = toProjectionInput(bundle({ loans: [loanBundle()] }), start);

    expect(input.loans[0].ratePeriods[0].basis).toBe("nominal_12");
    expect(input.loans[0].ratePeriods[0].annualRatePpm).toBe(percentToPpm(3.06));
  });

  it("prend la quote-part entière quand aucun membre n'est fourni", () => {
    expect(toProjectionInput(bundle(), start).sharePermille).toBe(1000);
  });

  it("prend la quote-part entière quand la contribution est à zéro", () => {
    const member = {
      id: "m-1",
      propertyId: "prop-1",
      userId: "user-1",
      role: "owner" as const,
      ownershipSharePermille: 500,
      contributionSharePermille: 0,
      createdAt: NOW,
    };

    expect(toProjectionInput(bundle({ member }), start).sharePermille).toBe(1000);
  });

  it("applique la quote-part de contribution quand elle est renseignée", () => {
    const member = {
      id: "m-1",
      propertyId: "prop-1",
      userId: "user-1",
      role: "owner" as const,
      ownershipSharePermille: 500,
      contributionSharePermille: 500,
      createdAt: NOW,
    };

    expect(toProjectionInput(bundle({ member }), start).sharePermille).toBe(500);
  });

  it("provisionne l'impôt mensuellement", () => {
    const input = toProjectionInput(bundle(), start);

    expect(input.property.taxMode).toBe("monthly_provision");
    expect(input.property.estimatedTaxYearly).toBe(eurosToCents(1_800));
  });
});
