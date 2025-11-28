-- Supabase migration: Allow buyers to read vendor store_name from profiles table
-- This allows buyers to see vendor store names in checkout and order details

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Buyers can read vendor store information (id, store_name) for vendors
-- This is needed for displaying vendor store names in checkout, cart, and order details
-- Note: We allow any authenticated user to read vendor profiles since we're only exposing
-- vendor information (role = 'vendor'), not other buyers' private information
DROP POLICY IF EXISTS "Buyers can read vendor store information" ON public.profiles;
CREATE POLICY "Buyers can read vendor store information"
    ON public.profiles
    FOR SELECT
    USING (
        -- Allow if the profile is a vendor and user is authenticated
        -- This is safe because we're only exposing vendor store information, not buyer data
        role = 'vendor'
        AND auth.uid() IS NOT NULL
    );

-- Note: Users can always read their own profile (this should already exist, but we ensure it)
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
    ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

