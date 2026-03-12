/**
 * run.ts
 *
 * CLI entry point.
 *
 * Usage:
 *   npx ts-node services/ai/run.ts                   # runs both jobs
 *   npx ts-node services/ai/run.ts --products        # only products
 *   npx ts-node services/ai/run.ts --recipients      # only recipients
 *
 * Required environment variables (set in .env.local or your CI environment):
 *   SUPABASE_URL              – your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – service-role key (bypasses RLS)
 *   OPENAI_API_KEY            – OpenAI secret key
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables before doing any imports that depend on them
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { runEmbedProducts } from './embedProducts';
import { runEmbedRecipients } from './embedRecipients';

async function main() {
  const args = new Set(process.argv.slice(2));
  const runProducts = args.size === 0 || args.has('--products');
  const runRecipients = args.size === 0 || args.has('--recipients');

  console.log('=== Giftyy AI Embedding Service ===');
  console.log(`Run products:   ${runProducts}`);
  console.log(`Run recipients: ${runRecipients}`);
  console.log('');

  let productsResult = { processed: 0, failed: 0, skipped: 0 };
  let recipientsResult = { processed: 0, failed: 0, skipped: 0 };

  if (runProducts) {
    productsResult = await runEmbedProducts();
    console.log(`\n[Products]   processed=${productsResult.processed}  failed=${productsResult.failed}  skipped=${productsResult.skipped}`);
  }

  if (runRecipients) {
    recipientsResult = await runEmbedRecipients();
    console.log(`[Recipients] processed=${recipientsResult.processed}  failed=${recipientsResult.failed}  skipped=${recipientsResult.skipped}`);
  }

  const anyFailed = productsResult.failed > 0 || recipientsResult.failed > 0;
  console.log('\n=== Done ===');
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error('[run] Unhandled error:', err);
  process.exit(1);
});
