ALTER TABLE "actual_entry" ADD COLUMN "lease_id" uuid;--> statement-breakpoint
ALTER TABLE "actual_entry" ADD COLUMN "due_month" integer;--> statement-breakpoint
ALTER TABLE "actual_entry" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "actual_entry" ADD CONSTRAINT "actual_entry_lease_id_lease_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."lease"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actual_entry_due_month_idx" ON "actual_entry" USING btree ("property_id","due_month");