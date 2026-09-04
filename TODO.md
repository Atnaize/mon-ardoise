# Mon Ardoise : backlog

Tout ce qui est volontairement hors du périmètre V1, avec le numéro de la question
de cadrage d'origine. Ne rien supprimer d'ici sans l'avoir livré ou explicitement
abandonné avec Eric.

## Bloquant

- [x] ~~**Q12 · Tableau d'amortissement de la banque**~~ : fourni le 02/09/2026
      (BNP Paribas Fortis, 31/08/2023). Deux prêts sur le même bien, 150 000 € et
      27 750 €, tous deux à 3,06 % sur 241 mois. Extrait en fixture de test dans
      `src/engine/__fixtures__/bnp-2023-08-31.json` et rejoué par
      `src/engine/calibration.test.ts`. Le PDF source reste dans `.idea/`, qui est
      gitignoré.
      **Conséquence :** BNP calcule le taux mensuel en `taux annuel / 12`, pas par
      équivalence. Le défaut de `rate_basis` est passé à `nominal_12`.
- [ ] **Chiffres restants du bien A** : revenu cadastral, précompte immobilier
      actuel, loyer visé, et le mode de prime des assurances (ASRD, incendie).
      Nécessaires pour encoder le bien au lot 2, pas pour le moteur.

## Décidé en cours de route

- Le **taux marginal d'imposition** est retiré du formulaire et de l'interface.
  Il était saisi et stocké sans qu'aucun calcul ne le lise : ni le moteur, ni un
  calculateur assisté. Il revient avec son premier consommateur réel, le
  rendement net-net. La colonne, elle, reste en base (voir les champs dormants).
- La **catégorie d'une ligne de frais ou de revenus** est retirée du formulaire
  et de l'interface. Texte libre obligatoire, elle était saisie, stockée et
  transportée jusqu'au moteur sans que rien ne la lise : ni agrégation, ni
  filtre, ni affichage. Elle revient avec son premier consommateur réel (la
  répartition par poste dans la synthèse, ou le calcul fiscal), et ce sera alors
  une liste fermée, pas un champ libre. La colonne reste en base, nullable.
  `actual_entry.category` reste écrite, elle : elle sert à repérer les loyers, et
  c'est le code qui la remplit.
- Le **précompte immobilier** est une simple ligne de frais récurrente, ajustée à la
  main après réception de l'avertissement-extrait de rôle. Pas de champ dédié
  « PI avant / après mise en location » : ça n'aurait servi qu'une fois.

## Planifié

- [ ] **Q2 · Extension de la maison (bien B)** : prêt rénovation, vague de frais
      de travaux, financement à deux. Le schéma le supporte déjà (prêts multiples,
      `ownership_share` / `contribution_share`), et les quote-parts se saisissent
      depuis le lot 6 ; reste l'UI de suivi de chantier.
- [ ] **Q24 · Calcul fiscal IPP automatique** : RC indexé × 1,4, taux marginal,
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

- [x] ~~**Édition après création**~~ : bien, prêts, baux et lignes se créent, se
      modifient et se suppriment. Formulaires partagés entre création et édition.
- [x] ~~**Suppression d'un bien**~~ : zone dangereuse sur l'écran de modification.
- [ ] **UI des assurances et des remboursements anticipés** : le schéma et le
      moteur les portent entièrement, il manque les formulaires.
- [x] ~~**Confirmation avant suppression**~~ : toute action sans retour arrière
      passe par `ConfirmForm`, qui remplace le bouton par sa question. Le bien est
      nommé dans la question : c'est ce qui distingue une confirmation d'un second
      clic au même endroit.
- [ ] **Périodes de taux multiples dans l'UI** : le formulaire de prêt ne gère que
      la période initiale ; le moteur en accepte autant qu'on veut.

## Suite du lot 6

- [x] ~~**Partage d'un bien**~~ : invitation par code, écran des membres, rôles
      appliqués, quote-parts de propriété et de contribution saisissables.
- [x] ~~**Quitter un bien de soi-même**~~ : un éditeur et un lecteur trouvent
      « Quitter ce bien » au bas de la synthèse. Un propriétaire se retire depuis
      les réglages, où il voit la place qu'il laisse ; le dernier propriétaire ne
      part pas, en écran comme en Server Action.
- [ ] **Invitation par e-mail** : le lien se copie et se transmet encore à la
      main, mais `src/lib/mail.ts` existe depuis le rappel de retard : il ne reste
      que le message à écrire et l'envoi à brancher sur `createInvitationAction`.
      Le champ `invitation.email` sert aujourd'hui seulement à rendre l'invitation
      nominative.
- [ ] **Le total des parts de propriété ne contraint rien** : il est affiché, et
      signalé quand il ne fait pas 100 %. Le forcer casserait l'état
      intermédiaire entre l'invitation envoyée et la part fixée.
- [ ] **Vue consolidée multi-biens** : annoncée au lot 6 dans le cadrage, pas
      livrée. La page d'accueil liste les biens un par un ; elle n'additionne ni
      les efforts mensuels ni le patrimoine net, alors que la quote-part de
      contribution rend enfin cette somme juste.

## Suite du lot 5

- [ ] **Pointer les frais réels** : seuls les loyers sont suivis. Les dépenses
      constatées se rapprocheraient d'une `flow_line` via `flow_line_id`, déjà
      dans le schéma.
- [ ] **Un versement qui couvre plusieurs mois** : aujourd'hui un versement
      désigne un seul mois d'échéance. Un virement de 2 400 € pour deux mois
      demande deux saisies.
- [x] ~~**Rappel de retard**~~ : cron Vercel quotidien sur
      `/api/cron/rent-reminders`, un e-mail par destinataire dans la langue de son
      compte. Le mois courant n'est un retard qu'à partir du 10, et un rappel
      identique attend une semaine (`src/lib/reminders.ts`).
- [ ] **Pas d'opt-out sur les rappels** : quiconque est membre d'un bien avec un
      loyer en retard reçoit l'e-mail. C'est tenable à deux ou trois ; il faudra
      une colonne sur le compte et une case dans l'écran du compte avant d'ouvrir
      l'app à quelqu'un d'autre.

## Champs dormants

Six colonnes sont sorties de l'interface sans sortir de la base : elles existent,
nullables et sans valeur par défaut, et rien ne les écrit.

| Colonne | Pourquoi elle dort | Ce qui la réveillerait |
| --- | --- | --- |
| `property.marginal_tax_rate_ppm` | saisi, jamais lu | rendement net-net |
| `property.cadastral_income` | saisi, jamais lu | calcul IPP automatique (Q24) |
| `property.estimated_tax_yearly` | doublonnait une ligne de frais | rien : l'impôt est une ligne récurrente |
| `property.region` | constante (Wallonie) | un calcul fiscal régionalisé |
| `property.status` | doublonnait ce que les baux disent | rien |
| `flow_line.category` | texte libre que rien n'agrégeait | répartition par poste, en liste fermée |

Le raisonnement du choix : une colonne nullable que personne n'écrit ne coûte
rien, alors qu'une migration rétroactive pour la faire revenir coûte cher. C'est
l'inverse de ce que disaient les migrations 0005 à 0010, qui les supprimaient ;
elles ont été écrasées dans `0000` et `0001` les remet.

Le rendement net-net a quand même disparu de l'interface : il dépendait d'une
estimation saisie à la main et divisait par un coût d'acquisition qui ignore le
prêt. Le réintroduire demande de rebrancher les champs côté formulaire, pas côté
schéma.

## Backlog

- [ ] **Q15 · Provisions** : gros travaux, vacance locative, impayés, dégâts.
      Contournable dès la V1 par des lignes de frais manuelles.
- [ ] **Q18 · Indexation légale du loyer** : indice santé belge, date anniversaire,
      indice de base du mois précédant la signature. Nécessite l'import des indices.
      V1 : pourcentage annuel simple et paramétrable.
- [ ] **Q17 · Charges récupérables** : provisions et décompte annuel.
      V1 : loyer hors charges uniquement.
- [ ] **Q21 · Plusieurs unités locatives par bien** : le bail se rattacherait à une
      unité plutôt qu'au bien. Impact schéma modéré.
- [ ] **Q31 · Rappels et notifications** : échéance du précompte, indexation à
      appliquer, fin de bail, entretien chaudière. Le cron et l'envoi existent
      depuis le rappel de retard ; il reste à décider ce que chacun de ces rappels
      lit en base pour savoir qu'il est dû.
- [ ] **Q8 · Taux variable** : la structure est déjà en place (`loan_rate_period`,
      une ligne par période) ; reste l'UI et les scénarios de révision.

## Hors scope assumé

- **Q19 · Garantie locative** : c'est un passif, pas un revenu.
- **Q29 · Revente et plus-value** : pas de revente prévue. `current_value` alimente
  le patrimoine net sans scénario de sortie.
