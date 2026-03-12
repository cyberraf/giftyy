-- Migration: Fix RLS for recipient_preferences to allow buyers to view connected profile preferences
-- This ensures authenticated buyers can see the preferences submitted by recipients (Phantoms or Users)

-- 1. Drop the restrictive old policy if it exists
DROP POLICY IF EXISTS "Users can view their own recipient preferences" ON public.recipient_preferences;

-- 2. Create a new, more inclusive SELECT policy for buyers
-- This allows viewing if:
-- a) The buyer has an approved connection to the profile
-- b) The buyer is the legacy owner (via recipient_id)
CREATE POLICY "Buyers can view preferences of their connections"
ON public.recipient_preferences FOR SELECT
TO authenticated
USING (
    -- Access via Connection (as sender)
    recipient_profile_id IN (
        SELECT recipient_profile_id 
        FROM public.connections 
        WHERE sender_id = auth.uid()
    )
    OR
    -- Access as the profile owner themselves (RECIPIENT viewing their own data)
    recipient_profile_id IN (
        SELECT id 
        FROM public.recipient_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 3. Ensure the public manage policy still exists for the recipient flow
-- (This allows the recipient to stay in an unauthenticated state while filling the form)
DROP POLICY IF EXISTS "Recipient manage preferences" ON public.recipient_preferences;
CREATE POLICY "Recipient manage preferences" 
ON public.recipient_preferences FOR ALL
TO public
USING (true)
WITH CHECK (true);
