-- Supabase migration: Update profile_images storage bucket configuration
-- This migration ensures the profile_images bucket exists and is properly configured
--
-- NOTE: Storage policies cannot be created via SQL due to permission restrictions.
-- You must create the storage policies manually through the Supabase Dashboard.
-- See the instructions below for creating the policies.

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_images',
  'profile_images',
  true, -- Public bucket (files can be accessed via public URL)
  5242880, -- 5MB file size limit (sufficient for profile pictures)
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/gif'] -- Allowed MIME types
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/gif'];

-- ====================================================
-- MANUAL SETUP REQUIRED: Create Storage Policies
-- ====================================================
-- Storage policies require admin/service_role permissions and cannot be created via SQL.
-- Please create the policies manually through the Supabase Dashboard:
--
-- 1. Go to: Supabase Dashboard > Storage > profile_images bucket
-- 2. Click on the "Policies" tab (or "RLS Policies")
-- 3. Delete any existing policies for this bucket (if you want to replace them)
-- 4. Create the following policies:
--
-- ====================================================
-- Policy 1: Public can view profile images
-- ====================================================
-- Policy name: "Public can view profile images"
-- Allowed operation: SELECT (read only)
-- Target roles: Select both "anon" and "authenticated"
-- Policy definition (USING expression):
--   bucket_id = 'profile_images'
--
-- ====================================================
-- Policy 2: Users can view own profile images
-- ====================================================
-- Policy name: "Users can view own profile images"
-- Allowed operation: SELECT (read only)
-- Target roles: Select "authenticated"
-- Policy definition (USING expression):
--   bucket_id = 'profile_images' AND
--   (
--     (string_to_array(name, '/'))[1] = auth.uid()::text
--     OR
--     ((string_to_array(name, '/'))[1] = 'avatars' AND (string_to_array(name, '/'))[2] = auth.uid()::text)
--   )
--
-- ====================================================
-- Policy 3: Users can upload own profile images
-- ====================================================
-- Policy name: "Users can upload own profile images"
-- Allowed operation: INSERT
-- Target roles: Select "authenticated"
-- Policy definition (WITH CHECK expression):
--   bucket_id = 'profile_images' AND
--   (
--     (string_to_array(name, '/'))[1] = auth.uid()::text
--     OR
--     ((string_to_array(name, '/'))[1] = 'avatars' AND (string_to_array(name, '/'))[2] = auth.uid()::text)
--   )
--
-- ====================================================
-- Policy 4: Users can update own profile images
-- ====================================================
-- Policy name: "Users can update own profile images"
-- Allowed operation: UPDATE
-- Target roles: Select "authenticated"
-- Policy definition (USING expression):
--   bucket_id = 'profile_images' AND
--   (
--     (string_to_array(name, '/'))[1] = auth.uid()::text
--     OR
--     ((string_to_array(name, '/'))[1] = 'avatars' AND (string_to_array(name, '/'))[2] = auth.uid()::text)
--   )
-- Policy definition (WITH CHECK expression):
--   bucket_id = 'profile_images' AND
--   (
--     (string_to_array(name, '/'))[1] = auth.uid()::text
--     OR
--     ((string_to_array(name, '/'))[1] = 'avatars' AND (string_to_array(name, '/'))[2] = auth.uid()::text)
--   )
--
-- ====================================================
-- Policy 5: Users can delete own profile images
-- ====================================================
-- Policy name: "Users can delete own profile images"
-- Allowed operation: DELETE
-- Target roles: Select "authenticated"
-- Policy definition (USING expression):
--   bucket_id = 'profile_images' AND
--   (
--     (string_to_array(name, '/'))[1] = auth.uid()::text
--     OR
--     ((string_to_array(name, '/'))[1] = 'avatars' AND (string_to_array(name, '/'))[2] = auth.uid()::text)
--   )
--
-- ====================================================
-- Path Format Support
-- ====================================================
-- These policies support both path formats:
-- - Old format: {user_id}/{fileName}
--   Example: 2d72babb-b3ae-434f-b89d-4febf89659f3/profile-123456.jpg
-- - New format: avatars/{user_id}/{fileName}
--   Example: avatars/2d72babb-b3ae-434f-b89d-4febf89659f3/profile-123456.jpg
--
-- ====================================================
-- Verification
-- ====================================================
-- After creating the policies, verify that:
-- 1. Public URLs work (anyone can view profile images)
-- 2. Users can upload/update/delete their own images
-- 3. Users cannot modify other users' images

