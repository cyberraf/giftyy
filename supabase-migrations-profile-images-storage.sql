-- Supabase migration: Profile Images Storage Bucket
-- Run this SQL in your Supabase SQL editor to create the storage bucket for user profile pictures
-- This bucket stores profile images uploaded by users

-- Create the storage bucket for profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_images',
  'profile_images',
  true, -- Public bucket (files can be accessed via public URL)
  5242880, -- 5MB file size limit (sufficient for profile pictures)
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/gif'] -- Allowed MIME types for profile pictures
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects for the profile_images bucket
-- Note: This is enabled by default, but we'll set it explicitly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;

-- Policy: Users can view their own profile images
-- Files are organized by user_id in the path: profile_images/{user_id}/{fileName}
-- We extract the user_id from the path (second part after 'profile_images/')
CREATE POLICY "Users can view own profile images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile_images' AND
  (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Policy: Users can upload their own profile images
-- They can only upload to their own folder (user_id)
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile_images' AND
  (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Policy: Users can update their own profile images
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile_images' AND
  (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Policy: Users can delete their own profile images
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile_images' AND
  (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Note: The bucket is set to public=true, which means files can be accessed
-- via public URLs without authentication. However, the policies above ensure
-- that users can only manage (upload/update/delete) files in their own folders.
--
-- Files are stored in the format: profile_images/{user_id}/{fileName}
-- This allows each user to have their own folder and ensures proper access control.

