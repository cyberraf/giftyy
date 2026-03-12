-- Migration: Fix RLS policies to allow claiming phantom profiles
-- Path: supabase/migrations/20260306121000_fix_recipient_profiles_claim_rls.sql

-- Drop existing policies if they exist to make this idempotent
DROP POLICY IF EXISTS "Users can claim phantoms or update their own profile" ON public.recipient_profiles;
DROP POLICY IF EXISTS "Users can update their own claimed profile" ON public.recipient_profiles;

-- Create a more permissive policy that allows:
-- 1. Owners to update their already claimed profile
-- 2. Any authenticated user to claim a profile that has NO user_id yet (phantom)
CREATE POLICY "Users can claim phantoms or update their own profile"
ON public.recipient_profiles FOR UPDATE
TO authenticated
USING (
    user_id IS NULL OR user_id = auth.uid()
)
WITH CHECK (
    -- If claiming a phantom, set user_id to yourself and is_claimed to true
    (user_id = auth.uid() AND is_claimed = true) OR
    -- If already yours, keep it yours
    (user_id = auth.uid())
);

-- Ensure connections can also be updated correctly during claim
-- The existing policy for updates on connections is:
-- USING (auth.uid() IN (SELECT user_id FROM public.recipient_profiles WHERE id = recipient_profile_id))
-- This should now work because the recipient_profile will have their user_id set before the connection update.
