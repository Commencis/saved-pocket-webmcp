ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "analysis_tokens_in" integer;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "analysis_tokens_out" integer;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "image_analysis_tokens_in" integer;
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "image_analysis_tokens_out" integer;
