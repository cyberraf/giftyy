/**
 * Direct insert script for giftyy_card_price
 * This uses the service role to bypass RLS and insert the value
 * Run: npx tsx scripts/insert-giftyy-price.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

// For this script, we'll need the service role key to bypass RLS
// You can find it in your Supabase dashboard under Settings > API
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function insertPrice() {
    console.log('🔐 This script needs your Supabase SERVICE ROLE KEY to insert the price.');
    console.log('   You can find it in: Supabase Dashboard > Settings > API > service_role key\n');

    rl.question('Enter your SERVICE ROLE KEY (or press Enter to skip): ', async (serviceKey) => {
        rl.close();

        if (!serviceKey || serviceKey.trim() === '') {
            console.log('\n📝 No service key provided. Here\'s what you can do:\n');
            console.log('Option 1: Run this SQL in your Supabase SQL Editor:');
            console.log('─'.repeat(60));
            console.log(`INSERT INTO global_vendor_settings (key, value, description)`);
            console.log(`VALUES ('giftyy_card_price', '3.00', 'Price for Giftyy Card (physical QR code card)')`);
            console.log(`ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
            console.log('─'.repeat(60));
            console.log('\nOption 2: Re-run this script with the service role key\n');
            return;
        }

        const supabase = createClient(SUPABASE_URL, serviceKey.trim());

        console.log('\n🚀 Inserting giftyy_card_price...');

        const { data, error } = await supabase
            .from('global_vendor_settings')
            .upsert({
                key: 'giftyy_card_price',
                value: '3.00',
                description: 'Price for Giftyy Card (physical QR code card)'
            }, {
                onConflict: 'key'
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }

        console.log('✅ Successfully set giftyy_card_price to $3.00!');
        console.log('\n📱 Restart your app to see the new price.');
    });
}

insertPrice().catch(console.error);
