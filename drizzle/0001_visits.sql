ALTER TABLE "items" ADD COLUMN "visit_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "last_visited_at" timestamp with time zone;
