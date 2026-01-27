/**
 * Script to check and set the Giftyy card price in global_vendor_settings
 * 
 * Usage:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 2. Run: npx tsx scripts/check-giftyy-card-price.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    console.log('Please set them in .env.local file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAndSetGiftyyCardPrice() {
    console.log('🔍 Checking global_vendor_settings table...\n');

    // Check if the table exists and what's in it
    const { data: allSettings, error: fetchError } = await supabase
        .from('global_vendor_settings')
        .select('*');

    if (fetchError) {
        console.error('❌ Error fetching settings:', fetchError);

        // Check if table doesn't exist
        if (fetchError.code === '42P01') {
            console.log('\n📝 Table does not exist. Creating global_vendor_settings table...');

            const { error: createError } = await supabase.rpc('exec_sql', {
                sql: `
          CREATE TABLE IF NOT EXISTS global_vendor_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
            });

            if (createError) {
                console.error('❌ Could not create table:', createError);
                return;
            }

            console.log('✅ Table created successfully');
        } else {
            return;
        }
    } else {
        console.log('📊 Current settings in table:');
        console.table(allSettings);
    }

    // Check for giftyy_card_price specifically
    const { data: priceData, error: priceError } = await supabase
        .from('global_vendor_settings')
        .select('*')
        .eq('key', 'giftyy_card_price')
        .single();

    if (priceError && priceError.code !== 'PGRST116') {
        console.error('\n❌ Error checking giftyy_card_price:', priceError);
        return;
    }

    if (!priceData) {
        console.log('\n⚠️  giftyy_card_price not found. Inserting default value of $3.00...');

        const { data: insertData, error: insertError } = await supabase
            .from('global_vendor_settings')
            .insert({
                key: 'giftyy_card_price',
                value: '3.00',
                description: 'Price for Giftyy Card (physical QR code card)'
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Error inserting giftyy_card_price:', insertError);
            return;
        }

        console.log('✅ Successfully inserted giftyy_card_price:', insertData);
    } else {
        console.log('\n✅ giftyy_card_price found:');
        console.log(`   Key: ${priceData.key}`);
        console.log(`   Value: $${priceData.value}`);
        console.log(`   Description: ${priceData.description || 'N/A'}`);

        // Ask if they want to update it
        const currentPrice = parseFloat(priceData.value);
        if (currentPrice === 5.00) {
            console.log('\n⚠️  Current price is $5.00. You may want to update it to $3.00');
            console.log('   To update, run this SQL in Supabase:');
            console.log(`   UPDATE global_vendor_settings SET value = '3.00' WHERE key = 'giftyy_card_price';`);
        }
    }

    console.log('\n✅ Done!');
}

checkAndSetGiftyyCardPrice().catch(console.error);
