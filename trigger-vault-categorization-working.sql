-- Manually trigger the categorize-vaults edge function
-- Fixed: Added apikey header which Supabase Edge Functions require

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Use pg_net to call the edge function
-- Note: Supabase Edge Functions require both Authorization and apikey headers
SELECT
  net.http_post(
    url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/categorize-vaults',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua71UUt5gxABf6921c87u0L00AJyGbJ6n0',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua71UUt5gxABf6921c87u0L00AJyGbJ6n0'
    ),
    body := '{}'::jsonb
  ) AS request_id;

-- After running, check:
-- 1. Edge Functions > categorize-vaults > Logs (for execution results)
-- 2. Run: SELECT COUNT(*) FROM vaults; (to see if vaults were created)

