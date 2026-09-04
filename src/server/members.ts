import "server-only";

import { and, asc, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { invitation, property, propertyMember, user as userTable } from "@/db/schema";
import {
  invitationState,
  inviteCode,
  INVITATION_DAYS,
  type InvitationState,
  type Role,
} from "@/lib/invitation";

export interface MemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  ownershipSharePermille: number;
  contributionSharePermille: number;
}

export async function listMembers(propertyId: string): Promise<MemberView[]> {
  return db
    .select({
      id: propertyMember.id,
      userId: propertyMember.userId,
      role: propertyMember.role,
      ownershipSharePermille: propertyMember.ownershipSharePermille,
      contributionSharePermille: propertyMember.contributionSharePermille,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(propertyMember)
    .innerJoin(userTable, eq(userTable.id, propertyMember.userId))
    .where(eq(propertyMember.propertyId, propertyId))
    .orderBy(asc(propertyMember.createdAt));
}

export interface InvitationView {
  id: string;
  code: string;
  email: string | null;
  role: Role;
  expiresAt: Date;
}

/** Celles qu'on peut encore utiliser : ni acceptées, ni périmées. */
export async function pendingInvitations(
  propertyId: string,
  now = new Date(),
): Promise<InvitationView[]> {
  return db
    .select({
      id: invitation.id,
      code: invitation.code,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.propertyId, propertyId),
        isNull(invitation.acceptedAt),
        gt(invitation.expiresAt, now),
      ),
    )
    .orderBy(asc(invitation.createdAt));
}

export async function createInvitation(input: {
  propertyId: string;
  invitedBy: string;
  role: Role;
  email: string | null;
  now?: Date;
}): Promise<string> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_DAYS * 24 * 60 * 60 * 1000);

  // Le code est unique en base. Une collision sur 1,5 × 10^17 tirages n'arrivera
  // pas, mais elle coûterait une invitation perdue sans message d'erreur : on
  // retire plutôt que de laisser filer.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [created] = await db
      .insert(invitation)
      .values({
        propertyId: input.propertyId,
        email: input.email,
        code: inviteCode(),
        role: input.role,
        invitedBy: input.invitedBy,
        expiresAt,
      })
      .onConflictDoNothing({ target: invitation.code })
      .returning({ code: invitation.code });

    if (created) {
      return created.code;
    }
  }

  throw new Error("Could not allocate a unique invitation code");
}

export interface InvitationOffer {
  code: string;
  role: Role;
  email: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  propertyId: string;
  propertyName: string;
  inviterName: string;
}

export async function invitationByCode(code: string): Promise<InvitationOffer | null> {
  const [row] = await db
    .select({
      code: invitation.code,
      role: invitation.role,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      propertyId: invitation.propertyId,
      propertyName: property.name,
      inviterName: userTable.name,
    })
    .from(invitation)
    .innerJoin(property, eq(property.id, invitation.propertyId))
    .innerJoin(userTable, eq(userTable.id, invitation.invitedBy))
    .where(eq(invitation.code, code))
    .limit(1);

  return row ?? null;
}

export type AcceptResult =
  | { status: "ok"; propertyId: string }
  | { status: Exclude<InvitationState, "ok"> };

export async function acceptInvitation(
  code: string,
  user: { id: string; email: string },
  now = new Date(),
): Promise<AcceptResult> {
  return db.transaction(async (tx) => {
    // Verrouillée le temps de la transaction : deux clics sur le même lien ne
    // doivent pas consommer l'invitation deux fois.
    const [row] = await tx
      .select()
      .from(invitation)
      .where(eq(invitation.code, code))
      .limit(1)
      .for("update");

    const state = invitationState(row ?? null, user.email, now);

    if (state !== "ok") {
      return { status: state };
    }

    await tx
      .insert(propertyMember)
      .values({
        propertyId: row.propertyId,
        userId: user.id,
        role: row.role,
        // Quote-part à zéro : « partager » et « posséder » sont deux notions
        // distinctes. Le rôle donne l'accès tout de suite ; la part, si elle
        // existe, est fixée ensuite par le propriétaire.
        ownershipSharePermille: 0,
        contributionSharePermille: 0,
      })
      // Déjà membre par une autre invitation : on ne double pas la ligne, mais on
      // consomme le code, sinon il reste ouvert pour un tiers.
      .onConflictDoNothing({ target: [propertyMember.propertyId, propertyMember.userId] });

    await tx.update(invitation).set({ acceptedAt: now }).where(eq(invitation.code, code));

    return { status: "ok", propertyId: row.propertyId };
  });
}

/**
 * Un bien sans propriétaire ne se partage plus, ne se règle plus et ne se
 * supprime plus : la dernière place de propriétaire est verrouillée, en
 * rétrogradation comme en retrait.
 */
export type LeaveResult = "ok" | "notMember" | "lastOwner";

/**
 * Sortir de soi-même. Faire entrer et faire sortir quelqu'un sont des décisions
 * du propriétaire ; rester n'en est pas une. Sans ça, un lecteur invité par
 * erreur dépend de la bonne volonté d'un autre pour quitter un bien qu'il n'a
 * jamais demandé à voir.
 *
 * Les membres sont verrouillés le temps de la transaction : deux derniers
 * propriétaires qui partiraient en même temps laisseraient derrière eux un bien
 * que personne ne peut plus régler ni supprimer.
 */
export async function leaveProperty(propertyId: string, userId: string): Promise<LeaveResult> {
  return db.transaction(async (tx) => {
    const members = await tx
      .select({
        id: propertyMember.id,
        userId: propertyMember.userId,
        role: propertyMember.role,
      })
      .from(propertyMember)
      .where(eq(propertyMember.propertyId, propertyId))
      .for("update");

    const mine = members.find((member) => member.userId === userId);

    if (!mine) {
      return "notMember";
    }

    if (mine.role === "owner" && members.filter((member) => member.role === "owner").length === 1) {
      return "lastOwner";
    }

    await tx.delete(propertyMember).where(eq(propertyMember.id, mine.id));

    return "ok";
  });
}

export async function isLastOwner(propertyId: string, memberId: string): Promise<boolean> {
  const owners = await db
    .select({ id: propertyMember.id })
    .from(propertyMember)
    .where(and(eq(propertyMember.propertyId, propertyId), eq(propertyMember.role, "owner")));

  return owners.length === 1 && owners[0].id === memberId;
}
