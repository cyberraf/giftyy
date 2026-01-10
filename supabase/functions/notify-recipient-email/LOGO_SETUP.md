# Email Logo Setup

The recipient notification email uses the Giftyy logo. To ensure the logo displays correctly in emails, you need to host it publicly and configure the URL.

## Step 1: Create Brand Assets Storage Bucket

Run the migration SQL file to create a public storage bucket for brand assets:

```sql
-- Run this in Supabase SQL Editor:
-- File: supabase-migrations-brand-assets-storage.sql
```

Or manually create the bucket in Supabase Dashboard:
1. Go to **Storage** → **Buckets**
2. Create new bucket named `brand-assets`
3. Set it as **Public**
4. Set file size limit to 5MB
5. Allowed MIME types: `image/jpeg`, `image/png`, `image/svg+xml`, `image/webp`

## Step 2: Upload Your Logo

1. Go to **Storage** → **Buckets** → **brand-assets**
2. Click **Upload file**
3. Upload `logo.png` from `assets/images/logo.png`
4. After upload, click on the file to view it
5. Copy the **Public URL** (format: `https://your-project.supabase.co/storage/v1/object/public/brand-assets/logo.png`)

## Step 3: Configure Logo URL

### Option A: Environment Variable (Recommended)

1. Go to **Supabase Dashboard** → **Edge Functions** → **notify-recipient-email**
2. Go to **Settings** → **Environment Variables** (or **Secrets**)
3. Add a new secret:
   - **Key**: `GIFTYY_LOGO_URL`
   - **Value**: The public URL you copied (e.g., `https://your-project.supabase.co/storage/v1/object/public/brand-assets/logo.png`)

The Edge Function will automatically use this URL if the environment variable is set.

### Option B: Update Code Directly

If you prefer, you can update the default URL in `supabase/functions/notify-recipient-email/index.ts`:

```typescript
const LOGO_URL = Deno.env.get('GIFTYY_LOGO_URL') || 'https://your-project.supabase.co/storage/v1/object/public/brand-assets/logo.png';
```

## Step 4: Test the Email

Send a test email to verify the logo displays correctly. Most email clients will display images from public URLs.

## Troubleshooting

- **Logo doesn't appear**: Make sure the storage bucket is set to **public** and the file is accessible via the URL
- **Broken image**: Verify the URL works by opening it in a browser
- **File too large**: Ensure the logo is optimized (recommended: under 100KB for emails)

## Alternative: Host on Your Domain

If you prefer to host the logo on your own domain (e.g., `giftyy.store`), you can:

1. Upload `logo.png` to your web server/CDN
2. Set the `GIFTYY_LOGO_URL` environment variable to that URL
3. Ensure the URL is publicly accessible without authentication

