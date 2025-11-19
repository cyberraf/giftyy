-- Supabase migration: Remove redundant 'value' column from product_variations table
-- The 'attributes' JSONB column is sufficient and is what the application uses

-- Check if the value column exists and drop it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variations' 
        AND column_name = 'value'
    ) THEN
        ALTER TABLE product_variations 
        DROP COLUMN value;
        
        RAISE NOTICE 'Dropped value column from product_variations';
    ELSE
        RAISE NOTICE 'value column does not exist - nothing to drop';
    END IF;
END $$;

-- Note: The attributes column (JSONB) stores all variation attributes
-- Example: {"Size": "Large", "Color": "Red"}
-- This is the only column needed for variation attributes

