/**
 * Script to seed initial QR card inventory
 * 
 * Usage:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * 2. Run: npx tsx scripts/seed-qr-cards.ts --count 1000
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEFAULT_COUNT = 100;

// Parse command line arguments
const args = process.argv.slice(2);
const countArg = args.find(arg => arg.startsWith('--count='));
const count = countArg ? parseInt(countArg.split('=')[1]) : DEFAULT_COUNT;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate a unique public token for a QR card
 * Format: GFT-XXXXXXXX (8 random uppercase alphanumeric characters)
 */
function generatePublicToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'GFT-';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    token += chars[randomIndex];
  }
  
  return token;
}

/**
 * Check if a token already exists in the database
 */
async function tokenExists(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('giftyy_cards')
    .select('id')
    .eq('public_token', token)
    .single();
  
  return !!data && !error;
}

/**
 * Generate a batch of unique tokens
 */
async function generateUniqueTokens(count: number): Promise<string[]> {
  const tokens: Set<string> = new Set();
  let attempts = 0;
  const maxAttempts = count * 10; // Prevent infinite loop
  
  while (tokens.size < count && attempts < maxAttempts) {
    const token = generatePublicToken();
    
    // Check local uniqueness first
    if (tokens.has(token)) {
      attempts++;
      continue;
    }
    
    // Check database uniqueness
    const exists = await tokenExists(token);
    if (!exists) {
      tokens.add(token);
    }
    
    attempts++;
    
    // Progress indicator
    if (tokens.size % 10 === 0) {
      process.stdout.write(`\rGenerating tokens... ${tokens.size}/${count}`);
    }
  }
  
  console.log(); // New line after progress
  
  if (tokens.size < count) {
    console.warn(`⚠️  Warning: Only generated ${tokens.size} unique tokens out of ${count} requested`);
  }
  
  return Array.from(tokens);
}

/**
 * Insert QR cards in batches
 */
async function insertQRCards(tokens: string[], batchSize: number = 100): Promise<void> {
  const totalBatches = Math.ceil(tokens.length / batchSize);
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    const rows = batch.map(token => ({
      public_token: token,
      status: 'inactive' as const,
    }));
    
    const { data, error } = await supabase
      .from('giftyy_cards')
      .insert(rows)
      .select();
    
    if (error) {
      console.error(`❌ Error inserting batch ${batchNumber}/${totalBatches}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data?.length || 0;
      process.stdout.write(`\rInserting cards... ${successCount}/${tokens.length}`);
    }
  }
  
  console.log(); // New line after progress
  console.log(`\n✅ Successfully inserted ${successCount} QR cards`);
  
  if (errorCount > 0) {
    console.log(`❌ Failed to insert ${errorCount} QR cards`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎁 Giftyy QR Card Seeder\n');
  console.log(`Generating ${count} QR cards...\n`);
  
  try {
    // Step 1: Generate unique tokens
    console.log('Step 1: Generating unique tokens...');
    const tokens = await generateUniqueTokens(count);
    console.log(`✅ Generated ${tokens.length} unique tokens\n`);
    
    // Step 2: Insert into database
    console.log('Step 2: Inserting QR cards into database...');
    await insertQRCards(tokens);
    
    // Step 3: Verify
    console.log('\nStep 3: Verifying...');
    const { count: totalCount, error: countError } = await supabase
      .from('giftyy_cards')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting cards:', countError.message);
    } else {
      console.log(`✅ Total QR cards in database: ${totalCount}\n`);
    }
    
    console.log('🎉 QR card seeding complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main();

