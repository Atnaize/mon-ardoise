import { describe, expect, it } from "vitest";

import { groupByYear, landmarksOf } from "@/components/timeline";
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

describe("groupByYear · « si tu vends » ne se pose qu'au présent", () => {
  // La projection démarre à l'acquisition, donc trois ans avant le mois de
  // référence : les deux premières années sont révolues.
  const NOW = fromIsoDate("2029-07-01");
  const rows = groupByYear(project(input()), landmarksOf(project(input()), NOW));

  it("marque révolues les années antérieures à l'année en cours", () => {
    const past = rows.filter((row) => row.past).map((row) => row.year);

    expect(past).toEqual([2026, 2027, 2028]);
  });

  it("ne marque pas révolue l'année en cours, dont le solde est celui de décembre", () => {
    const current = rows.find((row) => row.year === 2029)!;

    expect(current.past).toBe(false);
    expect(current.current).toBe(true);
  });

  it("ne marque révolu aucun exercice à venir", () => {
    expect(rows.filter((row) => row.year > 2029).every((row) => !row.past)).toBe(true);
  });

  it("coupe au mois, pas à l'année, dans l'année en cours", () => {
    const months = rows.find((row) => row.year === 2029)!.months;

    expect(months.filter((month) => month.past).map((month) => month.month)).toEqual([
      fromIsoDate("2029-01-01"),
      fromIsoDate("2029-02-01"),
      fromIsoDate("2029-03-01"),
      fromIsoDate("2029-04-01"),
      fromIsoDate("2029-05-01"),
      fromIsoDate("2029-06-01"),
    ]);
  });

  it("compte le mois de référence dans le présent, pas dans le passé", () => {
    const july = rows
      .flatMap((row) => row.months)
      .find((month) => month.month === NOW)!;

    expect(july.past).toBe(false);
  });

  it("laisse le cumul et le capital restant dû sur les années révolues", () => {
    // Seule la question de la revente perd son sens : ce qui a été dépensé et ce
    // qui reste dû sont des faits.
    const past = rows.find((row) => row.year === 2027)!;

    expect(past.cumulative).not.toBe(0);
    expect(past.outstanding).toBeGreaterThan(0);
  });
});
