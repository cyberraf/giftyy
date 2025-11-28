-- Supabase migration: Shared Memories Storage Bucket
-- Run this SQL in your Supabase SQL editor after creating the shared_memories table
-- This creates the storage bucket for shared memories (videos and photos)

-- Create the storage bucket for shared memories
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shared-memories',
  'shared-memories',
  true, -- Public bucket (files can be accessed via public URL)
  104857600, -- 100MB file size limit (adjust as needed)
  ARRAY['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'] -- Allowed MIME types
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects for the shared-memories bucket
-- Note: This is enabled by default, but we'll set it explicitly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own shared memories files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own shared memories files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own shared memories files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own shared memories files" ON storage.objects;

-- Policy: Users can view their own shared memory files
-- Files are organized by user_id in the path: {user_id}/{timestamp}-{randomId}.{ext}
-- We extract the user_id from the path (first part before the first '/')
CREATE POLICY "Users can view own shared memories files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'shared-memories' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Policy: Users can upload their own shared memory files
-- They can only upload to their own folder (user_id)
CREATE POLICY "Users can upload own shared memories files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shared-memories' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Policy: Users can update their own shared memory files
CREATE POLICY "Users can update own shared memories files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shared-memories' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Policy: Users can delete their own shared memory files
CREATE POLICY "Users can delete own shared memories files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shared-memories' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);


-- Note: The bucket is set to public=true, which means files can be accessed
-- via public URLs without authentication. However, the policies above ensure
-- that users can only manage (upload/update/delete) files in their own folders.
--
-- If you want the bucket to be private (requires signed URLs), set public=false
-- and use signed URLs in your application (similar to video-messages bucket).

