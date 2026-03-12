-- Migration: Add recurrence_pattern to occasions table
-- Allows differentiating between one_time, yearly, and holiday events.

ALTER TABLE public.occasions ADD COLUMN IF NOT EXISTS recurrence_pattern text DEFAULT 'one_time';

-- Update existing data based on the recurring boolean
UPDATE public.occasions 
SET recurrence_pattern = CASE 
    WHEN recurring = true THEN 'yearly' 
    ELSE 'one_time' 
END
WHERE recurrence_pattern = 'one_time';

COMMENT ON COLUMN public.occasions.recurrence_pattern IS 'Pattern of the occasion: one_time, yearly, or holiday';
