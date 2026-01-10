// Supabase Edge Function: Categorize Products into Bundles
// This function automatically categorizes products into bundles based on:
// - Product tags
// - Product category
// - Product name and description keywords
// - Bundle category matching

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

interface Bundle {
  id: string;
  title: string;
  category: string;
  is_active: boolean;
}

// Mapping rules for categorizing products into bundles
const BUNDLE_MAPPING: Record<string, string[]> = {
  'birthday': ['birthday', 'birthday-gifts', 'party', 'cake', 'celebration'],
  'valentine': ['valentine', 'valentines', 'romantic', 'love', 'roses', 'chocolate', 'couple'],
  'fathers-day': ['fathers-day', 'father', 'dad', 'daddy', 'papa', 'bbq', 'whiskey', 'tools', 'leather', 'travel'],
  'mothers-day': ['mothers-day', 'mother', 'mom', 'mama', 'spa', 'relaxation', 'scarf', 'fashion', 'tea'],
  'christmas': ['christmas', 'holiday', 'winter', 'ornaments', 'decor', 'hamper', 'cozy'],
  'for-her': ['for-her', 'her', 'perfume', 'luxury', 'jewelry', 'scarf', 'fashion', 'beauty', 'spa'],
  'for-him': ['for-him', 'him', 'watch', 'grooming', 'personal-care', 'leather', 'accessories', 'tools'],
  'for-kids': ['for-kids', 'kids', 'children', 'toys', 'educational', 'art', 'supplies', 'books', 'storybook'],
  'for-teens': ['for-teens', 'teens', 'teenagers', 'earbuds', 'electronics', 'gaming', 'accessories', 'backpack', 'fashion'],
};

// Bundle category to bundle title mapping
const BUNDLE_CATEGORY_MAP: Record<string, string> = {
  'birthday': 'Birthday Gifts',
  'valentine': 'Valentine\'s Gifts',
  'fathers-day': 'Father\'s Day',
  'mothers-day': 'Mother\'s Day',
  'christmas': 'Christmas Gifts',
  'for-her': 'For Her',
  'for-him': 'For Him',
  'for-kids': 'For Kids',
  'for-teens': 'For Teens',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { product_id, categorize_all = false } = body;

    // Fetch all active bundles
    const { data: bundles, error: bundlesError } = await supabase
      .from('bundles')
      .select('id, title, category, is_active')
      .eq('is_active', true);

    if (bundlesError) {
      throw new Error(`Error fetching bundles: ${bundlesError.message}`);
    }

    if (!bundles || bundles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No active bundles found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a map of bundle titles to bundle IDs for quick lookup
    const bundleMap = new Map<string, string>();
    bundles.forEach((bundle: Bundle) => {
      bundleMap.set(bundle.title.toLowerCase(), bundle.id);
    });

    let productsToProcess: Product[] = [];

    if (categorize_all) {
      // Fetch all active products
      console.log('Categorizing all products...');
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, tags')
        .eq('is_active', true);

      if (productsError) {
        throw new Error(`Error fetching products: ${productsError.message}`);
      }

      productsToProcess = allProducts || [];
      console.log(`Found ${productsToProcess.length} products to categorize`);
    } else if (product_id) {
      // Fetch specific product
      console.log(`Categorizing product: ${product_id}`);
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, description, tags')
        .eq('id', product_id)
        .single();

      if (productError) {
        throw new Error(`Error fetching product: ${productError.message}`);
      }

      if (!product) {
        return new Response(
          JSON.stringify({ success: false, message: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      productsToProcess = [product];
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Either product_id or categorize_all=true must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalCategorized = 0;
    let totalErrors = 0;
    const results: Array<{ product_id: string; bundles: string[] }> = [];

    // Process each product
    for (const product of productsToProcess) {
      try {
        const matchedBundles: string[] = [];

        // Get product text for matching (lowercase for case-insensitive matching)
        const productText = [
          product.name || '',
          product.description || '',
          ...(product.tags || []),
        ]
          .join(' ')
          .toLowerCase();

        // Match product against each bundle category
        for (const [bundleKey, keywords] of Object.entries(BUNDLE_MAPPING)) {
          const bundleTitle = BUNDLE_CATEGORY_MAP[bundleKey];
          if (!bundleTitle) continue;

          const bundleId = bundleMap.get(bundleTitle.toLowerCase());
          if (!bundleId) continue;

          // Check if any keyword matches the product
          const matches = keywords.some(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            return productText.includes(lowerKeyword) ||
                   (product.tags || []).some(tag => tag.toLowerCase().includes(lowerKeyword) || lowerKeyword.includes(tag.toLowerCase()));
          });

          if (matches) {
            matchedBundles.push(bundleId);
          }
        }

        if (matchedBundles.length > 0) {
          // Remove existing bundle_products entries for this product
          const { error: deleteError } = await supabase
            .from('bundle_products')
            .delete()
            .eq('product_id', product.id);

          if (deleteError) {
            console.error(`Error deleting existing bundle_products for product ${product.id}:`, deleteError);
            totalErrors++;
            continue;
          }

          // Insert new bundle_products entries
          const bundleProductsToInsert = matchedBundles.map((bundleId, index) => ({
            bundle_id: bundleId,
            product_id: product.id,
            display_order: index + 1,
          }));

          const { error: insertError } = await supabase
            .from('bundle_products')
            .insert(bundleProductsToInsert);

          if (insertError) {
            console.error(`Error inserting bundle_products for product ${product.id}:`, insertError);
            totalErrors++;
            continue;
          }

          totalCategorized++;
          results.push({
            product_id: product.id,
            bundles: matchedBundles,
          });

          console.log(`Product ${product.id} (${product.name}) categorized into ${matchedBundles.length} bundle(s)`);
        } else {
          console.log(`Product ${product.id} (${product.name}) did not match any bundles`);
        }
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        totalErrors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: categorize_all 
          ? `Categorized ${totalCategorized} out of ${productsToProcess.length} products`
          : `Product categorized into ${results[0]?.bundles.length || 0} bundle(s)`,
        total_processed: productsToProcess.length,
        total_categorized: totalCategorized,
        total_errors: totalErrors,
        results: categorize_all ? undefined : results[0],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in categorize-products-to-bundles:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

