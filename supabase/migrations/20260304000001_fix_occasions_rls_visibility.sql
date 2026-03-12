-- Migration: Fix Occasions RLS Visibility
-- The previous RLS policy only allowed users to see occasions they created (user_id = auth.uid()).
-- This prevented users from seeing occasions belonging to their connected recipients (created by the recipient themselves).
-- We add a policy to allow users to SELECT occasions if they have an active connection to the recipient profile.

-- 1. Drop the restrictive policy for SELECT if needed, or just add a new permissive one.
-- RLS policies are OR'ed together. So adding a new SELECT policy will expand access.

CREATE POLICY "Users can view connected recipient occasions" 
ON public.occasions
FOR SELECT 
TO authenticated
USING (
    -- The occasion belongs to a profile the user is connected to
    recipient_profile_id IN (
        SELECT recipient_profile_id 
        FROM public.connections 
        WHERE sender_id = auth.uid() 
          AND status IN ('pending', 'approved', 'accepted')
    )
    OR
    -- The occasion is natively linked to a connection owned by the user
    recipient_id IN (
        SELECT id 
        FROM public.connections 
        WHERE sender_id = auth.uid()
    )
);
