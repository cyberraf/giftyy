-- Add reminder_days_before and timezone to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER[] DEFAULT '{1, 7, 30}',
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Update existing rows with a default timezone if possible (optional, but good for consistency)
-- For example, setting it to 'UTC' as a baseline if it's currently null
-- UPDATE public.user_settings SET timezone = 'UTC' WHERE timezone IS NULL;
