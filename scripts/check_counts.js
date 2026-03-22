const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env parser
function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  });
  return env;
}

const env = parseEnv(path.join(process.cwd(), '.env.local'));
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCounts() {
  try {
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
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

checkCounts();
