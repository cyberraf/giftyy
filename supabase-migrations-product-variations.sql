-- Supabase migration: Create product_variations table
-- This table stores product variations (e.g., different sizes, colors, etc.)

-- Create product_variations table
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name TEXT, -- Optional variation name (e.g., "Large Red")
  price NUMERIC(10, 2), -- Optional override price (if null, uses product price)
  sku TEXT, -- Optional SKU for this variation
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  image_url TEXT, -- Optional variation-specific image
  attributes JSONB DEFAULT '{}' NOT NULL, -- e.g., {"Size": "Large", "Color": "Red"}
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view active product variations" ON product_variations;
DROP POLICY IF EXISTS "Vendors can manage their product variations" ON product_variations;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_variations;

-- Policy: Anyone (including unauthenticated users) can view active product variations
-- This allows buyers to see product variations when viewing products
CREATE POLICY "Anyone can view active product variations"
  ON product_variations FOR SELECT
  USING (is_active = true);

-- Policy: Only authenticated vendors can insert their own product variations
-- Note: Adjust this based on your vendor authentication setup
-- For now, allowing any authenticated user to insert (you may want to restrict this further)
CREATE POLICY "Vendors can insert product variations"
  ON product_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variations.product_id
      AND products.is_active = true
      -- Add vendor_id check here if products table has vendor_id
      -- AND products.vendor_id = auth.uid()
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
      -- Add vendor_id check here if products table has vendor_id
      -- AND products.vendor_id = auth.uid()
    )
  );

-- Policy: Only authenticated vendors can delete their own product variations
CREATE POLICY "Vendors can delete product variations"
  ON product_variations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variations.product_id
      -- Add vendor_id check here if products table has vendor_id
      -- AND products.vendor_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS product_variations_product_id_idx ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS product_variations_is_active_idx ON product_variations(is_active);
CREATE INDEX IF NOT EXISTS product_variations_display_order_idx ON product_variations(display_order);
CREATE INDEX IF NOT EXISTS product_variations_attributes_idx ON product_variations USING GIN(attributes);

-- Create function to update updated_at timestamp
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

