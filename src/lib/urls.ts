/**
 * L'adresse absolue d'une page de l'app, pour les liens qui partent dans un
 * message et non dans une navigation.
 *
 * `BETTER_AUTH_URL` est déjà l'adresse canonique : c'est celle que Google
 * connaît comme origine de redirection. S'en servir évite d'en déclarer une
 * seconde, qui finirait par diverger le jour d'un changement de domaine.
 */
export function appUrl(path: string): string {
  const base = process.env.BETTER_AUTH_URL?.replace(/\/+$/, "") ?? "";

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
