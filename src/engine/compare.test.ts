import { describe, expect, it } from "vitest";

import { compare } from "./compare";
import { runProjection } from "./index";
import { eurosToCents } from "./money";
import { fromIsoDate } from "./month";
import { percentToPpm } from "./rate";
import type { Lease, ProjectionInput } from "./types";

const START = fromIsoDate("2026-10-01");

function scenario(monthlyRent: number, leases = true): ProjectionInput {
  const lease: Lease = {
    id: "bail",
    startMonth: START,
    endMonth: null,
    monthlyRent: eurosToCents(monthlyRent),
    indexationRatePpm: 0,
  };

  return {
    startMonth: START,
    horizonMonths: 120,
    property: {
      purchasePrice: eurosToCents(250_000),
      currentValue: eurosToCents(250_000),
      valueGrowthRatePpm: 0,
      estimatedTaxYearly: 0,
      taxMode: "monthly_provision",
      taxMonth: null,
    },
    loans: [
      {
        id: "pret",
        label: "pret",
        principal: eurosToCents(150_000),
        startMonth: START,
        termMonths: 241,
        amortization: "annuity",
        deferralMonths: 0,
        deferralType: "none",
        ratePeriods: [{ startMonth: 0, annualRatePpm: percentToPpm(3.06), basis: "nominal_12" }],
        insurances: [],
        prepayments: [],
      },
    ],
    lines: [],
    leases: leases ? [lease] : [],
  };
}

describe("compare", () => {
  const baseline = runProjection(scenario(950));
  const variant = runProjection(scenario(1_050));
  const result = compare(baseline, variant);

  it("chiffre l'écart mensuel", () => {
    expect(result.months).toHaveLength(120);
    expect(result.months[0].net).toBe(eurosToCents(100));
  });

  it("cumule l'écart", () => {
    expect(result.months[11].cumulative).toBe(eurosToCents(1_200));
  });

  it("laisse le solde restant dû inchangé", () => {
    expect(result.months.every((m) => m.outstandingBalance === 0)).toBe(true);
  });

  it("chiffre l'écart sur les indicateurs", () => {
    expect(result.indicators.annualRent).toBe(eurosToCents(1_200));
    expect(result.indicators.grossYieldPpm).toBeGreaterThan(0);
  });

  it("rend null quand un indicateur n'existe pas des deux côtés", () => {
    const occupied = runProjection(scenario(950, false));

    expect(compare(occupied, variant).indicators.grossYieldPpm).toBeNull();
  });
});
