# Mon Ardoise

Prévision des coûts et des rentrées de biens immobiliers — Wallonie, bailleur
particulier. Deux biens au départ : une maison mise en location, une maison
occupée avec un projet d'extension. Un bien n'a donc pas forcément de revenu.

- **Document de cadrage** (modèle de données, moteur de calcul, lots) :
  [docs/CADRAGE.md](docs/CADRAGE.md)
- **Backlog et points bloquants** : [TODO.md](TODO.md)

## État

**Lot 0 · Fondations — livré.** Connexion Google, base Postgres avec les 15 tables,
français et anglais, application installable, socle du moteur de calcul sous tests,
CI bloquante.

**Lot 1 · Moteur de calcul — livré.** Tableau d'amortissement complet (annuités
ou capital constant, différé partiel ou total, assurances dans les quatre modes,
remboursements anticipés avec les quatre régimes d'indemnité, périodes de taux
multiples), dépliage des récurrences et de l'indexation, série de loyers,
projection mensuelle, dix-huit indicateurs, comparaison de scénarios.
114 tests, dont la calibration sur le tableau BNP réel.

**Lot 2 · Saisie — livré.** Adaptateur base → `ProjectionInput`, création d'un bien
avec son prêt et son bail, ajout et suppression des lignes de frais et de revenus,
écran de synthèse avec les douze indicateurs, timeline mensuelle et vue annuelle.

**Lot 5 · L'ardoise — livré.** Encodage des loyers reçus mois par mois, avec
statut par échéance (payé, partiel, impayé, trop-perçu, à venir), total dû par le
locataire, et alerte de retard sur la fiche du bien comme sur la liste. C'est ce
qui donne son nom à l'app.

Bien, prêts, baux et lignes se créent, se modifient et se suppriment. Les
formulaires de création et d'édition partagent les mêmes composants de champs :
un champ ajouté dans `src/components/fields/` apparaît des deux côtés.

**Ce qui n'y est pas encore** — l'UI des assurances et des remboursements
anticipés (le schéma et le moteur les portent déjà), la confirmation avant
suppression, les graphiques du lot 3, les scénarios du lot 4, et le suivi du réel
sur les *frais* (seuls les loyers sont pointés).

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run db:up                # Postgres local dans docker, port 5433
npm run db:migrate
npm run dev
```

La base tourne en local par défaut. Pour travailler contre Neon, commente la
ligne `DATABASE_URL` locale de `.env.local` et décommente celle de Neon — c'est
le même driver des deux côtés, il n'y a rien d'autre à changer.

### Les quatre valeurs à remplir

| Variable | Où la trouver |
| --- | --- |
| `DATABASE_URL` | déjà remplie pour le Postgres local ; pour Neon, [console.neon.tech](https://console.neon.tech) → projet → connection string *pooled*, avec `sslmode=verify-full` |
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
| `npm run check:auth-schema` | Vérifie que le schéma Drizzle satisfait better-auth |
| `npm run build` | Build de production |
| `npm run db:up` | Démarre le Postgres local (docker compose) |
| `npm run db:down` | Arrête le Postgres local, sans perdre les données |
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
6. **Aucune hypothèse financière n'est supposée par défaut.** La croissance de la
   valeur du bien démarre à 0 %. Supposer une plus-value flatte silencieusement
   toutes les projections ; c'est à l'utilisateur de la choisir, et l'écran
   rappelle l'hypothèse retenue sous le chiffre qu'elle produit.
7. **La conversion du taux annuel en taux mensuel est un paramètre du contrat,
   pas une règle universelle.** Deux conventions existent : l'équivalence
   `(1 + i)^(1/12) − 1` et le douzième `i / 12`. L'écart n'est pas cosmétique —
   sur 200 000 € à 3,5 % sur 20 ans il vaut 1 353,60 € de coût total — donc le
   champ `rate_basis` porte les deux et **il faut le lire sur le tableau de la
   banque, jamais le supposer**.

   Le tableau BNP réel du 31/08/2023 utilise **`i / 12` à 3,06 %** : intérêts du
   premier mois de 382,50 € sur 150 000 €, soit exactement 0,255 % mensuel.
   `nominal_12` est donc le défaut. Le test de calibration
   (`src/engine/calibration.test.ts`) rejoue les 241 lignes des deux prêts et
   échoue si le moteur dévie de plus de deux centimes sur les intérêts d'une
   ligne ou d'un euro sur le total.

## Le moteur

`src/engine/` est une bibliothèque pure : aucun import de React, de Drizzle ou de
`next/*`. Trois couches, sans cycle :

| Couche | Modules | Rôle |
| --- | --- | --- |
| Primitives | `money` `rate` `month` | centimes entiers, taux en ppm, index de mois |
| Contrat | `types` | les types d'entrée et de sortie, et rien d'autre |
| Calcul | `annuity` `schedule` `recurrence` `rent` `rent-ledger` `projection` `indicators` `compare` | une préoccupation par module |
| Façade | `index` | le barrel et `runProjection()` |

`runProjection(input)` est le seul point d'entrée dont l'UI aura besoin. Le lot 2
ajoutera un adaptateur base → `ProjectionInput` ; le moteur ne connaîtra jamais le
schéma.

## La couche UI

Tout ce qui touche à l'apparence est concentré pour pouvoir être jeté :

| Où | Quoi |
| --- | --- |
| `src/app/globals.css` | **tous** les tokens — couleurs des deux thèmes, rayon d'angle, familles de police. Aucun hex ailleurs dans le code |
| `src/components/ui/` | les primitives : `Button` `Card` `Field` `Input` `Select` `Checkbox` `Stat` `Table` `Badge` |
| `src/components/fields/` | les groupes de champs, partagés entre création et édition |
| `src/components/forms/` | les formulaires, qui n'assemblent que des champs et `InlineForm` |
| `src/components/` | les composants métier, qui ne font que composer les primitives |
| `src/lib/format.ts` | montants, pourcentages et mois, localisés |

Une page n'écrit jamais une couleur ni un rayon en dur : elle utilise une
primitive. Changer l'identité visuelle se fait dans `globals.css` et
`src/components/ui/`, sans toucher à une seule page ni à une ligne de calcul.

## Le chemin des données

```
base  →  src/server/properties.ts   requêtes filtrées par appartenance
      →  src/server/projection-input.ts   lignes de base → ProjectionInput
      →  src/engine/  runProjection()     calcul pur
      →  page serveur → primitives UI
```

Aucune fonction de `src/server/properties.ts` n'existe sans un `userId` en
premier paramètre, et le module n'exporte jamais le handle de base. L'écriture
passe par `src/server/actions.ts`, qui valide avec les schémas Zod de
`src/lib/schemas.ts` — les mêmes que le client — puis vérifie le rôle avant
d'écrire.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS 4 ·
Postgres (local en docker, Neon en production) + Drizzle · better-auth (Google) ·
next-intl (fr/en) · Vitest · GitHub Actions · Vercel

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
- **Un seul driver Postgres, `pg`, en local comme en production.** Le driver
  `@neondatabase/serverless` a été abandonné : il ne parle qu'à Neon en HTTP,
  donc impossible de développer contre un Postgres local, et ses transactions
  n'ont pas la même sémantique que les transactions interactives. Le coût du
  changement est environ 200 ms de handshake TCP au démarrage à froid sur
  Vercel — négligeable ici, contre une divergence dev/prod supprimée.
- Le Postgres local est en 16 et Neon en 18.6. Le schéma n'utilise rien de
  spécifique à une version ; si une divergence apparaît un jour, changer le tag
  dans `docker-compose.yml` suffit.
- **Le schéma des tables d'auth est dicté par better-auth, pas par nous.** Il est
  écrit à la main dans `src/db/schema/auth.ts`, et `npm run check:auth-schema`
  interroge `getAuthTables()` pour vérifier qu'aucun champ attendu ne manque et
  qu'aucun champ requis n'est nullable. Le check tourne en CI. Après une montée
  de version de better-auth, s'il échoue : ajouter les champs, puis
  `npm run db:generate && npm run db:migrate`.
- `drizzle-kit` est un CLI autonome : il ne charge pas `.env.local` comme le fait
  Next. C'est `drizzle.config.ts` qui appelle `dotenv` explicitement, sur
  `.env.local` puis `.env`. Sans ça, `db:migrate` échoue sur `url: ''`.
- Les icônes sont générées par `python3 scripts/generate-icons.py` (PIL).
