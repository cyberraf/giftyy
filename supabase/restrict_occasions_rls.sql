-- Migration: Restrict Occasion Management
-- 1. Buyers can read all relevant occasions (Private + Global for connected profiles)
-- 2. Buyers can ONLY manage (Insert/Update/Delete) their own private occasions
-- 3. Anonymous users (Web Form) can manage Global occasions (user_id IS NULL)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own private occasions" ON public.occasions;
DROP POLICY IF EXISTS "Public manage global profile occasions" ON public.occasions;
DROP POLICY IF EXISTS "Buyers can view relevant occasions" ON public.occasions;
DROP POLICY IF EXISTS "Buyers can manage their own milestones" ON public.occasions;
DROP POLICY IF EXISTS "Anon can manage global milestones" ON public.occasions;

-- 1. SELECT policy for Authenticated Users (Buyers)
CREATE POLICY "Buyers can view relevant occasions"
ON public.occasions FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR 
    (user_id IS NULL AND recipient_profile_id IN (
        SELECT recipient_profile_id FROM public.connections WHERE sender_id = auth.uid()
    ))
);

-- 2. ALL policy for Authenticated Users (Buyers) - Ownership + Connection required for write
CREATE POLICY "Buyers can manage their own milestones"
ON public.occasions FOR ALL
TO authenticated
USING (
    user_id = auth.uid() 
    AND (
        recipient_profile_id IS NULL 
        OR 
        EXISTS (
            SELECT 1 FROM public.connections 
            WHERE sender_id = auth.uid() 
              AND recipient_profile_id = public.occasions.recipient_profile_id
        )
    )
)
WITH CHECK (
    user_id = auth.uid() 
    AND (
        recipient_profile_id IS NULL 
        OR 
        EXISTS (
            SELECT 1 FROM public.connections 
            WHERE sender_id = auth.uid() 
              AND recipient_profile_id = public.occasions.recipient_profile_id
        )
    )
);

-- 3. ALL policy for Anonymous Users (Web Form) - Global occasions only
CREATE POLICY "Anon can manage global milestones"
ON public.occasions FOR ALL
TO anon
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);
