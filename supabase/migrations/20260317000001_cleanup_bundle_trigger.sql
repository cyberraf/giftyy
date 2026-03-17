-- Migration: Cleanup failing bundle categorization trigger
-- We are switching to Supabase Webhooks for better reliability

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS products_categorize_to_bundles_trigger ON public.products;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.trigger_categorize_product_to_bundles();

-- Note: We are NOT dropping pg_net extension as it may be used by other features (like the reminder system) 
