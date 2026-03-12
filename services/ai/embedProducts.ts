/**
 * embedProducts.ts
 *
 * Job runner: reads queued product_embedding_jobs (batch of 50), fetches each
 * product's search_text, calls OpenAI, writes the embedding vector back into
 * products, then marks the job done. On error it increments attempts and stores
 * the error message.  Jobs that have exceeded MAX_ATTEMPTS are left in 'error'
 * status so they can be inspected and retried manually.
 */

import {
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_MODEL,
  fetchEmbeddings,
  MAX_ATTEMPTS,
  supabaseAdmin,
} from './config';

// ---------------------------------------------------------------------------
// Types matching the DB schema from migrations
// ---------------------------------------------------------------------------
interface ProductEmbeddingJob {
  id: string;
  product_id: string;
  attempts: number;
}

interface ProductRow {
  id: string;
  product_text: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Claim a batch of queued jobs atomically (move to 'processing'). */
async function claimJobs(batchSize: number): Promise<ProductEmbeddingJob[]> {
  const { data, error } = await supabaseAdmin.rpc('claim_product_embedding_jobs', {
    p_batch_size: batchSize,
  });

  if (error) {
    // Fallback: manual claim with select + update (no stored proc yet)
    return claimJobsFallback(batchSize);
  }

  return (data as ProductEmbeddingJob[]) ?? [];
}

/** Manual claim (used if the RPC is not deployed). */
async function claimJobsFallback(batchSize: number): Promise<ProductEmbeddingJob[]> {
  // Select queued jobs that haven't exceeded max attempts
  const { data: jobs, error: selectError } = await supabaseAdmin
    .from('product_embedding_jobs')
    .select('id, product_id, attempts')
    .eq('status', 'queued')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (selectError || !jobs || jobs.length === 0) {
    if (selectError) console.error('[embedProducts] Select error:', selectError.message);
    return [];
  }

  const ids = jobs.map((j) => j.id);

  // Mark them as 'processing'
  const { error: updateError } = await supabaseAdmin
    .from('product_embedding_jobs')
    .update({ status: 'processing' })
    .in('id', ids);

  if (updateError) {
    console.error('[embedProducts] Failed to claim jobs:', updateError.message);
    return [];
  }

  return jobs as ProductEmbeddingJob[];
}

/** Fetch product rows for the given product IDs. */
async function fetchProducts(productIds: string[]): Promise<ProductRow[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, product_text')
    .in('id', productIds);

  if (error) throw new Error(`[embedProducts] fetchProducts error: ${error.message}`);
  return (data as ProductRow[]) ?? [];
}

/** Write embedding vector + metadata back to a product row. */
async function writeProductEmbedding(
  productId: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('products')
    .update({
      embedding: JSON.stringify(embedding),   // pgvector accepts JSON array
      embedding_model: EMBEDDING_MODEL,
      embedding_updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (error) throw new Error(`[embedProducts] write embedding failed (${productId}): ${error.message}`);
}

/** Mark a job as done. */
async function markJobDone(jobId: string): Promise<void> {
  await supabaseAdmin
    .from('product_embedding_jobs')
    .update({ status: 'done' })
    .eq('id', jobId);
}

/** Mark a job as failed and store the error message. */
async function markJobError(jobId: string, errorMsg: string, currentAttempts: number): Promise<void> {
  const newAttempts = currentAttempts + 1;
  await supabaseAdmin
    .from('product_embedding_jobs')
    .update({
      status: newAttempts >= MAX_ATTEMPTS ? 'error' : 'queued',
      error: errorMsg.slice(0, 1000),
      attempts: newAttempts,
    })
    .eq('id', jobId);
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export interface EmbedProductsResult {
  processed: number;
  failed: number;
  skipped: number;
}

export async function runEmbedProducts(): Promise<EmbedProductsResult> {
  console.log('[embedProducts] Starting product embedding run...');

  let totalProcessed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // Loop until there are no more queued jobs
  while (true) {
    const jobs = await claimJobs(EMBEDDING_BATCH_SIZE);

    if (jobs.length === 0) {
      console.log('[embedProducts] No queued jobs remaining. Done.');
      break;
    }

    console.log(`[embedProducts] Claimed ${jobs.length} jobs`);

    // Fetch the product rows for this batch
    const productIds = jobs.map((j) => j.product_id);
    const products = await fetchProducts(productIds);

    // Build a lookup by product_id
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Separate jobs into embeddable vs skippable (no search_text)
    const embeddable: { job: ProductEmbeddingJob; text: string }[] = [];
    for (const job of jobs) {
      const product = productMap.get(job.product_id);
      if (!product || !product.product_text?.trim()) {
        console.warn(`[embedProducts] No product_text for product ${job.product_id}, skipping`);
        await markJobError(job.id, 'Product has no product_text', job.attempts);
        totalSkipped++;
        continue;
      }
      embeddable.push({ job, text: product.product_text });
    }

    if (embeddable.length === 0) continue;

    // Call OpenAI with all texts in this sub-batch (max 50 at once)
    let vectors: number[][];
    try {
      vectors = await fetchEmbeddings(embeddable.map((e) => e.text));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[embedProducts] OpenAI batch call failed:', msg);
      // Mark all jobs in this batch as failed
      await Promise.all(
        embeddable.map(({ job }) => markJobError(job.id, msg, job.attempts))
      );
      totalFailed += embeddable.length;
      continue;
    }

    // Write results back individually (one DB update per product)
    await Promise.all(
      embeddable.map(async ({ job }, i) => {
        try {
          await writeProductEmbedding(job.product_id, vectors[i]);
          await markJobDone(job.id);
          totalProcessed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[embedProducts] Failed to write embedding for ${job.product_id}:`, msg);
          await markJobError(job.id, msg, job.attempts);
          totalFailed++;
        }
      })
    );

    console.log(
      `[embedProducts] Batch done — processed: ${totalProcessed}, failed: ${totalFailed}, skipped: ${totalSkipped}`
    );
  }

  return { processed: totalProcessed, failed: totalFailed, skipped: totalSkipped };
}
