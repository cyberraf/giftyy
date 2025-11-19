-- Seed Products and Collections from existing gift-data.ts
-- Run this SQL in your Supabase SQL Editor after running the main migrations

-- First, insert products
INSERT INTO products (id, name, price, image_url, discount_percentage, is_active, tags)
VALUES
  -- Main products
  ('00000000-0000-0000-0000-000000000001', 'Curated Gift Box', 49.99, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['gift-box', 'curated']),
  ('00000000-0000-0000-0000-000000000002', 'Memory Frame', 29.99, 'https://images.unsplash.com/photo-1517456793572-8c0a0f4e6223?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['frame', 'memory']),
  ('00000000-0000-0000-0000-000000000003', 'Experience Voucher', 89.00, 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['experience', 'voucher']),
  ('00000000-0000-0000-0000-000000000004', 'Personalized Mug', 19.99, 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['mug', 'personalized']),
  ('00000000-0000-0000-0000-000000000005', 'Scented Candle Set', 24.99, 'https://images.unsplash.com/photo-1519681398221-94f8192a6d05?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['candles', 'home']),
  ('00000000-0000-0000-0000-000000000006', 'Custom Photo Book', 39.99, 'https://images.unsplash.com/photo-1457694587812-e8bf29a43845?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['photo-book', 'custom']),
  ('00000000-0000-0000-0000-000000000007', 'Chocolate Assortment', 14.99, 'https://images.unsplash.com/photo-1481391032119-d89fee407e44?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['chocolate', 'food']),
  ('00000000-0000-0000-0000-000000000008', 'Flower Bouquet', 35.00, 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['flowers', 'bouquet']),
  ('00000000-0000-0000-0000-000000000009', 'Spa Gift Basket', 59.00, 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['spa', 'basket', 'relaxation']),
  ('00000000-0000-0000-0000-000000000010', 'Handmade Journal', 21.00, 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['journal', 'handmade']),
  ('00000000-0000-0000-0000-000000000011', 'Tea Sampler', 18.50, 'https://images.unsplash.com/photo-1451748266019-527af3d64c05?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['tea', 'sampler']),
  ('00000000-0000-0000-0000-000000000012', 'Cozy Blanket', 42.00, 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['blanket', 'home']),
  ('00000000-0000-0000-0000-000000000013', 'Leather Wallet', 55.00, 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['wallet', 'leather', 'accessories']),
  ('00000000-0000-0000-0000-000000000014', 'Portable Speaker', 69.99, 'https://images.unsplash.com/photo-1518441982129-5bcf8f6dbfa0?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['speaker', 'electronics']),
  -- Birthday products
  ('00000000-0000-0000-0000-000000000101', 'Birthday Box', 39.99, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['birthday', 'gift-box']),
  ('00000000-0000-0000-0000-000000000102', 'Cake & Card', 29.00, 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['birthday', 'cake']),
  ('00000000-0000-0000-0000-000000000103', 'Party Kit', 49.00, 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['birthday', 'party']),
  -- Valentine products
  ('00000000-0000-0000-0000-000000000201', 'Roses & Chocolate', 45.00, 'https://images.unsplash.com/photo-1519681399049-bbf3b0b0f6b0?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['valentine', 'roses', 'chocolate']),
  ('00000000-0000-0000-0000-000000000202', 'Love Letter Frame', 34.00, 'https://images.unsplash.com/photo-1519681396690-4f6b1a3a0b51?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['valentine', 'frame', 'love']),
  ('00000000-0000-0000-0000-000000000203', 'Couple''s Experience', 99.00, 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['valentine', 'experience', 'couple']),
  -- Father's Day products
  ('00000000-0000-0000-0000-000000000301', 'BBQ Tool Set', 44.00, 'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['fathers-day', 'bbq', 'tools']),
  ('00000000-0000-0000-0000-000000000302', 'Leather Dopp Kit', 52.00, 'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['fathers-day', 'leather', 'travel']),
  ('00000000-0000-0000-0000-000000000303', 'Whiskey Glasses', 27.00, 'https://images.unsplash.com/photo-1514369118554-e20d93546b30?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['fathers-day', 'whiskey', 'glasses']),
  -- Mother's Day products
  ('00000000-0000-0000-0000-000000000401', 'Spa Day Set', 48.00, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['mothers-day', 'spa', 'relaxation']),
  ('00000000-0000-0000-0000-000000000402', 'Silk Scarf', 36.00, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['mothers-day', 'scarf', 'fashion']),
  ('00000000-0000-0000-0000-000000000403', 'Tea & Cookies', 25.00, 'https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['mothers-day', 'tea', 'food']),
  -- Christmas products
  ('00000000-0000-0000-0000-000000000501', 'Holiday Hamper', 69.00, 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['christmas', 'hamper', 'holiday']),
  ('00000000-0000-0000-0000-000000000502', 'Cozy Hat & Gloves', 32.00, 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['christmas', 'winter', 'accessories']),
  ('00000000-0000-0000-0000-000000000503', 'Ornament Set', 19.50, 'https://images.unsplash.com/photo-1479722842840-c0a823bd0cd6?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['christmas', 'ornaments', 'decor']),
  -- For Her products
  ('00000000-0000-0000-0000-000000000601', 'Luxury Perfume Set', 89.00, 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop', 15, true, ARRAY['for-her', 'perfume', 'luxury']),
  ('00000000-0000-0000-0000-000000000602', 'Silk Scarf Collection', 45.00, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['for-her', 'scarf', 'fashion']),
  ('00000000-0000-0000-0000-000000000603', 'Jewelry Box', 65.00, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop', 10, true, ARRAY['for-her', 'jewelry', 'box']),
  -- For Him products
  ('00000000-0000-0000-0000-000000000701', 'Premium Watch', 199.00, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop', 20, true, ARRAY['for-him', 'watch', 'luxury']),
  ('00000000-0000-0000-0000-000000000702', 'Grooming Kit', 39.00, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['for-him', 'grooming', 'personal-care']),
  -- For Kids products
  ('00000000-0000-0000-0000-000000000801', 'Educational Toy Set', 34.00, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['for-kids', 'toys', 'educational']),
  ('00000000-0000-0000-0000-000000000802', 'Art Supplies Kit', 28.00, 'https://images.unsplash.com/photo-1606166186600-95e0b1e2b5b5?q=80&w=800&auto=format&fit=crop', 12, true, ARRAY['for-kids', 'art', 'supplies']),
  ('00000000-0000-0000-0000-000000000803', 'Storybook Collection', 42.00, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['for-kids', 'books', 'storybook']),
  -- For Teens products
  ('00000000-0000-0000-0000-000000000901', 'Wireless Earbuds', 79.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop', 18, true, ARRAY['for-teens', 'earbuds', 'electronics']),
  ('00000000-0000-0000-0000-000000000902', 'Gaming Accessories', 49.00, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['for-teens', 'gaming', 'accessories']),
  ('00000000-0000-0000-0000-000000000903', 'Trendy Backpack', 59.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop', 0, true, ARRAY['for-teens', 'backpack', 'fashion'])
ON CONFLICT (id) DO NOTHING;

-- Insert collections (using the structure from gift-data.ts)
-- Note: You'll need to create collections and link products to them based on your COLLECTIONS structure
-- This is a basic example - you may need to adjust based on your actual collection definitions

-- Example: Create a "Birthday Gifts" collection
INSERT INTO collections (id, title, description, color, category, is_active, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Birthday Gifts', 'Perfect gifts for birthdays', '#F97316', 'celebrations', true, 1),
  ('10000000-0000-0000-0000-000000000002', 'Valentine''s Gifts', 'Romantic gifts for your loved one', '#EC4899', 'celebrations', true, 2),
  ('10000000-0000-0000-0000-000000000003', 'Father''s Day', 'Gifts for dad', '#3B82F6', 'family', true, 3),
  ('10000000-0000-0000-0000-000000000004', 'Mother''s Day', 'Gifts for mom', '#F43F5E', 'family', true, 4),
  ('10000000-0000-0000-0000-000000000005', 'Christmas Gifts', 'Holiday gift ideas', '#10B981', 'seasonal-faith', true, 5),
  ('10000000-0000-0000-0000-000000000006', 'For Her', 'Gifts perfect for her', '#EC4899', 'family', true, 6),
  ('10000000-0000-0000-0000-000000000007', 'For Him', 'Gifts perfect for him', '#3B82F6', 'family', true, 7),
  ('10000000-0000-0000-0000-000000000008', 'For Kids', 'Gifts for children', '#F59E0B', 'family', true, 8),
  ('10000000-0000-0000-0000-000000000009', 'For Teens', 'Gifts for teenagers', '#8B5CF6', 'family', true, 9)
ON CONFLICT (id) DO NOTHING;

-- Link products to collections
-- Birthday collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 1),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 2),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- Valentine collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000201', 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000202', 2),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000203', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- Father's Day collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000301', 1),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000302', 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000303', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- Mother's Day collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000401', 1),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000402', 2),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000403', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- Christmas collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000501', 1),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000502', 2),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000503', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- For Her collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000601', 1),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000602', 2),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000603', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- For Him collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000701', 1),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000702', 2),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000013', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- For Kids collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000801', 1),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000802', 2),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000803', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- For Teens collection
INSERT INTO collection_products (collection_id, product_id, display_order)
VALUES
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000901', 1),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000902', 2),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000903', 3)
ON CONFLICT (collection_id, product_id) DO NOTHING;

