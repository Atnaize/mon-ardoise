ALTER TABLE "actual_entry" DROP CONSTRAINT "actual_entry_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "property" DROP CONSTRAINT "property_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "actual_entry" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "actual_entry" ADD CONSTRAINT "actual_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;