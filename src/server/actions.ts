"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "@/i18n/navigation";

import { db } from "@/db";
import { flowLine, lease, loan, loanRatePeriod, property, propertyMember } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { flowLineSchema, wizardSchema } from "@/lib/schemas";
import { currentUser } from "@/lib/session";

import { routing } from "@/i18n/routing";

import { fieldErrors, nestFormData, succeeded, type ActionState } from "./form";
import { requireEditor } from "./properties";

type Locale = (typeof routing.locales)[number];

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");

  return routing.locales.includes(value as Locale) ? (value as Locale) : routing.defaultLocale;
}

async function editorFor(propertyId: string, locale: Locale) {
  const user = await currentUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  await requireEditor(user.id, propertyId);

  return user;
}

export async function createPropertyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData);
  const user = await currentUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const raw = nestFormData(formData);
  const withLoan = formData.get("includeLoan") === "on";
  const withLease = formData.get("includeLease") === "on";

  const parsed = wizardSchema.safeParse({
    property: raw.property,
    loan: withLoan ? raw.loan : undefined,
    lease: withLease ? raw.lease : undefined,
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const { property: propertyInput, loan: loanInput, lease: leaseInput } = parsed.data;

  const createdId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(property)
      .values({
        name: propertyInput.name,
        type: propertyInput.type,
        region: propertyInput.region,
        status: propertyInput.status,
        acquisitionDate: propertyInput.acquisitionDate,
        purchasePrice: propertyInput.purchasePrice,
        cadastralIncome: propertyInput.cadastralIncome,
        currentValue: propertyInput.currentValue,
        valueGrowthRatePpm: propertyInput.valueGrowthRate,
        marginalTaxRatePpm: propertyInput.marginalTaxRate,
        estimatedTaxYearly: propertyInput.estimatedTaxYearly,
        horizonYears: propertyInput.horizonYears,
        createdBy: user.id,
      })
      .returning({ id: property.id });

    await tx.insert(propertyMember).values({
      propertyId: created.id,
      userId: user.id,
      role: "owner",
      ownershipSharePermille: 1000,
      contributionSharePermille: 1000,
    });

    if (loanInput) {
      const [createdLoan] = await tx
        .insert(loan)
        .values({
          propertyId: created.id,
          label: loanInput.label,
          principal: loanInput.principal,
          startDate: loanInput.startDate,
          termMonths: loanInput.termMonths,
          amortization: loanInput.amortization,
          deferralMonths: loanInput.deferralMonths,
          deferralType: loanInput.deferralType,
        })
        .returning({ id: loan.id });

      await tx.insert(loanRatePeriod).values({
        loanId: createdLoan.id,
        startMonth: 0,
        annualRatePpm: loanInput.annualRate,
        rateBasis: loanInput.rateBasis,
      });
    }

    if (leaseInput) {
      await tx.insert(lease).values({
        propertyId: created.id,
        tenantLabel: leaseInput.tenantLabel,
        kind: leaseInput.kind,
        startDate: leaseInput.startDate,
        endDate: leaseInput.endDate,
        monthlyRent: leaseInput.monthlyRent,
        indexationRatePpm: leaseInput.indexationRate,
        status: leaseInput.status,
      });
    }

    return created.id;
  });

  revalidatePath("/", "layout");
  redirect({ href: `/properties/${createdId}`, locale });
}

export async function addFlowLineAction(
  propertyId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await editorFor(propertyId, localeFrom(formData));

  const parsed = flowLineSchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;

  await db.insert(flowLine).values({
    propertyId,
    kind: input.kind,
    category: input.category,
    label: input.label,
    amount: input.amount,
    amountMode: input.amountMode,
    recurrence: input.recurrence,
    recurrenceInterval: input.recurrenceInterval,
    startDate: input.startDate,
    endDate: input.endDate,
    indexationRatePpm: input.indexationRate,
    capitalize: input.capitalize,
    amortizationYears: input.amortizationYears,
  });

  revalidatePath("/", "layout");

  return succeeded();
}

export async function deleteFlowLineAction(
  propertyId: string,
  lineId: string,
  _formData: FormData,
): Promise<void> {
  await editorFor(propertyId, routing.defaultLocale);

  await db
    .delete(flowLine)
    .where(and(eq(flowLine.id, lineId), eq(flowLine.propertyId, propertyId)));

  revalidatePath("/", "layout");
}
