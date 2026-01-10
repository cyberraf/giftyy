# Trigger Vault Categorization - Simple Guide

The `http_post` function might not be available in your Supabase instance. Here are the easiest alternatives:

## ✅ EASIEST METHOD: Use Supabase Dashboard

**This is the recommended way - no SQL needed!**

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/qaftabktuogxisioeeua
   - Click on "Edge Functions" in the left sidebar

2. **Find the categorize-vaults function**
   - Click on `categorize-vaults` in the list

3. **Invoke the function**
   - Click the "Invoke" button (usually at the top right)
   - Or go to the function details page and click "Invoke"
   - This will trigger the function immediately

4. **Check the logs**
   - Click on the "Logs" tab to see the execution results
   - Look for any errors or success messages

## Alternative: Use curl/HTTP Request

If you prefer command line, you can use curl:

```bash
curl -X POST 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/categorize-vaults' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua71UUt5gxABf6921c87u0L00AJyGbJ6n0' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## If You Must Use SQL

The `http` extension might not be available in your Supabase plan. Try these steps:

1. **First, check what extensions are available:**
   - Run `check-extensions.sql` to see what's available

2. **Try the fixed SQL:**
   - Run `trigger-vault-categorization-fixed.sql`
   - This tries to enable the extension and use correct syntax

3. **If that doesn't work, the `http` extension might not be available:**
   - Use the Dashboard method instead (recommended)
   - Or use curl/HTTP request

## Why SQL might not work

Some Supabase plans don't include the `http` or `net` extensions for security reasons. The Dashboard method always works and is the easiest way to trigger edge functions manually.

