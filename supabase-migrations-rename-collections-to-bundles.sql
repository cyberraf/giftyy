-- Migration: Rename collections table to bundles
-- This migration renames the collections table to bundles and updates all related objects

-- Step 1: Rename the table
ALTER TABLE IF EXISTS public.collections RENAME TO bundles;

-- Step 2: Rename any indexes (if they exist)
DO $$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'bundles' 
        AND schemaname = 'public'
        AND indexname LIKE '%collection%'
    LOOP
        EXECUTE format('ALTER INDEX IF EXISTS %I RENAME TO %I', 
            idx_record.indexname, 
            REPLACE(idx_record.indexname, 'collection', 'bundle'));
    END LOOP;
END $$;

-- Step 3: Update RLS policies (drop old ones and recreate with new table name)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on bundles (previously collections)
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'bundles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bundles', policy_record.policyname);
    END LOOP;
END $$;

-- Step 4: Recreate RLS policies for bundles (if needed)
-- Note: Adjust these policies based on your actual RLS requirements

-- Enable RLS on bundles table
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read active bundles
CREATE POLICY "Public can read active bundles"
    ON public.bundles
    FOR SELECT
    USING (is_active = true);

-- Policy: Authenticated users can read all bundles
CREATE POLICY "Authenticated users can read all bundles"
    ON public.bundles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: Vendors can manage their own bundles
-- Note: Adjust this based on your vendor_id column structure
-- CREATE POLICY "Vendors can manage their own bundles"
--     ON public.bundles
--     FOR ALL
--     USING (vendor_id = auth.uid());

-- Step 5: Update any foreign key constraints that reference collections
-- Check for foreign keys pointing to bundles table (foreign keys are automatically updated when table is renamed)
-- This step is just for verification/logging
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS referenced_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ccu.table_name = 'bundles'
    LOOP
        -- Foreign keys are automatically updated when table is renamed
        -- This is just for logging/debugging
        RAISE NOTICE 'Foreign key % on table % references bundles', 
            fk_record.constraint_name, 
            fk_record.table_name;
    END LOOP;
END $$;

-- Step 6: Update any sequences (if collections table uses SERIAL/BIGSERIAL)
-- Note: Sequences are automatically renamed when table is renamed in PostgreSQL
-- But we can verify and update if needed
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        AND sequence_name LIKE '%collection%'
    LOOP
        EXECUTE format('ALTER SEQUENCE IF EXISTS %I RENAME TO %I',
            seq_record.sequence_name,
            REPLACE(seq_record.sequence_name, 'collection', 'bundle'));
    END LOOP;
END $$;

-- Step 7: Add comments for documentation
COMMENT ON TABLE public.bundles IS 'Bundles (previously collections) - Curated gift sets and collections';
COMMENT ON COLUMN public.bundles.id IS 'Unique identifier for the bundle';
COMMENT ON COLUMN public.bundles.title IS 'Display title of the bundle';
COMMENT ON COLUMN public.bundles.description IS 'Description of the bundle';
COMMENT ON COLUMN public.bundles.is_active IS 'Whether the bundle is currently active and visible';

-- Note: After running this migration, you may need to:
-- 1. Update application code that references 'collections' table to use 'bundles'
-- 2. Update any views, functions, or triggers that reference the collections table
-- 3. Update any stored procedures or RPC functions that use collections

