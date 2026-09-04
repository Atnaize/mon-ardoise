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

  it("compte l'apport que le prêt n'a pas financé, absent du cumul de trésorerie", () => {
    // 250 000 de prix pour 177 750 empruntés, plus la première mensualité
    expect(projection[0].cashInjected).toBe(
      eurosToCents(72_250) - projection[0].cumulative,
    );
    expect(projection[0].netPosition).toBe(
      projection[0].netWorth - projection[0].cashInjected,
    );
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

  it("ne date aucune mise en location et ne compte aucun loyer", () => {
    const indicators = computeIndicators(projection, occupied);

    expect(indicators.rentStartMonth).toBeNull();
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

  it("compte le loyer annuel sur les douze premiers mois loués, pas sur le début de la projection", () => {
    const { indicators } = runProjection(late);

    expect(indicators.rentStartMonth).toBe(RENTED);
    expect(indicators.annualRent).toBe(eurosToCents(14_400));
  });

  it("ne signale l'absence de loyer que lorsqu'il n'y en a réellement jamais", () => {
    const { indicators } = runProjection(input({ leases: [] }));

    expect(indicators.rentStartMonth).toBeNull();
    expect(indicators.annualRent).toBe(0);
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

  it("ajoute un frais marqué acquisition au coût d'acquisition", () => {
    const { indicators } = runProjection(
      input({ lines: [...recurring, oneOff("notaire", 25_000, 0, true)] }),
    );

    expect(base.acquisitionCost).toBe(eurosToCents(250_000));
    expect(indicators.acquisitionCost).toBe(eurosToCents(275_000));
    expect(indicators.upfrontCosts).toBe(eurosToCents(25_000));
  });

  it("compte ce frais quelle que soit sa date, sans falaise à douze mois", () => {
    const atStart = runProjection(input({ lines: [...recurring, oneOff("notaire", 25_000, 0, true)] }));
    const muchLater = runProjection(input({ lines: [...recurring, oneOff("notaire", 25_000, 60, true)] }));

    expect(muchLater.indicators.acquisitionCost).toBe(atStart.indicators.acquisitionCost);
  });

  it("ne le compte pas comme charge de l'année, donc n'alourdit pas l'effort mensuel", () => {
    const { indicators } = runProjection(
      input({ lines: [...recurring, oneOff("notaire", 25_000, 0, true)] }),
    );

    expect(indicators.recurringCosts).toBe(base.recurringCosts);
    expect(indicators.monthlyEffort).toBe(base.monthlyEffort);
  });

  it("laisse le coût d'acquisition intact pour un frais ponctuel non marqué", () => {
    const { indicators } = runProjection(
      input({ lines: [...recurring, oneOff("chaudiere", 4_000, 4, false)] }),
    );

    expect(indicators.acquisitionCost).toBe(base.acquisitionCost);
    expect(indicators.rentalPeriodCosts).toBe(eurosToCents(4_000));
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

});

describe("computeIndicators · ce que la revente laisserait", () => {
  const BOUGHT = fromIsoDate("2023-08-01");
  const RENTED = fromIsoDate("2026-10-01");

  function oneOff(id: string, euros: number, month: number): FlowLine {
    return {
      ...yearlyExpense(id, euros),
      recurrence: "one_off",
      startMonth: month,
      isAcquisitionCost: true,
    };
  }

  // Le cas qui ne se lit pas dans la trésorerie : acheté au prix du marché, mis en
  // location trois ans plus tard, mensualité plus lourde que le loyer.
  const scenario = input({
    startMonth: BOUGHT,
    horizonMonths: 360,
    property: {
      purchasePrice: eurosToCents(200_000),
      currentValue: eurosToCents(200_000),
      valueGrowthRatePpm: 0,
      acquisitionMonth: BOUGHT,
    },
    loans: [{ ...bnpLoan("hypothecaire", 178_000), startMonth: BOUGHT, termMonths: 240 }],
    lines: [oneOff("notaire", 20_000, BOUGHT), { ...yearlyExpense("entretien", 300), startMonth: RENTED }],
    leases: [{ ...lease, startMonth: RENTED, monthlyRent: eurosToCents(850), indexationRatePpm: 0 }],
  });

  const { indicators, projection } = runProjection(scenario, { referenceMonth: RENTED });

  it("déduit du patrimoine tout ce qui est sorti de la poche", () => {
    const atReference = projection.find((row) => row.month >= RENTED)!;

    expect(indicators.cashInjectedNow).toBe(atReference.cashInjected);
    expect(indicators.netPositionNow).toBe(atReference.netWorth - atReference.cashInjected);
    // notaire et intérêts déjà payés ne se récupèrent pas : la revente est encore perdante
    expect(indicators.netPositionNow).toBeLessThan(0);
    expect(indicators.netWorthNow).toBeGreaterThan(0);
  });

  it("sort du rouge bien avant que la trésorerie ne soit remboursée", () => {
    const cashRecovered = projection.find((row) => row.cumulative >= 0 && row.month > RENTED);

    expect(indicators.netPositionBreakEvenMonth).not.toBeNull();
    expect(indicators.netPositionBreakEvenMonth!).toBeGreaterThan(RENTED);
    expect(cashRecovered).toBeDefined();
    expect(indicators.netPositionBreakEvenMonth!).toBeLessThan(cashRecovered!.month);
  });

  it("laisse la valeur entière une fois le prêt soldé", () => {
    const last = projection.at(-1)!;

    expect(last.outstandingBalance).toBe(0);
    expect(last.netPosition).toBe(last.propertyValue - last.cashInjected);
    expect(last.netPosition).toBeGreaterThan(0);
  });

  it("avance plus vite que la trésorerie, du montant du capital remboursé", () => {
    const start = projection.findIndex((row) => row.month >= RENTED);
    const [before, after] = [projection[start], projection[start + 1]];

    expect(after.netPosition - before.netPosition).toBe(
      after.net + after.principal,
    );
  });

  it("ne crédite aucun bien avant l'acquisition", () => {
    const before = fromIsoDate("2022-08-01");
    const early = project({
      ...scenario,
      startMonth: before,
      lines: [oneOff("notaire", 20_000, before)],
    });

    expect(early[0].netPosition).toBe(-early[0].cashInjected);
    expect(early[0].cashInjected).toBe(eurosToCents(20_000));
    expect(early[12].netPosition).toBeLessThan(early[12].netWorth);
  });
});

describe("runProjection", () => {
  const { projection, indicators } = runProjection(input());

  it("rend la projection et les indicateurs ensemble", () => {
    expect(projection).toHaveLength(240);
    expect(indicators.annualRent).toBe(eurosToCents(14_400));
  });

  it("calcule le coût d'acquisition et l'apport immobilisé", () => {
    expect(indicators.acquisitionCost).toBe(eurosToCents(250_000));
    expect(indicators.cashInvested).toBe(eurosToCents(72_250));
    // douze mois à 211,84 moins les 1 540 de frais annuels
    expect(indicators.referenceYearNet).toBe(eurosToCents(1_002.08));
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

  it("ne date aucun retournement quand la revente est gagnante dès le départ", () => {
    // 320 000 de valeur estimée pour 250 000 payés : la revente couvre tout dès le premier mois
    expect(indicators.netPositionNow).toBeGreaterThan(0);
    expect(indicators.netPositionBreakEvenMonth).toBe(projection[0].month);
  });
});
