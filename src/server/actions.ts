"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  actualEntry,
  flowLine,
  invitation,
  lease,
  loan,
  loanRatePeriod,
  property,
  propertyMember,
  user as userTable,
} from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { toIsoDate } from "@/engine/month";
import { RENT_CATEGORY } from "@/lib/categories";
import { normalizeCode } from "@/lib/invitation";
import {
  flowLineSchema,
  invitationSchema,
  leaseSchema,
  loanSchema,
  memberSchema,
  propertySchema,
  rentPaymentSchema,
  wizardSchema,
} from "@/lib/schemas";
import { currentUser } from "@/lib/session";

import { fieldErrors, nestFormData, succeeded, type ActionState } from "./form";
import { acceptInvitation, createInvitation, isLastOwner } from "./members";
import { NotAuthorized, requireEditor, requireOwner } from "./properties";

type Locale = (typeof routing.locales)[number];

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");

  return routing.locales.includes(value as Locale) ? (value as Locale) : routing.defaultLocale;
}

async function signedIn(locale: Locale) {
  const user = await currentUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  return user;
}

async function editorOf(propertyId: string, locale: Locale) {
  const user = await signedIn(locale);

  await requireEditor(user.id, propertyId);

  return user;
}

async function ownerOf(propertyId: string, locale: Locale) {
  const user = await signedIn(locale);

  await requireOwner(user.id, propertyId);

  return user;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createPropertyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData);
  const user = await signedIn(locale);

  const raw = nestFormData(formData);
  const parsed = wizardSchema.safeParse({
    property: raw.property,
    loan: formData.get("includeLoan") === "on" ? raw.loan : undefined,
    lease: formData.get("includeLease") === "on" ? raw.lease : undefined,
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const { property: input, loan: loanInput, lease: leaseInput } = parsed.data;

  const createdId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(property)
      .values({
        name: input.name,
        type: input.type,
        acquisitionDate: input.acquisitionDate,
        purchasePrice: input.purchasePrice,
        currentValue: input.currentValue,
        valueGrowthRatePpm: input.valueGrowthRate,
        horizonYears: input.horizonYears,
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

  refresh();
  redirect({ href: `/properties/${createdId}`, locale });
}

export async function updatePropertyAction(
  propertyId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData);

  await editorOf(propertyId, locale);

  const parsed = propertySchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;

  await db
    .update(property)
    .set({
      name: input.name,
      type: input.type,
      acquisitionDate: input.acquisitionDate,
      purchasePrice: input.purchasePrice,
      currentValue: input.currentValue,
      valueGrowthRatePpm: input.valueGrowthRate,
      horizonYears: input.horizonYears,
      updatedAt: new Date(),
    })
    .where(eq(property.id, propertyId));

  refresh();
  redirect({ href: `/properties/${propertyId}`, locale });
}

export async function deletePropertyAction(propertyId: string, formData: FormData): Promise<void> {
  const locale = localeFrom(formData);

  // Propriétaire, pas éditeur : à deux sur un bien, celui qui saisit les loyers
  // ne doit pas pouvoir emporter le prêt, les baux et l'ardoise avec un clic.
  await ownerOf(propertyId, locale);

  await db.delete(property).where(eq(property.id, propertyId));

  refresh();
  redirect({ href: "/", locale });
}

export async function saveLoanAction(
  propertyId: string,
  loanId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await editorOf(propertyId, localeFrom(formData));

  const parsed = loanSchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;

  const values = {
    label: input.label,
    principal: input.principal,
    startDate: input.startDate,
    termMonths: input.termMonths,
    amortization: input.amortization,
    deferralMonths: input.deferralMonths,
    deferralType: input.deferralType,
  };

  await db.transaction(async (tx) => {
    const id =
      loanId ??
      (
        await tx
          .insert(loan)
          .values({ propertyId, ...values })
          .returning({ id: loan.id })
      )[0].id;

    if (loanId) {
      await tx
        .update(loan)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(loan.id, loanId), eq(loan.propertyId, propertyId)));
    }

    const existing = await tx
      .select({ id: loanRatePeriod.id })
      .from(loanRatePeriod)
      .where(and(eq(loanRatePeriod.loanId, id), eq(loanRatePeriod.startMonth, 0)))
      .limit(1);

    if (existing.length === 0) {
      await tx.insert(loanRatePeriod).values({
        loanId: id,
        startMonth: 0,
        annualRatePpm: input.annualRate,
        rateBasis: input.rateBasis,
      });

      return;
    }

    await tx
      .update(loanRatePeriod)
      .set({ annualRatePpm: input.annualRate, rateBasis: input.rateBasis })
      .where(eq(loanRatePeriod.id, existing[0].id));
  });

  refresh();

  return succeeded();
}

export async function deleteLoanAction(
  propertyId: string,
  loanId: string,
  formData: FormData,
): Promise<void> {
  await editorOf(propertyId, localeFrom(formData));

  await db.delete(loan).where(and(eq(loan.id, loanId), eq(loan.propertyId, propertyId)));

  refresh();
}

export async function saveLeaseAction(
  propertyId: string,
  leaseId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await editorOf(propertyId, localeFrom(formData));

  const parsed = leaseSchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const values = {
    tenantLabel: input.tenantLabel,
    kind: input.kind,
    startDate: input.startDate,
    endDate: input.endDate,
    monthlyRent: input.monthlyRent,
    indexationRatePpm: input.indexationRate,
    status: input.status,
  };

  if (leaseId) {
    await db
      .update(lease)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(lease.id, leaseId), eq(lease.propertyId, propertyId)));
  } else {
    await db.insert(lease).values({ propertyId, ...values });
  }

  refresh();

  return succeeded();
}

export async function deleteLeaseAction(
  propertyId: string,
  leaseId: string,
  formData: FormData,
): Promise<void> {
  await editorOf(propertyId, localeFrom(formData));

  await db.delete(lease).where(and(eq(lease.id, leaseId), eq(lease.propertyId, propertyId)));

  refresh();
}

export async function saveFlowLineAction(
  propertyId: string,
  lineId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await editorOf(propertyId, localeFrom(formData));

  const parsed = flowLineSchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const values = {
    kind: input.kind,
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
    isAcquisitionCost: input.isAcquisitionCost,
  };

  if (lineId) {
    await db
      .update(flowLine)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(flowLine.id, lineId), eq(flowLine.propertyId, propertyId)));
  } else {
    await db.insert(flowLine).values({ propertyId, ...values });
  }

  refresh();

  return succeeded();
}

export async function deleteFlowLineAction(
  propertyId: string,
  lineId: string,
  formData: FormData,
): Promise<void> {
  await editorOf(propertyId, localeFrom(formData));

  await db
    .delete(flowLine)
    .where(and(eq(flowLine.id, lineId), eq(flowLine.propertyId, propertyId)));

  refresh();
}

export async function saveRentPaymentAction(
  propertyId: string,
  entryId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await editorOf(propertyId, localeFrom(formData));

  const parsed = rentPaymentSchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const values = {
    date: input.date,
    kind: "income" as const,
    category: RENT_CATEGORY,
    label: `Loyer ${toIsoDate(input.dueMonth, 1).slice(0, 7)}`,
    amount: input.amount,
    leaseId: input.leaseId,
    dueMonth: input.dueMonth,
  };

  if (entryId) {
    await db
      .update(actualEntry)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(actualEntry.id, entryId), eq(actualEntry.propertyId, propertyId)));
  } else {
    await db.insert(actualEntry).values({ propertyId, createdBy: user.id, ...values });
  }

  refresh();

  return succeeded();
}

export async function deleteRentPaymentAction(
  propertyId: string,
  entryId: string,
  formData: FormData,
): Promise<void> {
  await editorOf(propertyId, localeFrom(formData));

  await db
    .delete(actualEntry)
    .where(and(eq(actualEntry.id, entryId), eq(actualEntry.propertyId, propertyId)));

  refresh();
}

/*
 * Partager un bien. Trois règles tiennent tout le reste :
 *
 * 1. Seul un propriétaire fait entrer et sortir quelqu'un. Un éditeur saisit le
 *    contenu du bien, il ne décide pas de qui le voit.
 * 2. La dernière place de propriétaire est verrouillée : un bien sans
 *    propriétaire ne se règle plus et ne se supprime plus.
 * 3. Le rôle donne l'accès, la quote-part répartit l'argent. Les deux se
 *    modifient au même endroit, mais jamais l'un pour l'autre.
 */

export async function createInvitationAction(
  propertyId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData);
  const user = await ownerOf(propertyId, locale);

  const parsed = invitationSchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  await createInvitation({
    propertyId,
    invitedBy: user.id,
    role: parsed.data.role,
    email: parsed.data.email,
  });

  refresh();

  return succeeded();
}

export async function revokeInvitationAction(
  propertyId: string,
  invitationId: string,
  formData: FormData,
): Promise<void> {
  await ownerOf(propertyId, localeFrom(formData));

  await db
    .delete(invitation)
    .where(and(eq(invitation.id, invitationId), eq(invitation.propertyId, propertyId)));

  refresh();
}

export async function updateMemberAction(
  propertyId: string,
  memberId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await ownerOf(propertyId, localeFrom(formData));

  const parsed = memberSchema.safeParse(nestFormData(formData));

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;

  if (input.role !== "owner" && (await isLastOwner(propertyId, memberId))) {
    return { errors: { role: "C'est le dernier propriétaire du bien : il en faut un." } };
  }

  await db
    .update(propertyMember)
    .set({
      role: input.role,
      ownershipSharePermille: input.ownershipShare,
      contributionSharePermille: input.contributionShare,
    })
    .where(and(eq(propertyMember.id, memberId), eq(propertyMember.propertyId, propertyId)));

  refresh();

  return succeeded();
}

export async function removeMemberAction(
  propertyId: string,
  memberId: string,
  formData: FormData,
): Promise<void> {
  await ownerOf(propertyId, localeFrom(formData));

  // L'écran ne propose pas de retirer le dernier propriétaire ; la garde est ici
  // parce qu'une Server Action s'atteint aussi sans passer par l'écran.
  if (await isLastOwner(propertyId, memberId)) {
    throw new NotAuthorized();
  }

  await db
    .delete(propertyMember)
    .where(and(eq(propertyMember.id, memberId), eq(propertyMember.propertyId, propertyId)));

  refresh();
}

/**
 * Accepter, c'est un POST : une invitation ne se consomme pas à l'ouverture du
 * lien, sinon un aperçu de message dans une boîte mail suffirait à la brûler.
 */
export async function acceptInvitationAction(code: string, formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const user = await signedIn(locale);

  const result = await acceptInvitation(normalizeCode(code), {
    id: user.id,
    email: user.email,
  });

  refresh();

  if (result.status === "ok") {
    redirect({ href: `/properties/${result.propertyId}`, locale });
  }

  // Refusée : la page du lien se réaffiche et dit pourquoi.
}

/**
 * La langue suit l'utilisateur, pas le navigateur : elle est écrite sur son compte
 * puis relue à l'ouverture, donc le choix tient d'un appareil à l'autre.
 *
 * Une seule aller-retour : on écrit, puis on redirige vers la même page dans la
 * nouvelle langue. Un clic qui navigue et sauve en parallèle perdrait la course.
 */
export async function switchLocaleAction(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const path = formData.get("path");
  const target = typeof path === "string" && path.startsWith("/") ? path : "/";
  const current = await currentUser();

  if (current) {
    await db
      .update(userTable)
      .set({ locale, updatedAt: new Date() })
      .where(eq(userTable.id, current.id));

    refresh();
  }

  redirect({ href: target, locale });
}
