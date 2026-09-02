import type { Cents } from "./money";
import type { YearMonth } from "./month";

export type RentStatus = "upcoming" | "paid" | "overpaid" | "partial" | "overdue";

export interface RentPayment {
  id: string;
  dueMonth: YearMonth;
  amount: Cents;
  date: string;
}

export interface RentLedgerRow {
  month: YearMonth;
  expected: Cents;
  received: Cents;
  balance: Cents;
  status: RentStatus;
  payments: RentPayment[];
}

export interface RentLedger {
  rows: RentLedgerRow[];
  outstanding: Cents;
  expectedToDate: Cents;
  receivedToDate: Cents;
  overdueMonths: YearMonth[];
  firstOverdueMonth: YearMonth | null;
}

export interface RentLedgerInput {
  rents: readonly Cents[];
  startMonth: YearMonth;
  currentMonth: YearMonth;
  payments: readonly RentPayment[];
  monthsAhead?: number;
}

function statusOf(
  expected: Cents,
  received: Cents,
  month: YearMonth,
  currentMonth: YearMonth,
): RentStatus {
  if (month > currentMonth && received < expected) {
    return "upcoming";
  }

  if (received > expected) {
    return "overpaid";
  }

  if (received === expected) {
    return "paid";
  }

  return received > 0 ? "partial" : "overdue";
}

export function buildRentLedger({
  rents,
  startMonth,
  currentMonth,
  payments,
  monthsAhead = 1,
}: RentLedgerInput): RentLedger {
  const byMonth = new Map<YearMonth, RentPayment[]>();

  for (const payment of payments) {
    const existing = byMonth.get(payment.dueMonth) ?? [];
    existing.push(payment);
    byMonth.set(payment.dueMonth, existing);
  }

  const expectedAt = (month: YearMonth): Cents => rents[month - startMonth] ?? 0;

  const firstExpected = rents.findIndex((amount) => amount > 0);
  const candidates = [
    ...(firstExpected === -1 ? [] : [startMonth + firstExpected]),
    ...byMonth.keys(),
  ];

  if (candidates.length === 0) {
    return {
      rows: [],
      outstanding: 0,
      expectedToDate: 0,
      receivedToDate: 0,
      overdueMonths: [],
      firstOverdueMonth: null,
    };
  }

  const from = Math.min(...candidates);
  const to = Math.max(currentMonth + monthsAhead, ...byMonth.keys());

  const rows: RentLedgerRow[] = [];
  let outstanding: Cents = 0;
  let expectedToDate: Cents = 0;
  let receivedToDate: Cents = 0;
  const overdueMonths: YearMonth[] = [];

  for (let month = from; month <= to; month += 1) {
    const expected = expectedAt(month);
    const monthPayments = (byMonth.get(month) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    const received = monthPayments.reduce((total, payment) => total + payment.amount, 0);

    if (expected === 0 && received === 0) {
      continue;
    }

    const status = statusOf(expected, received, month, currentMonth);
    const balance = expected - received;

    if (month <= currentMonth) {
      expectedToDate += expected;
      receivedToDate += received;
      outstanding += balance;
    }

    if (status === "overdue" || (status === "partial" && month <= currentMonth)) {
      overdueMonths.push(month);
    }

    rows.push({ month, expected, received, balance, status, payments: monthPayments });
  }

  return {
    rows,
    outstanding,
    expectedToDate,
    receivedToDate,
    overdueMonths,
    firstOverdueMonth: overdueMonths[0] ?? null,
  };
}
