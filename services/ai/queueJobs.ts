
import { supabaseAdmin } from './config';

async function queueJobs() {
    console.log('[QueueJobs] Starting to queue active products...');

    // Fetch all active product IDs
    const { data: products, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('is_active', true);

    if (fetchError) {
        console.error('[QueueJobs] Error fetching products:', fetchError.message);
        return;
    }

    console.log(`[QueueJobs] Found ${products.length} active products.`);

    // Clear existing jobs for these products to ensure a fresh re-embedding run
    console.log('[QueueJobs] Clearing existing jobs for these products...');
    const { error: deleteError } = await supabaseAdmin
        .from('product_embedding_jobs')
        .delete()
        .in('product_id', products.map(p => p.id));

    if (deleteError) {
        console.error('[QueueJobs] Error clearing existing jobs:', deleteError.message);
        return;
    }

    // Insert into product_embedding_jobs
    const jobs = products.map(p => ({
        product_id: p.id,
        status: 'queued',
        attempts: 0
    }));

    const { error: insertError } = await supabaseAdmin
        .from('product_embedding_jobs')
        .insert(jobs);

    if (insertError) {
        console.error('[QueueJobs] Error inserting jobs:', insertError.message);
        return;
    }

    console.log('[QueueJobs] Successfully queued all jobs.');
}

queueJobs().catch(console.error);
