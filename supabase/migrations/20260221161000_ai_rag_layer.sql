-- Migration: AI + RAG Layer Infrastructure
-- Date: 2026-02-21
-- Description:
-- 1) Enables pgvector.
-- 2) Adds vector embedding support to products and recipient_preferences.
-- 3) Implements deterministic text generation for RAG.
-- 4) Establishes background processing queues for embeddings.

BEGIN;

--------------------------------------------------------------------------------
-- 1) Extensions
--------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

--------------------------------------------------------------------------------
-- 2) Products Table Enhancements
--------------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding_model text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- HNSW Index for Cosine Similarity (Recommended for 2K-10K rows)
CREATE INDEX IF NOT EXISTS products_embedding_hnsw_idx 
ON public.products USING hnsw (embedding vector_cosine_ops);

-- Supporting BTree Indexes for Pre-filtering
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products (price);
CREATE INDEX IF NOT EXISTS products_vendor_id_idx ON public.products (vendor_id);
-- (is_active, category, subcategory) already added in previous migration

--------------------------------------------------------------------------------
-- 3) Recipient Preferences Table Enhancements
--------------------------------------------------------------------------------
ALTER TABLE public.recipient_preferences ADD COLUMN IF NOT EXISTS profile_text text;
ALTER TABLE public.recipient_preferences ADD COLUMN IF NOT EXISTS profile_embedding vector(1536);
ALTER TABLE public.recipient_preferences ADD COLUMN IF NOT EXISTS profile_embedding_model text;
ALTER TABLE public.recipient_preferences ADD COLUMN IF NOT EXISTS profile_embedding_updated_at timestamptz;

-- HNSW Index on profile_embedding
CREATE INDEX IF NOT EXISTS recipient_preferences_embedding_hnsw_idx 
ON public.recipient_preferences USING hnsw (profile_embedding vector_cosine_ops);

-- JSONB Guardrails: Ensure all list fields are arrays
-- List of fields to guard: 
-- creative_hobbies, collecting_interests, tech_interests, outdoor_activities, indoor_activities, 
-- favorite_music_genres, favorite_books_genres, favorite_movies_genres, favorite_tv_shows, podcast_interests,
-- core_values, causes_they_support, fashion_style, color_preferences, home_decor_style,
-- dietary_preferences, food_allergies, favorite_cuisines, beverage_preferences, wellness_interests,
-- gift_type_preference, gift_dislikes, recent_life_events, upcoming_milestones, has_pets,
-- personality_traits, learning_style, scent_sensitivities, material_sensitivities

DO $$
DECLARE
    column_name_text text;
    columns_to_fix text[] := ARRAY[
        'sports_activities', 'creative_hobbies', 'collecting_interests', 'tech_interests', 'outdoor_activities', 'indoor_activities',
        'favorite_music_genres', 'favorite_books_genres', 'favorite_movies_genres', 'favorite_tv_shows', 'podcast_interests',
        'core_values', 'causes_they_support', 'fashion_style', 'color_preferences', 'home_decor_style',
        'dietary_preferences', 'food_allergies', 'favorite_cuisines', 'beverage_preferences', 'wellness_interests',
        'gift_type_preference', 'gift_dislikes', 'recent_life_events', 'upcoming_milestones', 'has_pets',
        'personality_traits', 'learning_style', 'scent_sensitivities', 'material_sensitivities',
        'cultural_background', 'languages_spoken'
    ];
BEGIN
    FOREACH column_name_text IN ARRAY columns_to_fix LOOP
        -- Coerce to [] if invalid
        EXECUTE format('UPDATE public.recipient_preferences SET %I = ''[]''::jsonb WHERE jsonb_typeof(%I) IS DISTINCT FROM ''array'' OR %I IS NULL', 
                       column_name_text, column_name_text, column_name_text);
        
        -- Add check constraint
        EXECUTE format('ALTER TABLE public.recipient_preferences DROP CONSTRAINT IF EXISTS recipient_preferences_%I_is_array', column_name_text);
        EXECUTE format('ALTER TABLE public.recipient_preferences ADD CONSTRAINT recipient_preferences_%I_is_array CHECK (jsonb_typeof(%I) = ''array'')', 
                       column_name_text, column_name_text);
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- 4) SQL Functions for Search Text
--------------------------------------------------------------------------------

-- Function for Product Search Text
CREATE OR REPLACE FUNCTION public.build_product_search_text(row_input public.products) 
RETURNS text AS $$
BEGIN
    RETURN trim(
        concat_ws(' ',
            row_input.name,
            row_input.description,
            row_input.category,
            row_input.subcategory,
            array_to_string(row_input.tags, ' '),
            array_to_string(row_input.occasions, ' '),
            array_to_string(row_input.recipient_types, ' '),
            array_to_string(row_input.vibes, ' '),
            array_to_string(row_input.interests, ' '),
            CASE WHEN row_input.gift_wrap_available THEN 'gift wrap available' ELSE '' END,
            CASE WHEN row_input.personalization_supported THEN 'personalization supported' ELSE '' END
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function for Recipient Profile Text
CREATE OR REPLACE FUNCTION public.build_recipient_profile_text(row_input public.recipient_preferences) 
RETURNS text AS $$
BEGIN
    RETURN trim(
        concat_ws(' ',
            'A ' || COALESCE(row_input.age_range, 'unknown age') || ' ' || COALESCE(row_input.gender_identity, ''),
            'who identifies as ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(row_input.personality_traits)), ', '),
            'Interests include: ' || array_to_string(ARRAY(
                SELECT jsonb_array_elements_text(row_input.sports_activities)
                UNION SELECT jsonb_array_elements_text(row_input.creative_hobbies)
                UNION SELECT jsonb_array_elements_text(row_input.tech_interests)
                UNION SELECT jsonb_array_elements_text(row_input.outdoor_activities)
            ), ', '),
            'Dietary: ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(row_input.dietary_preferences)), ', '),
            'Allergies: ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(row_input.food_allergies)), ', '),
            'Likes: ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(row_input.gift_type_preference)), ', '),
            'Dislikes: ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(row_input.gift_dislikes)), ', '),
            'Lifestyle: ' || COALESCE(row_input.lifestyle_type, ''),
            'Notes: ' || COALESCE(row_input.additional_notes, '')
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

--------------------------------------------------------------------------------
-- 5) Trigger Functions & Triggers
--------------------------------------------------------------------------------

-- Product Trigger Function
CREATE OR REPLACE FUNCTION public.on_product_text_update() 
RETURNS trigger AS $$
BEGIN
    NEW.search_text := public.build_product_search_text(NEW);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_search_text
BEFORE INSERT OR UPDATE OF name, description, category, subcategory, tags, occasions, recipient_types, vibes, interests, gift_wrap_available, personalization_supported
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.on_product_text_update();

-- Recipient Trigger Function
CREATE OR REPLACE FUNCTION public.on_recipient_text_update() 
RETURNS trigger AS $$
BEGIN
    NEW.profile_text := public.build_recipient_profile_text(NEW);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recipient_profile_text
BEFORE INSERT OR UPDATE
ON public.recipient_preferences
FOR EACH ROW
EXECUTE FUNCTION public.on_recipient_text_update();

--------------------------------------------------------------------------------
-- 6) Job Queues
--------------------------------------------------------------------------------

-- Custom Types for Job Status
DO $$ BEGIN
    CREATE TYPE public.job_status AS ENUM ('queued', 'processing', 'done', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product Embedding Jobs
CREATE TABLE IF NOT EXISTS public.product_embedding_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    status public.job_status NOT NULL DEFAULT 'queued',
    error text,
    attempts int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for pending jobs
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_job_pending_unique 
ON public.product_embedding_jobs (product_id) 
WHERE status IN ('queued', 'processing');

-- Recipient Embedding Jobs
CREATE TABLE IF NOT EXISTS public.recipient_embedding_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_preferences_id uuid NOT NULL REFERENCES public.recipient_preferences(id) ON DELETE CASCADE,
    status public.job_status NOT NULL DEFAULT 'queued',
    error text,
    attempts int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for pending jobs
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipient_job_pending_unique 
ON public.recipient_embedding_jobs (recipient_preferences_id) 
WHERE status IN ('queued', 'processing');

-- Update timestamps trigger for jobs
CREATE OR REPLACE FUNCTION public.update_job_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_job_updated_at 
BEFORE UPDATE ON public.product_embedding_jobs 
FOR EACH ROW EXECUTE FUNCTION public.update_job_updated_at();

CREATE TRIGGER trigger_recipient_job_updated_at 
BEFORE UPDATE ON public.recipient_embedding_jobs 
FOR EACH ROW EXECUTE FUNCTION public.update_job_updated_at();

COMMIT;
