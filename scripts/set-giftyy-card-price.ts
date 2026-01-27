/**
 * Simple script to set the Giftyy card price directly in the database
 * Run: npx tsx scripts/set-giftyy-card-price.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setGiftyyCardPrice() {
    console.log('🔍 Checking for giftyy_card_price...\n');

    // First, try to read the current value
    const { data: currentData, error: readError } = await supabase
        .from('global_vendor_settings')
        .select('*')
        .eq('key', 'giftyy_card_price')
        .maybeSingle();

    if (readError) {
        console.error('❌ Error reading from database:', readError.message);
        console.log('\n💡 The table might not exist yet. Please run the migration first:');
        console.log('   psql <your-database-url> -f supabase-migrations-global-vendor-settings.sql');
        return;
    }

    if (currentData) {
        console.log('✅ Found existing entry:');
        console.log(`   Current price: $${currentData.value}`);
        console.log(`   Description: ${currentData.description || 'N/A'}\n`);

        if (parseFloat(currentData.value) !== 3.00) {
            console.log('⚠️  Price is not $3.00. The app will use this value: $' + currentData.value);
            console.log('   If you want to change it, update it in your Supabase dashboard.');
        } else {
            console.log('✅ Price is correctly set to $3.00');
        }
    } else {
        console.log('⚠️  No entry found for giftyy_card_price');
        console.log('   The app will use the fallback default of $5.00\n');
        console.log('💡 To fix this, run the migration file or insert manually in Supabase:');
        console.log(`   INSERT INTO global_vendor_settings (key, value, description)`);
        console.log(`   VALUES ('giftyy_card_price', '3.00', 'Price for Giftyy Card');`);
    }
}

setGiftyyCardPrice().catch(console.error);
