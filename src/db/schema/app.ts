import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/*
 * Champs dormants.
 *
 * Six colonnes ont été retirées du formulaire et de l'interface parce qu'elles
 * étaient saisies sans qu'aucun calcul ne les lise. Elles restent en base, et
 * donc ici : une colonne nullable que personne n'écrit ne coûte rien, alors
 * qu'une migration rétroactive pour la faire revenir coûte cher.
 *
 * Elles sont volontairement absentes de `src/lib/schemas.ts`, des composants de
 * `src/components/fields/` et de tout affichage. Rien ne les écrit aujourd'hui.
 * Le jour où un calcul les consomme (le rendement net-net pour le taux marginal,
 * l'IPP automatique pour le revenu cadastral, la répartition par poste pour la
 * catégorie), il restera à les rebrancher côté formulaire, pas côté schéma.
 */
export const regionEnum = pgEnum("region", ["wallonie", "bruxelles", "flandre"]);
export const propertyStatusEnum = pgEnum("property_status", ["preparing", "rented", "occupied"]);

export const propertyTypeEnum = pgEnum("property_type", ["house", "apartment"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "editor", "viewer"]);
export const amortizationEnum = pgEnum("amortization", ["annuity", "constant_principal"]);
export const deferralEnum = pgEnum("deferral", ["none", "interest_only", "full"]);
export const rateBasisEnum = pgEnum("rate_basis", ["equivalent", "nominal_12"]);
export const insuranceKindEnum = pgEnum("insurance_kind", ["outstanding_balance", "fire", "other"]);
export const premiumModeEnum = pgEnum("premium_mode", [
  "in_payment",
  "annual",
  "quarterly",
  "single_financed",
]);
export const penaltyModeEnum = pgEnum("penalty_mode", [
  "months_of_interest",
  "percent",
  "fixed",
  "none",
]);
export const prepaymentEffectEnum = pgEnum("prepayment_effect", [
  "reduce_term",
  "reduce_payment",
]);
export const flowKindEnum = pgEnum("flow_kind", ["expense", "income"]);
export const amountModeEnum = pgEnum("amount_mode", ["fixed", "percent_of_rent"]);
export const recurrenceEnum = pgEnum("recurrence", [
  "one_off",
  "monthly",
  "quarterly",
  "yearly",
  "every_n_years",
]);
export const leaseKindEnum = pgEnum("lease_kind", ["one_year", "three_six_nine"]);
export const leaseStatusEnum = pgEnum("lease_status", ["planned", "active", "ended"]);

export const property = pgTable("property", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: propertyTypeEnum("type").notNull(),
  acquisitionDate: date("acquisition_date", { mode: "string" }),
  purchasePrice: integer("purchase_price"),
  currentValue: integer("current_value"),
  /** Dormants, cf. l'en-tête du fichier. Nullables : rien ne les écrit. */
  region: regionEnum("region"),
  status: propertyStatusEnum("status"),
  cadastralIncome: integer("cadastral_income"),
  marginalTaxRatePpm: integer("marginal_tax_rate_ppm"),
  estimatedTaxYearly: integer("estimated_tax_yearly"),
  valueGrowthRatePpm: integer("value_growth_rate_ppm").notNull().default(0),
  defaultInflationRatePpm: integer("default_inflation_rate_ppm").notNull().default(20_000),
  horizonYears: integer("horizon_years").notNull().default(20),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const propertyMember = pgTable(
  "property_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("viewer"),
    ownershipSharePermille: integer("ownership_share_permille").notNull().default(0),
    contributionSharePermille: integer("contribution_share_permille").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.propertyId, t.userId), index("property_member_user_idx").on(t.userId)],
);

export const invitation = pgTable("invitation", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => property.id, { onDelete: "cascade" }),
  email: text("email"),
  code: text("code").notNull().unique(),
  role: memberRoleEnum("role").notNull().default("viewer"),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loan = pgTable(
  "loan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    principal: integer("principal").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    termMonths: integer("term_months").notNull(),
    amortization: amortizationEnum("amortization").notNull().default("annuity"),
    paymentDay: integer("payment_day").notNull().default(1),
    deferralMonths: integer("deferral_months").notNull().default(0),
    deferralType: deferralEnum("deferral_type").notNull().default("none"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("loan_property_idx").on(t.propertyId)],
);

export const loanRatePeriod = pgTable(
  "loan_rate_period",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loan.id, { onDelete: "cascade" }),
    startMonth: integer("start_month").notNull().default(0),
    annualRatePpm: integer("annual_rate_ppm").notNull(),
    rateBasis: rateBasisEnum("rate_basis").notNull().default("nominal_12"),
  },
  (t) => [unique().on(t.loanId, t.startMonth)],
);

export const loanInsurance = pgTable("loan_insurance", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loan.id, { onDelete: "cascade" }),
  kind: insuranceKindEnum("kind").notNull(),
  premiumMode: premiumModeEnum("premium_mode").notNull(),
  amount: integer("amount").notNull(),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
});

export const loanPrepayment = pgTable("loan_prepayment", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loan.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  amount: integer("amount").notNull(),
  penaltyMode: penaltyModeEnum("penalty_mode").notNull().default("months_of_interest"),
  penaltyValue: integer("penalty_value").notNull().default(3),
  effect: prepaymentEffectEnum("effect").notNull().default("reduce_term"),
});

export const scenario = pgTable("scenario", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => property.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isBaseline: boolean("is_baseline").notNull().default(false),
  horizonYears: integer("horizon_years"),
  overrides: jsonb("overrides").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flowLine = pgTable(
  "flow_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    scenarioId: uuid("scenario_id").references(() => scenario.id, { onDelete: "cascade" }),
    kind: flowKindEnum("kind").notNull(),
    /** Dormante, cf. l'en-tête du fichier. Reviendra en liste fermée, pas en texte libre. */
    category: text("category"),
    label: text("label").notNull(),
    amount: integer("amount").notNull(),
    amountMode: amountModeEnum("amount_mode").notNull().default("fixed"),
    recurrence: recurrenceEnum("recurrence").notNull(),
    recurrenceInterval: integer("recurrence_interval").notNull().default(1),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    indexationRatePpm: integer("indexation_rate_ppm").notNull().default(0),
    indexationMonth: integer("indexation_month"),
    capitalize: boolean("capitalize").notNull().default(false),
    amortizationYears: integer("amortization_years"),
    isAcquisitionCost: boolean("is_acquisition_cost").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("flow_line_property_idx").on(t.propertyId, t.scenarioId)],
);

export const lease = pgTable(
  "lease",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    tenantLabel: text("tenant_label").notNull(),
    kind: leaseKindEnum("kind").notNull().default("one_year"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    monthlyRent: integer("monthly_rent").notNull(),
    indexationRatePpm: integer("indexation_rate_ppm").notNull().default(0),
    status: leaseStatusEnum("status").notNull().default("planned"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("lease_property_idx").on(t.propertyId)],
);

export const actualEntry = pgTable(
  "actual_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    kind: flowKindEnum("kind").notNull(),
    category: text("category").notNull(),
    label: text("label").notNull(),
    amount: integer("amount").notNull(),
    flowLineId: uuid("flow_line_id").references(() => flowLine.id, { onDelete: "set null" }),
    leaseId: uuid("lease_id").references(() => lease.id, { onDelete: "set null" }),
    dueMonth: integer("due_month"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("actual_entry_property_date_idx").on(t.propertyId, t.date),
    index("actual_entry_due_month_idx").on(t.propertyId, t.dueMonth),
  ],
);

/**
 * Ce qui a déjà été rappelé, un état par destinataire. Le cron des retards de
 * loyer tourne chaque jour ; sans mémoire, il enverrait le même message chaque
 * matin.
 *
 * `signature` résume l'ardoise du destinataire au moment de l'envoi (voir
 * `src/lib/reminders.ts`). Inchangée, le rappel attend la semaine suivante ;
 * différente, il repart tout de suite, parce qu'il a du neuf à dire. La ligne est
 * retirée dès que plus rien n'est en retard, pour que le retour du retard reparte
 * d'un rappel immédiat.
 */
export const rentReminder = pgTable("rent_reminder", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  signature: text("signature").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});
