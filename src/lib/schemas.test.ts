import { describe, expect, it } from "vitest";

import { eurosToCents } from "@/engine/money";
import { percentToPpm } from "@/engine/rate";

import {
  euros,
  flowLineSchema,
  invitationSchema,
  loanSchema,
  memberSchema,
  optionalEuros,
  percent,
  permille,
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

describe("permille · la quote-part", () => {
  it("passe du pourcentage au pour mille", () => {
    expect(permille.parse("50")).toBe(500);
    expect(permille.parse("100")).toBe(1000);
    expect(permille.parse("0")).toBe(0);
  });

  it("garde la décimale d'un bien détenu à trois", () => {
    expect(permille.parse("33,3")).toBe(333);
  });

  it("ne se confond pas avec un taux : cent pour cent font mille, pas un million", () => {
    expect(permille.parse("100")).toBe(1000);
    expect(percent.parse("100")).toBe(1_000_000);
  });

  it("refuse ce qui sort de zéro-cent", () => {
    expect(permille.safeParse("-1").success).toBe(false);
    expect(permille.safeParse("101").success).toBe(false);
  });

  it("refuse ce qui n'est pas un nombre", () => {
    expect(permille.safeParse("moitié").success).toBe(false);
  });
});

describe("invitationSchema", () => {
  it("accepte une invitation sans adresse : le lien vaut pour qui le reçoit", () => {
    const parsed = invitationSchema.safeParse({ role: "editor", email: "" });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.email).toBeNull();
  });

  it("range l'adresse en minuscules, pour que la comparaison à l'acceptation tienne", () => {
    const parsed = invitationSchema.safeParse({ role: "viewer", email: "Compagne@Example.com" });

    expect(parsed.data?.email).toBe("compagne@example.com");
  });

  it("refuse une adresse mal formée plutôt que de la garder en l'état", () => {
    expect(invitationSchema.safeParse({ role: "viewer", email: "compagne@" }).success).toBe(false);
  });

  it("refuse un rôle inventé", () => {
    expect(invitationSchema.safeParse({ role: "admin", email: "" }).success).toBe(false);
  });
});

describe("memberSchema", () => {
  it("lit les deux quote-parts séparément", () => {
    const parsed = memberSchema.safeParse({
      role: "owner",
      ownershipShare: "50",
      contributionShare: "60",
    });

    expect(parsed.data).toEqual({
      role: "owner",
      ownershipShare: 500,
      contributionShare: 600,
    });
  });

  it("laisse un lecteur à zéro : le rôle donne l'accès, pas la part", () => {
    const parsed = memberSchema.safeParse({
      role: "viewer",
      ownershipShare: "0",
      contributionShare: "0",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.ownershipShare).toBe(0);
  });
});
