-- Supabase migration: Brand Assets Storage Bucket
-- Run this SQL in your Supabase SQL editor to create the storage bucket for brand assets (logo, etc.)
-- This bucket stores brand images that need to be publicly accessible for emails and web

-- Create the storage bucket for brand assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true, -- Public bucket (files can be accessed via public URL)
  5242880, -- 5MB file size limit (sufficient for logo images)
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif'] -- Allowed MIME types for brand assets
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects for the brand-assets bucket
-- Since this is a public bucket, we want everyone to be able to view files
-- But only authenticated users (or service role) should be able to manage files

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage brand assets" ON storage.objects;

-- Policy: Everyone can view brand assets (public bucket)
CREATE POLICY "Public can view brand assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Policy: Only service role can upload/update/delete brand assets
-- (You can change this to allow authenticated users if needed)
CREATE POLICY "Service role can manage brand assets"
ON storage.objects FOR ALL
USING (bucket_id = 'brand-assets' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'brand-assets' AND auth.role() = 'service_role');

-- Note: Files in this bucket will be accessible via:
-- https://your-project.supabase.co/storage/v1/object/public/brand-assets/{filename}
-- 
-- To upload the logo:
-- 1. Go to Supabase Dashboard > Storage > brand-assets
-- 2. Upload logo.png
-- 3. Copy the public URL
-- 4. Set it as the GIFTYY_LOGO_URL environment variable in your Edge Function

