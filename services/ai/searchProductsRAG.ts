/**
 * searchProductsRAG.ts
 *
 * RAG retrieval step: embeds a free-text query, runs HNSW cosine-distance
 * vector search on products.embedding via the `match_products_rag` Supabase
 * RPC, applies hard pre-filters, and returns ranked RagProduct rows ready for
 * the LLM reranker.
 */

import { fetchEmbeddings, supabaseAdmin } from './config';
import type { RagProduct, SearchProductsRAGParams } from './types';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_LIMIT = 60;

// ---------------------------------------------------------------------------
// Normalise price inputs
// Accepts either `maxPrice` (numeric) or `maxPriceCents` (integer cents).
// Returns numeric in major currency units (e.g. 49.99).
// ---------------------------------------------------------------------------
function resolvePrice(
  major: number | undefined,
  cents: number | undefined
): number | null {
  if (major !== undefined) return major;
  if (cents !== undefined) return cents / 100;
  return null;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function searchProductsRAG(
  params: SearchProductsRAGParams
): Promise<RagProduct[]> {
  const {
    queryText,
    maxPrice,
    maxPriceCents,
    minPrice,
    minPriceCents,
    category,
    subcategory,
    mustHaveGiftWrap,
    mustSupportPersonalization,
    requireInStock = false,
    limit = DEFAULT_LIMIT,
  } = params;

  if (!queryText?.trim()) {
    throw new Error('[searchProductsRAG] queryText must be a non-empty string');
  }
  if (limit < 1 || limit > 200) {
    throw new Error('[searchProductsRAG] limit must be between 1 and 200');
  }

  // 1. Embed the query text
  const vectors = await fetchEmbeddings([queryText.trim()]);
  const queryEmbedding = vectors[0];

  // 2. Resolve price bounds
  const resolvedMinPrice = resolvePrice(minPrice, minPriceCents);
  const resolvedMaxPrice = resolvePrice(maxPrice, maxPriceCents);

  if (
    resolvedMinPrice !== null &&
    resolvedMaxPrice !== null &&
    resolvedMinPrice > resolvedMaxPrice
  ) {
    throw new Error('[searchProductsRAG] minPrice must be <= maxPrice');
  }

  // 3. Call the Supabase RPC (match_products_rag SQL function)
  const { data, error } = await supabaseAdmin.rpc('match_products_rag', {
    p_query_embedding:  queryEmbedding,
    p_limit:            limit,
    p_min_price:        resolvedMinPrice,
    p_max_price:        resolvedMaxPrice,
    p_category:         category ?? null,
    p_subcategory:      subcategory ?? null,
    p_gift_wrap:        mustHaveGiftWrap ?? null,
    p_personalization:  mustSupportPersonalization ?? null,
    p_require_in_stock: requireInStock,
  });

  if (error) {
    throw new Error(`[searchProductsRAG] RPC error: ${error.message}`);
  }

  return (data as RagProduct[]) ?? [];
}

// ---------------------------------------------------------------------------
// Convenience: search using a pre-built recipient profile text instead of a
// raw query string.  Useful when calling from the reranker with a recipient.
// ---------------------------------------------------------------------------
export async function searchProductsForRecipient(
  profileText: string,
  overrides: Omit<SearchProductsRAGParams, 'queryText'> = {}
): Promise<RagProduct[]> {
  return searchProductsRAG({ ...overrides, queryText: profileText });
}
