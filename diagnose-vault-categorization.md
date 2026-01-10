# Diagnose Vault Categorization Issue

You successfully triggered the function (request_id: 29902), but vaults weren't created. Let's check what happened:

## Step 1: Check if Edge Function is Deployed

1. Go to **Supabase Dashboard → Edge Functions**
2. Check if `categorize-vaults` appears in the list
3. If it's NOT there, you need to deploy it first (see DEPLOY-VAULT-FUNCTION.md)

## Step 2: Check the Request Status

Run `check-request-status.sql` to see:
- If the HTTP request was successful
- What status code was returned
- Any error messages

## Step 3: Check Edge Function Logs

1. Go to **Supabase Dashboard → Edge Functions → categorize-vaults**
2. Click on the **"Logs"** tab
3. Look for:
   - Execution logs from the recent run
   - Any error messages
   - Success messages

## Step 4: Verify You Have Videos

Run this query to check if you have videos that need categorization:
```sql
SELECT 
    COUNT(*) as total_videos,
    COUNT(DISTINCT user_id) as users_with_videos
FROM video_messages
WHERE user_id IS NOT NULL;
```

If this returns 0, there are no videos to categorize yet.

## Step 5: Check Environment Variables

Make sure the edge function has the required environment variables:
1. Go to **Edge Functions → categorize-vaults → Settings**
2. Check if `OPENAI_API_KEY` is set
3. The function needs this to call GPT for categorization

## Common Issues:

### Issue 1: Edge Function Not Deployed
**Solution:** Deploy it using the Dashboard or CLI (see DEPLOY-VAULT-FUNCTION.md)

### Issue 2: Missing OPENAI_API_KEY
**Solution:** Set it in Edge Functions → categorize-vaults → Settings

### Issue 3: No Videos in Database
**Solution:** You need video messages in the `video_messages` table before vaults can be created

### Issue 4: Function Execution Failed
**Solution:** Check the logs for specific error messages

## Quick Test:

Try invoking the function directly from the Dashboard:
1. Go to **Edge Functions → categorize-vaults**
2. Click **"Invoke"** button
3. Check the **"Logs"** tab immediately after
4. This will show you real-time execution results

