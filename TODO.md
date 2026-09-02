# Mon Ardoise — Backlog

Tout ce qui est volontairement hors du périmètre V1, avec le numéro de la question
de cadrage d'origine. Ne rien supprimer d'ici sans l'avoir livré ou explicitement
abandonné avec Eric.

## Bloquant

- [ ] **Q12 · Tableau d'amortissement de la banque** — à fournir par Eric.
      C'est le jeu de test de référence du moteur : le lot 1 ne peut pas être
      déclaré terminé sans un test qui rejoue ce tableau au centime, arrondis
      et prorata du premier mois compris.
- [ ] **Chiffres réels du bien A** — capital, date de première échéance, durée,
      taux, mode d'assurance (ASRD / incendie), revenu cadastral, précompte
      immobilier actuel, loyer visé.
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
