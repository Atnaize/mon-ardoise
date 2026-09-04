import { describe, expect, it } from "vitest";

import { landmarksOf } from "@/components/timeline";
import { eurosToCents } from "@/engine/money";
import { fromIsoDate, yearOf } from "@/engine/month";
import { project } from "@/engine/projection";
import { percentToPpm } from "@/engine/rate";
import type { Loan, ProjectionInput } from "@/engine/types";

const START = fromIsoDate("2026-01-01");

function loan(startMonth: number, termMonths: number): Loan {
  return {
    id: "pret",
    label: "pret",
    principal: eurosToCents(100_000),
    startMonth,
    termMonths,
    amortization: "annuity",
    deferralMonths: 0,
    deferralType: "none",
    ratePeriods: [{ startMonth: 0, annualRatePpm: percentToPpm(3), basis: "nominal_12" }],
    insurances: [],
    prepayments: [],
  };
}

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    startMonth: START,
    horizonMonths: 120,
    property: {
      purchasePrice: eurosToCents(150_000),
      currentValue: eurosToCents(150_000),
      valueGrowthRatePpm: 0,
    },
    loans: [loan(START, 60)],
    lines: [],
    leases: [],
    ...overrides,
  };
}

describe("landmarksOf · le prêt soldé", () => {
  it("marque l'année où le capital tombe à zéro", () => {
    const landmarks = landmarksOf(project(input()), START);

    // 60 mensualités à partir de janvier 2026 : la dernière tombe en décembre 2030,
    // et c'est elle qui ramène le capital restant dû à zéro.
    expect(landmarks.lastInstalment).toBe(START + 59);
    expect(landmarks.paidOff).toBe(2030);
  });

  it("ne solde pas un prêt qui n'a pas encore commencé", () => {
    // La projection démarre trois ans avant le prêt : le solde y est nul sans
    // qu'aucune dette n'ait jamais existé.
    const late = project(input({ loans: [loan(START + 36, 60)] }));
    const landmarks = landmarksOf(late, START);

    expect(late[0].outstandingBalance).toBe(0);
    expect(landmarks.firstDebt).toBe(START + 36);
    expect(landmarks.paidOff).toBe(yearOf(START + 36 + 59));
  });

  it("ne marque rien sans prêt du tout", () => {
    const landmarks = landmarksOf(project(input({ loans: [] })), START);

    expect(landmarks.firstDebt).toBe(null);
    expect(landmarks.paidOff).toBe(null);
    expect(landmarks.lastInstalment).toBe(null);
  });
});
