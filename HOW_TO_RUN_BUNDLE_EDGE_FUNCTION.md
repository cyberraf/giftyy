# How to Run the Bundle Categorization Edge Function

This guide explains how to deploy and run the `categorize-products-to-bundles` edge function that automatically categorizes products into bundles.

## Prerequisites

1. **Supabase CLI** (if using CLI method)
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project** - Make sure you have:
   - Your Supabase project URL
   - Your Supabase anon key (for calling the function)
   - Your Supabase service role key (automatically used by the function)

## Method 1: Deploy via Supabase CLI (Recommended)

### Step 1: Login to Supabase
```bash
supabase login
```

### Step 2: Link your project
```bash
supabase link --project-ref your-project-ref
```

### Step 3: Deploy the function
```bash
supabase functions deploy categorize-products-to-bundles
```

## Method 2: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **Edge Functions** in the left sidebar
3. Click **"Create a new function"** or **"Deploy a new function"**
4. Name it: `categorize-products-to-bundles`
5. Copy the contents of `supabase/functions/categorize-products-to-bundles/index.ts` into the editor
6. Click **Deploy**

## Running the Function

### Option A: Categorize All Products (Bulk Operation)

This will categorize all existing products in your database:

**Using cURL:**
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-products-to-bundles \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"categorize_all": true}'
```

**Using JavaScript/TypeScript:**
```typescript
const response = await fetch(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-products-to-bundles',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer YOUR_ANON_KEY`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ categorize_all: true }),
  }
);

const result = await response.json();
console.log(result);
```

**Using Supabase Dashboard:**
1. Go to **Edge Functions** → `categorize-products-to-bundles`
2. Click **"Invoke function"**
3. Enter the request body:
   ```json
   {
     "categorize_all": true
   }
   ```
4. Click **"Invoke"**

### Option B: Categorize a Single Product

**Using cURL:**
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-products-to-bundles \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "your-product-uuid-here"}'
```

**Using JavaScript/TypeScript:**
```typescript
const response = await fetch(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-products-to-bundles',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer YOUR_ANON_KEY`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product_id: 'your-product-uuid-here' }),
  }
);

const result = await response.json();
console.log(result);
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Product categorization complete",
  "totalProductsProcessed": 150,
  "totalCategorized": 145,
  "totalErrors": 5,
  "results": [
    {
      "product_id": "uuid-1",
      "bundles": ["bundle-uuid-1", "bundle-uuid-2"]
    },
    {
      "product_id": "uuid-2",
      "bundles": ["bundle-uuid-3"]
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Setting Up Automatic Triggering

To automatically categorize products when they are created or updated, you have two options:

### Option 1: Database Trigger (Recommended)

Run the SQL migration:
```bash
# Apply the migration via Supabase Dashboard SQL Editor
# Or via CLI:
supabase db push
```

The migration file is: `supabase-migrations-product-bundle-categorization-trigger.sql`

**Note:** This requires the `pg_net` extension to be enabled in your Supabase project. If it's not available, use Option 2.

### Option 2: Supabase Webhook

1. Go to **Database** → **Webhooks** in Supabase Dashboard
2. Click **"Create a new webhook"**
3. Configure:
   - **Name**: `categorize-products-to-bundles`
   - **Table**: `products`
   - **Events**: Select `INSERT` and `UPDATE`
   - **HTTP Request**:
     - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/categorize-products-to-bundles`
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
4. Click **"Save"**

## Quick Test Script

Create a file `test-bundle-function.js`:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const ANON_KEY = 'YOUR_ANON_KEY';

async function testBundleFunction() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/categorize-products-to-bundles`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categorize_all: true }),
      }
    );

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testBundleFunction();
```

Run it:
```bash
node test-bundle-function.js
```

## Troubleshooting

### Function not found
- Make sure the function is deployed
- Check the function name is exactly `categorize-products-to-bundles`
- Verify your project ref in the URL

### Authentication errors
- Make sure you're using the correct anon key (not service role key for the Authorization header)
- The function internally uses the service role key from environment variables

### No bundles found
- Make sure you have active bundles in the `bundles` table
- Check that bundles have `is_active = true`

### Products not being categorized
- Check product tags, names, and descriptions contain relevant keywords
- Verify products have `is_active = true`
- Check the function logs in Supabase Dashboard for errors

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

## Notes

- Only active products (`is_active = true`) are categorized
- Only active bundles are considered for matching
- Existing `bundle_products` entries for a product are removed before adding new ones
- Products can be matched to multiple bundles
- The function uses case-insensitive keyword matching

