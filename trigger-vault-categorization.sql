-- Manually trigger the categorize-vaults edge function
-- Use this to test the function immediately without waiting for the cron job
--
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with actual values
-- To find your project ref: Check your Supabase project URL
-- Example: https://abcdefghijklmnop.supabase.co -> project ref is "abcdefghijklmnop"
-- To find your service role key: Go to Settings > API > service_role key

-- Option 1: Using http extension (if enabled)
-- Make sure http extension is enabled first:
-- CREATE EXTENSION IF NOT EXISTS http;

SELECT
  http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
    '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    '{}'::jsonb
  ) AS request_result;

-- Option 2: Using net extension (if available on your Supabase plan)
-- CREATE EXTENSION IF NOT EXISTS net;
-- 
-- SELECT
--   net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;

-- Note: After running, check the function logs in Supabase Dashboard > Edge Functions > categorize-vaults > Logs
-- to see if it executed successfully and check for any errors

