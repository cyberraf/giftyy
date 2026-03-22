import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCounts() {
  // Find vendor profile
  const { data: vendor, error: vError } = await supabase
    .from('profiles')
    .select('id, store_name')
    .eq('store_name', 'GIFTYY Store')
    .single();

  if (vError) {
    console.error('Error finding vendor:', vError);
    process.exit(1);
  }

  console.log(`Found Vendor: ${vendor.store_name} (${vendor.id})`);

  // Count all products
  const { count: allCount, error: aError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id);

  if (aError) console.error('Error counting all products:', aError);
  else console.log(`Total products in database: ${allCount}`);

  // Count active products
  const { count: activeCount, error: acError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id)
    .eq('is_active', true);

  if (acError) console.error('Error counting active products:', acError);
  else console.log(`Active products in database: ${activeCount}`);

  // Count active & in-stock products
  const { count: inStockCount, error: isError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendor.id)
    .eq('is_active', true)
    .gt('stock_quantity', 0);

  if (isError) console.error('Error counting in-stock products:', isError);
  else console.log(`Active & In-stock products in database: ${inStockCount}`);
}

checkCounts();
