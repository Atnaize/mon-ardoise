CREATE TYPE "public"."amortization" AS ENUM('annuity', 'constant_principal');--> statement-breakpoint
CREATE TYPE "public"."amount_mode" AS ENUM('fixed', 'percent_of_rent');--> statement-breakpoint
CREATE TYPE "public"."deferral" AS ENUM('none', 'interest_only', 'full');--> statement-breakpoint
CREATE TYPE "public"."flow_kind" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TYPE "public"."insurance_kind" AS ENUM('outstanding_balance', 'fire', 'other');--> statement-breakpoint
CREATE TYPE "public"."lease_kind" AS ENUM('one_year', 'three_six_nine');--> statement-breakpoint
CREATE TYPE "public"."lease_status" AS ENUM('planned', 'active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."penalty_mode" AS ENUM('months_of_interest', 'percent', 'fixed', 'none');--> statement-breakpoint
CREATE TYPE "public"."premium_mode" AS ENUM('in_payment', 'annual', 'quarterly', 'single_financed');--> statement-breakpoint
CREATE TYPE "public"."prepayment_effect" AS ENUM('reduce_term', 'reduce_payment');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('preparing', 'rented', 'occupied');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('house', 'apartment');--> statement-breakpoint
CREATE TYPE "public"."rate_basis" AS ENUM('equivalent', 'nominal_12');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('one_off', 'monthly', 'quarterly', 'yearly', 'every_n_years');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('wallonie', 'bruxelles', 'flandre');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"locale" text DEFAULT 'fr' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actual_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kind" "flow_kind" NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"flow_line_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"scenario_id" uuid,
	"kind" "flow_kind" NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"amount_mode" "amount_mode" DEFAULT 'fixed' NOT NULL,
	"recurrence" "recurrence" NOT NULL,
	"recurrence_interval" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"indexation_rate_ppm" integer DEFAULT 0 NOT NULL,
	"indexation_month" integer,
	"capitalize" boolean DEFAULT false NOT NULL,
	"amortization_years" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"email" text,
	"code" text NOT NULL,
	"role" "member_role" DEFAULT 'viewer' NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "lease" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"tenant_label" text NOT NULL,
	"kind" "lease_kind" DEFAULT 'one_year' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"monthly_rent" integer NOT NULL,
	"indexation_rate_ppm" integer DEFAULT 0 NOT NULL,
	"status" "lease_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"label" text NOT NULL,
	"principal" integer NOT NULL,
	"start_date" date NOT NULL,
	"term_months" integer NOT NULL,
	"amortization" "amortization" DEFAULT 'annuity' NOT NULL,
	"payment_day" integer DEFAULT 1 NOT NULL,
	"deferral_months" integer DEFAULT 0 NOT NULL,
	"deferral_type" "deferral" DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_insurance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"kind" "insurance_kind" NOT NULL,
	"premium_mode" "premium_mode" NOT NULL,
	"amount" integer NOT NULL,
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "loan_prepayment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount" integer NOT NULL,
	"penalty_mode" "penalty_mode" DEFAULT 'months_of_interest' NOT NULL,
	"penalty_value" integer DEFAULT 3 NOT NULL,
	"effect" "prepayment_effect" DEFAULT 'reduce_term' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_rate_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"start_month" integer DEFAULT 0 NOT NULL,
	"annual_rate_ppm" integer NOT NULL,
	"rate_basis" "rate_basis" DEFAULT 'equivalent' NOT NULL,
	CONSTRAINT "loan_rate_period_loan_id_start_month_unique" UNIQUE("loan_id","start_month")
);
--> statement-breakpoint
CREATE TABLE "property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "property_type" NOT NULL,
	"region" "region" DEFAULT 'wallonie' NOT NULL,
	"status" "property_status" DEFAULT 'preparing' NOT NULL,
	"acquisition_date" date,
	"purchase_price" integer,
	"cadastral_income" integer,
	"current_value" integer,
	"value_growth_rate_ppm" integer DEFAULT 0 NOT NULL,
	"marginal_tax_rate_ppm" integer DEFAULT 500000 NOT NULL,
	"estimated_tax_yearly" integer DEFAULT 0 NOT NULL,
	"default_inflation_rate_ppm" integer DEFAULT 20000 NOT NULL,
	"horizon_years" integer DEFAULT 20 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'viewer' NOT NULL,
	"ownership_share_permille" integer DEFAULT 0 NOT NULL,
	"contribution_share_permille" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "property_member_property_id_user_id_unique" UNIQUE("property_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "scenario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_baseline" boolean DEFAULT false NOT NULL,
	"horizon_years" integer,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_entry" ADD CONSTRAINT "actual_entry_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_entry" ADD CONSTRAINT "actual_entry_flow_line_id_flow_line_id_fk" FOREIGN KEY ("flow_line_id") REFERENCES "public"."flow_line"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_entry" ADD CONSTRAINT "actual_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_line" ADD CONSTRAINT "flow_line_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_line" ADD CONSTRAINT "flow_line_scenario_id_scenario_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_insurance" ADD CONSTRAINT "loan_insurance_loan_id_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_prepayment" ADD CONSTRAINT "loan_prepayment_loan_id_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_rate_period" ADD CONSTRAINT "loan_rate_period_loan_id_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_member" ADD CONSTRAINT "property_member_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_member" ADD CONSTRAINT "property_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario" ADD CONSTRAINT "scenario_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actual_entry_property_date_idx" ON "actual_entry" USING btree ("property_id","date");--> statement-breakpoint
CREATE INDEX "flow_line_property_idx" ON "flow_line" USING btree ("property_id","scenario_id");--> statement-breakpoint
CREATE INDEX "lease_property_idx" ON "lease" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "loan_property_idx" ON "loan" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_member_user_idx" ON "property_member" USING btree ("user_id");