-- Supabase migration: Daily cron job for vault categorization
-- Run this SQL in your Supabase SQL editor after deploying the categorize-vaults edge function
-- This sets up a daily job to automatically categorize videos into vaults using GPT

-- IMPORTANT: Setting up cron jobs in Supabase
-- ============================================
-- Option 1 (Recommended): Use Supabase Dashboard
--   1. Go to Database > Cron Jobs in your Supabase Dashboard
--   2. Create a new cron job with:
--      - Schedule: 0 2 * * * (Every day at 2:00 AM UTC)
--      - SQL: See "Option 2" below, or use HTTP call method
--
-- Option 2: Use pg_cron (if available in your Supabase plan)
--   Run the SQL below after enabling pg_cron extension
--
-- Option 3: Use Supabase Management API or external cron service
--   Set up an external cron job (e.g., GitHub Actions, cron-job.org) to call:
--   POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults
--   Headers: { "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY" }

-- Enable pg_cron extension if not already enabled (may require superuser privileges)
-- Note: This may not be available on all Supabase plans
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on schema to postgres role (required for pg_cron)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Enable http extension for making HTTP requests (if available)
CREATE EXTENSION IF NOT EXISTS http;

-- Drop existing job if it exists (in case you need to recreate it)
SELECT cron.unschedule('categorize-vaults-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'categorize-vaults-daily'
);

-- Schedule daily vault categorization job using pg_cron + http extension
-- Runs every day at 2:00 AM UTC (adjust timezone as needed)
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- Replace YOUR_SERVICE_ROLE_KEY with your service role key (or use a secret)
--
-- To find your project ref: Check your Supabase project URL
-- Example: https://abcdefghijklmnop.supabase.co -> project ref is "abcdefghijklmnop"
SELECT cron.schedule(
  'categorize-vaults-daily',
  '0 2 * * *', -- Cron expression: Every day at 2:00 AM UTC
  $$
  SELECT
    http_post(
      'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
      '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}',
      '{}'::jsonb
    );
  $$
);

-- Alternative: If you have the net extension available (Supabase Enterprise)
-- you can use this approach instead:

-- CREATE EXTENSION IF NOT EXISTS net;
-- 
-- SELECT cron.schedule(
--   'categorize-vaults-daily',
--   '0 2 * * *', -- Every day at 2:00 AM UTC
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--       ),
--       body := '{}'::jsonb
--     ) AS request_id;
--   $$
-- );

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job run history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'categorize-vaults-daily');

-- To update the schedule (e.g., change to run on Wednesdays at 3 AM):
-- SELECT cron.schedule(
--   'categorize-vaults-daily',
--   '0 3 * * *', -- Every day at 3:00 AM UTC
--   $$ ... (same query as above) ... $$
-- );

-- To unschedule the job:
-- SELECT cron.unschedule('categorize-vaults-daily');

-- Note: For production, you may also want to use Supabase's built-in cron functionality
-- which can be configured in the Supabase Dashboard under Database > Cron Jobs
-- or via the Supabase Management API

