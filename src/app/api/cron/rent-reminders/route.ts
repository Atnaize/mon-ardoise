import { timingSafeEqual } from "node:crypto";

import { sendRentReminders } from "@/server/reminders";

/**
 * Le cron des retards de loyer. Vercel appelle cette route une fois par jour
 * (voir `crons` dans `vercel.json`) avec `Authorization: Bearer $CRON_SECRET`.
 *
 * Sans secret configuré, la route reste fermée : une URL d'administration
 * ouverte par défaut est une URL ouverte, et celle-ci envoie des e-mails.
 *
 * 404 et non 401 : « non autorisé » confirmerait que l'adresse existe.
 */
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");

  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json(await sendRentReminders());
}
