# Fix 401 Unauthorized Error

The 401 error is happening at the Supabase Edge Function runtime level, before your function code even runs. This means Supabase is rejecting the authentication.

## Solution 1: Use Dashboard Invoke (Easiest - Recommended)

The Dashboard method handles authentication automatically:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/qaftabktuogxisioeeua
   - Click **Edge Functions** in the left sidebar

2. **Find and Invoke the Function**
   - Click on `categorize-vaults` in the list
   - Click the **"Invoke"** button (usually at the top right)
   - This will trigger the function with proper authentication

3. **Check Results**
   - Go to the **"Logs"** tab to see execution results
   - Check for success/error messages

## Solution 2: Check Function Authentication Settings

The function might have authentication requirements set in the Dashboard:

1. Go to **Edge Functions → categorize-vaults → Settings**
2. Check if there are any authentication/security settings
3. Make sure the function allows service role access

## Solution 3: Update Function Code to Handle Auth

The function might need to explicitly allow service role requests. Let's check if the function code needs to verify the auth header.

Actually, looking at your function code, it doesn't check authentication - it just uses environment variables. The 401 is coming from Supabase's runtime, not your code.

## Solution 4: Use curl with Proper Headers

Try invoking it via curl to see the actual error message:

```bash
curl -X POST 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/categorize-vaults' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua71UUt5gxABf6921c87u0L00AJyGbJ6n0' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua71UUt5gxABf6921c87u0L00AJyGbJ6n0' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

This will show you the actual error message in the response body.

## Most Likely Issue

The function might be deployed but not properly configured. The **Dashboard Invoke method (Solution 1) is the most reliable** because it handles all authentication automatically.

Try the Dashboard method first - it should work immediately!

