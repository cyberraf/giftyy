-- Migration: Fix RLS Recursion Error
-- This breaks the circular dependency between 'connections' and 'recipient_profiles' policies
-- using SECURITY DEFINER functions that bypass RLS for specific lookups.

-- 1. Helper Function: Get user_id from recipient_profile
CREATE OR REPLACE FUNCTION public.get_connection_recipient_user_id(p_rp_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id FROM recipient_profiles WHERE id = p_rp_id;
$$;

-- 2. Helper Function: Check if user has an approved connection to a profile
CREATE OR REPLACE FUNCTION public.check_is_approved_sender(p_rp_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM connections 
    WHERE recipient_profile_id = p_rp_id 
      AND sender_id = p_user_id 
      AND status = 'approved'
  );
$$;

-- 3. Update recipient_profiles policy
DROP POLICY IF EXISTS "Connected buyers and owners can view profile" ON public.recipient_profiles;

CREATE POLICY "Connected buyers and owners can view profile"
ON public.recipient_profiles FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    check_is_approved_sender(id, auth.uid())
);

-- 4. Update connections policies
DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can manage their own connections" ON public.connections;
DROP POLICY IF EXISTS "Recipients can respond to their own connections" ON public.connections;

-- SELECT policy usingSD helper
CREATE POLICY "Users can view their own connections"
ON public.connections FOR SELECT
USING (
    auth.uid() = sender_id 
    OR 
    auth.uid() = get_connection_recipient_user_id(recipient_profile_id)
);

-- ALL policy (for management/deletion) using SD helper
CREATE POLICY "Users can manage their own connections"
ON public.connections FOR ALL
USING (
    auth.uid() = sender_id 
    OR 
    auth.uid() = get_connection_recipient_user_id(recipient_profile_id)
);

-- UPDATE policy (for responding) using SD helper
CREATE POLICY "Recipients can respond to their own connections"
ON public.connections FOR UPDATE
USING (
    auth.uid() = get_connection_recipient_user_id(recipient_profile_id)
);

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_connection_recipient_user_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_approved_sender(UUID, UUID) TO authenticated;
