-- Migration: Create product categories table with subcategories as array
-- This creates a simplified categorization system where:
-- - Categories are top-level (e.g., "Electronics", "Clothing", "Home & Garden")
-- - Subcategories are stored as an array within each category (e.g., ["Laptops", "Phones", "Tablets"] for Electronics)
-- - Products are linked to categories (and optionally to specific subcategories within those categories)

-- Create categories table with subcategories array
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    subcategories TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of subcategory names
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create junction table to link products to categories
-- A product can belong to multiple categories
CREATE TABLE IF NOT EXISTS public.product_category_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
    subcategory TEXT, -- Optional: specific subcategory within this category (should exist in category's subcategories array)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure a product isn't assigned to the same category+subcategory combination twice
    -- Note: NULL values are considered distinct, so (product_id, category_id, NULL) allows
    -- a product to be in a category with no subcategory, and also with specific subcategories
    UNIQUE(product_id, category_id, subcategory)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS product_categories_slug_idx 
    ON public.product_categories(slug);

CREATE INDEX IF NOT EXISTS product_categories_active_idx 
    ON public.product_categories(is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_category_assignments_product_id_idx 
    ON public.product_category_assignments(product_id);

CREATE INDEX IF NOT EXISTS product_category_assignments_category_id_idx 
    ON public.product_category_assignments(category_id);

-- Composite index for common queries: finding all categories for a product, or all products in a category
CREATE INDEX IF NOT EXISTS product_category_assignments_product_category_idx 
    ON public.product_category_assignments(product_id, category_id);

CREATE INDEX IF NOT EXISTS product_category_assignments_subcategory_idx 
    ON public.product_category_assignments(subcategory) 
    WHERE subcategory IS NOT NULL;

-- Enable RLS (Row Level Security)
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can read active categories" ON public.product_categories;
DROP POLICY IF EXISTS "Authenticated users can read all categories" ON public.product_categories;
DROP POLICY IF EXISTS "Service role can manage categories" ON public.product_categories;

-- Anyone can read active categories
CREATE POLICY "Anyone can read active categories"
    ON public.product_categories
    FOR SELECT
    USING (is_active = true);

-- Authenticated users and service role can read all categories
CREATE POLICY "Authenticated users can read all categories"
    ON public.product_categories
    FOR SELECT
    TO authenticated, service_role
    USING (true);

-- Service role can manage categories
CREATE POLICY "Service role can manage categories"
    ON public.product_categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for product_category_assignments
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can read product category assignments" ON public.product_category_assignments;
DROP POLICY IF EXISTS "Service role can manage product category assignments" ON public.product_category_assignments;

-- Anyone can read assignments
CREATE POLICY "Anyone can read product category assignments"
    ON public.product_category_assignments
    FOR SELECT
    USING (true);

-- Service role can manage assignments
CREATE POLICY "Service role can manage product category assignments"
    ON public.product_category_assignments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON public.product_categories;

CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON public.product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.product_categories IS 'Product categories with subcategories stored as an array';
COMMENT ON TABLE public.product_category_assignments IS 'Junction table linking products to their categories. Foreign keys: product_id -> products(id), category_id -> product_categories(id)';

COMMENT ON COLUMN public.product_categories.slug IS 'URL-friendly identifier for the category';
COMMENT ON COLUMN public.product_categories.subcategories IS 'Array of subcategory names within this category';
COMMENT ON COLUMN public.product_category_assignments.product_id IS 'Foreign key to products table - links products to categories';
COMMENT ON COLUMN public.product_category_assignments.category_id IS 'Foreign key to product_categories table - links categories to products';
COMMENT ON COLUMN public.product_category_assignments.subcategory IS 'Optional specific subcategory within the assigned category (should match a value in the category''s subcategories array)';
