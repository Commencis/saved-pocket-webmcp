CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "embedding" vector(384);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "link_status" text;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "link_checked_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_embedding_idx" ON "items" USING hnsw ("embedding" vector_cosine_ops);
