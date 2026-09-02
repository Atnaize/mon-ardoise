import { describe, expect, it } from "vitest";

import { monthlyRate, percentToPpm, ppmToPercent, ppmToRate } from "./rate";

describe("percentToPpm", () => {
  it("stores a percentage without floating point drift", () => {
    expect(percentToPpm(3.5)).toBe(35_000);
    expect(percentToPpm(3.456)).toBe(34_560);
    expect(ppmToPercent(percentToPpm(3.456))).toBe(3.456);
    expect(ppmToRate(35_000)).toBe(0.035);
  });
});

describe("monthlyRate", () => {
  it("compounds back to the contractual annual rate on the equivalent basis", () => {
    const monthly = monthlyRate(percentToPpm(3.5), "equivalent");

    expect(Math.pow(1 + monthly, 12)).toBeCloseTo(1.035, 12);
  });

  it("is a plain twelfth on the nominal basis", () => {
    expect(monthlyRate(percentToPpm(3.6), "nominal_12")).toBeCloseTo(0.036 / 12, 15);
  });

  it("stays below the nominal twelfth, which is why the basis matters", () => {
    const equivalent = monthlyRate(percentToPpm(3.5), "equivalent");
    const nominal = monthlyRate(percentToPpm(3.5), "nominal_12");

    expect(equivalent).toBeLessThan(nominal);
  });

  it("handles a zero rate", () => {
    expect(monthlyRate(0, "equivalent")).toBe(0);
    expect(monthlyRate(0, "nominal_12")).toBe(0);
  });
});
