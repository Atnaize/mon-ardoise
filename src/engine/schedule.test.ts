import { describe, expect, it } from "vitest";

import { eurosToCents } from "./money";
import { fromIsoDate } from "./month";
import { percentToPpm } from "./rate";
import { buildSchedule } from "./schedule";
import type { Insurance, Loan, Prepayment } from "./types";

const START = fromIsoDate("2026-10-01");

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-1",
    label: "Prêt principal",
    principal: eurosToCents(200_000),
    startMonth: START,
    termMonths: 240,
    amortization: "annuity",
    deferralMonths: 0,
    deferralType: "none",
    ratePeriods: [{ startMonth: 0, annualRatePpm: percentToPpm(3.5), basis: "equivalent" }],
    insurances: [],
    prepayments: [],
    ...overrides,
  };
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("buildSchedule · annuités", () => {
  it("amortit exactement le capital financé", () => {
    const { installments, financedPrincipal } = buildSchedule(loan());

    expect(installments).toHaveLength(240);
    expect(installments.at(-1)!.closingBalance).toBe(0);
    expect(sum(installments.map((i) => i.principal))).toBe(financedPrincipal);
  });

  it("garde une mensualité identique sur toute la durée sauf la dernière", () => {
    const { installments } = buildSchedule(loan());
    const payments = new Set(installments.slice(0, -1).map((i) => i.payment));

    expect(payments.size).toBe(1);
  });

  it("absorbe la dérive d'arrondi sur la dernière échéance", () => {
    const { installments } = buildSchedule(loan());
    const regular = installments[0].payment;
    const last = installments.at(-1)!;

    expect(Math.abs(last.payment - regular)).toBeLessThan(eurosToCents(5));
    expect(last.principal).toBe(last.openingBalance);
    expect(last.closingBalance).toBe(0);
  });

  it("fait décroître les intérêts et croître le capital de façon monotone", () => {
    const { installments } = buildSchedule(loan());

    for (let i = 1; i < installments.length - 1; i += 1) {
      expect(installments[i].interest).toBeLessThan(installments[i - 1].interest);
      expect(installments[i].principal).toBeGreaterThan(installments[i - 1].principal);
    }
  });

  it("chaîne les soldes sans trou", () => {
    const { installments } = buildSchedule(loan());

    for (let i = 1; i < installments.length; i += 1) {
      expect(installments[i].openingBalance).toBe(installments[i - 1].closingBalance);
    }
  });
});

describe("buildSchedule · amortissements constants", () => {
  it("garde un capital constant et une mensualité décroissante", () => {
    const { installments, financedPrincipal } = buildSchedule(
      loan({ amortization: "constant_principal" }),
    );

    const principals = new Set(installments.slice(0, -1).map((i) => i.principal));

    expect(principals.size).toBe(1);
    expect(installments[0].payment).toBeGreaterThan(installments[239].payment);
    expect(sum(installments.map((i) => i.principal))).toBe(financedPrincipal);
    expect(installments.at(-1)!.closingBalance).toBe(0);
  });
});

describe("buildSchedule · différé", () => {
  it("ne rembourse que les intérêts pendant un différé partiel", () => {
    const { installments, financedPrincipal } = buildSchedule(
      loan({ deferralMonths: 12, deferralType: "interest_only" }),
    );

    expect(installments).toHaveLength(240);

    for (const installment of installments.slice(0, 12)) {
      expect(installment.principal).toBe(0);
      expect(installment.payment).toBe(installment.interest);
      expect(installment.closingBalance).toBe(financedPrincipal);
    }

    expect(installments[12].principal).toBeGreaterThan(0);
    expect(installments.at(-1)!.closingBalance).toBe(0);
  });

  it("capitalise les intérêts pendant un différé total", () => {
    const { installments, financedPrincipal } = buildSchedule(
      loan({ deferralMonths: 12, deferralType: "full" }),
    );

    expect(installments[0].payment).toBe(0);
    expect(installments[11].closingBalance).toBeGreaterThan(financedPrincipal);
    expect(installments.at(-1)!.closingBalance).toBe(0);
  });

  it("ignore le différé quand son type est none", () => {
    const { installments } = buildSchedule(loan({ deferralMonths: 12, deferralType: "none" }));

    expect(installments[0].principal).toBeGreaterThan(0);
  });

  it("refuse un différé qui couvre toute la durée", () => {
    expect(() =>
      buildSchedule(loan({ termMonths: 12, deferralMonths: 12, deferralType: "interest_only" })),
    ).toThrow();
  });
});

describe("buildSchedule · assurances", () => {
  const asrd: Insurance = {
    kind: "outstanding_balance",
    premiumMode: "in_payment",
    amount: eurosToCents(28),
  };

  it("prélève une prime mensuelle chaque mois", () => {
    const { installments } = buildSchedule(loan({ insurances: [asrd] }));

    expect(installments.every((i) => i.insurance === eurosToCents(28))).toBe(true);
  });

  it("prélève une prime annuelle une fois par an", () => {
    const { installments } = buildSchedule(
      loan({
        insurances: [{ kind: "fire", premiumMode: "annual", amount: eurosToCents(340) }],
      }),
    );

    expect(installments.filter((i) => i.insurance > 0)).toHaveLength(20);
    expect(installments[0].insurance).toBe(eurosToCents(340));
    expect(installments[1].insurance).toBe(0);
    expect(installments[12].insurance).toBe(eurosToCents(340));
  });

  it("prélève une prime trimestrielle quatre fois par an", () => {
    const { installments } = buildSchedule(
      loan({
        termMonths: 12,
        insurances: [{ kind: "fire", premiumMode: "quarterly", amount: eurosToCents(85) }],
      }),
    );

    expect(installments.filter((i) => i.insurance > 0)).toHaveLength(4);
  });

  it("ajoute une prime unique financée au capital sans jamais la prélever", () => {
    const { installments, financedPrincipal } = buildSchedule(
      loan({
        insurances: [
          {
            kind: "outstanding_balance",
            premiumMode: "single_financed",
            amount: eurosToCents(6_000),
          },
        ],
      }),
    );

    expect(financedPrincipal).toBe(eurosToCents(206_000));
    expect(installments.every((i) => i.insurance === 0)).toBe(true);
    expect(sum(installments.map((i) => i.principal))).toBe(eurosToCents(206_000));
  });

  it("respecte la fin d'une assurance", () => {
    const { installments } = buildSchedule(
      loan({
        insurances: [{ ...asrd, endMonth: START + 11 }],
      }),
    );

    expect(installments.filter((i) => i.insurance > 0)).toHaveLength(12);
  });
});

describe("buildSchedule · remboursements anticipés", () => {
  const prepayment = (overrides: Partial<Prepayment> = {}): Prepayment => ({
    month: START + 60,
    amount: eurosToCents(30_000),
    penaltyMode: "months_of_interest",
    penaltyValue: 3,
    effect: "reduce_term",
    ...overrides,
  });

  it("raccourcit la durée sans toucher à la mensualité", () => {
    const base = buildSchedule(loan());
    const withPrepayment = buildSchedule(loan({ prepayments: [prepayment()] }));

    expect(withPrepayment.installments.length).toBeLessThan(base.installments.length);
    expect(withPrepayment.installments[70].payment).toBe(base.installments[70].payment);
    expect(withPrepayment.installments.at(-1)!.closingBalance).toBe(0);
  });

  it("réduit la mensualité sans toucher à la durée", () => {
    const base = buildSchedule(loan());
    const withPrepayment = buildSchedule(
      loan({ prepayments: [prepayment({ effect: "reduce_payment" })] }),
    );

    expect(withPrepayment.installments).toHaveLength(240);
    expect(withPrepayment.installments[70].payment).toBeLessThan(base.installments[70].payment);
    expect(withPrepayment.installments.at(-1)!.closingBalance).toBe(0);
  });

  it("facture trois mois d'intérêts sur le montant remboursé", () => {
    const { installments } = buildSchedule(loan({ prepayments: [prepayment()] }));
    const month = installments.find((i) => i.prepayment > 0)!;

    expect(month.prepayment).toBe(eurosToCents(30_000));
    expect(month.penalty).toBeGreaterThan(eurosToCents(240));
    expect(month.penalty).toBeLessThan(eurosToCents(270));
  });

  it("applique une indemnité en pourcentage", () => {
    const { installments } = buildSchedule(
      loan({
        prepayments: [prepayment({ penaltyMode: "percent", penaltyValue: percentToPpm(2) })],
      }),
    );

    expect(installments.find((i) => i.prepayment > 0)!.penalty).toBe(eurosToCents(600));
  });

  it("applique une indemnité forfaitaire ou nulle", () => {
    const fixed = buildSchedule(
      loan({
        prepayments: [prepayment({ penaltyMode: "fixed", penaltyValue: eurosToCents(500) })],
      }),
    );
    const none = buildSchedule(
      loan({ prepayments: [prepayment({ penaltyMode: "none", penaltyValue: 0 })] }),
    );

    expect(fixed.installments.find((i) => i.prepayment > 0)!.penalty).toBe(eurosToCents(500));
    expect(none.installments.find((i) => i.prepayment > 0)!.penalty).toBe(0);
  });

  it("ne rembourse jamais plus que le solde restant", () => {
    const { installments, financedPrincipal } = buildSchedule(
      loan({ prepayments: [prepayment({ amount: eurosToCents(400_000) })] }),
    );

    const repaid = sum(installments.map((i) => i.principal + i.prepayment));

    expect(repaid).toBe(financedPrincipal);
    expect(installments.at(-1)!.closingBalance).toBe(0);
  });
});

describe("buildSchedule · taux variable", () => {
  it("recalcule la mensualité à chaque révision de taux", () => {
    const { installments } = buildSchedule(
      loan({
        ratePeriods: [
          { startMonth: 0, annualRatePpm: percentToPpm(3.5), basis: "equivalent" },
          { startMonth: 60, annualRatePpm: percentToPpm(5), basis: "equivalent" },
        ],
      }),
    );

    expect(installments[59].payment).toBeLessThan(installments[60].payment);
    expect(installments[60].payment).toBe(installments[61].payment);
    expect(installments.at(-1)!.closingBalance).toBe(0);
  });

  it("refuse un prêt sans période de taux applicable", () => {
    expect(() => buildSchedule(loan({ ratePeriods: [{ startMonth: 6, annualRatePpm: 1, basis: "equivalent" }] }))).toThrow();
  });
});
