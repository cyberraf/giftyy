-- Supabase migration: Bundles and Bundle Products tables
-- Run this SQL in your Supabase SQL editor

-- Create bundles table
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL, -- Hex color code (e.g., '#F97316')
  category TEXT NOT NULL CHECK (category IN ('celebrations', 'family', 'life-events', 'seasonal-faith', 'interests')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bundle_products junction table
CREATE TABLE IF NOT EXISTS bundle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_id, product_id) -- Prevent duplicate entries
);

-- Enable RLS on bundles
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bundles (public read access, admin write access)
DROP POLICY IF EXISTS "Bundles are viewable by everyone" ON bundles;
DROP POLICY IF EXISTS "Bundles are insertable by authenticated users" ON bundles;
DROP POLICY IF EXISTS "Bundles are updatable by authenticated users" ON bundles;
DROP POLICY IF EXISTS "Bundles are deletable by authenticated users" ON bundles;

-- Allow everyone to read bundles (public access)
CREATE POLICY "Bundles are viewable by everyone"
  ON bundles FOR SELECT
  USING (true);

-- Allow authenticated users to insert bundles (for admin/vendor use)
CREATE POLICY "Bundles are insertable by authenticated users"
  ON bundles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update bundles
CREATE POLICY "Bundles are updatable by authenticated users"
  ON bundles FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete bundles
CREATE POLICY "Bundles are deletable by authenticated users"
  ON bundles FOR DELETE
  USING (auth.role() = 'authenticated');

-- Enable RLS on bundle_products
ALTER TABLE bundle_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bundle_products (public read access, admin write access)
DROP POLICY IF EXISTS "Bundle products are viewable by everyone" ON bundle_products;
DROP POLICY IF EXISTS "Bundle products are insertable by authenticated users" ON bundle_products;
DROP POLICY IF EXISTS "Bundle products are updatable by authenticated users" ON bundle_products;
DROP POLICY IF EXISTS "Bundle products are deletable by authenticated users" ON bundle_products;

-- Allow everyone to read bundle_products (public access)
CREATE POLICY "Bundle products are viewable by everyone"
  ON bundle_products FOR SELECT
  USING (true);

-- Allow authenticated users to insert bundle_products
CREATE POLICY "Bundle products are insertable by authenticated users"
  ON bundle_products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update bundle_products
CREATE POLICY "Bundle products are updatable by authenticated users"
  ON bundle_products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete bundle_products
CREATE POLICY "Bundle products are deletable by authenticated users"
  ON bundle_products FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bundle_products_bundle_id ON bundle_products(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_products_product_id ON bundle_products(product_id);
CREATE INDEX IF NOT EXISTS idx_bundles_category ON bundles(category);
CREATE INDEX IF NOT EXISTS idx_bundles_is_active ON bundles(is_active);
CREATE INDEX IF NOT EXISTS idx_bundles_display_order ON bundles(display_order);
