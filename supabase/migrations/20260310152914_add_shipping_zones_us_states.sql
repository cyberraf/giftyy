-- Add us_states column to allow vendors to restrict shipping to specific US states
ALTER TABLE public.vendor_shipping_zones
ADD COLUMN us_states text[] DEFAULT '{}'::text[];

-- Add a comment explaining the column
COMMENT ON COLUMN public.vendor_shipping_zones.us_states IS 'List of specific US states this zone covers. If empty and country includes US, it means all states.';
