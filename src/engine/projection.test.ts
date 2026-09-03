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
    isAcquisitionCost: false,
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

  it("calcule le net du premier mois et du deuxième", () => {
    // 1 200 de loyer - 1 540 de frais annuels - 988,16 de mensualités
    expect(projection[0].net).toBe(eurosToCents(-1_328.16));
    // les mois suivants ne portent plus les frais annuels
    expect(projection[1].net).toBe(eurosToCents(211.84));
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
    expect(indicators.cashOnCashPpm).toBeNull();
    expect(indicators.annualRent).toBe(0);
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

describe("computeIndicators · coûts d'acquisition", () => {
  function oneOff(id: string, euros: number, monthOffset: number, isAcquisitionCost: boolean): FlowLine {
    return {
      id,
      kind: "expense",
      label: id,
      amount: eurosToCents(euros),
      amountMode: "fixed",
      recurrence: "one_off",
      recurrenceInterval: 1,
      startMonth: START + monthOffset,
      endMonth: null,
      indexationRatePpm: 0,
      indexationMonth: null,
      capitalize: false,
      amortizationYears: null,
      isAcquisitionCost,
    };
  }

  const recurring = [
    yearlyExpense("precompte_immobilier", 900),
    yearlyExpense("assurance", 340),
    yearlyExpense("entretien", 300),
  ];

  const base = runProjection(input({ lines: recurring })).indicators;

  it("ajoute un frais marqué acquisition au dénominateur", () => {
    const { indicators } = runProjection(
      input({ lines: [...recurring, oneOff("notaire", 25_000, 0, true)] }),
    );

    expect(base.acquisitionCost).toBe(eurosToCents(250_000));
    expect(indicators.acquisitionCost).toBe(eurosToCents(275_000));
    expect(indicators.grossYieldPpm!).toBeLessThan(base.grossYieldPpm!);
  });

  it("compte ce frais quelle que soit sa date, sans falaise à douze mois", () => {
    const atStart = runProjection(input({ lines: [...recurring, oneOff("notaire", 25_000, 0, true)] }));
    const muchLater = runProjection(input({ lines: [...recurring, oneOff("notaire", 25_000, 60, true)] }));

    expect(muchLater.indicators.acquisitionCost).toBe(atStart.indicators.acquisitionCost);
  });

  it("ne le compte pas comme charge de l'année, donc ne détruit pas le rendement net", () => {
    const { indicators } = runProjection(
      input({ lines: [...recurring, oneOff("notaire", 25_000, 0, true)] }),
    );

    expect(indicators.netYieldPpm!).toBeGreaterThan(0);
    expect(indicators.netYieldPpm!).toBeLessThan(indicators.grossYieldPpm!);
  });

  it("laisse le coût d'acquisition intact pour un frais ponctuel non marqué", () => {
    const { indicators } = runProjection(
      input({ lines: [...recurring, oneOff("chaudiere", 4_000, 4, false)] }),
    );

    expect(indicators.acquisitionCost).toBe(base.acquisitionCost);
    expect(indicators.netYieldPpm).toBe(base.netYieldPpm);
  });

  it("fait quand même sortir la trésorerie au mois indiqué", () => {
    const { projection } = runProjection(
      input({ lines: [...recurring, oneOff("notaire", 25_000, 3, true)] }),
    );

    expect(projection[3].expenses).toBe(eurosToCents(25_000));
    expect(projection[3].recurringExpenses).toBe(0);
    expect(projection[3].net).toBeLessThan(projection[2].net);
  });
});

describe("computeIndicators · détail des coûts", () => {
  function oneOffLine(id: string, euros: number, monthOffset: number, acquisition: boolean): FlowLine {
    return {
      id,
      kind: "expense",
      label: id,
      amount: eurosToCents(euros),
      amountMode: "fixed",
      recurrence: "one_off",
      recurrenceInterval: 1,
      startMonth: START + monthOffset,
      endMonth: null,
      indexationRatePpm: 0,
      indexationMonth: null,
      capitalize: false,
      amortizationYears: null,
      isAcquisitionCost: acquisition,
    };
  }

  const scenario = input({
    lines: [
      oneOffLine("notaire", 25_000, 0, true),
      oneOffLine("agence", 2_000, 0, true),
      oneOffLine("chaudiere", 4_000, 30, false),
      yearlyExpense("assurance", 340),
    ],
  });

  const { indicators, projection } = runProjection(scenario);

  it("sépare les trois natures de frais", () => {
    expect(indicators.upfrontCosts).toBe(eurosToCents(27_000));
    expect(indicators.rentalPeriodCosts).toBe(eurosToCents(4_000));
    expect(indicators.recurringCosts).toBe(eurosToCents(340 * 20));
  });

  it("additionne les frais au départ dans le coût d'acquisition", () => {
    expect(indicators.acquisitionCost).toBe(eurosToCents(250_000 + 27_000));
  });

  it("boucle : le coût total est la somme exacte de ses lignes", () => {
    const creditCost = indicators.totalCreditCost;
    const parts =
      eurosToCents(250_000) +
      indicators.upfrontCosts +
      indicators.rentalPeriodCosts +
      indicators.recurringCosts +
      creditCost;

    expect(indicators.totalCostOfOwnership).toBe(parts);
  });

  it("ne compte aucune charge deux fois", () => {
    const allExpenses = projection.reduce((total, month) => total + month.expenses, 0);

    expect(indicators.upfrontCosts + indicators.rentalPeriodCosts + indicators.recurringCosts).toBe(
      allExpenses,
    );
  });

  it("reste cohérent sans aucun frais", () => {
    const bare = runProjection(input({ lines: [] })).indicators;

    expect(bare.upfrontCosts).toBe(0);
    expect(bare.rentalPeriodCosts).toBe(0);
    expect(bare.recurringCosts).toBe(0);
    expect(bare.totalCostOfOwnership).toBe(eurosToCents(250_000) + bare.totalCreditCost);
  });
});

describe("computeIndicators · projection démarrée dans le passé", () => {
  const BOUGHT = fromIsoDate("2023-08-01");
  const RENTED = fromIsoDate("2026-09-01");

  function upfront(id: string, euros: number): FlowLine {
    return {
      id,
      kind: "expense",
      label: id,
      amount: eurosToCents(euros),
      amountMode: "fixed",
      recurrence: "one_off",
      recurrenceInterval: 1,
      startMonth: RENTED,
      endMonth: null,
      indexationRatePpm: 0,
      indexationMonth: null,
      capitalize: false,
      amortizationYears: null,
      isAcquisitionCost: true,
    };
  }

  const scenario = input({
    startMonth: BOUGHT,
    horizonMonths: 420,
    loans: [
      { ...bnpLoan("hypothecaire", 150_000), startMonth: BOUGHT },
      { ...bnpLoan("mandat", 27_750), startMonth: BOUGHT },
    ],
    lines: [upfront("notaire", 20_000), upfront("banque", 500)],
    leases: [{ ...lease, startMonth: RENTED, monthlyRent: eurosToCents(850) }],
  });

  const { indicators, projection } = runProjection(scenario, { referenceMonth: RENTED });

  it("exclut les frais ponctuels de l'effort mensuel", () => {
    // 850 de loyer - 988,16 de mensualités, sans les 20 500 de frais au départ
    expect(indicators.monthlyEffort).toBe(eurosToCents(138.16));
  });

  it("reporte les frais ponctuels dans un chiffre séparé", () => {
    expect(indicators.oneOffCostsAhead).toBe(eurosToCents(20_500));
  });

  it("applique la quote-part aux deux chiffres", () => {
    const half = runProjection({ ...scenario, sharePermille: 500 }, { referenceMonth: RENTED });

    expect(half.indicators.oneOffCostsAhead).toBe(eurosToCents(10_250));
    expect(half.indicators.monthlyEffort).toBe(Math.round(indicators.monthlyEffort / 2));
  });

  it("ne compte pas dans la trésorerie à financer ce qui a été payé avant le mois de référence", () => {
    const fromStart = runProjection(scenario);

    expect(fromStart.indicators.worstCumulative).toBeLessThan(indicators.worstCumulative);
    expect(indicators.worstCumulative).toBeGreaterThan(eurosToCents(-60_000));
  });

  it("date le creux de trésorerie", () => {
    expect(indicators.worstCumulativeMonth).not.toBeNull();
    expect(indicators.worstCumulativeMonth!).toBeGreaterThanOrEqual(RENTED);
  });

  it("compte le capital remboursé comme du patrimoine, pas comme une dépense", () => {
    const start = projection.findIndex((row) => row.month >= RENTED);
    const expected = Math.round(
      projection.slice(start, start + 12).reduce((total, row) => total + row.principal, 0) / 12,
    );

    expect(indicators.monthlyEquityBuilt).toBe(expected);
    expect(indicators.monthlyEquityBuilt).toBeGreaterThan(0);
  });

  it("distingue le patrimoine net d'aujourd'hui de celui de fin d'horizon", () => {
    expect(indicators.netWorthNow).toBeLessThan(indicators.finalNetWorth);
    expect(indicators.netWorthNow).toBeGreaterThan(0);
  });

  it("chiffre le net mensuel une fois les prêts soldés", () => {
    expect(indicators.monthlyNetAfterLoans).not.toBeNull();
    expect(indicators.monthlyNetAfterLoans!).toBeGreaterThan(0);
    expect(indicators.monthlyNetAfterLoans!).toBeGreaterThan(-indicators.monthlyEffort);
  });

  it("ne promet rien après les prêts s'ils courent au-delà de l'horizon", () => {
    const short = runProjection({ ...scenario, horizonMonths: 120 }, { referenceMonth: RENTED });

    expect(short.indicators.monthlyNetAfterLoans).toBeNull();
  });

  it("mesure le point d'équilibre à partir du mois de référence", () => {
    const fromStart = runProjection(scenario);

    expect(indicators.breakEvenMonth).not.toBeNull();
    expect(indicators.breakEvenMonth!).toBeLessThan(fromStart.indicators.breakEvenMonth!);
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
  });

  it("calcule l'apport immobilisé et le cash-on-cash", () => {
    expect(indicators.cashInvested).toBe(eurosToCents(72_250));
    // douze mois à 211,84 moins les 1 540 de frais annuels
    expect(indicators.referenceYearNet).toBe(eurosToCents(1_002.08));
    expect(indicators.cashOnCashPpm).toBeGreaterThan(0);
  });

  it("calcule l'effort d'épargne du premier mois moyen", () => {
    // net positif, donc l'effort est négatif : le bien s'autofinance
    expect(indicators.monthlyEffort).toBe(-Math.round(eurosToCents(1_002.08) / 12));
    expect(indicators.monthlyEffort).toBeLessThan(0);
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
