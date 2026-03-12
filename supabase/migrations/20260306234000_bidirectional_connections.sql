-- Migration: Refine connections table for bidirectional relationships
-- Renames 'relationship' and 'nickname' to 'sender_relationship' and 'sender_nickname'
-- Adds 'receiver_relationship' and 'receiver_nickname'

DO $$ 
BEGIN 
    -- 1. Rename 'relationship' to 'sender_relationship' if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='connections' AND column_name='relationship'
    ) THEN
        ALTER TABLE public.connections RENAME COLUMN relationship TO sender_relationship;
    END IF;

    -- 2. Rename 'nickname' to 'sender_nickname' if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='connections' AND column_name='nickname'
    ) THEN
        ALTER TABLE public.connections RENAME COLUMN nickname TO sender_nickname;
    END IF;

    -- 3. Add 'receiver_relationship' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='connections' AND column_name='receiver_relationship'
    ) THEN
        ALTER TABLE public.connections ADD COLUMN receiver_relationship TEXT;
    END IF;

    -- 4. Add 'receiver_nickname' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='connections' AND column_name='receiver_nickname'
    ) THEN
        ALTER TABLE public.connections ADD COLUMN receiver_nickname TEXT;
    END IF;

END $$;
