-- Example SQL to update your existing variation with attributes
-- Replace the product_id and variation id with your actual values

-- First, let's see what variations you have:
SELECT id, product_id, name, attributes, is_active 
FROM product_variations 
ORDER BY created_at DESC;

-- Update a variation with attributes (example for a Color variation):
-- Replace 'your-variation-id' with the actual id from the query above
UPDATE product_variations 
SET attributes = '{"Color": "Green"}'::jsonb
WHERE id = 'your-variation-id';

-- Or if you want to add multiple attributes (e.g., Size and Color):
UPDATE product_variations 
SET attributes = '{"Size": "Large", "Color": "Red"}'::jsonb
WHERE id = 'your-variation-id';

-- Example: Update the variation named "Color" for a specific product
-- Replace 'your-product-id' with the actual product_id
UPDATE product_variations 
SET attributes = '{"Color": "Green"}'::jsonb
WHERE name = 'Color' 
  AND product_id = 'your-product-id';

-- If you want to create multiple variations for different colors:
-- First variation (Green)
UPDATE product_variations 
SET attributes = '{"Color": "Green"}'::jsonb,
    is_active = true
WHERE name = 'Color' 
  AND product_id = 'your-product-id'
LIMIT 1;

-- You can also insert new variations with attributes:
INSERT INTO product_variations (
  product_id, 
  name, 
  attributes, 
  stock_quantity, 
  is_active
) VALUES (
  'your-product-id',  -- Replace with actual product_id
  'Color Variation',
  '{"Color": "Red"}'::jsonb,
  20,
  true
);

-- Insert multiple variations at once (example for different colors):
INSERT INTO product_variations (
  product_id, 
  name, 
  attributes, 
  stock_quantity, 
  is_active,
  display_order
) VALUES 
  ('your-product-id', 'Red Candle', '{"Color": "Red"}'::jsonb, 20, true, 1),
  ('your-product-id', 'Green Candle', '{"Color": "Green"}'::jsonb, 15, true, 2),
  ('your-product-id', 'Blue Candle', '{"Color": "Blue"}'::jsonb, 10, true, 3);

-- Example with multiple attributes (Size and Color):
INSERT INTO product_variations (
  product_id, 
  name, 
  attributes, 
  stock_quantity, 
  is_active,
  display_order
) VALUES 
  ('your-product-id', 'Large Red', '{"Size": "Large", "Color": "Red"}'::jsonb, 20, true, 1),
  ('your-product-id', 'Large Green', '{"Size": "Large", "Color": "Green"}'::jsonb, 15, true, 2),
  ('your-product-id', 'Small Red', '{"Size": "Small", "Color": "Red"}'::jsonb, 10, true, 3),
  ('your-product-id', 'Small Green', '{"Size": "Small", "Color": "Green"}'::jsonb, 8, true, 4);

