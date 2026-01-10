-- Migration: Rename collection_products table to bundle_products
-- This migration renames the collection_products table to bundle_products and updates the collection_id column to bundle_id

-- Step 1: Rename the table
ALTER TABLE IF EXISTS public.collection_products RENAME TO bundle_products;

-- Step 2: Rename the collection_id column to bundle_id
ALTER TABLE IF EXISTS public.bundle_products RENAME COLUMN collection_id TO bundle_id;

-- Step 3: Rename any indexes (if they exist)
DO $$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'bundle_products' 
        AND schemaname = 'public'
        AND (indexname LIKE '%collection%' OR indexname LIKE '%collection_products%')
    LOOP
        EXECUTE format('ALTER INDEX IF EXISTS %I RENAME TO %I', 
            idx_record.indexname, 
            REPLACE(REPLACE(idx_record.indexname, 'collection_products', 'bundle_products'), 'collection', 'bundle'));
    END LOOP;
END $$;

-- Step 4: Update foreign key constraints
-- The foreign key constraint name might need to be updated
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'bundle_products'
        AND (kcu.column_name = 'bundle_id' OR kcu.column_name = 'collection_id')
    LOOP
        -- Rename foreign key constraint if it contains 'collection'
        IF fk_record.constraint_name LIKE '%collection%' THEN
            EXECUTE format('ALTER TABLE public.bundle_products RENAME CONSTRAINT %I TO %I',
                fk_record.constraint_name,
                REPLACE(REPLACE(fk_record.constraint_name, 'collection_products', 'bundle_products'), 'collection', 'bundle'));
        END IF;
    END LOOP;
END $$;

-- Step 5: Update RLS policies (drop old ones and recreate with new table name)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on bundle_products (previously collection_products)
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'bundle_products' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bundle_products', policy_record.policyname);
    END LOOP;
END $$;

-- Step 6: Recreate RLS policies for bundle_products
-- Enable RLS on bundle_products table
ALTER TABLE public.bundle_products ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read bundle_products for active bundles
CREATE POLICY "Public can read bundle_products for active bundles"
    ON public.bundle_products
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.bundles 
            WHERE bundles.id = bundle_products.bundle_id 
            AND bundles.is_active = true
        )
    );

-- Policy: Authenticated users can read all bundle_products
CREATE POLICY "Authenticated users can read all bundle_products"
    ON public.bundle_products
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: Vendors can manage bundle_products for their bundles
-- Note: Uncomment and adjust if bundles have vendor_id column
-- CREATE POLICY "Vendors can manage bundle_products for their bundles"
--     ON public.bundle_products
--     FOR ALL
--     USING (
--         EXISTS (
--             SELECT 1 
--             FROM public.bundles 
--             WHERE bundles.id = bundle_products.bundle_id 
--             AND bundles.vendor_id = auth.uid()
--         )
--     );

-- Step 7: Update any sequences (if bundle_products table uses SERIAL/BIGSERIAL)
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        AND (sequence_name LIKE '%collection_products%' OR sequence_name LIKE '%collection%')
    LOOP
        EXECUTE format('ALTER SEQUENCE IF EXISTS %I RENAME TO %I',
            seq_record.sequence_name,
            REPLACE(REPLACE(seq_record.sequence_name, 'collection_products', 'bundle_products'), 'collection', 'bundle'));
    END LOOP;
END $$;

-- Step 8: Add comments for documentation
COMMENT ON TABLE public.bundle_products IS 'Junction table linking bundles (previously collections) to products';
COMMENT ON COLUMN public.bundle_products.bundle_id IS 'Foreign key reference to bundles table (previously collection_id)';
COMMENT ON COLUMN public.bundle_products.product_id IS 'Foreign key reference to products table';
COMMENT ON COLUMN public.bundle_products.display_order IS 'Display order of the product within the bundle';

-- Note: After running this migration, you may need to:
-- 1. Update application code that references 'collection_products' table to use 'bundle_products'
-- 2. Update application code that references 'collection_id' column to use 'bundle_id'
-- 3. Update any views, functions, or triggers that reference collection_products
-- 4. Update any stored procedures or RPC functions that use collection_products

