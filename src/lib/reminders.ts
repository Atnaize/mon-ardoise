/**
 * Quand rappeler un retard de loyer, et quand se taire. Aucun accès à la base ni
 * au réseau ici : la règle se lit et se teste seule, comme celle des invitations.
 *
 * Un cron quotidien qui enverrait tout ce que l'ardoise affiche serait pénible
 * deux fois : il accuserait le locataire le 1er du mois, et il répéterait le même
 * message chaque matin. Ces deux garde-fous sont toute la matière du module.
 */

import type { Cents } from "@/engine/money";
import { fromIsoDate, type YearMonth } from "@/engine/month";
import type { RentLedger } from "@/engine/rent-ledger";

/**
 * Le mois courant n'est pas un retard le 1er du mois. L'ardoise le compte comme
 * dû dès le premier jour, ce qui est juste pour un solde et faux pour un
 * reproche : on attend le 10 avant de le rappeler. Les mois antérieurs, eux, sont
 * en retard quel que soit le jour.
 */
export const GRACE_DAY = 10;

/**
 * Rien de neuf, mais toujours dû : on relance une fois par semaine. Un rappel
 * quotidien identique se classe tout seul en indésirable, et un rappel qu'on ne
 * lit plus ne rappelle rien.
 */
export const REPEAT_DAYS = 7;

export interface LateRent {
  months: YearMonth[];
  /** Ce qui manque sur ces mois seulement, et non l'ardoise entière. */
  amount: Cents;
}

export function lateRent(ledger: RentLedger, today: string): LateRent {
  const currentMonth = fromIsoDate(`${today.slice(0, 7)}-01`);
  const graced = Number(today.slice(8, 10)) >= GRACE_DAY;
  const months = ledger.overdueMonths.filter((month) => graced || month < currentMonth);
  const amount = ledger.rows
    .filter((row) => months.includes(row.month))
    .reduce((total, row) => total + row.balance, 0);

  return { months, amount };
}

export interface ReminderEntry {
  propertyId: string;
  amount: Cents;
  months: number;
}

/**
 * L'ardoise du destinataire réduite à une chaîne. Deux passages qui produisent la
 * même ne valent pas deux messages ; un versement encodé la change, et le rappel
 * suivant dit alors quelque chose de neuf.
 *
 * Triée : l'ordre des biens vient d'une requête, il n'a pas à décider d'un envoi.
 */
export function reminderSignature(entries: readonly ReminderEntry[]): string {
  return entries
    .map((entry) => `${entry.propertyId}:${entry.amount}:${entry.months}`)
    .sort()
    .join("|");
}

/** Envoyer si l'ardoise a changé, ou si le dernier rappel date d'une semaine. */
export function shouldRemind(
  previous: { signature: string; sentAt: Date } | null,
  signature: string,
  now: Date,
): boolean {
  if (signature === "") {
    return false;
  }

  if (!previous || previous.signature !== signature) {
    return true;
  }

  return now.getTime() - previous.sentAt.getTime() >= REPEAT_DAYS * 24 * 60 * 60 * 1000;
}
