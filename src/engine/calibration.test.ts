import { describe, expect, it } from "vitest";

import fixture from "./__fixtures__/bnp-2023-08-31.json";
import { eurosToCents, type Cents } from "./money";
import { fromIsoDate } from "./month";
import { percentToPpm, type RateBasis } from "./rate";
import { buildSchedule } from "./schedule";
import type { Loan } from "./types";

interface FixtureLoan {
  label: string;
  principal: Cents;
  termMonths: number;
  annualPercent: number;
  basis: string;
  rows: number[][];
}

const CLOSING = 0;
const INTEREST = 1;
const PRINCIPAL = 2;
const PAYMENT = 3;

function loanFrom(source: FixtureLoan): Loan {
  return {
    id: source.label,
    label: source.label,
    principal: source.principal,
    startMonth: fromIsoDate("2023-10-01"),
    termMonths: source.termMonths,
    amortization: "annuity",
    deferralMonths: 0,
    deferralType: "none",
    ratePeriods: [
      {
        startMonth: 0,
        annualRatePpm: percentToPpm(source.annualPercent),
        basis: source.basis as RateBasis,
      },
    ],
    insurances: [],
    prepayments: [],
  };
}

describe.each(fixture.loans as FixtureLoan[])("calibration BNP · $label", (source) => {
  const { installments } = buildSchedule(loanFrom(source));
  const rows = source.rows;

  it("produit le même nombre d'échéances", () => {
    expect(installments).toHaveLength(source.termMonths);
  });

  it("produit la même mensualité", () => {
    expect(installments[0].payment).toBe(rows[0][PAYMENT]);
  });

  it("produit les mêmes premiers intérêts", () => {
    expect(installments[0].interest).toBe(rows[0][INTEREST]);
    expect(installments[0].principal).toBe(rows[0][PRINCIPAL]);
    expect(installments[0].closingBalance).toBe(rows[0][CLOSING]);
  });

  it("solde le prêt exactement", () => {
    expect(installments.at(-1)!.closingBalance).toBe(0);
    expect(rows.at(-1)![CLOSING]).toBe(0);
  });

  it("ne dévie jamais de plus de deux centimes sur les intérêts d'une ligne", () => {
    const worst = installments.reduce(
      (max, installment, index) => Math.max(max, Math.abs(installment.interest - rows[index][INTEREST])),
      0,
    );

    expect(worst).toBeLessThanOrEqual(2);
  });

  it("ne dévie jamais de plus d'un euro sur le solde d'une ligne", () => {
    const worst = installments.reduce(
      (max, installment, index) => Math.max(max, Math.abs(installment.closingBalance - rows[index][CLOSING])),
      0,
    );

    expect(worst).toBeLessThan(eurosToCents(1));
  });

  it("ne dévie pas de plus d'un euro sur les intérêts totaux", () => {
    const engine = installments.reduce((total, installment) => total + installment.interest, 0);
    const bank = rows.reduce((total, row) => total + row[INTEREST], 0);

    expect(Math.abs(engine - bank)).toBeLessThan(eurosToCents(1));
  });

  it("amortit exactement le capital emprunté", () => {
    const engine = installments.reduce((total, installment) => total + installment.principal, 0);

    expect(engine).toBe(source.principal);
    expect(rows.reduce((total, row) => total + row[PRINCIPAL], 0)).toBe(source.principal);
  });
});
