import { describe, expect, it } from "vitest";

import { eurosToCents } from "./money";
import { fromIsoDate } from "./month";
import { percentToPpm } from "./rate";
import { rentByMonth } from "./rent";
import type { Lease } from "./types";

const START = fromIsoDate("2026-10-01");

function lease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: "lease-1",
    startMonth: START,
    endMonth: null,
    monthlyRent: eurosToCents(1_000),
    indexationRatePpm: 0,
    ...overrides,
  };
}

describe("rentByMonth", () => {
  it("rend zéro partout sans bail", () => {
    expect(rentByMonth([], START, 12).every((r) => r === 0)).toBe(true);
  });

  it("rend le loyer sur toute la durée", () => {
    expect(rentByMonth([lease()], START, 12).every((r) => r === eurosToCents(1_000))).toBe(true);
  });

  it("indexe à la date anniversaire", () => {
    const rents = rentByMonth([lease({ indexationRatePpm: percentToPpm(2) })], START, 36);

    expect(rents[0]).toBe(eurosToCents(1_000));
    expect(rents[11]).toBe(eurosToCents(1_000));
    expect(rents[12]).toBe(eurosToCents(1_020));
    expect(rents[24]).toBe(eurosToCents(1_040.4));
  });

  it("laisse une vacance avant le début et après la fin", () => {
    const rents = rentByMonth([lease({ startMonth: START + 2, endMonth: START + 5 })], START, 12);

    expect(rents[0]).toBe(0);
    expect(rents[1]).toBe(0);
    expect(rents[2]).toBe(eurosToCents(1_000));
    expect(rents[5]).toBe(eurosToCents(1_000));
    expect(rents[6]).toBe(0);
  });

  it("laisse un trou entre deux baux successifs", () => {
    const rents = rentByMonth(
      [
        lease({ endMonth: START + 11 }),
        lease({ id: "lease-2", startMonth: START + 13, monthlyRent: eurosToCents(1_100) }),
      ],
      START,
      24,
    );

    expect(rents[11]).toBe(eurosToCents(1_000));
    expect(rents[12]).toBe(0);
    expect(rents[13]).toBe(eurosToCents(1_100));
  });

  it("additionne deux baux simultanés", () => {
    const rents = rentByMonth(
      [lease(), lease({ id: "lease-2", monthlyRent: eurosToCents(450) })],
      START,
      6,
    );

    expect(rents[0]).toBe(eurosToCents(1_450));
  });
});
