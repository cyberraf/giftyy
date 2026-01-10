# Manually Trigger Vault Categorization

You can trigger the vault categorization function immediately without waiting for the cron job. Here are several ways:

## Option 1: Via Supabase Dashboard (Easiest - Recommended)

1. **Deploy the function first** (if not already deployed):
   - Go to Edge Functions > Deploy a new function
   - Name: `categorize-vaults`
   - Copy code from `supabase/functions/categorize-vaults/index-dashboard-ready.ts`
   - Click Deploy

2. **Set environment variables**:
   - Go to Edge Functions > `categorize-vaults` > Settings
   - Add: `OPENAI_API_KEY` = your OpenAI API key

3. **Invoke the function**:
   - Go to Edge Functions > `categorize-vaults`
   - Click the "Invoke" button (or go to the function details page and click "Invoke")
   - This will trigger the function immediately
   - Check the "Logs" tab to see the execution results

## Option 2: Via SQL (Using http extension)

1. **Enable http extension** (if not already enabled):
   ```sql
   CREATE EXTENSION IF NOT EXISTS http;
   ```

2. **Run the trigger SQL**:
   - Open `trigger-vault-categorization.sql` in your SQL Editor
   - Replace `YOUR_PROJECT_REF` with your actual project reference
   - Replace `YOUR_SERVICE_ROLE_KEY` with your service role key
   - Execute the SQL

3. **Check the results**:
   - Go to Edge Functions > `categorize-vaults` > Logs to see execution logs
   - Run the queries from `check-vault-cron-job.sql` to see if vaults were created

## Option 3: Via curl/HTTP Request

Open your terminal and run:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Replace:
- `YOUR_PROJECT_REF` with your actual project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key

## Option 4: Create a Temporary Frequent Cron Job (For Testing)

If you want to test the cron job itself, you can create a temporary job that runs every minute:

```sql
-- Remove existing job if it exists
SELECT cron.unschedule('categorize-vaults-test')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'categorize-vaults-test'
);

-- Create a test job that runs every minute
SELECT cron.schedule(
  'categorize-vaults-test',
  '* * * * *', -- Every minute (for testing only!)
  $$
  SELECT
    http_post(
      'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-vaults',
      '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      '{}'::jsonb
    );
  $$
);
```

**⚠️ WARNING: Remember to delete this test job after testing!**

```sql
SELECT cron.unschedule('categorize-vaults-test');
```

## Check Results

After running the function, check if vaults were created:

```sql
-- Check vaults
SELECT COUNT(*) as total_vaults, COUNT(DISTINCT user_id) as users_with_vaults
FROM vaults;

-- Check vault_videos associations
SELECT COUNT(*) as total_associations
FROM vault_videos;

-- View recent vaults
SELECT id, user_id, name, category_type, last_categorized_at
FROM vaults
ORDER BY last_categorized_at DESC
LIMIT 10;
```

## Troubleshooting

- **Function not found**: Make sure the function is deployed first
- **Missing OPENAI_API_KEY**: Set it in Edge Functions > Settings
- **Permission errors**: Make sure you're using the service role key, not the anon key
- **No vaults created**: Check the function logs for errors, and make sure you have video messages in the database

