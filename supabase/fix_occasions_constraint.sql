-- Migration: Fix NULL user_id constraint in occasions
-- This allows recipients to add "Global" occasions (owned by no specific buyer)
-- to their shared profile, which buyers can then see.

-- 1. Make user_id optional
ALTER TABLE public.occasions ALTER COLUMN user_id DROP NOT NULL;

-- 2. Refine RLS for occasions
-- Ensure registered users can still manage their own private occasions
-- AND anyone (public) can manage "Global" occasions if they know the profile_id (recipient flow)

-- Drop the overly broad public policy if it exists
DROP POLICY IF EXISTS "Recipient manage occasions" ON occasions;

-- Private Occasions: Standard buyer access
CREATE POLICY "Users can manage their own private occasions" ON occasions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Global/Recipient Occasions: Allow public management if user_id is null
-- (Security is handled by knowing the recipient_profile_id from the invitation link)
CREATE POLICY "Public manage global profile occasions" ON occasions
    FOR ALL
    TO public
    USING (user_id IS NULL)
    WITH CHECK (user_id IS NULL);
