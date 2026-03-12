-- Migration: Fix AI Recommendation Sessions Foreign Key
-- Description:
--   The ai_recommendation_sessions table was incorrectly referencing
--   recipient_preferences(id) for the recipient_profile_id column.
--   This changes the foreign key to correctly reference recipient_profiles(id).

BEGIN;

ALTER TABLE public.ai_recommendation_sessions
    DROP CONSTRAINT IF EXISTS ai_recommendation_sessions_recipient_profile_id_fkey;

ALTER TABLE public.ai_recommendation_sessions
    ADD CONSTRAINT ai_recommendation_sessions_recipient_profile_id_fkey
    FOREIGN KEY (recipient_profile_id)
    REFERENCES public.recipient_profiles(id)
    ON DELETE SET NULL;

COMMIT;
