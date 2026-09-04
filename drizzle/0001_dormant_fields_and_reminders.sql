-- Deux choses en une : les six champs dormants reviennent en base sans revenir
-- dans l'interface, et la mémoire des rappels de retard apparaît.
--
-- Tout est gardé, parce que cette migration doit passer sur trois états :
--   * une base vierge, où 0000 vient de tout créer sans ces colonnes ;
--   * la base de production, où 0005 à 0009 ont supprimé les trois champs
--     fiscaux et la catégorie, mais où 0010 n'a jamais tourné : les types
--     `region` et `property_status` et leurs colonnes y sont probablement
--     encore, en NOT NULL avec valeur par défaut ;
--   * une base de développement, arrivée là par un chemin ou par l'autre.
--
-- D'où la normalisation en fin de fichier : à l'arrivée les trois états sont
-- identiques, et conformes à ce que dit le snapshot.

DO $$ BEGIN
  CREATE TYPE "public"."property_status" AS ENUM('preparing', 'rented', 'occupied');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."region" AS ENUM('wallonie', 'bruxelles', 'flandre');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "rent_reminder" (
	"user_id" text PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "rent_reminder" ADD CONSTRAINT "rent_reminder_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "flow_line" ADD COLUMN IF NOT EXISTS "category" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "region" "region";--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "status" "property_status";--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "cadastral_income" integer;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "marginal_tax_rate_ppm" integer;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "estimated_tax_yearly" integer;--> statement-breakpoint

-- Là où les colonnes ont survécu, elles sont NOT NULL avec une valeur par
-- défaut. Un champ dormant ne doit pas faire écrire une valeur que personne ne
-- lit : on lève les deux contraintes. Sans effet là où la colonne vient d'être
-- ajoutée, donc sûr dans les trois cas.
ALTER TABLE "flow_line" ALTER COLUMN "category" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "flow_line" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "region" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "region" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "cadastral_income" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "cadastral_income" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "marginal_tax_rate_ppm" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "marginal_tax_rate_ppm" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "estimated_tax_yearly" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "estimated_tax_yearly" DROP NOT NULL;
