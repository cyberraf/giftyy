-- Manually trigger the categorize-vaults edge function
-- This version tries multiple methods depending on what's available

-- Use pg_net extension (which you have installed - version 0.19.5)
-- This is the correct way to make HTTP requests in Supabase

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Use pg_net to call the edge function
SELECT
  net.http_post(
    url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/categorize-vaults',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua71UUt5gxABf6921c87u0L00AJyGbJ6n0'
    ),
    body := '{}'::jsonb
  ) AS request_id;

-- Note: This will return a request_id. The actual execution happens asynchronously.
-- Check the Edge Function logs in Supabase Dashboard > Edge Functions > categorize-vaults > Logs
-- to see the execution results. After a few seconds, check if vaults were created:
-- SELECT COUNT(*) FROM vaults;

