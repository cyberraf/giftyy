-- Enable Row Level Security on vendor_media table
ALTER TABLE public.vendor_media ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users (logged in users) to read vendor media
-- This allows buyers and vendors to view vendor media for any vendor
CREATE POLICY "Authenticated users can read vendor media"
ON public.vendor_media
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow public (unauthenticated) users to read vendor media
-- This allows anyone browsing the app to view vendor media
CREATE POLICY "Public can read vendor media"
ON public.vendor_media
FOR SELECT
TO anon
USING (true);

-- Policy: Vendors can insert their own vendor media
CREATE POLICY "Vendors can insert their own vendor media"
ON public.vendor_media
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'vendor'
    AND profiles.id = vendor_media.vendor_id
  )
);

-- Policy: Vendors can update their own vendor media
CREATE POLICY "Vendors can update their own vendor media"
ON public.vendor_media
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'vendor'
    AND profiles.id = vendor_media.vendor_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'vendor'
    AND profiles.id = vendor_media.vendor_id
  )
);

-- Policy: Vendors can delete their own vendor media
CREATE POLICY "Vendors can delete their own vendor media"
ON public.vendor_media
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'vendor'
    AND profiles.id = vendor_media.vendor_id
  )
);

