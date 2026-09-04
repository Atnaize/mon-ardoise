import { describe, expect, it } from "vitest";

import {
  addMonths,
  fromIsoDate,
  horizonThroughYearEnd,
  monthOf,
  monthsBetween,
  toIsoDate,
  yearOf,
} from "./month";

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

describe("horizonThroughYearEnd", () => {
  const lastMonthOf = (start: string, years: number) =>
    addMonths(fromIsoDate(start), horizonThroughYearEnd(fromIsoDate(start), years) - 1);

  it("prolonge un départ en cours d'année jusqu'à décembre", () => {
    const last = lastMonthOf("2023-08-01", 30);

    expect(yearOf(last)).toBe(2053);
    expect(monthOf(last)).toBe(12);
    // trente ans font 360 mois, plus les cinq qui restent de 2053
    expect(horizonThroughYearEnd(fromIsoDate("2023-08-01"), 30)).toBe(365);
  });

  it("ne rallonge rien quand la projection démarre en janvier", () => {
    expect(horizonThroughYearEnd(fromIsoDate("2026-01-01"), 20)).toBe(240);
    expect(monthOf(lastMonthOf("2026-01-01", 20))).toBe(12);
  });

  it("finit toujours en décembre, quel que soit le mois de départ", () => {
    for (let month = 1; month <= 12; month += 1) {
      const start = `2024-${String(month).padStart(2, "0")}-01`;

      expect(monthOf(lastMonthOf(start, 20))).toBe(12);
    }
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
