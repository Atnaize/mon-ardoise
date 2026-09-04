import "server-only";

/**
 * L'envoi d'e-mail, réduit à ce dont l'app a besoin : une adresse, un sujet, un
 * texte. Resend en HTTP, sans SDK : un POST et une clé suffisent.
 *
 * Texte seul, pas de HTML. Un rappel de loyer tient en trois lignes et une URL ;
 * une version HTML demanderait un gabarit, un échappement et une relecture dans
 * cinq clients de messagerie pour dire la même chose.
 *
 * Sans clé configurée, rien ne part et on le dit dans les logs plutôt que de
 * lever : un poste de développement et un déploiement de preview n'ont pas de
 * compte d'envoi, et un cron qui échoue là-dessus masquerait les vraies pannes.
 */
export interface Email {
  to: string;
  subject: string;
  text: string;
}

export type MailResult = "sent" | "skipped";

export async function sendEmail(email: Email): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!key || !from) {
    console.info(`[mail] no transport configured, not sending "${email.subject}" to ${email.to}`);

    return "skipped";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: email.to, subject: email.subject, text: email.text }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the message (${response.status}): ${await response.text()}`);
  }

  return "sent";
}
