-- Supabase migration: Allow buyers to read vendor shipping zones and rates
-- This enables buyers to calculate shipping costs during checkout based on vendor-configured shipping settings

-- Enable RLS on vendor_shipping_zones if not already enabled
ALTER TABLE public.vendor_shipping_zones ENABLE ROW LEVEL SECURITY;

-- Enable RLS on vendor_shipping_rates if not already enabled
ALTER TABLE public.vendor_shipping_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Buyers can read shipping zones" ON public.vendor_shipping_zones;
DROP POLICY IF EXISTS "Buyers can read shipping rates" ON public.vendor_shipping_rates;
DROP POLICY IF EXISTS "Public can read shipping zones" ON public.vendor_shipping_zones;
DROP POLICY IF EXISTS "Public can read shipping rates" ON public.vendor_shipping_rates;

-- Policy: Allow authenticated users (buyers) to read shipping zones
-- Buyers need to see shipping zones to calculate shipping costs based on recipient location
CREATE POLICY "Buyers can read shipping zones"
ON public.vendor_shipping_zones
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users (buyers) to read shipping rates
-- Buyers need to see shipping rates to calculate shipping costs based on order subtotal and conditions
CREATE POLICY "Buyers can read shipping rates"
ON public.vendor_shipping_rates
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow public/anonymous users to read shipping zones
-- This allows visitors to see shipping information before logging in
CREATE POLICY "Public can read shipping zones"
ON public.vendor_shipping_zones
FOR SELECT
TO anon
USING (true);

-- Policy: Allow public/anonymous users to read shipping rates
-- This allows visitors to see shipping costs before logging in
CREATE POLICY "Public can read shipping rates"
ON public.vendor_shipping_rates
FOR SELECT
TO anon
USING (true);

-- Add comments for documentation
COMMENT ON POLICY "Buyers can read shipping zones" ON public.vendor_shipping_zones IS 
'Allows authenticated users (buyers) to read vendor shipping zones to calculate shipping costs during checkout.';

COMMENT ON POLICY "Buyers can read shipping rates" ON public.vendor_shipping_rates IS 
'Allows authenticated users (buyers) to read vendor shipping rates to calculate shipping costs based on order subtotal and conditions.';

COMMENT ON POLICY "Public can read shipping zones" ON public.vendor_shipping_zones IS 
'Allows unauthenticated users to read vendor shipping zones for displaying shipping information before login.';

COMMENT ON POLICY "Public can read shipping rates" ON public.vendor_shipping_rates IS 
'Allows unauthenticated users to read vendor shipping rates for displaying shipping costs before login.';

