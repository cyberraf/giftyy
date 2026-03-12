-- Migration: Improve products table integrity and add AI/RAG features
-- Date: 2026-02-21
-- Description:
-- 1) Adds currency support and price constraints.
-- 2) Ensures stock_quantity integrity.
-- 3) Implements partial unique index for SKU (unique when present).
-- 4) Adds RAG/AI fields (search_text, occasions, recipient_types, vibes, interests, etc.).
-- 5) Adds JSONB guardrails for images and variations.
-- 6) Adds composite index for common filters.
-- 7) Backfills search_text for discoverability.

BEGIN;

--------------------------------------------------------------------------------
-- 1) Currency Support
--------------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'currency') THEN
        ALTER TABLE public.products ADD COLUMN currency char(3) NOT NULL DEFAULT 'USD';
    END IF;
END $$;

-- Drop and recreate constraints to ensure they match requirements (even if they already exist)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_currency_check;
ALTER TABLE public.products ADD CONSTRAINT products_currency_check CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_check;
ALTER TABLE public.products ADD CONSTRAINT products_price_check CHECK (price >= 0);

--------------------------------------------------------------------------------
-- 2) Stock Integrity
--------------------------------------------------------------------------------
-- Ensure the column is NOT NULL and has a default
ALTER TABLE public.products ALTER COLUMN stock_quantity SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN stock_quantity SET DEFAULT 0;

-- Drop and recreate constraint
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_quantity_check;
ALTER TABLE public.products ADD CONSTRAINT products_stock_quantity_check CHECK (stock_quantity >= 0);

--------------------------------------------------------------------------------
-- 3) SKU Uniqueness (Partial Index)
--------------------------------------------------------------------------------
-- Safely drop generic UNIQUE constraints on sku
DO $$
DECLARE
    cons_name text;
BEGIN
    FOR cons_name IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
        WHERE tc.table_name = 'products' 
        AND ccu.column_name = 'sku' 
        AND tc.constraint_type = 'UNIQUE'
    ) LOOP
        EXECUTE 'ALTER TABLE public.products DROP CONSTRAINT ' || cons_name;
    END LOOP;
END $$;

-- Drop index if it was manually created previously
DROP INDEX IF EXISTS public.products_sku_partial_idx;

-- Create partial unique index: enforce uniqueness only if SKU is provided and not empty
CREATE UNIQUE INDEX products_sku_partial_idx ON public.products (sku) 
WHERE sku IS NOT NULL AND sku <> '';

--------------------------------------------------------------------------------
-- 4) AI/RAG Fields
--------------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_text text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS occasions text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS recipient_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vibes text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS personalization_supported boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gift_wrap_available boolean NOT NULL DEFAULT false;

--------------------------------------------------------------------------------
-- 5) JSONB Guardrails
--------------------------------------------------------------------------------
-- Ensure columns exist (handling cases where they might be missing in some environments)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'images') THEN
        ALTER TABLE public.products ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'variations') THEN
        ALTER TABLE public.products ADD COLUMN variations jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Coerce existing invalid values to '[]' before adding constraints
UPDATE public.products 
SET images = '[]'::jsonb 
WHERE jsonb_typeof(images) IS DISTINCT FROM 'array' OR images IS NULL;

UPDATE public.products 
SET variations = '[]'::jsonb 
WHERE jsonb_typeof(variations) IS DISTINCT FROM 'array' OR variations IS NULL;

-- Add constraints to ensure they remain arrays
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_images_is_array;
ALTER TABLE public.products ADD CONSTRAINT products_images_is_array CHECK (jsonb_typeof(images) = 'array');

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_variations_is_array;
ALTER TABLE public.products ADD CONSTRAINT products_variations_is_array CHECK (jsonb_typeof(variations) = 'array');

--------------------------------------------------------------------------------
-- 6) Composite Index for common filters
--------------------------------------------------------------------------------
-- We assume category/subcategory exist as columns or are being added. 
-- Based on the requirement to index them, we ensure they exist.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text;

CREATE INDEX IF NOT EXISTS products_filter_idx ON public.products (is_active, category, subcategory);

--------------------------------------------------------------------------------
-- 7) Backfill search_text
--------------------------------------------------------------------------------
-- This backfills the search_text column with a concatenated string of relevant fields
-- for RAG/full-text search purposes.
UPDATE public.products
SET search_text = trim(
    concat_ws(' ',
        name,
        description,
        category,
        subcategory,
        array_to_string(tags, ' '),
        array_to_string(occasions, ' '),
        array_to_string(recipient_types, ' '),
        array_to_string(vibes, ' '),
        array_to_string(interests, ' '),
        CASE WHEN gift_wrap_available THEN 'gift wrap available' ELSE '' END,
        CASE WHEN personalization_supported THEN 'personalization supported' ELSE '' END
    )
);

COMMIT;

--------------------------------------------------------------------------------
-- Verification Queries
--------------------------------------------------------------------------------
/*
-- 1. Check constraints and columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('currency', 'stock_quantity', 'search_text', 'occasions');

-- 2. Check check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.products'::regclass;

-- 3. Check partial unique index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'products' AND indexname = 'products_sku_partial_idx';

-- 4. Verify search_text backfill
SELECT name, search_text 
FROM public.products 
LIMIT 5;
*/
