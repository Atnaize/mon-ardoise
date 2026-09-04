/**
 * Partager un bien : le code qu'on transmet, et la règle qui dit ce qu'on peut
 * en faire. Aucun accès à la base ici, pour que la règle se lise et se teste
 * seule.
 *
 * Il n'y a pas d'e-mail sortant dans cette app : le code voyage dans le message
 * que tu envoies toi-même, et il arrive qu'on le dicte au téléphone. Tout le
 * dessin du code en découle.
 */

/**
 * Deux semaines. Une invitation est un message adressé à quelqu'un qu'on
 * connaît : passé ce délai, elle n'a pas été lue, et un lien de partage qui
 * traîne dans une boîte est un accès qu'on ne surveille plus.
 */
export const INVITATION_DAYS = 14;

export type Role = "owner" | "editor" | "viewer";

/**
 * Ni O ni 0, ni I ni 1 ni L : les confondre donne un code refusé sans qu'on
 * comprenne pourquoi. Aucune voyelle non plus, Y compris, pour qu'aucun tirage ne
 * forme un mot. Restent 27 caractères, soit 1,5 × 10^17 combinaisons sur douze
 * places.
 */
const ALPHABET = "BCDFGHJKMNPQRSTVWXZ23456789";

export const CODE_LENGTH = 12;

export function inviteCode(): string {
  // Les octets qui ne couvrent pas un nombre entier d'alphabets sont rejetés :
  // un simple modulo ferait sortir les neuf premières lettres un peu plus
  // souvent que les autres.
  const limit = 256 - (256 % ALPHABET.length);
  const picked: string[] = [];
  const bytes = new Uint8Array(CODE_LENGTH);

  while (picked.length < CODE_LENGTH) {
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte < limit && picked.length < CODE_LENGTH) {
        picked.push(ALPHABET[byte % ALPHABET.length]);
      }
    }
  }

  return picked.join("");
}

/**
 * Ce qu'on accepte en entrée : la casse indifférente, et les tirets ou espaces
 * de la mise en forme jetés. Les caractères ambigus, eux, ne sont pas rattrapés :
 * ils ne sortent jamais du tirage, donc les corriger serait deviner.
 */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Découpé en groupes de quatre, parce que c'est ainsi qu'on lit un code à voix haute. */
export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export type InvitationState = "ok" | "unknown" | "expired" | "used" | "wrongEmail";

/**
 * Ce qu'on peut faire d'un code.
 *
 * `viewerEmail` à null veut dire « personne n'est encore connecté ». Une
 * invitation nominative reste alors « ok » : la page propose la connexion, et
 * c'est à ce moment-là qu'on saura si l'adresse correspond.
 */
export function invitationState(
  row: { expiresAt: Date; acceptedAt: Date | null; email: string | null } | null,
  viewerEmail: string | null,
  now: Date,
): InvitationState {
  if (!row) {
    return "unknown";
  }

  if (row.acceptedAt) {
    return "used";
  }

  if (row.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  // Une invitation nominative ne s'accepte que par son destinataire : le code
  // circule dans un message, et un message se transfère.
  if (row.email && viewerEmail && row.email !== viewerEmail.toLowerCase()) {
    return "wrongEmail";
  }

  return "ok";
}
