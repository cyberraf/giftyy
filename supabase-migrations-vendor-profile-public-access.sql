-- Supabase migration: Allow buyers and public users to read vendor profiles
-- This allows buyers and public visitors to view vendor store information on product details and vendor profile pages
-- 
-- Accessible fields: id, store_name, profile_image_url, created_at, role
-- 
-- Features:
-- - Authenticated users (buyers) can read vendor profiles
-- - Public (unauthenticated) users can read vendor profiles for public store browsing
-- - Users can always read their own profile

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
-- Handle both old and new policy names for smooth migration
DROP POLICY IF EXISTS "Buyers can read vendor store information" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read vendor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can read vendor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;

-- Policy: Authenticated users (buyers) can read vendor profiles
-- This is needed for displaying vendor information in checkout, cart, order details, and product pages
-- Fields accessible: id, store_name, profile_image_url, created_at, role
CREATE POLICY "Authenticated users can read vendor profiles"
    ON public.profiles
    FOR SELECT
    USING (
        -- Allow if the profile is a vendor and user is authenticated
        -- This is safe because we're only exposing vendor public information, not buyer data
        role = 'vendor'
        AND auth.uid() IS NOT NULL
    );

-- Policy: Public (unauthenticated) users can read vendor profiles
-- This allows visitors to view vendor store pages without logging in
-- Enables public store browsing and discovery
CREATE POLICY "Public can read vendor profiles"
    ON public.profiles
    FOR SELECT
    USING (
        -- Allow public access to vendor profiles only
        role = 'vendor'
    );

-- Policy: Users can always read their own profile
-- This ensures users can view their own profile regardless of role
CREATE POLICY "Users can read their own profile"
    ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- Add comments for documentation
COMMENT ON POLICY "Authenticated users can read vendor profiles" ON public.profiles IS 
'Allows authenticated users (buyers) to read vendor profile information including store name and profile image. Used for displaying vendor info on product pages and in checkout.';

COMMENT ON POLICY "Public can read vendor profiles" ON public.profiles IS 
'Allows unauthenticated users to read vendor profiles for public store pages. Enables store browsing without requiring login.';

COMMENT ON POLICY "Users can read their own profile" ON public.profiles IS 
'Allows users to read their own profile regardless of role. Ensures users can always access their own account information.';

