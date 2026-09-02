import { describe, expect, it } from "vitest";

import { eurosToCents } from "./money";
import { fromIsoDate } from "./month";
import { buildRentLedger, type RentPayment } from "./rent-ledger";

const START = fromIsoDate("2026-01-01");
const NOW = fromIsoDate("2026-06-01");
const RENT = eurosToCents(1_000);

const rents = (count: number, amount = RENT) => new Array(count).fill(amount);

function payment(monthOffset: number, amount: number, id = `p${monthOffset}`): RentPayment {
  return {
    id,
    dueMonth: START + monthOffset,
    amount: eurosToCents(amount),
    date: "2026-01-05",
  };
}

describe("buildRentLedger · statuts", () => {
  const ledger = buildRentLedger({
    rents: rents(12),
    startMonth: START,
    currentMonth: NOW,
    payments: [payment(0, 1_000), payment(1, 400), payment(3, 1_200)],
  });

  const at = (offset: number) => ledger.rows.find((row) => row.month === START + offset)!;

  it("marque payé un mois soldé", () => {
    expect(at(0).status).toBe("paid");
    expect(at(0).balance).toBe(0);
  });

  it("marque partiel un mois incomplet et passé", () => {
    expect(at(1).status).toBe("partial");
    expect(at(1).balance).toBe(eurosToCents(600));
  });

  it("marque impayé un mois passé sans versement", () => {
    expect(at(2).status).toBe("overdue");
    expect(at(2).balance).toBe(RENT);
  });

  it("marque trop-perçu un versement excédentaire", () => {
    expect(at(3).status).toBe("overpaid");
    expect(at(3).balance).toBe(eurosToCents(-200));
  });

  it("marque à venir le mois suivant, non encore réglé", () => {
    expect(at(6).status).toBe("upcoming");
  });

  it("ne devance pas au-delà du mois suivant sans versement encodé", () => {
    expect(ledger.rows.find((row) => row.month === START + 11)).toBeUndefined();
  });

  it("considère un mois futur déjà réglé comme payé", () => {
    const advance = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [payment(8, 1_000)],
    });

    expect(advance.rows.find((row) => row.month === START + 8)!.status).toBe("paid");
  });
});

describe("buildRentLedger · ardoise", () => {
  it("ne compte que les mois échus dans l'ardoise", () => {
    const ledger = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [payment(0, 1_000), payment(1, 400)],
    });

    expect(ledger.expectedToDate).toBe(eurosToCents(6_000));
    expect(ledger.receivedToDate).toBe(eurosToCents(1_400));
    expect(ledger.outstanding).toBe(eurosToCents(4_600));
  });

  it("liste les mois en retard dans l'ordre", () => {
    const ledger = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [payment(0, 1_000), payment(2, 1_000), payment(4, 500)],
    });

    expect(ledger.overdueMonths).toEqual([START + 1, START + 3, START + 4, START + 5]);
    expect(ledger.firstOverdueMonth).toBe(START + 1);
  });

  it("tombe à zéro quand tout est payé", () => {
    const ledger = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [0, 1, 2, 3, 4, 5].map((offset) => payment(offset, 1_000)),
    });

    expect(ledger.outstanding).toBe(0);
    expect(ledger.overdueMonths).toEqual([]);
    expect(ledger.firstOverdueMonth).toBeNull();
  });

  it("compense un trop-perçu par un impayé dans l'ardoise", () => {
    const ledger = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [payment(0, 2_000), payment(2, 1_000), payment(3, 1_000), payment(4, 1_000), payment(5, 1_000)],
    });

    expect(ledger.outstanding).toBe(0);
    expect(ledger.overdueMonths).toEqual([START + 1]);
  });
});

describe("buildRentLedger · bornes", () => {
  it("ne rend rien sans loyer attendu ni versement", () => {
    const ledger = buildRentLedger({
      rents: rents(12, 0),
      startMonth: START,
      currentMonth: NOW,
      payments: [],
    });

    expect(ledger.rows).toEqual([]);
    expect(ledger.outstanding).toBe(0);
  });

  it("démarre au premier mois attendu, pas au début de la projection", () => {
    const ledger = buildRentLedger({
      rents: [0, 0, 0, RENT, RENT, RENT, RENT],
      startMonth: START,
      currentMonth: NOW,
      payments: [],
    });

    expect(ledger.rows[0].month).toBe(START + 3);
  });

  it("expose le mois suivant pour permettre un règlement anticipé", () => {
    const ledger = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [],
    });

    expect(ledger.rows.at(-1)!.month).toBe(NOW + 1);
  });

  it("étend la vue jusqu'au dernier versement encodé, même au-delà", () => {
    const ledger = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [payment(10, 1_000)],
    });

    expect(ledger.rows.at(-1)!.month).toBe(START + 10);
  });

  it("garde un versement sur un mois sans loyer attendu", () => {
    const ledger = buildRentLedger({
      rents: [0, 0, 0, 0, 0, 0, 0],
      startMonth: START,
      currentMonth: NOW,
      payments: [payment(2, 800)],
    });

    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0].expected).toBe(0);
    expect(ledger.rows[0].received).toBe(eurosToCents(800));
    expect(ledger.rows[0].status).toBe("overpaid");
  });

  it("trie les versements d'un mois par date", () => {
    const ledger = buildRentLedger({
      rents: rents(12),
      startMonth: START,
      currentMonth: NOW,
      payments: [
        { id: "b", dueMonth: START, amount: eurosToCents(400), date: "2026-01-20" },
        { id: "a", dueMonth: START, amount: eurosToCents(600), date: "2026-01-03" },
      ],
    });

    expect(ledger.rows[0].payments.map((p) => p.id)).toEqual(["a", "b"]);
    expect(ledger.rows[0].received).toBe(RENT);
    expect(ledger.rows[0].status).toBe("paid");
  });
});
