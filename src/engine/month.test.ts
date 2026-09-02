import { describe, expect, it } from "vitest";

import { addMonths, fromIsoDate, monthOf, monthsBetween, toIsoDate, yearOf } from "./month";

describe("fromIsoDate", () => {
  it("collapses a date to its month", () => {
    const ym = fromIsoDate("2026-09-02");

    expect(yearOf(ym)).toBe(2026);
    expect(monthOf(ym)).toBe(9);
  });

  it("rejects malformed input", () => {
    expect(() => fromIsoDate("septembre 2026")).toThrow();
  });
});

describe("addMonths", () => {
  it("crosses the year boundary", () => {
    const ym = addMonths(fromIsoDate("2026-12-01"), 1);

    expect(yearOf(ym)).toBe(2027);
    expect(monthOf(ym)).toBe(1);
  });

  it("walks backwards", () => {
    const ym = addMonths(fromIsoDate("2026-01-01"), -1);

    expect(yearOf(ym)).toBe(2025);
    expect(monthOf(ym)).toBe(12);
  });
});

describe("monthsBetween", () => {
  it("counts a twenty year horizon", () => {
    expect(monthsBetween(fromIsoDate("2026-09-01"), fromIsoDate("2046-09-01"))).toBe(240);
  });
});

describe("toIsoDate", () => {
  it("clamps a payment day to the last day of a short month", () => {
    expect(toIsoDate(fromIsoDate("2026-02-01"), 31)).toBe("2026-02-28");
    expect(toIsoDate(fromIsoDate("2028-02-01"), 31)).toBe("2028-02-29");
  });

  it("keeps a valid payment day", () => {
    expect(toIsoDate(fromIsoDate("2026-09-01"), 5)).toBe("2026-09-05");
  });
});
