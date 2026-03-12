/**
 * recommender.ts
 *
 * Orchestrates the full Giftyy AI gift recommendation pipeline:
 *   1. Load recipient_preferences (profile_text + sensitivity fields)
 *   2. Build an intent string
 *   3. Retrieve RAG candidates via searchProductsRAG
 *   4. Call OpenAI gpt-4o with a strict structured JSON prompt
 *   5. Parse + validate the response
 *   6. Return typed RecommenderOutput
 *
 * This module is pure TypeScript (no Deno-specific APIs) so it can be tested
 * locally with ts-node and re-used from the Edge Function.
 */

import { supabaseAdmin } from './config';
import { searchProductsRAG } from './searchProductsRAG';
import type { RagProduct } from './types';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Public input / output types
// ---------------------------------------------------------------------------

export interface RecommenderParams {
  userId: string;
  /** UUID of the recipient_preferences row */
  recipientProfileId: string;
  occasion: string;
  /** Budget in major currency units (e.g. 49.99) */
  budget: number;
  freeText?: string;
  constraints?: {
    gift_wrap_required?: boolean;
    personalization_required?: boolean;
    /** If set, adds context to the prompt; not a hard DB filter (stock may vary) */
    shipping_deadline_days?: number;
  };
}

export interface RecommendedProduct {
  product_id: string;
  title: string;
  reason_1: string;
  reason_2: string;
  fit_tags: string[];
  price: number;
  confidence_0_1: number;
}

export interface RecommenderOutput {
  /** Present only when the LLM needs clarification before making suggestions */
  clarifying_questions: string[];
  /** 3–5 ranked gift recommendations */
  recommendations: RecommendedProduct[];
  /** Short 2-4 sentence video message script the buyer can read */
  message_script: string;
  /** Warnings about recipient sensitivities / dislikes to avoid */
  cautions: string[];
  /** Total RAG candidates passed to the LLM */
  candidates_evaluated: number;
}

// ---------------------------------------------------------------------------
// Recipient preferences row (minimal shape we need)
// ---------------------------------------------------------------------------

interface RecipientPreferencesRow {
  id: string;
  profile_text: string | null;
  gift_dislikes: unknown;         // JSONB string[]
  food_allergies: unknown;        // JSONB string[]
  scent_sensitivities: unknown;   // JSONB string[]
  material_sensitivities: unknown;// JSONB string[]
  dietary_preferences: unknown;   // JSONB string[]
}

// ---------------------------------------------------------------------------
// Step 1: load recipient preferences
// ---------------------------------------------------------------------------

async function loadRecipientPreferences(
  recipientProfileId: string
): Promise<RecipientPreferencesRow | null> {
  const { data, error } = await supabaseAdmin
    .from('recipient_preferences')
    .select(
      'id, profile_text, gift_dislikes, food_allergies, scent_sensitivities, material_sensitivities, dietary_preferences'
    )
    .eq('id', recipientProfileId)
    .maybeSingle();

  if (error) throw new Error(`[recommender] load recipient error: ${error.message}`);
  return data as RecipientPreferencesRow | null;
}

// ---------------------------------------------------------------------------
// Step 2: build intent string
// ---------------------------------------------------------------------------

function buildIntentString(
  params: RecommenderParams,
  profileText: string | null
): string {
  const parts: string[] = [
    `Occasion: ${params.occasion}`,
    `Budget: $${params.budget.toFixed(2)}`,
  ];

  if (profileText?.trim()) {
    parts.push(`Recipient profile: ${profileText.trim()}`);
  }

  if (params.freeText?.trim()) {
    parts.push(`Buyer notes: ${params.freeText.trim()}`);
  }

  const c = params.constraints ?? {};
  const constraintParts: string[] = [];
  if (c.gift_wrap_required) constraintParts.push('gift wrap required');
  if (c.personalization_required) constraintParts.push('personalization required');
  if (c.shipping_deadline_days != null)
    constraintParts.push(`must ship within ${c.shipping_deadline_days} days`);
  if (constraintParts.length > 0) {
    parts.push(`Constraints: ${constraintParts.join(', ')}`);
  }

  return parts.join('; ');
}

// ---------------------------------------------------------------------------
// Step 3: serialize candidates for the LLM prompt (compact but informative)
// ---------------------------------------------------------------------------

function serializeCandidates(products: RagProduct[]): string {
  return JSON.stringify(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      description: p.description?.slice(0, 200) ?? '',
      category: p.category,
      subcategory: p.subcategory,
      occasions: p.occasions,
      recipient_types: p.recipient_types,
      vibes: p.vibes,
      interests: p.interests,
      tags: p.tags,
      gift_wrap: p.gift_wrap_available,
      personalization: p.personalization_supported,
      similarity_distance: Number(p.similarity_distance.toFixed(4)),
    }))
  );
}

// ---------------------------------------------------------------------------
// Step 4 + 5: call OpenAI and parse the structured response
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Giftyy AI Gift Strategist — an expert in personalised gift selection.

RULES (non-negotiable):
1. You MUST only recommend products from the CANDIDATE LIST provided. Do NOT invent or hallucinate products.
2. Select 3 to 5 products that best match the recipient profile and occasion. Fewer than 3 only if candidates are genuinely insufficient.
3. Rank by fit quality, not by similarity_distance alone.
4. Respect ALL constraints stated by the buyer (budget, gift wrap, personalization, shipping).
5. If critical information is missing and you cannot make good recommendations, return clarifying_questions instead of bad recommendations. Do not return both.
6. cautions MUST list any concerns from the recipient profile (allergies, dislikes, sensitivities) that the buyer should know about.
7. message_script must be warm, personal, 2-4 sentences, suitable to read aloud on a short video.
8. confidence_0_1 reflects your genuine certainty that this product fits (0.0 = guess, 1.0 = perfect match).

OUTPUT FORMAT — respond with a single JSON object, no markdown, no extra text:
{
  "clarifying_questions": [],
  "recommendations": [
    {
      "product_id": "<uuid from candidate list>",
      "title": "<product name>",
      "reason_1": "<primary fit reason>",
      "reason_2": "<secondary fit reason>",
      "fit_tags": ["<tag>"],
      "price": 0.00,
      "confidence_0_1": 0.0
    }
  ],
  "message_script": "<2-4 sentence video script>",
  "cautions": ["<caution>"]
}`;

async function callOpenAI(
  intentString: string,
  candidatesJson: string,
  recipient: RecipientPreferencesRow | null
): Promise<RecommenderOutput & { candidates_evaluated: number }> {
  const candidateCount = JSON.parse(candidatesJson).length;

  // Build sensitivity context for the prompt
  const sensitivityLines: string[] = [];
  function jsonArrayToString(val: unknown): string {
    if (!Array.isArray(val)) return '';
    return val.join(', ');
  }
  if (recipient) {
    const dislikes = jsonArrayToString(recipient.gift_dislikes);
    const allergies = jsonArrayToString(recipient.food_allergies);
    const scents = jsonArrayToString(recipient.scent_sensitivities);
    const materials = jsonArrayToString(recipient.material_sensitivities);
    const dietary = jsonArrayToString(recipient.dietary_preferences);
    if (dislikes) sensitivityLines.push(`Gift dislikes: ${dislikes}`);
    if (allergies) sensitivityLines.push(`Food allergies: ${allergies}`);
    if (scents) sensitivityLines.push(`Scent sensitivities: ${scents}`);
    if (materials) sensitivityLines.push(`Material sensitivities: ${materials}`);
    if (dietary) sensitivityLines.push(`Dietary preferences: ${dietary}`);
  }

  const userMessage = [
    `=== BUYER REQUEST ===`,
    intentString,
    '',
    sensitivityLines.length > 0
      ? `=== RECIPIENT SENSITIVITIES (avoid these in your selection) ===\n${sensitivityLines.join('\n')}\n`
      : '',
    `=== CANDIDATE PRODUCTS (${candidateCount} items, ordered by embedding similarity) ===`,
    candidatesJson,
    '',
    `Select 3-5 best gifts. Respond with the JSON object only.`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.3,       // low temp for consistent structured output
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[recommender] OpenAI error ${response.status}: ${err}`);
  }

  const json = await response.json() as {
    choices: { message: { content: string } }[];
  };

  const raw = json.choices?.[0]?.message?.content;
  if (!raw) throw new Error('[recommender] OpenAI returned empty content');

  return parseAndValidateOutput(raw, candidateCount);
}

// ---------------------------------------------------------------------------
// Parse + validate LLM output
// ---------------------------------------------------------------------------

function parseAndValidateOutput(
  raw: string,
  candidateCount: number
): RecommenderOutput & { candidates_evaluated: number } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[recommender] Failed to parse LLM JSON: ${raw.slice(0, 300)}`);
  }

  const clarifying_questions = Array.isArray(parsed.clarifying_questions)
    ? (parsed.clarifying_questions as string[])
    : [];

  const rawRecs = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
    : [];

  const recommendations: RecommendedProduct[] = rawRecs
    .filter(
      (r): r is Record<string, unknown> =>
        typeof r === 'object' && r !== null && typeof r.product_id === 'string'
    )
    .slice(0, 5)
    .map((r) => ({
      product_id: String(r.product_id),
      title: String(r.title ?? ''),
      reason_1: String(r.reason_1 ?? ''),
      reason_2: String(r.reason_2 ?? ''),
      fit_tags: Array.isArray(r.fit_tags) ? (r.fit_tags as string[]) : [],
      price: typeof r.price === 'number' ? r.price : 0,
      confidence_0_1: typeof r.confidence_0_1 === 'number'
        ? Math.min(1, Math.max(0, r.confidence_0_1))
        : 0,
    }));

  const message_script = typeof parsed.message_script === 'string'
    ? parsed.message_script
    : '';

  const cautions = Array.isArray(parsed.cautions)
    ? (parsed.cautions as string[])
    : [];

  return {
    clarifying_questions,
    recommendations,
    message_script,
    cautions,
    candidates_evaluated: candidateCount,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function getRecommendations(
  params: RecommenderParams
): Promise<RecommenderOutput> {
  const { budget, constraints } = params;

  // 1. Load recipient preferences
  const recipient = await loadRecipientPreferences(params.recipientProfileId);

  // 2. Build intent string
  const intentString = buildIntentString(params, recipient?.profile_text ?? null);

  // 3. RAG retrieval
  const candidates: RagProduct[] = await searchProductsRAG({
    queryText: intentString,
    maxPrice: budget,
    mustHaveGiftWrap: constraints?.gift_wrap_required || undefined,
    mustSupportPersonalization: constraints?.personalization_required || undefined,
    requireInStock: true,
    limit: 60,
  });

  if (candidates.length === 0) {
    return {
      clarifying_questions: [],
      recommendations: [],
      message_script: '',
      cautions: [],
      candidates_evaluated: 0,
    };
  }

  // 4 + 5. Call LLM, parse, return
  const candidatesJson = serializeCandidates(candidates);
  const output = await callOpenAI(intentString, candidatesJson, recipient);

  return output;
}
