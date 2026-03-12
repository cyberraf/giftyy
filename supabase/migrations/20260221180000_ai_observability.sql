-- Migration: AI Observability – recommendation session logging
-- Date: 2026-02-21
-- Description:
--   Creates ai_recommendation_sessions to record every call to the
--   ai-recommend Edge Function for observability, debugging, and future
--   fine-tuning. Rows are written by the service-role key (Edge Function)
--   and are readable by the owning user only (RLS).

BEGIN;

--------------------------------------------------------------------------------
-- Table
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_recommendation_sessions (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who made the request
    user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Request context
    recipient_profile_id    uuid        REFERENCES public.recipient_preferences(id) ON DELETE SET NULL,
    occasion                text        NOT NULL,
    budget                  numeric     NOT NULL CHECK (budget > 0),
    free_text               text,

    -- What was sent to the pipeline
    intent_text             text        NOT NULL,

    -- RAG retrieval: array of product UUIDs returned by match_products_rag
    retrieved_product_ids   jsonb       NOT NULL DEFAULT '[]'::jsonb,

    -- LLM output: full structured response object
    final_recommendations   jsonb       NOT NULL DEFAULT '{}'::jsonb,

    -- Model metadata
    model_used              text        NOT NULL DEFAULT 'gpt-4o',

    -- Timing
    created_at              timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- Constraints
--------------------------------------------------------------------------------
ALTER TABLE public.ai_recommendation_sessions
    DROP CONSTRAINT IF EXISTS ai_rec_sessions_retrieved_ids_is_array;
ALTER TABLE public.ai_recommendation_sessions
    ADD CONSTRAINT ai_rec_sessions_retrieved_ids_is_array
    CHECK (jsonb_typeof(retrieved_product_ids) = 'array');

ALTER TABLE public.ai_recommendation_sessions
    DROP CONSTRAINT IF EXISTS ai_rec_sessions_recommendations_is_object;
ALTER TABLE public.ai_recommendation_sessions
    ADD CONSTRAINT ai_rec_sessions_recommendations_is_object
    CHECK (jsonb_typeof(final_recommendations) IN ('object', 'array'));

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------
-- Primary lookup: all sessions for a user (e.g. history screen)
CREATE INDEX IF NOT EXISTS ai_rec_sessions_user_id_idx
    ON public.ai_recommendation_sessions (user_id, created_at DESC);

-- Lookup by recipient (e.g. "what was recommended for this person before?")
CREATE INDEX IF NOT EXISTS ai_rec_sessions_recipient_idx
    ON public.ai_recommendation_sessions (recipient_profile_id, created_at DESC)
    WHERE recipient_profile_id IS NOT NULL;

--------------------------------------------------------------------------------
-- RLS
--------------------------------------------------------------------------------
ALTER TABLE public.ai_recommendation_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions (e.g. recommendation history)
CREATE POLICY "Users can view their own recommendation sessions"
    ON public.ai_recommendation_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Inserts are performed by the service-role key from the Edge Function.
-- No authenticated insert policy — the service role bypasses RLS entirely.
-- If you ever need users to insert directly, add a policy here.

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------
COMMENT ON TABLE public.ai_recommendation_sessions IS
'Logs every call to the ai-recommend Edge Function for observability and
future fine-tuning. Written by the service-role key; readable by the
owning user only.';

COMMENT ON COLUMN public.ai_recommendation_sessions.intent_text IS
'Full intent string passed to the embedding model, e.g.
"Occasion: Birthday; Budget: $75.00; Recipient profile: ..."';

COMMENT ON COLUMN public.ai_recommendation_sessions.retrieved_product_ids IS
'JSON array of product UUIDs returned by match_products_rag (RAG step),
in cosine-distance order. Useful for debugging retrieval quality.';

COMMENT ON COLUMN public.ai_recommendation_sessions.final_recommendations IS
'Full structured JSON output from the LLM reranker:
{ clarifying_questions, recommendations, message_script, cautions, candidates_evaluated }';

COMMIT;
