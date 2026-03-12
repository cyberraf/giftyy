-- Migration: Fix notifications table column mismatch
-- This adds 'message' as an alias or duplicate column to 'body' 
-- to support legacy triggers that may still be using 'message'.

DO $$ 
BEGIN 
    -- 1. Ensure 'body' column exists (it should, but just in case)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='notifications' AND column_name='body'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN body TEXT NOT NULL DEFAULT '';
    END IF;

    -- 2. Add 'message' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='notifications' AND column_name='message'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN message TEXT;
        
        -- Optional: Populate it from body for existing records
        UPDATE public.notifications SET message = body WHERE message IS NULL;
    END IF;

    -- 3. Create a trigger to keep body and message in sync if needed
    -- (Best practice is to fix the triggers, but this ensures it won't break again)
END $$;

-- Create or replace a function to sync legacy message to body
CREATE OR REPLACE FUNCTION sync_notification_message_to_body()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.message IS NOT NULL AND (NEW.body IS NULL OR NEW.body = '') THEN
        NEW.body := NEW.message;
    ELSIF NEW.body IS NOT NULL AND NEW.message IS NULL THEN
        NEW.message := NEW.body;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_notification_message ON public.notifications;
CREATE TRIGGER trg_sync_notification_message
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION sync_notification_message_to_body();
