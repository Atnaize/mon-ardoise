ALTER TABLE "property" DROP COLUMN "region";--> statement-breakpoint
ALTER TABLE "property" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."property_status";--> statement-breakpoint
DROP TYPE "public"."region";