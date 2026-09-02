import { describe, expect, it } from "vitest";

import { annuityPayment } from "./annuity";
import { eurosToCents } from "./money";
import { percentToPpm } from "./rate";

describe("annuityPayment", () => {
  it("spreads the principal evenly when the rate is zero", () => {
    expect(annuityPayment(eurosToCents(100_000), 100, 0)).toBe(eurosToCents(1_000));
  });

  it("rejects a non-positive term", () => {
    expect(() => annuityPayment(eurosToCents(100_000), 0, percentToPpm(3.5))).toThrow();
  });

  it("charges only interest on a single-month term", () => {
    const principal = eurosToCents(100_000);
    const payment = annuityPayment(principal, 1, percentToPpm(3.5));

    expect(payment).toBeGreaterThan(principal);
    expect(payment - principal).toBeLessThan(eurosToCents(300));
  });

  it("costs less on the equivalent basis than on the nominal twelfth", () => {
    const principal = eurosToCents(200_000);
    const term = 240;
    const rate = percentToPpm(3.5);

    const equivalent = annuityPayment(principal, term, rate, "equivalent");
    const nominal = annuityPayment(principal, term, rate, "nominal_12");

    expect(equivalent).toBeLessThan(nominal);
  });

  it("keeps the gap between the two bases within the documented order of magnitude", () => {
    const principal = eurosToCents(200_000);
    const term = 240;
    const rate = percentToPpm(3.5);

    const gap =
      (annuityPayment(principal, term, rate, "nominal_12") -
        annuityPayment(principal, term, rate, "equivalent")) *
      term;

    expect(gap).toBeGreaterThan(eurosToCents(1_200));
    expect(gap).toBeLessThan(eurosToCents(1_600));
  });
});
