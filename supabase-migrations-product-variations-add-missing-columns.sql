-- Supabase migration: Add missing columns to product_variations table
-- This ensures the table has all required columns for variations to work

-- Add attributes column (JSONB) - CRITICAL for variations to work
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variations' 
        AND column_name = 'attributes'
    ) THEN
        ALTER TABLE product_variations 
        ADD COLUMN attributes JSONB DEFAULT '{}' NOT NULL;
        
        -- Create GIN index for faster JSONB queries
        CREATE INDEX IF NOT EXISTS product_variations_attributes_idx 
        ON product_variations USING GIN(attributes);
        
        RAISE NOTICE 'Added attributes column to product_variations';
    ELSE
        RAISE NOTICE 'attributes column already exists';
    END IF;
END $$;

-- Add price column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variations' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE product_variations 
        ADD COLUMN price NUMERIC(10, 2);
        RAISE NOTICE 'Added price column to product_variations';
    ELSE
        RAISE NOTICE 'price column already exists';
    END IF;
END $$;

-- Add image_url column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variations' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE product_variations 
        ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to product_variations';
    ELSE
        RAISE NOTICE 'image_url column already exists';
    END IF;
END $$;

-- Add is_active column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variations' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE product_variations 
        ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE 'Added is_active column to product_variations';
    ELSE
        RAISE NOTICE 'is_active column already exists';
    END IF;
END $$;

-- Add display_order column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variations' 
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE product_variations 
        ADD COLUMN display_order INTEGER DEFAULT 0;
        
        -- Create index for display_order
        CREATE INDEX IF NOT EXISTS product_variations_display_order_idx 
        ON product_variations(display_order);
        
        RAISE NOTICE 'Added display_order column to product_variations';
    ELSE
        RAISE NOTICE 'display_order column already exists';
    END IF;
END $$;

-- Add updated_at column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE product_variations 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
        RAISE NOTICE 'Added updated_at column to product_variations';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_product_variations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_product_variations_updated_at ON product_variations;
CREATE TRIGGER set_product_variations_updated_at
  BEFORE UPDATE ON product_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variations_updated_at();

-- Ensure RLS is enabled
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view active product variations" ON product_variations;
DROP POLICY IF EXISTS "Vendors can insert product variations" ON product_variations;
DROP POLICY IF EXISTS "Vendors can update product variations" ON product_variations;
DROP POLICY IF EXISTS "Vendors can delete product variations" ON product_variations;
DROP POLICY IF EXISTS "Vendors can manage their product variations" ON product_variations;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_variations;

-- Policy: Anyone (including unauthenticated users) can view active product variations
CREATE POLICY "Anyone can view active product variations"
  ON product_variations FOR SELECT
  USING (is_active = true);

-- Policy: Only authenticated vendors can insert their own product variations
CREATE POLICY "Vendors can insert product variations"
  ON product_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variations.product_id
      AND products.is_active = true
    )
  );

-- Policy: Only authenticated vendors can update their own product variations
CREATE POLICY "Vendors can update product variations"
  ON product_variations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variations.product_id
      AND products.is_active = true
    )
  );

-- Policy: Only authenticated vendors can delete their own product variations
CREATE POLICY "Vendors can delete product variations"
  ON product_variations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variations.product_id
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS product_variations_product_id_idx ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS product_variations_is_active_idx ON product_variations(is_active);

