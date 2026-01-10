-- Migration: Create database trigger to automatically categorize products into bundles
-- This trigger uses pg_net to call the categorize-products-to-bundles edge function

-- Step 1: Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create a function to call the edge function using pg_net
CREATE OR REPLACE FUNCTION public.trigger_categorize_product_to_bundles()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  response_status INT;
  response_body TEXT;
BEGIN
  -- Get Supabase URL and service role key
  -- These should be set as database secrets or environment variables
  -- You can set them using: ALTER DATABASE postgres SET app.settings.supabase_url = 'your-url';
  
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- If settings don't exist, try to get from environment
    -- For Supabase, you may need to set these manually
    supabase_url := NULL;
    service_role_key := NULL;
  END;

  -- If we have the URL and key, call the edge function
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    -- Use pg_net to make HTTP request to edge function
    SELECT status, content INTO response_status, response_body
    FROM net.http_post(
      url := supabase_url || '/functions/v1/categorize-products-to-bundles',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('product_id', NEW.id)
    );
    
    -- Log the response (optional, for debugging)
    RAISE NOTICE 'Categorization triggered for product %: Status %', NEW.id, response_status;
  ELSE
    -- If configuration is missing, log a notice
    -- You can set these using:
    -- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
    -- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
    RAISE NOTICE 'Product % created/updated. Supabase URL or service role key not configured. Please set app.settings.supabase_url and app.settings.service_role_key, or use webhooks instead.', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger on products table
-- This trigger fires after INSERT or UPDATE on products
DROP TRIGGER IF EXISTS products_categorize_to_bundles_trigger ON public.products;

CREATE TRIGGER products_categorize_to_bundles_trigger
  AFTER INSERT OR UPDATE OF name, description, tags, is_active
  ON public.products
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.trigger_categorize_product_to_bundles();

-- Step 4: Add comments for documentation
COMMENT ON FUNCTION public.trigger_categorize_product_to_bundles() IS 
  'Triggers the categorize-products-to-bundles edge function when products are created or updated. Requires pg_net extension and app.settings configuration.';

COMMENT ON TRIGGER products_categorize_to_bundles_trigger ON public.products IS 
  'Automatically categorizes products into bundles when products are created or updated';

-- Step 5: Configuration Instructions
-- To enable automatic triggering, set these database settings:
-- 
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--
-- Alternative: Use Supabase Webhooks (Recommended if pg_net is not available)
-- 1. Go to Database > Webhooks in Supabase Dashboard
-- 2. Create a webhook:
--    - Name: categorize-products-to-bundles
--    - Table: products
--    - Events: INSERT, UPDATE
--    - URL: https://your-project.supabase.co/functions/v1/categorize-products-to-bundles
--    - HTTP Method: POST
--    - Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--    - Body: {"product_id": "{{ $1.id }}"}
--
-- Note: The trigger will still work even if the edge function call fails,
-- it will just log a notice. The categorization can be done manually later.
