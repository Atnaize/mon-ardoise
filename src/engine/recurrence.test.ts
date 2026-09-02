import { describe, expect, it } from "vitest";

import { eurosToCents } from "./money";
import { fromIsoDate, monthOf } from "./month";
import { percentToPpm } from "./rate";
import { expandLine, indexationSteps, occurrenceMonths, totalsByMonth } from "./recurrence";
import type { FlowLine } from "./types";

const START = fromIsoDate("2026-10-01");
const HORIZON_END = START + 239;

function line(overrides: Partial<FlowLine> = {}): FlowLine {
  return {
    id: "line-1",
    kind: "expense",
    category: "autre",
    label: "Ligne",
    amount: eurosToCents(100),
    amountMode: "fixed",
    recurrence: "monthly",
    recurrenceInterval: 1,
    startMonth: START,
    endMonth: null,
    indexationRatePpm: 0,
    indexationMonth: null,
    capitalize: false,
    amortizationYears: null,
    ...overrides,
  };
}

const total = (values: { amount: number }[]) => values.reduce((s, v) => s + v.amount, 0);

describe("occurrenceMonths", () => {
  it("ne produit qu'une occurrence pour un frais ponctuel", () => {
    expect(occurrenceMonths(line({ recurrence: "one_off" }), HORIZON_END)).toEqual([START]);
  });

  it("produit chaque mois de l'horizon", () => {
    expect(occurrenceMonths(line(), HORIZON_END)).toHaveLength(240);
  });

  it("produit un trimestre sur trois mois", () => {
    const months = occurrenceMonths(line({ recurrence: "quarterly" }), HORIZON_END);

    expect(months).toHaveLength(80);
    expect(months[1] - months[0]).toBe(3);
  });

  it("produit une fois par an", () => {
    expect(occurrenceMonths(line({ recurrence: "yearly" }), HORIZON_END)).toHaveLength(20);
  });

  it("gère un entretien tous les dix ans", () => {
    const months = occurrenceMonths(
      line({ recurrence: "every_n_years", recurrenceInterval: 10 }),
      HORIZON_END,
    );

    expect(months).toHaveLength(2);
    expect(months[1] - months[0]).toBe(120);
  });

  it("multiplie l'intervalle sur une récurrence mensuelle", () => {
    const months = occurrenceMonths(line({ recurrenceInterval: 2 }), HORIZON_END);

    expect(months[1] - months[0]).toBe(2);
  });

  it("s'arrête à la date de fin", () => {
    expect(occurrenceMonths(line({ endMonth: START + 5 }), HORIZON_END)).toHaveLength(6);
  });

  it("ne produit rien si la ligne commence après l'horizon", () => {
    expect(occurrenceMonths(line({ startMonth: HORIZON_END + 1 }), HORIZON_END)).toEqual([]);
  });
});

describe("indexationSteps", () => {
  it("reste à zéro sans indexation", () => {
    expect(indexationSteps(line(), START + 60)).toBe(0);
  });

  it("compte les anniversaires depuis le début", () => {
    const indexed = line({ indexationRatePpm: percentToPpm(2) });

    expect(indexationSteps(indexed, START + 11)).toBe(0);
    expect(indexationSteps(indexed, START + 12)).toBe(1);
    expect(indexationSteps(indexed, START + 35)).toBe(2);
  });

  it("compte les passages d'un mois d'indexation explicite", () => {
    const indexed = line({ indexationRatePpm: percentToPpm(2), indexationMonth: 1 });

    expect(monthOf(START)).toBe(10);
    expect(indexationSteps(indexed, START + 2)).toBe(0);
    expect(indexationSteps(indexed, START + 3)).toBe(1);
    expect(indexationSteps(indexed, START + 15)).toBe(2);
  });
});

describe("expandLine", () => {
  it("applique l'indexation composée", () => {
    const amounts = expandLine(
      line({ recurrence: "yearly", indexationRatePpm: percentToPpm(2) }),
      HORIZON_END,
    );

    expect(amounts[0].amount).toBe(eurosToCents(100));
    expect(amounts[1].amount).toBe(eurosToCents(102));
    expect(amounts[2].amount).toBe(eurosToCents(104.04));
  });

  it("calcule un pourcentage du loyer du mois", () => {
    const amounts = expandLine(
      line({ amountMode: "percent_of_rent", amount: percentToPpm(8) }),
      START + 2,
      () => eurosToCents(1_000),
    );

    expect(amounts).toHaveLength(3);
    expect(amounts[0].amount).toBe(eurosToCents(80));
  });

  it("ignore un pourcentage de loyer quand il n'y a pas de loyer", () => {
    const amounts = expandLine(
      line({ amountMode: "percent_of_rent", amount: percentToPpm(8) }),
      START + 2,
    );

    expect(amounts).toEqual([]);
  });

  it("étale un frais capitalisé sans perdre un centime", () => {
    const amounts = expandLine(
      line({
        recurrence: "one_off",
        amount: eurosToCents(12_345.67),
        capitalize: true,
        amortizationYears: 10,
      }),
      HORIZON_END,
    );

    expect(amounts).toHaveLength(120);
    expect(total(amounts)).toBe(eurosToCents(12_345.67));
  });

  it("tronque un étalement qui dépasse l'horizon", () => {
    const amounts = expandLine(
      line({
        recurrence: "one_off",
        startMonth: HORIZON_END - 5,
        amount: eurosToCents(1_200),
        capitalize: true,
        amortizationYears: 10,
      }),
      HORIZON_END,
    );

    expect(amounts).toHaveLength(6);
    expect(total(amounts)).toBeLessThan(eurosToCents(1_200));
  });
});

describe("totalsByMonth", () => {
  it("additionne plusieurs lignes sur le même mois", () => {
    const totals = totalsByMonth(
      [line(), line({ id: "line-2", amount: eurosToCents(50) })],
      START,
      12,
      () => 0,
    );

    expect(totals).toHaveLength(12);
    expect(totals.every((t) => t === eurosToCents(150))).toBe(true);
  });

  it("ignore ce qui tombe hors de l'horizon", () => {
    const totals = totalsByMonth([line({ startMonth: START - 5 })], START, 12, () => 0);

    expect(totals.every((t) => t === eurosToCents(100))).toBe(true);
  });
});
