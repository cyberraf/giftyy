-- Supabase migration: Video Messages Storage Bucket
-- This creates the storage bucket for video messages and thumbnails with proper RLS policies
-- Run this SQL in your Supabase SQL editor

-- Create the storage bucket for video messages
-- Note: If the bucket already exists, this will not modify it (ON CONFLICT DO NOTHING)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-messages',
  'video-messages',
  true, -- Public bucket (files can be accessed via public URL)
  104857600, -- 100MB file size limit (adjust as needed for video files)
  ARRAY[
    'video/mp4', 
    'video/quicktime', 
    'video/x-msvideo', 
    'video/webm',
    'image/jpeg', -- For thumbnails
    'image/png',  -- For thumbnails
    'image/webp'  -- For thumbnails
  ] -- Allowed MIME types for videos and thumbnails
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (should already be enabled, but ensuring it)
-- Note: RLS is enabled by default on storage.objects in Supabase

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can view own video messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own video messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own video messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own video messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own video thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own video thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own video thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own video thumbnails" ON storage.objects;

-- ============================================
-- Policies for Video Files
-- ============================================
-- Path structure: {user_id}/{timestamp}-{randomId}.mp4
-- Example: abc123/1234567890-xyz789.mp4

-- Policy: Users can view their own video files
-- Files are organized by user_id in the path: {user_id}/{filename}
-- We extract the user_id from the path (first part before the first '/')
CREATE POLICY "Users can view own video messages"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'video-messages' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Policy: Users can upload their own video files
-- They can only upload to their own folder (user_id)
CREATE POLICY "Users can upload own video messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'video-messages' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Policy: Users can update their own video files
CREATE POLICY "Users can update own video messages"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'video-messages' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Policy: Users can delete their own video files
CREATE POLICY "Users can delete own video messages"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'video-messages' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- ============================================
-- Notes
-- ============================================
-- The bucket is set to public=true, which means files can be accessed
-- via public URLs without authentication. However, the policies above ensure
-- that users can only manage (upload/update/delete) files in their own folders.
--
-- File structure:
-- - Videos: {user_id}/{timestamp}-{randomId}.mp4
--
-- This allows each user to have their own folder and ensures proper access control.

