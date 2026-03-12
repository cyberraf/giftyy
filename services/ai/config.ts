import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
console.log('Dotenv Load Result:', result.error ? result.error : 'Success');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
console.log('Read EXPO_PUBLIC_SUPABASE_URL directly after dotenv:', process.env.EXPO_PUBLIC_SUPABASE_URL);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

if (!SUPABASE_URL) throw new Error('[AI Service] SUPABASE_URL is not set (read: ' + SUPABASE_URL + ')');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('[AI Service] SUPABASE_SERVICE_ROLE_KEY is not set');
if (!OPENAI_API_KEY) throw new Error('[AI Service] OPENAI_API_KEY is not set');

// ---------------------------------------------------------------------------
// Supabase – service-role client (bypasses RLS for background job access)
// ---------------------------------------------------------------------------
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------------------------------------------------------------------------
// OpenAI embeddings helper
// ---------------------------------------------------------------------------
export const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536-dim, fast, cheap
export const EMBEDDING_BATCH_SIZE = 50;                  // rows per job batch
export const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
export const MAX_ATTEMPTS = 3;

/**
 * Calls the OpenAI Embeddings API for a batch of texts.
 * Returns vectors in the same order as the input array.
 */
export async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[OpenAI] Embeddings API error ${response.status}: ${error}`);
  }

  const json = await response.json() as {
    data: { index: number; embedding: number[] }[];
  };

  // Sort by index to guarantee order matches input
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
