import { describe, expect, it } from "vitest";

import { computeIndicators } from "./indicators";
import { eurosToCents } from "./money";
import { fromIsoDate, monthOf } from "./month";
import { percentToPpm } from "./rate";
import { project } from "./projection";
import { runProjection } from "./index";
import type { FlowLine, Lease, Loan, ProjectionInput } from "./types";

const START = fromIsoDate("2026-10-01");

function bnpLoan(id: string, principalEuros: number): Loan {
  return {
    id,
    label: id,
    principal: eurosToCents(principalEuros),
    startMonth: START,
    termMonths: 241,
    amortization: "annuity",
    deferralMonths: 0,
    deferralType: "none",
    ratePeriods: [{ startMonth: 0, annualRatePpm: percentToPpm(3.06), basis: "nominal_12" }],
    insurances: [],
    prepayments: [],
  };
}

function yearlyExpense(id: string, euros: number): FlowLine {
  return {
    id,
    kind: "expense",
    category: id,
    label: id,
    amount: eurosToCents(euros),
    amountMode: "fixed",
    recurrence: "yearly",
    recurrenceInterval: 1,
    startMonth: START,
    endMonth: null,
    indexationRatePpm: 0,
    indexationMonth: null,
    capitalize: false,
    amortizationYears: null,
  };
}

const lease: Lease = {
  id: "bail",
  startMonth: START,
  endMonth: null,
  monthlyRent: eurosToCents(1_200),
  indexationRatePpm: percentToPpm(2),
};

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    startMonth: START,
    horizonMonths: 240,
    property: {
      purchasePrice: eurosToCents(250_000),
      currentValue: eurosToCents(320_000),
      valueGrowthRatePpm: percentToPpm(1.5),
      estimatedTaxYearly: eurosToCents(1_800),
      taxMode: "monthly_provision",
      taxMonth: null,
    },
    loans: [bnpLoan("hypothecaire", 150_000), bnpLoan("mandat", 27_750)],
    lines: [
      yearlyExpense("precompte_immobilier", 900),
      yearlyExpense("assurance", 340),
      yearlyExpense("entretien", 300),
    ],
    leases: [lease],
    ...overrides,
  };
}

describe("project · bien loué avec les deux prêts réels", () => {
  const projection = project(input());

  it("couvre tout l'horizon", () => {
    expect(projection).toHaveLength(240);
    expect(monthOf(projection[0].month)).toBe(10);
  });

  it("additionne les mensualités des deux prêts", () => {
    expect(projection[0].loanPayment).toBe(eurosToCents(988.16));
    expect(projection[100].loanPayment).toBe(eurosToCents(988.16));
  });

  it("additionne les soldes restants dus", () => {
    expect(projection[0].outstandingBalance).toBe(eurosToCents(177_215.1));
  });

  it("charge les frais annuels sur le mois d'échéance seulement", () => {
    expect(projection[0].expenses).toBe(eurosToCents(1_540));
    expect(projection[1].expenses).toBe(0);
    expect(projection[12].expenses).toBe(eurosToCents(1_540));
  });

  it("provisionne l'impôt chaque mois", () => {
    expect(projection[0].tax).toBe(eurosToCents(150));
    expect(projection.every((m) => m.tax === eurosToCents(150))).toBe(true);
  });

  it("calcule le net du premier mois et du deuxième", () => {
    expect(projection[0].net).toBe(eurosToCents(-1_478.16));
    expect(projection[1].net).toBe(eurosToCents(61.84));
  });

  it("indexe le loyer au premier anniversaire", () => {
    expect(projection[11].rent).toBe(eurosToCents(1_200));
    expect(projection[12].rent).toBe(eurosToCents(1_224));
  });

  it("cumule le net mois après mois", () => {
    expect(projection[0].cumulative).toBe(projection[0].net);
    expect(projection[1].cumulative).toBe(projection[0].net + projection[1].net);
  });

  it("fait croître la valeur et le patrimoine net", () => {
    expect(projection[0].propertyValue).toBe(eurosToCents(320_000));
    expect(projection[239].propertyValue).toBeGreaterThan(projection[0].propertyValue);
    expect(projection[0].netWorth).toBe(eurosToCents(320_000) - eurosToCents(177_215.1));
    expect(projection[239].netWorth).toBeGreaterThan(projection[0].netWorth);
  });

  it("applique la quote-part au seul champ share", () => {
    const half = project(input({ sharePermille: 500 }));

    expect(half[0].net).toBe(projection[0].net);
    expect(half[0].share).toBe(Math.round(projection[0].net / 2));
  });
});

describe("project · bien occupé sans loyer", () => {
  const occupied = input({ leases: [], lines: [yearlyExpense("assurance", 340)] });
  const projection = project(occupied);

  it("ne produit aucun revenu", () => {
    expect(projection.every((m) => m.income === 0)).toBe(true);
  });

  it("produit un net négatif tous les mois", () => {
    expect(projection.every((m) => m.net < 0)).toBe(true);
  });

  it("masque les rendements au lieu d'afficher zéro", () => {
    const indicators = computeIndicators(projection, occupied);

    expect(indicators.grossYieldPpm).toBeNull();
    expect(indicators.netYieldPpm).toBeNull();
    expect(indicators.netNetYieldPpm).toBeNull();
    expect(indicators.cashOnCashPpm).toBeNull();
    expect(indicators.annualRent).toBe(0);
  });
});

describe("project · impôt annuel", () => {
  it("charge l'impôt sur le mois choisi", () => {
    const projection = project(
      input({
        property: {
          ...input().property,
          taxMode: "yearly",
          taxMonth: 11,
        },
      }),
    );

    expect(projection[0].tax).toBe(0);
    expect(projection[1].tax).toBe(eurosToCents(1_800));
    expect(projection.filter((m) => m.tax > 0)).toHaveLength(20);
  });
});

describe("computeIndicators · fenêtres de calcul", () => {
  const ACQUIRED = fromIsoDate("2023-08-01");
  const RENTED = fromIsoDate("2026-10-01");

  const lateLease: Lease = { ...lease, startMonth: RENTED };

  const late = input({
    startMonth: ACQUIRED,
    horizonMonths: 300,
    loans: [
      { ...bnpLoan("hypothecaire", 150_000), startMonth: ACQUIRED },
      { ...bnpLoan("mandat", 27_750), startMonth: ACQUIRED },
    ],
    lines: [{ ...yearlyExpense("assurance", 340), startMonth: ACQUIRED }],
    leases: [lateLease],
  });

  it("calcule les rendements sur les douze premiers mois loués, pas sur le début de la projection", () => {
    const { indicators } = runProjection(late);

    expect(indicators.rentStartMonth).toBe(RENTED);
    expect(indicators.annualRent).toBe(eurosToCents(14_400));
    expect(indicators.grossYieldPpm).not.toBeNull();
  });

  it("ne masque les rendements que lorsqu'il n'y a réellement jamais de loyer", () => {
    const { indicators } = runProjection(input({ leases: [] }));

    expect(indicators.rentStartMonth).toBeNull();
    expect(indicators.grossYieldPpm).toBeNull();
  });

  it("mesure l'effort sur les douze mois qui suivent le mois de référence", () => {
    const beforeRent = runProjection(late, { referenceMonth: fromIsoDate("2024-01-01") });
    const afterRent = runProjection(late, { referenceMonth: RENTED });

    expect(beforeRent.indicators.referenceMonth).toBe(fromIsoDate("2024-01-01"));
    expect(afterRent.indicators.referenceMonth).toBe(RENTED);
    expect(beforeRent.indicators.monthlyEffort).toBeGreaterThan(
      afterRent.indicators.monthlyEffort,
    );
  });

  it("retombe sur le début de la projection sans mois de référence", () => {
    const { indicators } = runProjection(late);

    expect(indicators.referenceMonth).toBe(ACQUIRED);
  });
});

describe("runProjection", () => {
  const { projection, indicators } = runProjection(input());

  it("rend la projection et les indicateurs ensemble", () => {
    expect(projection).toHaveLength(240);
    expect(indicators.annualRent).toBe(eurosToCents(14_400));
  });

  it("calcule les rendements sur le coût d'acquisition", () => {
    expect(indicators.acquisitionCost).toBe(eurosToCents(250_000));
    expect(indicators.grossYieldPpm).toBe(percentToPpm(5.76));
    expect(indicators.netYieldPpm).toBe(percentToPpm(5.144));
    expect(indicators.netNetYieldPpm).toBe(percentToPpm(4.424));
  });

  it("calcule l'apport immobilisé et le cash-on-cash", () => {
    expect(indicators.cashInvested).toBe(eurosToCents(72_250));
    expect(indicators.referenceYearNet).toBe(eurosToCents(-797.92));
    expect(indicators.cashOnCashPpm).toBeLessThan(0);
  });

  it("calcule l'effort d'épargne du premier mois moyen", () => {
    expect(indicators.monthlyEffort).toBe(-Math.round(eurosToCents(-797.92) / 12));
  });

  it("totalise le coût du crédit", () => {
    expect(indicators.totalInterest).toBeGreaterThan(eurosToCents(59_000));
    expect(indicators.totalCreditCost).toBe(indicators.totalInterest);
  });

  it("trouve le mois de bascule", () => {
    expect(indicators.worstCumulative).toBeLessThan(0);
    expect(indicators.breakEvenMonth).not.toBeNull();
  });
});
