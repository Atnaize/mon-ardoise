# Mon Ardoise — document de cadrage

v2 · 2 septembre 2026 · lot 0 livré

| | |
| --- | --- |
| Région | Wallonie |
| Régime | bailleur particulier — RC indexé × 1,4 |
| Horizon | 20 ans, paramétrable |
| Hébergement | Vercel Hobby, 0 €/mois |
| Base | Neon Postgres |
| Langues | fr · en |

---

## 1. Ce que j'ai compris

Deux biens, et ils ne se ressemblent pas.

**Bien A — la maison de ta compagne.** Mise en location longue durée, bail 1 an
puis 3-6-9. Prêt en cours, loyer entrant, précompte immobilier qui va augmenter.
C'est le cas nominal de l'app. Partagé entre vous deux.

**Bien B — ta maison.** Résidence principale, aucun loyer. Prêt en cours, et un
projet d'extension financé à deux — donc un second prêt et une vague de frais de
travaux. Ça n'a aucun revenu, mais ça consomme de la trésorerie.

### Trois conséquences sur le modèle

**Un bien n'a pas forcément de revenu locatif.** « Loué » et « occupé » sont deux
*états* du même objet, pas deux types différents. Le modèle ne suppose jamais
qu'un loyer existe, et les indicateurs de rendement se masquent quand il n'y en a
pas, au lieu d'afficher un « 0 % » trompeur.

**Il faut une quote-part dès la première migration.** Si l'extension est financée
à deux, l'app dira « ce bien coûte 1 400 €/mois » alors que ton effort réel est de
700 €. Sans quote-part, tous tes chiffres personnels sont faux d'un facteur deux.
Les deux champs sont dans le schéma depuis le lot 0 — `ownership_share_permille`
et `contribution_share_permille` — l'UI qui les expose arrive au lot 6. Le
stockage est gratuit, la migration rétroactive ne l'est pas.

**« Partager » et « posséder » sont deux notions distinctes.** Un ami à qui tu
montres un bien en lecture n'a aucune quote-part ; ta compagne en détient la
moitié. D'où deux dimensions séparées sur `property_member` : le `role` gouverne
le droit d'accès, la quote-part gouverne la répartition économique. Les confondre
est le piège classique de ce genre d'app.

---

## 2. Décisions structurantes

1. **Le moteur de calcul est une bibliothèque pure.** TypeScript, sans React,
   sans base, sans réseau. Entrées → sorties déterministes, couvertes par des
   tests. Écrit et validé *avant* le premier écran, calibré au centime sur le
   tableau d'amortissement bancaire réel.
2. **Prévu et réel sont séparés dès le jour un.** Une projection est une
   hypothèse ; un loyer encaissé le 4 du mois est un fait. Deux tables, jamais
   mélangées, rapprochées par une vue de comparaison.
3. **Lignes datées, pas colonnes.** Chaque frais et chaque revenu est une ligne
   avec une règle de périodicité. Ajouter « ramonage tous les deux ans » est une
   saisie utilisateur, pas une migration.
4. **Centimes entiers.** Tous les montants sont des entiers en centimes, jamais
   de flottant. Sur 240 mensualités, l'arithmétique flottante dérive
   visiblement, et rien ne détruit la confiance dans un outil financier comme un
   total qui ne tombe pas juste. Les taux suivent la même logique : entiers en
   ppm, `3,5 % → 35 000`.
5. **Multi-tenant d'emblée.** Toute requête est filtrée par appartenance dès la
   première ligne de code d'accès aux données, même quand tu es seul utilisateur.
   Rétrofitter l'isolation, c'est auditer chaque requête une par une.
6. **Taux fixe en V1, structure prête pour le variable.** Le moteur ne lit jamais
   un champ « taux » unique : il consomme une liste de périodes
   (`loan_rate_period`). Un prêt fixe est une liste d'une seule période.

---

## 3. Fiscalité V1 — Wallonie, bailleur particulier

Tu loues à un **particulier** qui ne déduit pas le loyer. Tu n'es donc pas imposé
sur les loyers perçus, mais sur le **revenu cadastral indexé majoré de 40 %**,
ajouté à tes autres revenus et taxé à ton taux marginal, additionnels communaux
compris.

Conséquence contre-intuitive que l'app doit afficher, parce qu'elle change les
décisions : **ton impôt ne dépend pas du loyer que tu demandes.** Passer de 950 à
1 050 € augmente ton net de 100 € et ton impôt de zéro. À l'inverse, un mois de
vacance coûte le loyer entier — l'impôt, lui, continue de courir.

Le **précompte immobilier va augmenter** sur le bien loué : les réductions liées
à l'habitation propre tombent. C'est une ligne de frais annuelle comme une autre,
ajustée à la main dès réception de l'avertissement-extrait de rôle.

Périmètre V1 : un champ « impôt estimé par an » que tu remplis, assisté d'un
calculateur qui propose `RC × coefficient d'indexation × 1,4 × taux marginal`. Le
calcul fiscal complet part au backlog — la fiscalité belge du logement bouge tous
les deux ans, et la coder aujourd'hui c'est acheter de la maintenance.

Hypothèse enregistrée telle quelle, non vérifiée : le bien étant resté résidence
principale plus de trois ans, aucune reprise d'avantage à l'enregistrement n'est
à provisionner.

---

## 4. Stack technique

Contrainte dure : zéro euro par mois.

| Couche | Choix | Pourquoi |
| --- | --- | --- |
| Framework | Next.js 16, App Router | Chemin natif Vercel, Turbopack par défaut. Deux changements de la 16 qui comptent : `middleware.ts` est renommé `proxy.ts`, et `next typegen` génère les types de routes que `tsc` attend. |
| Base | Neon Postgres | Free tier sans réactivation manuelle : le compute descend à zéro après quelques minutes et se réveille en moins d'une seconde. Supabase met ses projets gratuits en pause après une semaine sans trafic — rédhibitoire pour une app ouverte une fois par mois. Bonus : une branche de base par preview deploy. |
| ORM | Drizzle | Schéma en TypeScript, migrations SQL versionnées et relisibles. Driver HTTP Neon : pas de pool à épuiser en serverless. |
| Auth | better-auth, Google | Auth.js v5 est encore en beta après deux ans. better-auth est en 1.x stable, a un adaptateur Drizzle officiel, et fournit des plugins d'organisation et d'invitation utiles au lot 6. Aucune infrastructure e-mail. |
| UI | Tailwind 4 | Mobile-first par défaut. shadcn/ui s'ajoutera au lot 2, quand il y aura de vrais formulaires. |
| i18n | next-intl | Routing `/fr` et `/en`, fr par défaut. Formats de dates et de montants localisés. |
| Graphiques | Recharts | À installer au lot 3. Suffisant pour aires empilées, courbes cumulées et barres, lisible sur téléphone. |
| PWA | Manifest natif Next | Next 16 génère le manifest depuis `src/app/manifest.ts`, ce qui suffit à l'installation sur écran d'accueil. Un service worker greffé sur le bundler est la dépendance à éviter avec Turbopack — le cache hors-ligne attend le lot 8. |
| Exports | ExcelJS + react-pdf | À installer au lot 7. |
| Validation | Zod | Un schéma par formulaire, partagé client et Server Action. |
| Tests | Vitest, puis Playwright | Vitest sur le moteur, là où sont les vrais risques. Playwright sur deux ou trois parcours seulement. |
| CI | GitHub Actions | `typecheck → lint → test → build` bloquant sur chaque PR, plus le preview deploy Vercel. |

---

## 5. Modèle de données

15 tables : 11 métier, 4 pour l'authentification. Tout montant est un entier en
centimes, tout taux un entier en ppm, toute date un `date` PostgreSQL en mode
chaîne pour éviter les décalages de fuseau.

| Table | Rôle | Champs notables |
| --- | --- | --- |
| `property` | le bien | `status` (preparing / rented / occupied), `cadastral_income`, `marginal_tax_rate_ppm`, `estimated_tax_yearly`, `horizon_years` |
| `property_member` | accès **et** quote-part | `role`, `ownership_share_permille`, `contribution_share_permille` |
| `invitation` | partage d'un bien | `email` ou `code`, `role`, `expires_at` |
| `loan` | un par crédit — le prêt hypothécaire et le mandat sont deux lignes | `principal`, `term_months`, `amortization`, `deferral_months`, `deferral_type` |
| `loan_rate_period` | une ligne si taux fixe | `start_month`, `annual_rate_ppm`, `rate_basis` (défaut `nominal_12`) |
| `loan_insurance` | ASRD, incendie, autre | `premium_mode` (dans la mensualité / annuelle / trimestrielle / unique financée) |
| `loan_prepayment` | remboursement anticipé | `penalty_mode`, `penalty_value` (défaut 3 mois), `effect` |
| `flow_line` | tout frais, tout revenu | `recurrence`, `indexation_rate_ppm`, `capitalize`, `amortization_years` |
| `lease` | bail 1 an puis 3-6-9 | `monthly_rent` hors charges, `indexation_rate_ppm` |
| `scenario` | comparaison côte à côte | `is_baseline`, `overrides` (jsonb) |
| `actual_entry` | le réel constaté | `flow_line_id` pour le rapprochement |
| `user` `session` `account` `verification` | better-auth | `user.locale` ajouté |

Schéma source : [`src/db/schema/`](../src/db/schema/) · migration :
[`drizzle/0000_initial_schema.sql`](../drizzle/0000_initial_schema.sql)

---

## 6. Moteur de calcul

Cinq fonctions pures, chacune testable en isolation. Aucune ne connaît React ni
PostgreSQL.

```
buildSchedule(loan, ratePeriods, insurances, prepayments) → Installment[]
   date, capital ouvert, mensualité, intérêts, capital, assurance, capital restant dû

expandLines(lines, horizonMonths) → MonthlyAmount[]
   déplie récurrences, indexation annuelle, étalement des frais capitalisés

project({ property, schedules, lines, leases, horizonMonths }) → MonthlyProjection[]
   par mois : revenus, charges, mensualités, impôt, net, cumul, capital restant dû, valeur

computeIndicators(projection, property) → Indicators
   rendements, point d'équilibre, coût du crédit, effort mensuel, patrimoine net

compare(baseline, variant) → Delta
   écarts mois par mois et sur les indicateurs
```

### Le détail qui fait dériver tous les simulateurs amateurs

Deux conventions existent pour passer du taux annuel au taux mensuel :

```
équivalence :  i_mensuel = (1 + i_annuel)^(1/12) − 1
douzième :     i_mensuel = i_annuel / 12
```

L'écart n'est pas cosmétique : sur 200 000 € à 3,5 % sur 20 ans il vaut
**1 353,60 € de coût total** et 5,64 € sur la mensualité — 1 154,28 € contre
1 159,92 €. Chiffres produits par le moteur, pas estimés.

**Correction de la v1 de ce document**, qui affirmait que l'équivalence était *la*
convention belge et en faisait le défaut. Le tableau BNP Paribas Fortis réel du
31/08/2023 utilise **le douzième, à 3,06 %** : intérêts du premier mois de
382,50 € sur 150 000 €, soit exactement 0,255 % mensuel. Sous l'équivalence il
aurait fallu un taux annuel de 3,10336 %, que personne ne rédige dans un contrat.

La leçon tient dans le schéma : `rate_basis` porte les deux conventions et **se
lit sur le tableau de la banque, jamais ne se suppose**. `nominal_12` est
désormais le défaut. Le champ `rounding_mode` que prévoyait la v1 s'est révélé
inutile : l'arrondi au centime le plus proche reproduit la mensualité BNP
exactement.

### Calibration sur le tableau réel

Deux prêts sur le même bien, tous deux à 3,06 % sur 241 mois — un prêt
hypothécaire et un mandat hypothécaire :

| | Capital | Mensualité | Intérêts du 1er mois | Intérêts totaux |
| --- | --- | --- | --- | --- |
| Prêt hypothécaire | 150 000,00 € | 833,89 € | 382,50 € | 50 967,49 € |
| Mandat hypothécaire | 27 750,00 € | 154,27 € | 70,76 € | 9 429,07 € |

Le moteur reproduit exactement le nombre d'échéances, la mensualité, la première
ligne et le solde final nul. La dérive résiduelle vient de l'ordre d'arrondi
interne de BNP : au plus **2 centimes sur les intérêts d'une ligne** et
**0,73 € sur les 50 967,49 € d'intérêts** du prêt principal, soit 0,0014 %.
Chercher la réplication au centime près n'a pas de valeur pour de la prévision.

`src/engine/calibration.test.ts` rejoue les 482 lignes et échoue au-delà de ces
tolérances.

---

## 7. Écrans et indicateurs

Mobile-first au sens fort : la vue par défaut est celle qu'on consulte debout
dans une cuisine, pas un tableau de 240 lignes.

- **Parcours d'entrée** — un assistant en trois étapes (le bien, le prêt, le
  loyer visé) qui produit un premier verdict chiffré avant toute saisie de frais.
- **Écran du bien** — huit onglets : Synthèse, Prêts, Frais, Bail, Timeline,
  Scénarios, Réel vs prévu, Partage. Barre d'onglets défilante sur mobile, rail
  latéral sur desktop.
- **Timeline** — liste par mois avec montant net et cumul sur mobile, tableau
  dense et vue annuelle sur desktop. Les deux lisent la même projection.

### Indicateurs

| Indicateur | Définition |
| --- | --- |
| **Effort d'épargne mensuel** | Ce que ça sort de ta poche chaque mois, quote-part appliquée. **Le chiffre qui décide**, mis en avant partout. |
| Cash-flow net mensuel | Loyer − charges − mensualité − impôt provisionné |
| Point d'équilibre | Le mois où le cumul repasse positif, et le total à financer avant d'y arriver |
| Rendement brut | Loyer annuel ÷ prix d'acquisition frais compris |
| Rendement net | Après charges récurrentes, avant impôt |
| Rendement net-net | Après impôt estimé. Le seul comparable à un placement |
| Cash-on-cash | Cash-flow annuel ÷ apport réellement immobilisé |
| Coût total du crédit | Intérêts + assurances + indemnités de remploi, sur toute la durée |
| Capital restant dû | Mois par mois, avec l'effet des remboursements anticipés |
| Patrimoine net | Valeur estimée − capital restant dû, courbe sur l'horizon |
| Écart réel / prévu | Par catégorie et cumulé, dès qu'il y a du réel encodé |
| Vue consolidée | Tous les biens ensemble, quote-part appliquée, y compris ceux sans loyer |

---

## 8. Découpage en lots

L'ordre n'est pas négociable sur les deux premiers : les fondations conditionnent
tout, et le moteur avant l'UI garantit qu'on ne construise pas des écrans sur des
chiffres faux.

| Lot | Contenu | État |
| --- | --- | --- |
| **0 · Fondations** | Repo, Next 16 + TS strict, Tailwind 4, Neon + Drizzle, better-auth Google, next-intl fr/en, manifest PWA, CI bloquante | **Livré** |
| **1 · Moteur de calcul** | Tableau d'amortissement complet, différé, assurances, remboursements anticipés, récurrences, indexation, projection, indicateurs, comparaison. Aucune interface | **Livré** — 114 tests, calibré sur le tableau BNP |
| 2 · Saisie | Adaptateur base → `ProjectionInput`, création bien + prêt + bail, lignes de frais et revenus, synthèse | **Livré** — édition après création encore à faire |
| 3 · Restitution | Timeline et vue annuelle **livrées** au lot 2 ; restent les graphiques Recharts | **Suivant** |
| 4 · Scénarios | Duplication, substitution d'hypothèses, comparaison côte à côte | À faire |
| 5 · Réel vs prévu | Saisie rapide mobile, rapprochement, écrans d'écart | À faire |
| 6 · Partage | Invitations, rôles, quote-parts, vue consolidée multi-biens | À faire |
| 7 · Exports | `.xlsx` avec hypothèses en feuille séparée, PDF de synthèse | À faire |
| 8 · Finitions | Hors-ligne, anglais complet, accessibilité, budget de perf mobile | À faire |

**Livré au lot 0 :** `/` redirige vers `/fr`, les deux langues rendent, manifest
et icônes servis, build et lint propres.

**Livré au lot 1 :** annuités et capital constant, différé partiel et total,
assurances dans les quatre modes de prime, remboursements anticipés dans les
quatre régimes d'indemnité et les deux effets, périodes de taux multiples — donc
le taux variable ne demande plus que de l'UI. Dépliage des récurrences avec
indexation composée, étalement des frais capitalisés sans perte de centime,
séries de loyers avec vacance, projection mensuelle, dix-huit indicateurs,
comparaison de scénarios.

---

## 9. Backlog

Tenu à jour dans [TODO.md](../TODO.md) à la racine, avec le numéro de la question
de cadrage d'origine.

Le tableau d'amortissement a été fourni et sert de test de calibration. Il reste
à réunir, pour encoder le bien au lot 2 :

1. **Revenu cadastral, précompte immobilier actuel, loyer visé.**
2. **Le mode d'assurance** — ASRD et incendie, prime dans la mensualité,
   annuelle, trimestrielle ou unique financée.
3. **Le taux marginal d'imposition** — pour le rendement net-net. Défaut
   provisoire : 50 %, affiché comme hypothèse modifiable.

Deux points relevés dans le contrat BNP et volontairement hors périmètre :

- **Prorata temporis de la première échéance.** BNP précise que les premiers
  intérêts sont calculés au nombre de jours entre la conclusion du crédit et la
  première échéance. Le tableau fourni montre la version « pleine ». Sans
  incidence sur une prévision à vingt ans.
- **Période de prélèvement.** Le crédit est à prélèvements progressifs : si le
  crédit est moins prélevé que ce que le tableau prévoit, l'amortissement du
  capital est suspendu. Modélisable plus tard si l'extension du bien B passe par
  un crédit du même type.

---

## 10. Décisions prises par défaut

À corriger si l'une déplaît.

- **Neon plutôt que Turso.** Postgres, intégration Vercel native, branches de
  base en preview. Le compute descend à zéro : la première requête après une
  longue inactivité prend environ une seconde. Turso n'a pas ce réveil, mais on
  perdrait Postgres.
- **Google OAuth seul en V1**, via better-auth. Zéro infrastructure e-mail. Le
  plugin magic-link s'ajoute sans toucher au reste si quelqu'un n'a pas de compte
  Google.
- **Impôt saisi à la main en V1**, avec un calculateur d'aide. Le calcul fiscal
  automatique arrive en V2, quand le reste tourne.
