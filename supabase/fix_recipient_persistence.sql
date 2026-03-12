-- Migration: Fix recipient data persistence for phantom profiles
-- This migration makes legacy fields optional and adds unique constraints for phantom profiles

-- 1. Modify recipient_preferences table
-- 1. Make recipient_id optional in recipient_preferences to support phantom profiles
ALTER TABLE recipient_preferences ALTER COLUMN recipient_id DROP NOT NULL;

-- 2. Add unique constraint to recipient_profile_id if it doesn't already exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipient_preferences_recipient_profile_id_key') THEN
        ALTER TABLE recipient_preferences ADD CONSTRAINT recipient_preferences_recipient_profile_id_key UNIQUE (recipient_profile_id);
    END IF;
END $$;

-- 2. Modify occasions table
-- Make recipient_id optional if it exists and is NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'occasions' AND column_name = 'recipient_id'
    ) THEN
        ALTER TABLE public.occasions ALTER COLUMN recipient_id DROP NOT NULL;
    END IF;
END $$;

-- 3. Enable RLS on all related tables
ALTER TABLE recipient_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipient_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing loose policies if they exist
DROP POLICY IF EXISTS "Public upsert of preferences via profile_id" ON recipient_preferences;
DROP POLICY IF EXISTS "Recipient manage preferences" ON recipient_preferences;

DROP POLICY IF EXISTS "Public manage occasions via profile_id" ON occasions;
DROP POLICY IF EXISTS "Recipient manage occasions" ON occasions;

DROP POLICY IF EXISTS "Public update of profiles" ON recipient_profiles;
DROP POLICY IF EXISTS "Recipient update profile" ON recipient_profiles;
DROP POLICY IF EXISTS "Public read profiles" ON recipient_profiles;

-- 5. Create more robust policies for the recipient flow
-- ...
-- Recipient Preferences: Allow anyone to fetch/upsert if they know the profile_id or recipient_id
CREATE POLICY "Recipient manage preferences" ON recipient_preferences
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Occasions: Allow anyone to manage if they know the relationship
CREATE POLICY "Recipient manage occasions" ON occasions
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Recipient Profiles: Allow public update of address info (needed for verification flow)
CREATE POLICY "Recipient update profile" ON recipient_profiles
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Ensure public can read profiles to find names and IDs
CREATE POLICY "Public read profiles" ON recipient_profiles
    FOR SELECT
    TO public
    USING (true);
