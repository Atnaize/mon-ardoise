import { describe, expect, it } from "vitest";

import { eurosToCents } from "@/engine/money";
import { percentToPpm } from "@/engine/rate";

import { euros, flowLineSchema, optionalEuros, percent, propertySchema } from "./schemas";

describe("euros", () => {
  it("accepte le point comme la virgule", () => {
    expect(euros.parse("1200.50")).toBe(eurosToCents(1200.5));
    expect(euros.parse("1200,50")).toBe(eurosToCents(1200.5));
  });

  it("ignore les espaces de milliers", () => {
    expect(euros.parse("1 200,50")).toBe(eurosToCents(1200.5));
    expect(euros.parse("1 200,50")).toBe(eurosToCents(1200.5));
  });

  it("refuse ce qui n'est pas un nombre", () => {
    expect(euros.safeParse("mille deux cents").success).toBe(false);
    expect(euros.safeParse("").success).toBe(false);
  });
});

describe("optionalEuros", () => {
  it("traduit le vide en null", () => {
    expect(optionalEuros.parse("")).toBeNull();
    expect(optionalEuros.parse("   ")).toBeNull();
  });

  it("convertit une valeur présente", () => {
    expect(optionalEuros.parse("250000")).toBe(eurosToCents(250_000));
  });
});

describe("percent", () => {
  it("convertit en ppm", () => {
    expect(percent.parse("3,06")).toBe(percentToPpm(3.06));
    expect(percent.parse(0)).toBe(0);
  });
});

describe("propertySchema", () => {
  const valid = {
    name: "  Maison  ",
    type: "house",
    region: "wallonie",
    status: "rented",
    acquisitionDate: "",
    purchasePrice: "200000",
    cadastralIncome: "",
    currentValue: "190000",
    valueGrowthRate: "0",
    marginalTaxRate: "50",
    estimatedTaxYearly: "0",
    horizonYears: "20",
  };

  it("nettoie et convertit", () => {
    const parsed = propertySchema.parse(valid);

    expect(parsed.name).toBe("Maison");
    expect(parsed.purchasePrice).toBe(eurosToCents(200_000));
    expect(parsed.acquisitionDate).toBeNull();
    expect(parsed.cadastralIncome).toBeNull();
    expect(parsed.valueGrowthRate).toBe(0);
    expect(parsed.horizonYears).toBe(20);
  });

  it("exige un nom", () => {
    expect(propertySchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("refuse une date mal formée", () => {
    expect(propertySchema.safeParse({ ...valid, acquisitionDate: "31/08/2023" }).success).toBe(false);
  });
});

describe("flowLineSchema · unité du montant", () => {
  const base = {
    kind: "expense",
    category: "precompte_immobilier",
    label: "Précompte immobilier",
    amount: "900",
    amountMode: "fixed",
    recurrence: "yearly",
    recurrenceInterval: "1",
    startDate: "2026-10-01",
    endDate: "",
    indexationRate: "0",
    capitalize: "",
    amortizationYears: "",
  };

  it("convertit en centimes en mode montant fixe", () => {
    expect(flowLineSchema.parse(base).amount).toBe(eurosToCents(900));
  });

  it("convertit en ppm en mode pourcentage du loyer", () => {
    const parsed = flowLineSchema.parse({ ...base, amount: "8", amountMode: "percent_of_rent" });

    expect(parsed.amount).toBe(percentToPpm(8));
  });

  it("laisse amortizationYears à null sans étalement", () => {
    expect(flowLineSchema.parse(base).amortizationYears).toBeNull();
  });
});
