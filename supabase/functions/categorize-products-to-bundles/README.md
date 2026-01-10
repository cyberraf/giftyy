# Categorize Products to Bundles Edge Function

This edge function automatically categorizes products into bundles based on product tags, category, name, and description.

## Features

- **Automatic Categorization**: Matches products to bundles using keyword matching
- **Single Product**: Categorize a specific product by ID
- **Bulk Categorization**: Categorize all existing products at once
- **Smart Matching**: Uses product tags, name, description, and category to find relevant bundles

## Usage

### 1. Deploy the Function

Deploy this function to Supabase:

```bash
supabase functions deploy categorize-products-to-bundles
```

Or use the Supabase Dashboard:
1. Go to **Edge Functions** → **Deploy a new function**
2. Name it `categorize-products-to-bundles`
3. Copy the contents of `index.ts` into the editor
4. Deploy

### 2. Set Environment Variables

The function uses these environment variables (automatically available in Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access

### 3. Call the Function

#### Categorize a Single Product

```bash
curl -X POST https://your-project.supabase.co/functions/v1/categorize-products-to-bundles \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "product-uuid-here"}'
```

#### Categorize All Products

```bash
curl -X POST https://your-project.supabase.co/functions/v1/categorize-products-to-bundles \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"categorize_all": true}'
```

### 4. Set Up Automatic Triggering

You have two options:

#### Option A: Database Trigger (Recommended if pg_net is available)

Run the migration file:
```sql
-- Run: supabase-migrations-product-bundle-categorization-trigger.sql
```

#### Option B: Supabase Webhook

1. Go to **Database** → **Webhooks** in Supabase Dashboard
2. Create a new webhook:
   - **Name**: `categorize-products-to-bundles`
   - **Table**: `products`
   - **Events**: `INSERT`, `UPDATE`
   - **HTTP Request**:
     - **URL**: `https://your-project.supabase.co/functions/v1/categorize-products-to-bundles`
     - **HTTP Method**: `POST`
     - **HTTP Headers**: 
       ```
       Authorization: Bearer YOUR_SERVICE_ROLE_KEY
       Content-Type: application/json
       ```
     - **HTTP Request Body**:
       ```json
       {
         "product_id": "{{ $1.id }}"
       }
       ```

## Bundle Matching Rules

The function matches products to bundles based on these keywords:

- **Birthday Gifts**: birthday, party, cake, celebration
- **Valentine's Gifts**: valentine, romantic, love, roses, chocolate, couple
- **Father's Day**: fathers-day, father, dad, bbq, whiskey, tools, leather, travel
- **Mother's Day**: mothers-day, mother, mom, spa, relaxation, scarf, fashion, tea
- **Christmas Gifts**: christmas, holiday, winter, ornaments, decor, hamper, cozy
- **For Her**: for-her, perfume, luxury, jewelry, scarf, fashion, beauty, spa
- **For Him**: for-him, watch, grooming, personal-care, leather, accessories, tools
- **For Kids**: for-kids, kids, children, toys, educational, art, supplies, books
- **For Teens**: for-teens, teens, earbuds, electronics, gaming, accessories, backpack

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Product categorized into 2 bundle(s)",
  "total_processed": 1,
  "total_categorized": 1,
  "total_errors": 0,
  "results": {
    "product_id": "uuid",
    "bundles": ["bundle-uuid-1", "bundle-uuid-2"]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Notes

- Only active products (`is_active = true`) are categorized
- Only active bundles are considered for matching
- Existing bundle_products entries for a product are removed before adding new ones
- Products can be matched to multiple bundles
- The function uses case-insensitive keyword matching

