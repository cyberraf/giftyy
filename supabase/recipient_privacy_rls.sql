-- ============================================================
-- Migration: Recipient Privacy RLS Update (v2)
-- ============================================================
-- Privacy model:
--   • recipient_preferences is PRIVATE to the recipient only.
--     Buyers NEVER read this table directly — not even approved
--     connections. The data exists solely to power the AI
--     recommendation engine, which runs via the service_role
--     key (bypasses RLS entirely).
--   • recipient_profiles full row is readable only by the
--     profile owner and approved connected buyers.
--     The unauthenticated "searchable by anyone" policy is
--     removed; invitation search now happens server-side via
--     an Edge Function using the service_role key.
-- ============================================================

-- -----------------------------------------------------------
-- STEP 1: recipient_profiles – remove public access
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Recipient profiles are searchable by phone or email" ON public.recipient_profiles;

-- Full profile visible to:
--  a) The claimed user (the recipient themselves)
--  b) A buyer with an approved connection (name, avatar, etc.)
--     so they can display the recipient card in the UI.
--     NOTE: sensitive fields (address, email, phone) should be
--     queried selectively in the app — do NOT SELECT * for buyers.
CREATE POLICY "Connected buyers and owners can view profile"
ON public.recipient_profiles FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    id IN (
        SELECT recipient_profile_id
        FROM public.connections
        WHERE sender_id = auth.uid()
          AND status = 'approved'
    )
);

-- -----------------------------------------------------------
-- STEP 2: recipient_preferences – recipient ONLY
-- -----------------------------------------------------------
-- Drop the open public policy that allowed unauthenticated write
DROP POLICY IF EXISTS "Recipient manage preferences"             ON public.recipient_preferences;
-- Drop the buyer read policy (buyers must NEVER read preferences)
DROP POLICY IF EXISTS "Buyers can view preferences of their connections"     ON public.recipient_preferences;
DROP POLICY IF EXISTS "Approved buyers can view preferences of connections"  ON public.recipient_preferences;

-- Only the recipient (profile owner) can manage their own preferences.
-- The AI engine uses service_role and bypasses RLS — no policy needed for it.
CREATE POLICY "Recipient owns their preferences"
ON public.recipient_preferences FOR ALL
TO authenticated
USING (
    recipient_profile_id IN (
        SELECT id FROM public.recipient_profiles
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    recipient_profile_id IN (
        SELECT id FROM public.recipient_profiles
        WHERE user_id = auth.uid()
    )
);

-- Allow unauthenticated recipients to INSERT/UPDATE their preferences
-- (they fill the form before creating an account).
-- Restrict to INSERT + UPDATE only (not SELECT/DELETE).
CREATE POLICY "Anonymous recipients can submit preferences"
ON public.recipient_preferences FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anonymous recipients can update preferences"
ON public.recipient_preferences FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------
-- STEP 3: Drop the gifting view (no longer needed)
-- -----------------------------------------------------------
DROP VIEW IF EXISTS public.recipient_preferences_gifting;

-- -----------------------------------------------------------
-- Summary
-- -----------------------------------------------------------
-- After this migration:
--
--  recipient_profiles
--    SELECT  → profile owner + approved connected buyers only
--    UPDATE  → profile owner only (existing policy)
--
--  recipient_preferences
--    ALL     → profile owner (authenticated) only
--    INSERT  → anon (recipient form flow)
--    UPDATE  → anon (recipient form flow)
--    SELECT  → AI engine reads via service_role (bypasses RLS)
--
-- Frontend note:
--   RecipientsContext / recipient/[id].tsx must NOT query
--   recipient_preferences for the buyer detail view.
--   Buyers see only what the AI recommendations surface.
-- -----------------------------------------------------------
