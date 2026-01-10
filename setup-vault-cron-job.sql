-- Setup vault categorization cron job
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with actual values
-- 
-- To find your project ref: Check your Supabase project URL
-- Example: https://abcdefghijklmnop.supabase.co -> project ref is "abcdefghijklmnop"
-- 
-- To find your service role key: Go to Supabase Dashboard > Settings > API > service_role key

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Step 2: Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;

-- Step 3: Remove existing job if it exists (to avoid duplicates)
SELECT cron.unschedule('categorize-vaults-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'categorize-vaults-daily'
);

-- Step 4: Schedule the cron job
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running!
-- 
-- Option A: Using http extension (recommended for most Supabase projects)
SELECT cron.schedule(
  'categorize-vaults-daily',
  '0 2 * * *', -- Runs every day at 2:00 AM UTC (change this to your preferred time)
  $$
  SELECT
    http_post(
      'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
      '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      '{}'::jsonb
    );
  $$
);

-- If the above doesn't work, you can also try manually setting up the job via Supabase Dashboard:
-- 1. Go to Database > Cron Jobs in your Supabase Dashboard
-- 2. Create a new cron job with:
--    - Name: categorize-vaults-daily
--    - Schedule: 0 2 * * * (Every day at 2:00 AM UTC)
--    - SQL Command: 
--      SELECT net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--        ),
--        body := '{}'::jsonb
--      );

-- Step 5: Verify the job was created
SELECT 
    jobid,
    schedule,
    active,
    jobname
FROM cron.job
WHERE jobname = 'categorize-vaults-daily';

-- Step 6: To manually trigger the job immediately (for testing)
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY first!
-- SELECT
--   http_post(
--     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
--     '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     '{}'::jsonb
--   );

