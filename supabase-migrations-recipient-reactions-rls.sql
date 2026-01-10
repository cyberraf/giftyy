-- Supabase migration: RLS policies for recipient_reactions
-- Goal:
-- 1) Recipients can read their own reactions (recipient_user_id = auth.uid())
-- 2) Senders can read reactions tied to orders they own (orders.user_id = auth.uid())
--
-- Notes:
-- - We intentionally do NOT allow client-side INSERT/UPDATE/DELETE here because
--   validating "is the user the intended recipient of this order?" requires an
--   authoritative linkage (often implemented via Edge Function/service role).

-- Enable Row Level Security on recipient_reactions (if table exists)
ALTER TABLE public.recipient_reactions ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid duplicates
DROP POLICY IF EXISTS "Recipients can read their reactions" ON public.recipient_reactions;
DROP POLICY IF EXISTS "Senders can read reactions to their orders" ON public.recipient_reactions;

-- Policy: Recipients can SELECT their own reactions
CREATE POLICY "Recipients can read their reactions"
  ON public.recipient_reactions
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND recipient_user_id = auth.uid()::uuid
  );

-- Policy: Senders can SELECT reactions tied to orders they own
CREATE POLICY "Senders can read reactions to their orders"
  ON public.recipient_reactions
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = recipient_reactions.order_id
        AND o.user_id = auth.uid()::uuid
    )
  );

