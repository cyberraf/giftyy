-- Migration: Fix orphaned occasions by backfilling recipient_profile_id from connections
-- This resolves cases where connection_ids were stored instead of profile_ids

-- 1. Fix occasions where recipient_profile_id was incorrectly set to a connection_id
-- We know it's a connection_id if it exists in the connections table
UPDATE public.occasions o
SET recipient_profile_id = c.recipient_profile_id
FROM public.connections c
WHERE o.recipient_profile_id = c.id;

-- 2. Fix occasions where recipient_profile_id is null but recipient_id (legacy) points to a connection
UPDATE public.occasions o
SET recipient_profile_id = c.recipient_profile_id
FROM public.connections c
WHERE o.recipient_profile_id IS NULL 
  AND o.recipient_id = c.id;

-- 3. Verify: List any remaining occasions with NULL recipient_profile_id that ARE NOT self-occasions
-- (Self-occasions have recipient_profile_id matching the user's own profile, handled in useHome)
-- SELECT id, title, user_id FROM public.occasions WHERE recipient_profile_id IS NULL;
