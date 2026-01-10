-- Simple SQL script to seed initial QR card inventory
-- Run this in Supabase SQL Editor for quick testing

-- Generate 100 QR cards with unique public tokens
-- Format: GFT-XXXXXXXX (8 random characters)

INSERT INTO public.giftyy_cards (public_token, status)
SELECT 
    'GFT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || i::TEXT) FROM 1 FOR 8)),
    'inactive'::giftyy_card_status
FROM generate_series(1, 100) AS i
ON CONFLICT (public_token) DO NOTHING;

-- Verify insertion
SELECT 
    status,
    COUNT(*) as count
FROM public.giftyy_cards
GROUP BY status
ORDER BY status;

-- Display some sample cards
SELECT 
    public_token,
    status,
    created_at
FROM public.giftyy_cards
ORDER BY created_at DESC
LIMIT 10;

