import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { actualEntry } from "@/db/schema";
import { rentByMonth } from "@/engine/rent";
import { buildRentLedger, type RentLedger, type RentPayment } from "@/engine/rent-ledger";
import { RENT_CATEGORY } from "@/lib/categories";
import { currentMonth } from "@/lib/clock";

import { earliestMonth, toProjectionInput, type PropertyBundle } from "./projection-input";

function toPayment(row: typeof actualEntry.$inferSelect): RentPayment | null {
  return row.dueMonth == null
    ? null
    : { id: row.id, dueMonth: row.dueMonth, amount: row.amount, date: row.date };
}

export async function rentPaymentsOf(propertyId: string): Promise<RentPayment[]> {
  const rows = await db
    .select()
    .from(actualEntry)
    .where(and(eq(actualEntry.propertyId, propertyId), eq(actualEntry.category, RENT_CATEGORY)));

  return rows.map(toPayment).filter((payment): payment is RentPayment => payment != null);
}

export async function rentPaymentsByProperty(
  propertyIds: string[],
): Promise<Map<string, RentPayment[]>> {
  const byProperty = new Map<string, RentPayment[]>(propertyIds.map((id) => [id, []]));

  if (propertyIds.length === 0) {
    return byProperty;
  }

  const rows = await db
    .select()
    .from(actualEntry)
    .where(
      and(
        inArray(actualEntry.propertyId, propertyIds),
        eq(actualEntry.category, RENT_CATEGORY),
      ),
    );

  for (const row of rows) {
    const payment = toPayment(row);

    if (payment) {
      byProperty.get(row.propertyId)?.push(payment);
    }
  }

  return byProperty;
}

export function ledgerFor(bundle: PropertyBundle, payments: RentPayment[]): RentLedger {
  const reference = currentMonth();
  const startMonth = earliestMonth(bundle, reference);
  const input = toProjectionInput(bundle, startMonth);

  return buildRentLedger({
    rents: rentByMonth(input.leases, startMonth, input.horizonMonths),
    startMonth,
    currentMonth: reference,
    payments,
  });
}
