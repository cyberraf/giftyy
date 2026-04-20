-- Storage policies for announcement images in the 'products' bucket (announcements/ folder)
-- Uses standard RLS on storage.objects

-- Allow admins to upload announcement images
CREATE POLICY "Admins can upload announcement images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = 'announcements'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow public read access for announcement images
CREATE POLICY "Public can read announcement images"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = 'announcements'
  );

-- Allow admins to delete announcement images
CREATE POLICY "Admins can delete announcement images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = 'announcements'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
