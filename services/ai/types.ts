/**
 * types.ts
 * Shared types for the Giftyy AI + RAG layer.
 */

// ---------------------------------------------------------------------------
// RAG search inputs
// ---------------------------------------------------------------------------

export interface SearchProductsRAGParams {
  /** Free-text query that will be embedded and used for vector similarity */
  queryText: string;

  /**
   * Price upper-bound in major currency units (e.g. 49.99).
   * Alias convenience: you may pass `maxPriceCents` (integer cents) instead —
   * the service converts it to numeric automatically.
   */
  maxPrice?: number;
  maxPriceCents?: number;   // alternative: cents integer (e.g. 4999 → $49.99)
  minPrice?: number;
  minPriceCents?: number;

  /** Hard-filter: only products in this category */
  category?: string;
  /** Hard-filter: only products in this subcategory */
  subcategory?: string;

  /** Hard-filter: only products with gift_wrap_available = true */
  mustHaveGiftWrap?: boolean;
  /** Hard-filter: only products with personalization_supported = true */
  mustSupportPersonalization?: boolean;
  /** Hard-filter: only products with stock_quantity > 0 */
  requireInStock?: boolean;

  /**
   * Maximum number of products to return from the vector search.
   * These are passed to the LLM reranker, so 40-60 is a good range.
   * Default: 60
   */
  limit?: number;
}

// ---------------------------------------------------------------------------
// RAG product – minimal fields returned for LLM processing
// ---------------------------------------------------------------------------

export interface RagProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  images: unknown[];                // JSONB array of image objects
  tags: string[];
  category: string | null;
  subcategory: string | null;
  occasions: string[];
  recipient_types: string[];
  vibes: string[];
  interests: string[];
  gift_wrap_available: boolean;
  personalization_supported: boolean;
  vendor_id: string | null;
  /** Cosine distance to the query vector (0 = identical, 2 = opposite) */
  similarity_distance: number;
}
