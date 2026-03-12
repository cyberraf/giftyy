-- Migration: match_products_rag – vector similarity search with hard filters
-- Date: 2026-02-21
-- Description:
--   Creates a SQL function that performs HNSW cosine-distance vector search
--   on products.embedding with optional hard pre-filters, then returns only
--   the minimal fields needed by the LLM reranker.
--
--   All filter parameters are optional (NULL = skip that filter).
--   Called via Supabase RPC: supabase.rpc('match_products_rag', { ... })

BEGIN;

DROP FUNCTION IF EXISTS public.match_products_rag(vector(1536), int, numeric, numeric, text, text, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.match_products_rag(
    -- The query embedding vector (1536-dim, text-embedding-3-small)
    p_query_embedding   vector(1536),

    -- How many candidates to return (passed directly to LLM – keep 40-60)
    p_limit             int             DEFAULT 60,

    -- Price range filters (inclusive, in major currency units e.g. 49.99)
    p_min_price         numeric         DEFAULT NULL,
    p_max_price         numeric         DEFAULT NULL,

    -- Categorical filters
    p_category          text            DEFAULT NULL,
    p_subcategory       text            DEFAULT NULL,

    -- Boolean feature filters
    p_gift_wrap         boolean         DEFAULT NULL,
    p_personalization   boolean         DEFAULT NULL,

    -- When true, only products with stock_quantity > 0 are returned
    p_require_in_stock  boolean         DEFAULT false
)
RETURNS TABLE (
    id                          uuid,
    name                        text,
    description                 text,
    price                       numeric,
    currency                    char(3),
    images                      jsonb,
    tags                        text[],
    category                    text,
    subcategory                 text,
    occasions                   text[],
    recipient_types             text[],
    vibes                       text[],
    interests                   text[],
    gift_wrap_available         boolean,
    personalization_supported   boolean,
    vendor_id                   uuid,
    product_text                text,
    similarity_distance         float8
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
    SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.currency,
        p.images,
        p.tags,
        p.category,
        p.subcategory,
        p.occasions,
        p.recipient_types,
        p.vibes,
        p.interests,
        p.gift_wrap_available,
        p.personalization_supported,
        p.vendor_id,
        p.product_text,
        -- Cosine distance: 0 = identical, 2 = maximally dissimilar
        (p.embedding <=> p_query_embedding)::float8 AS similarity_distance
    FROM public.products p
    WHERE
        -- Always required
        p.is_active = true
        -- Embedding must exist (unembedded products are excluded)
        AND p.embedding IS NOT NULL
        -- Optional: stock filter
        AND (p_require_in_stock IS NOT TRUE OR p.stock_quantity > 0)
        -- Optional: price lower bound
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        -- Optional: price upper bound
        AND (p_max_price IS NULL OR p.price <= p_max_price)
        -- Optional: category
        AND (p_category IS NULL OR p.category = p_category)
        -- Optional: subcategory
        AND (p_subcategory IS NULL OR p.subcategory = p_subcategory)
        -- Optional: gift wrap required
        AND (p_gift_wrap IS NULL OR p.gift_wrap_available = p_gift_wrap)
        -- Optional: personalization required
        AND (p_personalization IS NULL OR p.personalization_supported = p_personalization)
    ORDER BY
        p.embedding <=> p_query_embedding  -- cosine distance, uses HNSW index
    LIMIT p_limit;
$$;

-- Grant execute to the anon and authenticated roles so the Expo app can call
-- it via Supabase RPC from an Edge Function (which uses the anon key).
-- The service-role key already has unrestricted access.
GRANT EXECUTE ON FUNCTION public.match_products_rag(
    vector(1536), int, numeric, numeric, text, text, boolean, boolean, boolean
) TO anon, authenticated;

COMMENT ON FUNCTION public.match_products_rag IS
'Vector similarity search over products using HNSW cosine distance.
Returns the top-p_limit active products ordered by embedding proximity to
p_query_embedding, with optional hard filters on price, category, stock, and
feature flags. Intended to be called from the AI RAG pipeline.';

COMMIT;
