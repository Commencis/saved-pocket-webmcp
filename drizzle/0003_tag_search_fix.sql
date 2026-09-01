CREATE OR REPLACE FUNCTION immutable_array_to_text(arr text[]) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT coalesce(array_to_string(arr, ' '), '') $$;
--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "search_vector";
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', immutable_array_to_text("tags")), 'B') ||
  setweight(to_tsvector('english', immutable_array_to_text("user_tags")), 'B') ||
  setweight(to_tsvector('english', coalesce("summary", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("notes", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'D')
) STORED;
--> statement-breakpoint
CREATE INDEX "items_search_idx" ON "items" USING gin ("search_vector");
