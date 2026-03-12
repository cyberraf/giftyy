-- Consolidation and Fix for Notifications Schema
-- This script ensures the 'notifications' table is the single source of truth
-- and resolves the missing 'body' column issue reported by PostgREST.

-- 1. Ensure the 'notifications' table exists with the correct schema
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,           -- e.g. 'gift_incoming', 'order_update', 'reaction', 'gift_opened'
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,           -- Ensure 'body' is present
    data        JSONB DEFAULT '{}',      -- arbitrary payload (orderId, etc.)
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Handle schema inconsistencies
DO $$ 
BEGIN 
    -- Drop restrictive type check constraint if it exists to allow new types like 'gift_opened'
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

    -- Handle potential 'message' column rename to 'body'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='notifications' AND column_name='message'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='notifications' AND column_name='body'
    ) THEN
        ALTER TABLE public.notifications RENAME COLUMN message TO body;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='notifications' AND column_name='body'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN body TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- 3. Migration: if user_notifications has data, move it to notifications (optional but good for consistency)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN
        INSERT INTO public.notifications (user_id, type, title, body, data, is_read, created_at)
        SELECT 
            user_id, 
            COALESCE(metadata->>'type', 'general'), -- Extract type or default to 'general'
            title, 
            body, 
            COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('action_label', action_label, 'action_href', action_href),
            (read_at IS NOT NULL),
            created_at
        FROM public.user_notifications
        ON CONFLICT DO NOTHING;
        
        -- After migration, we can eventually drop user_notifications, 
        -- but let's keep it for now to avoid breaking existing queries until all functions are updated.
    END IF;
END $$;

-- 4. Ensure RLS is correct
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role inserts notifications" ON public.notifications;
CREATE POLICY "Service role inserts notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 5. Helper function for consistent notification creation (for SQL triggers/functions)
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
