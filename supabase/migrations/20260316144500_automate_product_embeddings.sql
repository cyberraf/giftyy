-- Migration: Automate Product and Recipient Embeddings
-- Date: 2026-03-16
-- Description: Adds triggers to automatically queue products and recipient preferences 
--              for vector embedding whenever they are created or updated.

BEGIN;

--------------------------------------------------------------------------------
-- 1) Product Embedding Trigger
--------------------------------------------------------------------------------

-- Function to queue product embedding
CREATE OR REPLACE FUNCTION public.queue_product_embedding()
RETURNS trigger AS $$
BEGIN
    -- Only queue if it's active
    IF (NEW.is_active = true) THEN
        INSERT INTO public.product_embedding_jobs (product_id, status, attempts)
        VALUES (NEW.id, 'queued', 0)
        ON CONFLICT (product_id) 
        WHERE status IN ('queued', 'processing')
        DO UPDATE SET 
            status = 'queued',
            attempts = 0,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for products
DROP TRIGGER IF EXISTS trigger_queue_product_embedding ON public.products;
CREATE TRIGGER trigger_queue_product_embedding
AFTER INSERT OR UPDATE OF name, description, category, subcategory, tags, occasions, recipient_types, vibes, interests, gift_wrap_available, personalization_supported, is_active
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.queue_product_embedding();

--------------------------------------------------------------------------------
-- 2) Recipient Preference Embedding Trigger
--------------------------------------------------------------------------------

-- Function to queue recipient preference embedding
CREATE OR REPLACE FUNCTION public.queue_recipient_embedding()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.recipient_embedding_jobs (recipient_preferences_id, status, attempts)
    VALUES (NEW.id, 'queued', 0)
    ON CONFLICT (recipient_preferences_id) 
    WHERE status IN ('queued', 'processing')
    DO UPDATE SET 
        status = 'queued',
        attempts = 0,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for recipient_preferences
DROP TRIGGER IF EXISTS trigger_queue_recipient_embedding ON public.recipient_preferences;
CREATE TRIGGER trigger_queue_recipient_embedding
AFTER INSERT OR UPDATE ON public.recipient_preferences
FOR EACH ROW
EXECUTE FUNCTION public.queue_recipient_embedding();

--------------------------------------------------------------------------------
-- 3) Comments
--------------------------------------------------------------------------------
COMMENT ON FUNCTION public.queue_product_embedding() IS 
'Automatically queues a product for vector embedding when descriptive fields change.';
COMMENT ON FUNCTION public.queue_recipient_embedding() IS 
'Automatically queues recipient preferences for vector embedding when profile data changes.';

COMMIT;
