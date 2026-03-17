-- Migration: Setup Daily Occasion Reminders via pg_cron
-- This schedules the process-occasion-reminders edge function to run daily.

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the daily reminder check
-- Runs every day at 08:00 AM UTC
-- Note: Replace the URL and Service Role Key if necessary during deployment.
-- In a real Supabase environment, you would use vault.get_secret() for the key.
SELECT cron.schedule(
  'process-occasion-reminders-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/process-occasion-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0"}'::jsonb
    )
  $$
);

-- 3. Ensure user_notifications table has correct structure for metadata
-- (Adding an index on metadata for faster filtering of reminder types)
CREATE INDEX IF NOT EXISTS idx_user_notifications_metadata_type 
ON public.user_notifications ((metadata->>'type'));
