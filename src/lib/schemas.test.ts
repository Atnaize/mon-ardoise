import { describe, expect, it } from "vitest";

import { eurosToCents } from "@/engine/money";
import { percentToPpm } from "@/engine/rate";

import {
  euros,
  flowLineSchema,
  loanSchema,
  optionalEuros,
  percent,
  propertySchema,
  wizardSchema,
} from "./schemas";

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
    acquisitionDate: "",
    purchasePrice: "200000",
    currentValue: "190000",
    valueGrowthRate: "0",
    estimatedTaxYearly: "0",
    horizonYears: "20",
  };

  it("nettoie et convertit", () => {
    const parsed = propertySchema.parse(valid);

    expect(parsed.name).toBe("Maison");
    expect(parsed.purchasePrice).toBe(eurosToCents(200_000));
    expect(parsed.acquisitionDate).toBeNull();
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

describe("flowLineSchema · nature", () => {
  const base = {
    kind: "expense",
    label: "Assurance incendie",
    amount: "340",
    amountMode: "fixed",
    nature: "recurring",
    periodicity: "yearly",
    recurrenceInterval: "1",
    startDate: "2026-10-01",
    endDate: "",
    indexationRate: "2",
    amortizationYears: "",
  };

  it("traduit « au départ » en frais ponctuel qui compte dans l'acquisition", () => {
    const parsed = flowLineSchema.parse({ ...base, nature: "upfront", periodicity: undefined });

    expect(parsed.recurrence).toBe("one_off");
    expect(parsed.isAcquisitionCost).toBe(true);
  });

  it("traduit « ponctuel » en frais ponctuel hors acquisition", () => {
    const parsed = flowLineSchema.parse({ ...base, nature: "one_off", periodicity: undefined });

    expect(parsed.recurrence).toBe("one_off");
    expect(parsed.isAcquisitionCost).toBe(false);
  });

  it("traduit « récurrent » en la périodicité choisie", () => {
    expect(flowLineSchema.parse(base).recurrence).toBe("yearly");
    expect(flowLineSchema.parse({ ...base, periodicity: "quarterly" }).recurrence).toBe("quarterly");
    expect(flowLineSchema.parse(base).isAcquisitionCost).toBe(false);
  });

  it("retombe sur annuel si la périodicité manque", () => {
    expect(flowLineSchema.parse({ ...base, periodicity: undefined }).recurrence).toBe("yearly");
  });

  it("ignore l'indexation sur un frais ponctuel, qui n'a pas d'anniversaire", () => {
    expect(flowLineSchema.parse({ ...base, nature: "upfront" }).indexationRate).toBe(0);
    expect(flowLineSchema.parse({ ...base, nature: "one_off" }).indexationRate).toBe(0);
    expect(flowLineSchema.parse(base).indexationRate).toBe(percentToPpm(2));
  });

  it("refuse une nature inconnue", () => {
    expect(flowLineSchema.safeParse({ ...base, nature: "autre" }).success).toBe(false);
  });
});

describe("flowLineSchema · unité du montant", () => {
  const base = {
    kind: "expense",
    label: "Précompte immobilier",
    amount: "900",
    amountMode: "fixed",
    nature: "recurring",
    periodicity: "yearly",
    recurrenceInterval: "1",
    startDate: "2026-10-01",
    endDate: "",
    indexationRate: "0",
    amortizationYears: "",
  };

  it("convertit en centimes en mode montant fixe", () => {
    expect(flowLineSchema.parse(base).amount).toBe(eurosToCents(900));
  });

  it("convertit en ppm en mode pourcentage du loyer", () => {
    const parsed = flowLineSchema.parse({ ...base, amount: "8", amountMode: "percent_of_rent" });

    expect(parsed.amount).toBe(percentToPpm(8));
  });

  it("accepte la case étalement décochée, absente du FormData", () => {
    expect(flowLineSchema.parse(base).capitalize).toBe(false);
  });

  it("lit la case étalement cochée", () => {
    expect(flowLineSchema.parse({ ...base, capitalize: "on" }).capitalize).toBe(true);
  });

  it("laisse amortizationYears à null sans étalement", () => {
    expect(flowLineSchema.parse(base).amortizationYears).toBeNull();
  });
});

describe("loanSchema · conventions belges par défaut", () => {
  const withoutConventions = {
    label: "Prêt hypothécaire",
    principal: "150000",
    startDate: "2023-10-01",
    termMonths: "241",
    annualRate: "3,06",
  };

  it("valide un prêt saisi sans les champs de convention", () => {
    const parsed = loanSchema.parse(withoutConventions);

    expect(parsed.rateBasis).toBe("nominal_12");
    expect(parsed.amortization).toBe("annuity");
    expect(parsed.deferralType).toBe("none");
    expect(parsed.deferralMonths).toBe(0);
  });

  it("respecte les conventions explicites de l'édition avancée", () => {
    const parsed = loanSchema.parse({
      ...withoutConventions,
      rateBasis: "equivalent",
      amortization: "constant_principal",
      deferralType: "interest_only",
      deferralMonths: "24",
    });

    expect(parsed.rateBasis).toBe("equivalent");
    expect(parsed.amortization).toBe("constant_principal");
    expect(parsed.deferralType).toBe("interest_only");
    expect(parsed.deferralMonths).toBe(24);
  });

  it("refuse une convention inconnue", () => {
    expect(loanSchema.safeParse({ ...withoutConventions, rateBasis: "actuariel" }).success).toBe(
      false,
    );
  });

  it("valide le prêt du wizard de création, qui n'affiche aucune convention", () => {
    const parsed = wizardSchema.safeParse({
      property: {
        name: "Maison",
        type: "house",
        acquisitionDate: "",
        purchasePrice: "200000",
        currentValue: "190000",
        valueGrowthRate: "0",
        estimatedTaxYearly: "0",
        horizonYears: "20",
      },
      loan: withoutConventions,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.loan?.rateBasis).toBe("nominal_12");
  });
});
