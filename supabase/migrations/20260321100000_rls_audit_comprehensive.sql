-- ============================================================================
-- RLS Audit: Comprehensive Row Level Security for all public tables
-- Date: 2026-03-21
--
-- This migration adds RLS policies to tables that were previously unprotected.
-- Tables are grouped by access pattern:
--   1. User-private tables (orders, memories, videos, vaults, wishlists)
--   2. Public marketplace tables (products, vendors, bundles)
--   3. System/background tables (embedding jobs)
-- ============================================================================

-- ============================================================================
-- 1. ORDERS — user_id ownership
-- ============================================================================

ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

-- Users can only read their own orders
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Gift recipients can read orders sent to them (for gift/[code] flow)
CREATE POLICY "Recipients read gift orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can only create orders for themselves
CREATE POLICY "Users create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own orders (e.g., cancel)
CREATE POLICY "Users update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. ORDER_ITEMS — access via parent order ownership
-- ============================================================================

ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;

-- Users can read items belonging to their orders
CREATE POLICY "Users read own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- Users can insert items into their own orders
CREATE POLICY "Users create own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. SHARED_MEMORIES — user_id ownership + gift recipients can view
-- ============================================================================

ALTER TABLE IF EXISTS shared_memories ENABLE ROW LEVEL SECURITY;

-- Owners can read their own shared memories
CREATE POLICY "Users read own shared memories"
  ON shared_memories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Gift recipients can view shared memories via order link
CREATE POLICY "Recipients view shared memories via order"
  ON shared_memories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.shared_memory_id = shared_memories.id
        AND orders.recipient_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
    )
  );

-- Users can create their own shared memories
CREATE POLICY "Users create own shared memories"
  ON shared_memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own shared memories
CREATE POLICY "Users update own shared memories"
  ON shared_memories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shared memories
CREATE POLICY "Users delete own shared memories"
  ON shared_memories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. VIDEO_MESSAGES — user_id ownership
-- ============================================================================

ALTER TABLE IF EXISTS video_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own video messages
CREATE POLICY "Users read own video messages"
  ON video_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Gift recipients can view video messages attached to their orders
CREATE POLICY "Recipients view video messages via order"
  ON video_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = video_messages.order_id
        AND orders.recipient_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
    )
  );

-- Users can create their own video messages
CREATE POLICY "Users create own video messages"
  ON video_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own video messages
CREATE POLICY "Users update own video messages"
  ON video_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own video messages
CREATE POLICY "Users delete own video messages"
  ON video_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. RECIPIENT_REACTIONS — recipient_user_id ownership + order buyer can view
-- ============================================================================

ALTER TABLE IF EXISTS recipient_reactions ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own reactions
CREATE POLICY "Recipients read own reactions"
  ON recipient_reactions FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Order buyers can view reactions to their gifts
CREATE POLICY "Buyers view reactions to their gifts"
  ON recipient_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = recipient_reactions.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- Recipients can create reactions (linked to their profile)
CREATE POLICY "Recipients create own reactions"
  ON recipient_reactions FOR INSERT
  TO authenticated
  WITH CHECK (recipient_user_id = auth.uid());

-- Recipients can update their own reactions
CREATE POLICY "Recipients update own reactions"
  ON recipient_reactions FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- ============================================================================
-- 6. VAULTS — user_id ownership
-- ============================================================================

ALTER TABLE IF EXISTS vaults ENABLE ROW LEVEL SECURITY;

-- Users can read their own vaults
CREATE POLICY "Users read own vaults"
  ON vaults FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own vaults
CREATE POLICY "Users create own vaults"
  ON vaults FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own vaults
CREATE POLICY "Users update own vaults"
  ON vaults FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own vaults
CREATE POLICY "Users delete own vaults"
  ON vaults FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. VAULT_VIDEOS — access via parent vault ownership
-- ============================================================================

ALTER TABLE IF EXISTS vault_videos ENABLE ROW LEVEL SECURITY;

-- Users can read videos in their own vaults
CREATE POLICY "Users read own vault videos"
  ON vault_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_videos.vault_id
        AND vaults.user_id = auth.uid()
    )
  );

-- Users can add videos to their own vaults
CREATE POLICY "Users create own vault videos"
  ON vault_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_videos.vault_id
        AND vaults.user_id = auth.uid()
    )
  );

-- Users can remove videos from their own vaults
CREATE POLICY "Users delete own vault videos"
  ON vault_videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_videos.vault_id
        AND vaults.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. PRODUCTS — public marketplace (read-only for buyers)
-- ============================================================================

ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

-- Anyone can read active products (marketplace browsing)
CREATE POLICY "Anyone can read active products"
  ON products FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Vendors can read all their own products (including inactive)
CREATE POLICY "Vendors read own products"
  ON products FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendors can insert their own products
CREATE POLICY "Vendors create own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendors can update their own products
CREATE POLICY "Vendors update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. PRODUCT_VARIATIONS — public readable, vendor writable
-- ============================================================================

ALTER TABLE IF EXISTS product_variations ENABLE ROW LEVEL SECURITY;

-- Anyone can read product variations (marketplace browsing)
CREATE POLICY "Anyone can read product variations"
  ON product_variations FOR SELECT
  TO authenticated, anon
  USING (true);

-- Vendors can manage their own product variations
CREATE POLICY "Vendors create own product variations"
  ON product_variations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN vendors ON vendors.id = products.vendor_id
      WHERE products.id = product_variations.product_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors update own product variations"
  ON product_variations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN vendors ON vendors.id = products.vendor_id
      WHERE products.id = product_variations.product_id
        AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors delete own product variations"
  ON product_variations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN vendors ON vendors.id = products.vendor_id
      WHERE products.id = product_variations.product_id
        AND vendors.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. BUNDLES — public read-only (managed by admins/service role)
-- ============================================================================

ALTER TABLE IF EXISTS bundles ENABLE ROW LEVEL SECURITY;

-- Anyone can read bundles (marketplace collections)
CREATE POLICY "Anyone can read bundles"
  ON bundles FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- 11. BUNDLE_PRODUCTS — public read-only (managed by admins/service role)
-- ============================================================================

ALTER TABLE IF EXISTS bundle_products ENABLE ROW LEVEL SECURITY;

-- Anyone can read bundle products
CREATE POLICY "Anyone can read bundle products"
  ON bundle_products FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- 12. VENDORS — public readable, owner writable
-- ============================================================================

ALTER TABLE IF EXISTS vendors ENABLE ROW LEVEL SECURITY;

-- Anyone can read vendor profiles (marketplace)
CREATE POLICY "Anyone can read vendors"
  ON vendors FOR SELECT
  TO authenticated, anon
  USING (true);

-- Vendors can update their own profile
CREATE POLICY "Vendors update own profile"
  ON vendors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 13. VENDOR_SHIPPING_ZONES — public readable
-- ============================================================================

ALTER TABLE IF EXISTS vendor_shipping_zones ENABLE ROW LEVEL SECURITY;

-- Anyone can read shipping zones (needed for checkout)
CREATE POLICY "Anyone can read shipping zones"
  ON vendor_shipping_zones FOR SELECT
  TO authenticated, anon
  USING (true);

-- Vendors can manage their own shipping zones
CREATE POLICY "Vendors manage own shipping zones"
  ON vendor_shipping_zones FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors update own shipping zones"
  ON vendor_shipping_zones FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors delete own shipping zones"
  ON vendor_shipping_zones FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 14. VENDOR_SHIPPING_RATES — public readable
-- ============================================================================

ALTER TABLE IF EXISTS vendor_shipping_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can read shipping rates (needed for checkout)
CREATE POLICY "Anyone can read shipping rates"
  ON vendor_shipping_rates FOR SELECT
  TO authenticated, anon
  USING (true);

-- Vendors can manage their own shipping rates
CREATE POLICY "Vendors manage own shipping rates"
  ON vendor_shipping_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors update own shipping rates"
  ON vendor_shipping_rates FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors delete own shipping rates"
  ON vendor_shipping_rates FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 15. GLOBAL_VENDOR_SETTINGS — public read-only
-- ============================================================================

ALTER TABLE IF EXISTS global_vendor_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read global settings (e.g., card prices)
CREATE POLICY "Anyone can read global vendor settings"
  ON global_vendor_settings FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- 16. PROFILES — public readable, self writable
-- ============================================================================

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (public user info)
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile (auto-created on signup)
CREATE POLICY "Users create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 17. PRODUCT_EMBEDDING_JOBS — service role only
-- ============================================================================

ALTER TABLE IF EXISTS product_embedding_jobs ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated users — service_role bypasses RLS
-- This ensures embedding jobs are only managed by edge functions

-- ============================================================================
-- 18. RECIPIENT_EMBEDDING_JOBS — service role only
-- ============================================================================

ALTER TABLE IF EXISTS recipient_embedding_jobs ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated users — service_role bypasses RLS
-- This ensures embedding jobs are only managed by edge functions

-- ============================================================================
-- GRANT NOTES:
-- - service_role key always bypasses RLS (Supabase default)
-- - Edge functions using service_role can still read/write all tables
-- - Authenticated users are restricted by the policies above
-- - Anonymous users only get read access to marketplace tables
-- ============================================================================
