import { describe, expect, it } from "vitest";

import { yearMonth } from "@/engine/month";
import { buildRentLedger, type RentPayment } from "@/engine/rent-ledger";

import { lateRent, reminderSignature, shouldRemind } from "./reminders";

const RENT = 95_000;
const JUNE = yearMonth(2026, 6);
const SEPTEMBER = yearMonth(2026, 9);

/** Un bail de 950 € par mois depuis juin, vu au mois de septembre. */
function ledger(payments: RentPayment[] = []) {
  return buildRentLedger({
    rents: [RENT, RENT, RENT, RENT],
    startMonth: JUNE,
    currentMonth: SEPTEMBER,
    payments,
  });
}

function payment(month: number, amount: number): RentPayment {
  return { id: `p${month}`, dueMonth: month, amount, date: "2026-06-05" };
}

describe("lateRent", () => {
  it("ne compte pas le mois courant avant le 10", () => {
    const late = lateRent(ledger(), "2026-09-04");

    expect(late.months).toEqual([JUNE, JUNE + 1, JUNE + 2]);
    expect(late.amount).toBe(3 * RENT);
  });

  it("compte le mois courant à partir du 10", () => {
    const late = lateRent(ledger(), "2026-09-10");

    expect(late.months).toEqual([JUNE, JUNE + 1, JUNE + 2, SEPTEMBER]);
    expect(late.amount).toBe(4 * RENT);
  });

  it("ne réclame que ce qui manque sur un mois payé en partie", () => {
    const late = lateRent(ledger([payment(JUNE, 40_000), payment(JUNE + 1, RENT)]), "2026-09-04");

    expect(late.months).toEqual([JUNE, JUNE + 2]);
    expect(late.amount).toBe(RENT - 40_000 + RENT);
  });

  it("ne trouve rien à rappeler sur une ardoise soldée", () => {
    const paid = [JUNE, JUNE + 1, JUNE + 2, SEPTEMBER].map((month) => payment(month, RENT));
    const late = lateRent(ledger(paid), "2026-09-30");

    expect(late.months).toEqual([]);
    expect(late.amount).toBe(0);
  });
});

describe("reminderSignature", () => {
  it("ne dépend pas de l'ordre des biens", () => {
    const a = { propertyId: "a", amount: RENT, months: 1 };
    const b = { propertyId: "b", amount: 2 * RENT, months: 2 };

    expect(reminderSignature([a, b])).toBe(reminderSignature([b, a]));
  });

  it("change dès qu'un montant change", () => {
    const before = reminderSignature([{ propertyId: "a", amount: RENT, months: 1 }]);
    const after = reminderSignature([{ propertyId: "a", amount: RENT - 1, months: 1 }]);

    expect(after).not.toBe(before);
  });

  it("est vide quand rien n'est en retard", () => {
    expect(reminderSignature([])).toBe("");
  });
});

describe("shouldRemind", () => {
  const NOW = new Date("2026-09-15T06:00:00Z");
  const YESTERDAY = new Date("2026-09-14T06:00:00Z");
  const LAST_WEEK = new Date("2026-09-08T06:00:00Z");

  it("se tait quand rien n'est en retard", () => {
    expect(shouldRemind(null, "", NOW)).toBe(false);
  });

  it("envoie un premier rappel", () => {
    expect(shouldRemind(null, "a:95000:1", NOW)).toBe(true);
  });

  it("envoie dès que l'ardoise a changé", () => {
    expect(shouldRemind({ signature: "a:95000:1", sentAt: YESTERDAY }, "a:190000:2", NOW)).toBe(
      true,
    );
  });

  it("ne répète pas le même message le lendemain", () => {
    expect(shouldRemind({ signature: "a:95000:1", sentAt: YESTERDAY }, "a:95000:1", NOW)).toBe(
      false,
    );
  });

  it("relance au bout d'une semaine", () => {
    expect(shouldRemind({ signature: "a:95000:1", sentAt: LAST_WEEK }, "a:95000:1", NOW)).toBe(
      true,
    );
  });
});
