-- Verify and configure video-messages bucket for Android compatibility
-- Run this in Supabase SQL Editor

-- 1. Check current bucket configuration
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'video-messages';

-- 2. Ensure bucket is public (required for video playback)
UPDATE storage.buckets 
SET public = true 
WHERE name = 'video-messages';

-- 3. Verify RLS policies allow public read access
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%video-messages%';

-- 4. If no public read policy exists, create one
-- (This allows anyone to read videos, which is needed for playback)
CREATE POLICY IF NOT EXISTS "Public read access for video-messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-messages');

-- 5. Verify CORS configuration (check in Supabase Dashboard > Storage > Configuration)
-- Ensure these headers are allowed:
-- - Access-Control-Allow-Origin: *
-- - Access-Control-Allow-Methods: GET, HEAD, OPTIONS
-- - Access-Control-Allow-Headers: Range, Content-Type

-- Note: CORS configuration is typically done via the Supabase Dashboard,
-- not SQL. Go to: Dashboard > Storage > Configuration > CORS
