-- Add onboarding_completed_at to profiles table
-- Used to gate the mandatory post-login onboarding flow.
-- NULL means onboarding not yet completed; a timestamp means done.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz DEFAULT NULL;
