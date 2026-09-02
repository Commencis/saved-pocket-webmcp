-- Add OpenAI-specific columns and ai_provider selector.
-- The existing anthropic_api_key / anthropic_model columns currently hold
-- OpenAI credentials (legacy naming). We:
--   1. Add proper openai_* columns + ai_provider
--   2. Copy existing (OpenAI) keys into the new openai_* columns
--   3. Clear the old columns so they can hold real Anthropic keys going forward

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS openai_api_key text,
  ADD COLUMN IF NOT EXISTS openai_model   text,
  ADD COLUMN IF NOT EXISTS ai_provider    text NOT NULL DEFAULT 'openai';

UPDATE "user"
SET openai_api_key = anthropic_api_key,
    openai_model   = anthropic_model;

UPDATE "user"
SET anthropic_api_key = NULL,
    anthropic_model   = NULL;
