import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  flowLine,
  lease,
  loan,
  loanInsurance,
  loanPrepayment,
  loanRatePeriod,
  property,
  propertyMember,
} from "@/db/schema";
import { runProjection } from "@/engine";
import { fromIsoDate } from "@/engine/month";
import type { Indicators } from "@/engine/types";

import {
  earliestMonth,
  toProjectionInput,
  type LoanBundle,
  type PropertyBundle,
} from "./projection-input";

export class NotAuthorized extends Error {
  constructor() {
    super("Not authorized for this property");
  }
}

const EDITOR_ROLES = ["owner", "editor"] as const;

function currentMonth(): number {
  const now = new Date();

  return fromIsoDate(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
  );
}

export async function membershipOf(userId: string, propertyId: string) {
  const [row] = await db
    .select()
    .from(propertyMember)
    .where(and(eq(propertyMember.userId, userId), eq(propertyMember.propertyId, propertyId)))
    .limit(1);

  return row ?? null;
}

export async function requireEditor(userId: string, propertyId: string) {
  const member = await membershipOf(userId, propertyId);

  if (!member || !EDITOR_ROLES.includes(member.role as (typeof EDITOR_ROLES)[number])) {
    throw new NotAuthorized();
  }

  return member;
}

async function loadBundles(
  propertyIds: string[],
  members: Map<string, Awaited<ReturnType<typeof membershipOf>>>,
): Promise<Map<string, PropertyBundle>> {
  if (propertyIds.length === 0) {
    return new Map();
  }

  const [properties, loans, lines, leases] = await Promise.all([
    db.select().from(property).where(inArray(property.id, propertyIds)),
    db.select().from(loan).where(inArray(loan.propertyId, propertyIds)).orderBy(asc(loan.startDate)),
    db.select().from(flowLine).where(inArray(flowLine.propertyId, propertyIds)),
    db.select().from(lease).where(inArray(lease.propertyId, propertyIds)).orderBy(asc(lease.startDate)),
  ]);

  const loanIds = loans.map((row) => row.id);
  const [ratePeriods, insurances, prepayments] =
    loanIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db.select().from(loanRatePeriod).where(inArray(loanRatePeriod.loanId, loanIds)),
          db.select().from(loanInsurance).where(inArray(loanInsurance.loanId, loanIds)),
          db.select().from(loanPrepayment).where(inArray(loanPrepayment.loanId, loanIds)),
        ]);

  const bundles = new Map<string, PropertyBundle>();

  for (const row of properties) {
    bundles.set(row.id, {
      property: row,
      member: members.get(row.id) ?? null,
      loans: [],
      lines: lines.filter((line) => line.propertyId === row.id),
      leases: leases.filter((entry) => entry.propertyId === row.id),
    });
  }

  for (const row of loans) {
    const bundle = bundles.get(row.propertyId);

    if (!bundle) {
      continue;
    }

    const entry: LoanBundle = {
      loan: row,
      ratePeriods: ratePeriods.filter((period) => period.loanId === row.id),
      insurances: insurances.filter((insurance) => insurance.loanId === row.id),
      prepayments: prepayments.filter((prepayment) => prepayment.loanId === row.id),
    };

    bundle.loans.push(entry);
  }

  return bundles;
}

export async function loadPropertyBundle(
  userId: string,
  propertyId: string,
): Promise<PropertyBundle | null> {
  const member = await membershipOf(userId, propertyId);

  if (!member) {
    return null;
  }

  const bundles = await loadBundles([propertyId], new Map([[propertyId, member]]));

  return bundles.get(propertyId) ?? null;
}

export function projectBundle(bundle: PropertyBundle) {
  const reference = currentMonth();
  const startMonth = earliestMonth(bundle, reference);

  return runProjection(toProjectionInput(bundle, startMonth), { referenceMonth: reference });
}

export interface PropertySummary {
  bundle: PropertyBundle;
  indicators: Indicators;
}

export async function listProperties(userId: string): Promise<PropertySummary[]> {
  const members = await db
    .select()
    .from(propertyMember)
    .where(eq(propertyMember.userId, userId));

  const byProperty = new Map(members.map((member) => [member.propertyId, member]));
  const bundles = await loadBundles([...byProperty.keys()], byProperty);

  return [...bundles.values()]
    .sort((a, b) => a.property.name.localeCompare(b.property.name))
    .map((bundle) => ({ bundle, indicators: projectBundle(bundle).indicators }));
}

export async function loadProjection(userId: string, propertyId: string) {
  const bundle = await loadPropertyBundle(userId, propertyId);

  if (!bundle) {
    return null;
  }

  return { bundle, ...projectBundle(bundle) };
}
