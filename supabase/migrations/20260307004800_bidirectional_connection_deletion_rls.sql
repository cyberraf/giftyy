-- Migration: Update connections RLS for bidirectional deletion
-- This allows both the sender and the receiver to delete a connection

-- Drop existing management policy
DROP POLICY IF EXISTS "Users can manage their own connections" ON public.connections;

-- Create new bidirectional management policy
CREATE POLICY "Users can manage their own connections"
ON public.connections FOR ALL
USING (
    auth.uid() = sender_id OR 
    auth.uid() IN (
        SELECT user_id FROM public.recipient_profiles WHERE id = recipient_profile_id
    )
);

-- Note: Recipient can now DELETE. 
-- UPDATE is also covered, which is good for personalized nicknames on both sides.
