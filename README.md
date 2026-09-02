# Mon Ardoise

Prévision des coûts et des rentrées de biens immobiliers — Wallonie, bailleur
particulier. Deux biens au départ : une maison mise en location, une maison
occupée avec un projet d'extension. Un bien n'a donc pas forcément de revenu.

- **Document de cadrage** (modèle de données, moteur de calcul, lots) :
  https://claude.ai/code/artifact/c98e33a2-a481-44c1-a269-6bbe53e1afc4
- **Backlog et points bloquants** : [TODO.md](TODO.md)

## État

**Lot 0 · Fondations — livré.** Connexion Google, base Postgres avec les 15 tables,
français et anglais, application installable, socle du moteur de calcul sous tests,
CI bloquante.

**Lot 1 · Moteur de calcul — à faire.** Les primitives sont là (centimes, taux,
mois, annuité) ; il reste le tableau d'amortissement complet, les récurrences, la
projection et les indicateurs.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les quatre valeurs
npm run db:migrate
npm run dev
```

### Les quatre valeurs à remplir

| Variable | Où la trouver |
| --- | --- |
| `DATABASE_URL` | [console.neon.tech](https://console.neon.tech) → projet → connection string *pooled* |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Google Cloud Console → Credentials → OAuth client ID (Web) |

Redirect URI à déclarer côté Google : `http://localhost:3000/api/auth/callback/google`
en local, et `https://<domaine-vercel>/api/auth/callback/google` en production.

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run typecheck` | `next typegen` puis `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Tests du moteur de calcul (Vitest) |
| `npm run build` | Build de production |
| `npm run db:generate` | Génère une migration SQL depuis le schéma |
| `npm run db:migrate` | Applique les migrations |
| `npm run db:studio` | Explorateur Drizzle |

## Conventions non négociables

1. **Le moteur de calcul est une bibliothèque pure** — `src/engine/`, sans React,
   sans base, sans réseau. Écrit et testé avant tout écran qui l'utilise.
2. **Prévisionnel et réel constaté sont séparés** — `flow_line` d'un côté,
   `actual_entry` de l'autre, rapprochés par `flow_line_id`.
3. **Chaque frais et chaque revenu est une ligne datée** avec une règle de
   périodicité. Ajouter un type de frais ne doit jamais demander de migration.
4. **Tous les montants sont des entiers en centimes.** Jamais de flottant, ni en
   base ni dans le moteur. Les taux sont des entiers en ppm (`3,5 % → 35 000`).
5. **Toute requête est filtrée par appartenance** via `property_member`, dès la
   première ligne de code d'accès aux données.
6. **Le taux mensuel se déduit du taux annuel par équivalence** —
   `(1 + i)^(1/12) − 1`, pas `i / 12`. C'est la convention du crédit hypothécaire
   belge : sur 200 000 € à 3,5 % sur 20 ans, l'autre convention se trompe de
   1 353,60 € de coût total. Le champ `rate_basis` permet les deux, `equivalent`
   est le défaut.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS 4 ·
Neon Postgres + Drizzle · better-auth (Google) · next-intl (fr/en) ·
Vitest · GitHub Actions · Vercel

Deux écarts assumés par rapport au cadrage initial, décidés après vérification :

- **better-auth 1.7 plutôt qu'Auth.js v5**, qui est encore en beta après deux ans.
  better-auth est en 1.x stable, a un adaptateur Drizzle officiel, et fournit des
  plugins d'organisation et d'invitation utiles au partage de biens du lot 6.
- **Pas de Serwist.** Next 16 génère le manifest nativement (`src/app/manifest.ts`),
  ce qui suffit à l'installabilité. Un service worker qui se greffe sur le bundler
  est exactement le type de dépendance à éviter avec Turbopack par défaut : le
  cache hors-ligne est reporté au lot 8.

## Notes

- `next typegen` doit tourner avant `tsc` : Next 16 génère les types de routes
  (`PageProps<"/[locale]">`, `LayoutProps<…>`) dans `.next/types`.
- Le routage par locale vit dans `src/proxy.ts` — Next 16 a renommé
  `middleware.ts` en `proxy.ts`.
- `npm audit` signale un CVE esbuild via `drizzle-kit` → `@esbuild-kit/esm-loader`.
  L'advisory concerne le serveur de développement d'esbuild, que drizzle-kit
  n'expose pas ; l'outil ne tourne qu'en local et en CI, jamais en production.
  Corriger imposerait de régresser en drizzle-kit 0.18.
- Les icônes sont générées par `python3 scripts/generate-icons.py` (PIL).
