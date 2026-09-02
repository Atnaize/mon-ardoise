import { describe, expect, it } from "vitest";

import { applyShare, distribute, eurosToCents, formatCents, roundToCents } from "./money";

describe("roundToCents", () => {
  it("rounds half away from zero symmetrically", () => {
    expect(roundToCents(0.5)).toBe(1);
    expect(roundToCents(-0.5)).toBe(-1);
    expect(roundToCents(1.5)).toBe(2);
    expect(roundToCents(-1.5)).toBe(-2);
  });

  it("keeps integers untouched", () => {
    expect(roundToCents(12_345)).toBe(12_345);
  });
});

describe("eurosToCents", () => {
  it("survives binary floating point representation", () => {
    expect(eurosToCents(1150.1)).toBe(115_010);
    expect(eurosToCents(0.07)).toBe(7);
    expect(eurosToCents(1234.565)).toBe(123_457);
  });
});

describe("applyShare", () => {
  it("splits on a per-mille basis", () => {
    expect(applyShare(140_000, 500)).toBe(70_000);
    expect(applyShare(140_000, 333)).toBe(46_620);
  });
});

describe("distribute", () => {
  it("never loses or invents a cent", () => {
    expect(distribute(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(distribute(100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("preserves the total for uneven shares", () => {
    const parts = distribute(140_007, [600, 400]);

    expect(parts.reduce((a, b) => a + b, 0)).toBe(140_007);
  });

  it("preserves the total for negative amounts", () => {
    const parts = distribute(-100, [1, 1, 1]);

    expect(parts.reduce((a, b) => a + b, 0)).toBe(-100);
  });

  it("returns zeros when no share is held", () => {
    expect(distribute(100, [0, 0])).toEqual([0, 0]);
  });
});

describe("formatCents", () => {
  it("formats in euros for both locales", () => {
    expect(formatCents(115_425, "fr-BE")).toContain("154");
    expect(formatCents(115_425, "en")).toContain("154");
  });
});
