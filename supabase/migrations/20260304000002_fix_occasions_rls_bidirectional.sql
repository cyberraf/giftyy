-- Migration: Fix Occasions RLS Visibility (Bidirectional)
-- The previous migration only allowed the *sender* of a connection to view the recipient's occasions.
-- This migration updates the policy to allow *both* users in an approved/pending connection network to view each other's occasions.

DROP POLICY IF EXISTS "Users can view connected recipient occasions" ON public.occasions;

CREATE POLICY "Users can view connected recipient occasions bidirectional" 
ON public.occasions
FOR SELECT 
TO authenticated
USING (
    -- 1. I am the sender, I want to see the recipient's occasions
    recipient_profile_id IN (
        SELECT recipient_profile_id 
        FROM public.connections 
        WHERE sender_id = auth.uid() 
          AND status IN ('pending', 'approved', 'accepted')
    )
    OR
    recipient_id IN (
        SELECT id 
        FROM public.connections 
        WHERE sender_id = auth.uid()
    )
    OR
    -- 2. I am the recipient, I want to see the sender's occasions
    -- The occasion belongs to the sender's recipient_profile
    recipient_profile_id IN (
        SELECT sender_rp.id
        FROM public.connections c
        JOIN public.recipient_profiles sender_rp ON sender_rp.user_id = c.sender_id
        JOIN public.recipient_profiles my_rp ON my_rp.id = c.recipient_profile_id 
        WHERE my_rp.user_id = auth.uid()
          AND c.status IN ('pending', 'approved', 'accepted')
    )
    OR
    -- The occasion was tied to the legacy connection ID (recipient_id)
    recipient_id IN (
        SELECT c.id
        FROM public.connections c
        JOIN public.recipient_profiles my_rp ON my_rp.id = c.recipient_profile_id 
        WHERE my_rp.user_id = auth.uid()
          AND c.status IN ('pending', 'approved', 'accepted')
    )
);
