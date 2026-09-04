import "server-only";

import { eq } from "drizzle-orm";
import { createTranslator, hasLocale } from "next-intl";

import { db } from "@/db";
import { propertyMember, rentReminder, user as userTable } from "@/db/schema";
import type { Cents } from "@/engine/money";
import type { YearMonth } from "@/engine/month";
import { routing } from "@/i18n/routing";
import { isoDate } from "@/lib/clock";
import { money, monthLabelLong } from "@/lib/format";
import { sendEmail, type Email } from "@/lib/mail";
import { lateRent, reminderSignature, shouldRemind } from "@/lib/reminders";
import { appUrl } from "@/lib/urls";

import { roleOf } from "./projection-input";
import { listProperties } from "./properties";

/**
 * Le rappel de retard : ce qui rend l'ardoise active. Elle est juste depuis le
 * lot 5, mais passive, et un impayé qu'on ne voit qu'en ouvrant l'app est un
 * impayé qu'on découvre tard.
 *
 * Le cron n'a pas de visiteur, mais il ne lit pas la base autrement que l'app :
 * chaque destinataire passe par `listProperties`, filtré par appartenance comme
 * la page d'accueil. Personne ne reçoit donc un chiffre qu'il ne pourrait pas
 * afficher lui-même.
 */

interface Recipient {
  id: string;
  name: string;
  email: string;
  locale: string;
}

interface LateProperty {
  id: string;
  name: string;
  months: YearMonth[];
  amount: Cents;
}

export interface ReminderRun {
  considered: number;
  sent: number;
}

export async function sendRentReminders(now = new Date()): Promise<ReminderRun> {
  // Une ligne par personne membre d'au moins un bien : c'est la seule population
  // qui peut avoir quelque chose en retard.
  const recipients = await db
    .selectDistinct({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      locale: userTable.locale,
    })
    .from(propertyMember)
    .innerJoin(userTable, eq(userTable.id, propertyMember.userId));

  let sent = 0;

  for (const recipient of recipients) {
    if (await remind(recipient, now)) {
      sent += 1;
    }
  }

  return { considered: recipients.length, sent };
}

async function remind(recipient: Recipient, now: Date): Promise<boolean> {
  const today = isoDate(now);
  const late: LateProperty[] = [];

  for (const summary of await listProperties(recipient.id)) {
    // Un lecteur ne court pas après un loyer, il regarde. Le rappel part à ceux
    // qui peuvent encoder le versement ou relancer le locataire.
    if (roleOf(summary.bundle) === "viewer") {
      continue;
    }

    const { months, amount } = lateRent(summary.ledger, today);

    if (months.length === 0 || amount <= 0) {
      continue;
    }

    late.push({
      id: summary.bundle.property.id,
      name: summary.bundle.property.name,
      months,
      amount,
    });
  }

  const signature = reminderSignature(
    late.map((entry) => ({
      propertyId: entry.id,
      amount: entry.amount,
      months: entry.months.length,
    })),
  );

  const [previous] = await db
    .select({ signature: rentReminder.signature, sentAt: rentReminder.sentAt })
    .from(rentReminder)
    .where(eq(rentReminder.userId, recipient.id))
    .limit(1);

  if (!shouldRemind(previous ?? null, signature, now)) {
    // Plus rien en retard : on oublie, pour qu'un retard qui revient reparte d'un
    // rappel immédiat plutôt que d'attendre la fin d'une semaine entamée.
    if (signature === "" && previous) {
      await db.delete(rentReminder).where(eq(rentReminder.userId, recipient.id));
    }

    return false;
  }

  // Rien n'est parti : on n'écrit pas non plus la mémoire de l'envoi, sinon le
  // premier vrai rappel attendrait la semaine suivante d'un message fantôme.
  if ((await sendEmail(await reminderEmail(recipient, late))) === "skipped") {
    return false;
  }

  await db
    .insert(rentReminder)
    .values({ userId: recipient.id, signature, sentAt: now })
    .onConflictDoUpdate({ target: rentReminder.userId, set: { signature, sentAt: now } });

  return true;
}

/**
 * Le message, dans la langue du compte : c'est la même colonne que celle qui
 * décide de la langue d'entrée dans l'app.
 *
 * Un lien par bien, vers l'ardoise et non vers la synthèse : ce qu'on vient
 * faire après ce message, c'est pointer un versement.
 */
async function reminderEmail(recipient: Recipient, late: LateProperty[]): Promise<Email> {
  const locale = hasLocale(routing.locales, recipient.locale)
    ? recipient.locale
    : routing.defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  const t = createTranslator({ locale, messages, namespace: "reminder" });

  const lines = late.map((entry) => {
    const line = t("line", {
      property: entry.name,
      amount: money(entry.amount, locale),
      count: entry.months.length,
      since: monthLabelLong(entry.months[0], locale),
    });

    return `${line}\n${appUrl(`/${locale}/properties/${entry.id}/rent`)}`;
  });

  return {
    to: recipient.email,
    subject:
      late.length === 1
        ? t("subjectOne", { property: late[0].name })
        : t("subjectMany", { count: late.length }),
    text: [
      t("greeting", { name: recipient.name }),
      t("intro", { count: late.length }),
      lines.join("\n\n"),
      t("footer", { count: late.length }),
    ].join("\n\n"),
  };
}
