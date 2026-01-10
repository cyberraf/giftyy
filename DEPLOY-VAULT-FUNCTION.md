# Deploy the categorize-vaults Edge Function

The `categorize-vaults` edge function needs to be deployed to Supabase. Here are two ways to do it:

## Option 1: Deploy via Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Go to Edge Functions**
   - Click on "Edge Functions" in the left sidebar
   - Click "Deploy a new function"

3. **Create the function**
   - Function name: `categorize-vaults`
   - Copy the contents of `supabase/functions/categorize-vaults/index.ts` into the editor
   - Click "Deploy"

4. **Set Environment Variables**
   - Go to Edge Functions > `categorize-vaults` > Settings
   - Add these environment variables:
     - `OPENAI_API_KEY` - Your OpenAI API key
     - `OPENAI_MODEL` - (Optional) Default is `gpt-4o-mini`
     - `SUPABASE_URL` - Your Supabase project URL (usually auto-set)
     - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (usually auto-set)

## Option 2: Deploy via Supabase CLI (Recommended for future updates)

### Install Supabase CLI

**Windows (using Scoop):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Windows (using npm):**
```powershell
npm install -g supabase
```

**Or download directly:**
- Visit: https://github.com/supabase/cli/releases
- Download the Windows executable
- Add it to your PATH

### Login to Supabase
```powershell
supabase login
```

### Link your project
```powershell
supabase link --project-ref YOUR_PROJECT_REF
```
(Replace `YOUR_PROJECT_REF` with your actual project reference from your Supabase URL)

### Deploy the function
```powershell
supabase functions deploy categorize-vaults
```

### Set environment variables
```powershell
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

## After Deployment

1. **Test the function manually:**
   - Go to Edge Functions > `categorize-vaults` > Invoke
   - Click "Invoke" to test it
   - Check the logs for any errors

2. **Set up the cron job:**
   - Once the function is deployed and tested, run `setup-vault-cron-job.sql` in your Supabase SQL Editor
   - Make sure to replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` with actual values

## Troubleshooting

- **Function not found:** Make sure the function name matches exactly: `categorize-vaults`
- **CORS errors:** The function includes CORS headers, but make sure the `_shared/cors.ts` file is accessible
- **OpenAI API errors:** Check that your `OPENAI_API_KEY` is set correctly and has credits
- **Permission errors:** Make sure the service role key has proper permissions

