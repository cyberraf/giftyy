-- Migration: Update orders table card_type check constraint to include 'Giftyy Card'
-- This allows orders to be created with the new 'Giftyy Card' card type

-- Drop the existing check constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_card_type_check;

-- Recreate the check constraint with 'Giftyy Card' included
ALTER TABLE public.orders 
ADD CONSTRAINT orders_card_type_check 
CHECK (
    card_type IS NULL 
    OR card_type = '' 
    OR card_type = 'Standard' 
    OR card_type = 'Premium' 
    OR card_type = 'Luxury' 
    OR card_type = 'Giftyy Card'
);

-- Add comment for documentation
COMMENT ON CONSTRAINT orders_card_type_check ON public.orders IS 
'Ensures card_type is one of the allowed values: Standard, Premium, Luxury, Giftyy Card, or empty string/null.';

