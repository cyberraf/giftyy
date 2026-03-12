-- Helper script to queue all active products for re-embedding
-- This uses the new narrative 'product_text' column for the vector search index.

INSERT INTO public.product_embedding_jobs (product_id, status, attempts)
SELECT id, 'queued', 0
FROM public.products
WHERE is_active = true
ON CONFLICT (product_id) 
DO UPDATE SET 
    status = 'queued',
    attempts = 0,
    updated_at = now();

SELECT count(*) as queued_jobs FROM public.product_embedding_jobs WHERE status = 'queued';
