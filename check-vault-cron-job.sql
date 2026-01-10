-- Check if the vault categorization cron job is set up and running
-- Run this in your Supabase SQL Editor to diagnose the issue

-- 1. Check if pg_cron extension is enabled
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname = 'pg_cron';

-- 2. Check if http extension is enabled (needed for calling edge functions)
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname = 'http';

-- 3. List all scheduled cron jobs
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
ORDER BY jobid;

-- 4. Check specifically for the categorize-vaults-daily job
SELECT 
    jobid,
    schedule,
    command,
    active,
    jobname
FROM cron.job
WHERE jobname = 'categorize-vaults-daily';

-- 5. Check recent cron job run history (last 10 runs)
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'categorize-vaults-daily')
ORDER BY start_time DESC
LIMIT 10;

-- 6. Check if the edge function exists and is accessible
-- (This requires manual testing via HTTP call)

-- To manually trigger the edge function for testing:
-- Use the Supabase Dashboard > Edge Functions > categorize-vaults > Invoke
-- OR use curl:
-- curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults' \
--   -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
--   -H 'Content-Type: application/json'

-- 7. Check if there are any video messages that need categorization
SELECT 
    COUNT(*) as total_videos,
    COUNT(DISTINCT user_id) as users_with_videos
FROM video_messages
WHERE user_id IS NOT NULL;

-- 8. Check existing vaults
SELECT 
    COUNT(*) as total_vaults,
    COUNT(DISTINCT user_id) as users_with_vaults,
    MAX(last_categorized_at) as last_categorization_time
FROM vaults;

-- 9. Check vault_videos associations
SELECT 
    COUNT(*) as total_vault_video_associations,
    COUNT(DISTINCT vault_id) as vaults_with_videos,
    COUNT(DISTINCT video_message_id) as videos_in_vaults
FROM vault_videos;

