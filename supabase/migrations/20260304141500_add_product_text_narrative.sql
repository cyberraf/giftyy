-- Migration: Add narrative product_text for better RAG context
-- Date: 2026-03-04
-- Description: Adds a narrative-style search column to products for improved LLM context.

BEGIN;

-- 1. Add the column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_text text;

-- 2. Create the builder function
CREATE OR REPLACE FUNCTION public.build_product_text(row_input public.products) 
RETURNS text AS $$
BEGIN
    RETURN trim(
        concat_ws(' ',
            COALESCE(row_input.name, '') || '.',
            COALESCE(row_input.description, '') || '.',
            'This ' || COALESCE(row_input.category, 'product') || 
            CASE WHEN row_input.subcategory IS NOT NULL THEN ' (' || row_input.subcategory || ')' ELSE '' END ||
            ' is a great gift for ' || array_to_string(row_input.occasions, ', ') || '.',
            'It fits vibes like ' || array_to_string(row_input.vibes, ', ') || '.',
            'Perfect for people interested in ' || array_to_string(row_input.interests, ', ') || '.',
            CASE WHEN row_input.gift_wrap_available THEN 'Gift wrap is available.' ELSE '' END,
            CASE WHEN row_input.personalization_supported THEN 'Personalization is supported.' ELSE '' END,
            'Tags: ' || array_to_string(row_input.tags, ', ')
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Create the trigger function
CREATE OR REPLACE FUNCTION public.on_product_narrative_update() 
RETURNS trigger AS $$
BEGIN
    NEW.product_text := public.build_product_text(NEW);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS trigger_update_product_narrative_text ON public.products;
CREATE TRIGGER trigger_update_product_narrative_text
BEFORE INSERT OR UPDATE OF name, description, category, subcategory, tags, occasions, recipient_types, vibes, interests, gift_wrap_available, personalization_supported
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.on_product_narrative_update();

-- 5. Backfill existing products
UPDATE public.products SET product_text = public.build_product_text(products);

COMMIT;
