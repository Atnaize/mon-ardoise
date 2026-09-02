# Mon Ardoise — Backlog

Tout ce qui est volontairement hors du périmètre V1, avec le numéro de la question
de cadrage d'origine. Ne rien supprimer d'ici sans l'avoir livré ou explicitement
abandonné avec Eric.

## Bloquant

- [x] ~~**Q12 · Tableau d'amortissement de la banque**~~ — fourni le 02/09/2026
      (BNP Paribas Fortis, 31/08/2023). Deux prêts sur le même bien, 150 000 € et
      27 750 €, tous deux à 3,06 % sur 241 mois. Extrait en fixture de test dans
      `src/engine/__fixtures__/bnp-2023-08-31.json` et rejoué par
      `src/engine/calibration.test.ts`. Le PDF source reste dans `.idea/`, qui est
      gitignoré.
      **Conséquence :** BNP calcule le taux mensuel en `taux annuel / 12`, pas par
      équivalence. Le défaut de `rate_basis` est passé à `nominal_12`.
- [ ] **Chiffres restants du bien A** — revenu cadastral, précompte immobilier
      actuel, loyer visé, et le mode de prime des assurances (ASRD, incendie).
      Nécessaires pour encoder le bien au lot 2, pas pour le moteur.
- [ ] **Taux marginal d'imposition** — nécessaire au rendement net-net.
      Défaut provisoire : 50 %, affiché comme hypothèse modifiable.

## Décidé en cours de route

- Le **précompte immobilier** est une simple ligne de frais récurrente, ajustée à la
  main après réception de l'avertissement-extrait de rôle. Pas de champ dédié
  « PI avant / après mise en location » : ça n'aurait servi qu'une fois.

## Planifié

- [ ] **Q2 · Extension de la maison (bien B)** — prêt rénovation, vague de frais
      de travaux, financement à deux. Le schéma le supporte déjà (prêts multiples,
      `ownership_share` / `contribution_share`) ; reste l'UI de suivi de chantier.
      → après le lot 6.
- [ ] **Q24 · Calcul fiscal IPP automatique** — RC indexé × 1,4, taux marginal,
      additionnels communaux, chèque habitat. V1 : champ manuel assisté.
      → V2. La fiscalité belge du logement bouge tous les deux ans.

## Relevé dans le contrat BNP, hors périmètre

- [ ] **Prorata temporis de la première échéance.** BNP précise que les premiers
      intérêts sont calculés au nombre de jours entre la conclusion du crédit et
      la première échéance. Le tableau fourni montre la version pleine, et le
      moteur fait pareil. Sans incidence sur une prévision à vingt ans.
- [ ] **Période de prélèvement.** Crédit à prélèvements progressifs : si le crédit
      est moins prélevé que ce que le tableau prévoit, l'amortissement du capital
      est suspendu et la part capital devient exigible au prélèvement suivant.
      À modéliser seulement si l'extension du bien B passe par un crédit du même
      type.

## Dette assumée du lot 2

- [ ] **Édition après création** — un bien, un prêt ou un bail ne peuvent
      aujourd'hui qu'être créés. Seules les lignes de frais s'ajoutent et se
      suppriment. À faire avant d'encoder les biens réels pour de bon.
- [ ] **UI des assurances et des remboursements anticipés** — le schéma et le
      moteur les portent entièrement, il manque les formulaires.
- [ ] **Suppression d'un bien** — pas d'écran, à faire en base pour l'instant.

## Backlog

- [ ] **Q15 · Provisions** — gros travaux, vacance locative, impayés, dégâts.
      Contournable dès la V1 par des lignes de frais manuelles.
- [ ] **Q18 · Indexation légale du loyer** — indice santé belge, date anniversaire,
      indice de base du mois précédant la signature. Nécessite l'import des indices.
      V1 : pourcentage annuel simple et paramétrable.
- [ ] **Q17 · Charges récupérables** — provisions et décompte annuel.
      V1 : loyer hors charges uniquement.
- [ ] **Q21 · Plusieurs unités locatives par bien** — le bail se rattacherait à une
      unité plutôt qu'au bien. Impact schéma modéré.
- [ ] **Q31 · Rappels et notifications** — échéance du précompte, indexation à
      appliquer, fin de bail, entretien chaudière. Cron Vercel quotidien + e-mail.
- [ ] **Q8 · Taux variable** — la structure est déjà en place (`loan_rate_period`,
      une ligne par période) ; reste l'UI et les scénarios de révision.

## Hors scope assumé

- **Q19 · Garantie locative** — c'est un passif, pas un revenu.
- **Q29 · Revente et plus-value** — pas de revente prévue. `current_value` alimente
  le patrimoine net sans scénario de sortie.
