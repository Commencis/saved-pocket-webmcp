ALTER TABLE "items" ADD COLUMN "notes" text;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "user_tags" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "search_vector";
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(array_to_tsvector("tags"), 'B') ||
  setweight(array_to_tsvector("user_tags"), 'B') ||
  setweight(to_tsvector('english', coalesce("summary", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("notes", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'D')
) STORED;
--> statement-breakpoint
CREATE INDEX "items_search_idx" ON "items" USING gin ("search_vector");
