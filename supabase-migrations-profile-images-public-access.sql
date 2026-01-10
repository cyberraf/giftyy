-- Supabase migration: Ensure profile_images bucket is public
-- This migration sets the bucket to public, which should allow public URL access
-- 
-- NOTE: If you need to create storage policies, you'll need to do it manually through
-- the Supabase Dashboard due to permission restrictions on storage.objects

-- Ensure the bucket exists and is public
UPDATE storage.buckets
SET public = true
WHERE id = 'profile_images';

-- If bucket doesn't exist, create it (should already exist from previous migration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_images',
  'profile_images',
  true, -- Public bucket (files can be accessed via public URL)
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ====================================================
-- MANUAL SETUP REQUIRED: Create Storage Policy
-- ====================================================
-- Storage policies require admin/service_role permissions.
-- Please create the policy manually through the Supabase Dashboard:
--
-- 1. Go to: Supabase Dashboard > Storage > profile_images bucket
-- 2. Click on the "Policies" tab (or "RLS Policies")
-- 3. Click "New Policy" button
-- 4. Select "For full customization" (or "Create a policy from scratch")
-- 5. Configure the policy:
--    - Policy name: "Public can view profile images"
--    - Allowed operation: SELECT (read only)
--    - Target roles: Select both "anon" and "authenticated"
--    - Policy definition (USING expression):
--        bucket_id = 'profile_images'
-- 6. Click "Review" then "Save policy"
--
-- Alternatively, if the bucket is set to public=true (which we do above),
-- public URLs should work without an explicit policy, as long as there are
-- no restrictive policies blocking access.
--
-- VERIFICATION:
-- After setting the bucket to public and creating the policy (if needed),
-- try accessing a profile image URL directly in a browser to verify it works.

