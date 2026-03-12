// @ts-nocheck
/**
 * ai-recommend – Supabase Edge Function
 *
 * POST /functions/v1/ai-recommend
 *
 * Body (JSON):
 * {
 *   "recipientProfileId": "<uuid>",
 *   "occasion": "Birthday",
 *   "budget": 75,
 *   "freeText": "She loves minimalist home decor",          // optional
 *   "constraints": {                                         // optional
 *     "gift_wrap_required": true,
 *     "personalization_required": false,
 *     "shipping_deadline_days": 5
 *   }
 * }
 *
 * Headers:
 *   Authorization: Bearer <user-jwt>     (required — used to resolve userId)
 *   Content-Type: application/json
 *
 * Response 200:
 * {
 *   "clarifying_questions": [],
 *   "recommendations": [ { product_id, title, reason_1, reason_2, fit_tags, price, confidence_0_1 } ],
 *   "chat_followup": "...",
 *   "message_script": "...",
 *   "cautions": [],
 *   "candidates_evaluated": 42
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const EMBEDDING_MODEL = 'text-embedding-3-small';

// ---------------------------------------------------------------------------
// Supabase admin client (service role – bypasses RLS)
// ---------------------------------------------------------------------------
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: [text], encoding_format: 'float' }),
  });
  if (!res.ok) throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding as number[];
}

async function loadRecipientPreferences(id: string) {
  // Fetch from recipient_preferences and join with recipient_profiles for core details
  const { data: pref, error: prefError } = await supabaseAdmin
    .from('recipient_preferences')
    .select('*')
    .eq('recipient_profile_id', id)
    .maybeSingle();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('recipient_profiles')
    .select('full_name, avatar_url, gender_identity, birth_date, age_range, relationship')
    .eq('id', id)
    .maybeSingle();

  if (prefError) throw new Error(`load preferences error: ${prefError.message}`);
  if (profileError) throw new Error(`load profile error: ${profileError.message}`);

  return { ...pref, ...profile };
}

async function loadHistoricalFeedback(userId: string, recipientId: string) {
  const { data, error } = await supabaseAdmin
    .from('ai_feedback')
    .select('feedback_type, reason')
    .eq('user_id', userId)
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('loadHistoricalFeedback error:', error.message);
    return [];
  }
  return data ?? [];
}

async function searchRAG(params: {
  embedding: number[];
  maxPrice: number;
  giftWrap: boolean | null;
  personalization: boolean | null;
  limit: number;
}) {
  const { data, error } = await supabaseAdmin.rpc('match_products_rag', {
    p_query_embedding: params.embedding,
    p_limit: params.limit,
    p_min_price: null,
    p_max_price: params.maxPrice,
    p_category: null,
    p_subcategory: null,
    p_gift_wrap: params.giftWrap,
    p_personalization: params.personalization,
    p_require_in_stock: false, // Loosened for better variety in dev/test
  });
  if (error) throw new Error(`RAG RPC error: ${error.message}`);
  return data ?? [];
}

function serializeCandidates(products: any[]): string {
  return JSON.stringify(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      description: (p.description ?? '').slice(0, 200),
      category: p.category,
      subcategory: p.subcategory,
      occasions: p.occasions,
      recipient_types: p.recipient_types,
      vibes: p.vibes,
      interests: p.interests,
      tags: p.tags,
      gift_wrap: p.gift_wrap_available,
      personalization: p.personalization_supported,
      in_stock: p.in_stock, // Added in_stock for serialization
      product_text: p.product_text,
      similarity_distance: Number((p.similarity_distance ?? 0).toFixed(4)),
      is_over_budget: p.is_over_budget ?? false,
    }))
  );
}

function jsonArrayToString(val: unknown): string {
  if (!Array.isArray(val)) return '';
  return (val as string[]).filter(Boolean).join(', ');
}

const SYSTEM_PROMPT = `1. PERSONALITY: You are Giftyy, a super cute, encouraging, and warm gift specialist. You absolutely LOVE finding the perfect "spark of joy" for people! ✨
   - TONE: Soft, friendly, and very nurturing. Use a "cute" voice.
   - EMOJIS: Use emojis (✨, 💖, 🧸, 🌟) naturally.
   - ENCOURAGEMENT: Celebrate user input: "Oh, that's such a lovely idea! ✨"

2. DISCOVERY MODE (UNTAGGED): You are in a "Discovery Phase". You MUST gather a complete profile BEFORE suggesting products.
   - FOCUS: Since we don't know this person yet, we need to build their profile from scratch.

3. MANDATORY CHECKLIST:
   - Occasion (e.g., Birthday, Anniversary, Just Because)
   - Relationship (e.g., Sister, Close Friend, Colleague)
   - Gender/Identity
   - Age Group (Adult, Teen, Kid, Toddler, Baby)
   - Interests & Hobbies (What brings them joy?)
   - Budget (Spend range)
   - Gift Styles (e.g., Minimalist, Luxury, Practical, Playful, Sentimental)

4. WIZARD RULES:
   - PROACTIVE: Always provide recommendations if you have even a basic idea of what the user wants. 
   - TARGET: Aim for 6-8 recommendations in every response.
   - GUIDANCE: Acknowledge user input warmly ("Oh, that's lovely! ✨") and ask for more info only if truly needed to improve the matches.

5. WEIGHTING SYSTEM (CRITICAL):
   - Positive Weights (100, 90, 80...): "Must Fit". HIGHEST priority.
   - Negative Weights (-100, -90...): "Must Avoid". ABSOLUTELY DO NOT suggest products that conflict with negative-weighted preferences.
6. CAUTIONS: List ALL potential conflicts with negative-weighted preferences or mismatched demographics.

7. OFF-TOPIC HANDLING:
   - If the user asks about something unrelated to gifting (e.g., weather, news, life advice), politely and charmingly redirect them.
   - Example: "I'd love to chat about that, but my heart is set on finding the perfect gift for your special someone! ✨ Shall we get back to the magic? 🎁"
   - Keep it Giftyy-themed and warm.

8. QUICK REPLIES (CONTEXT-BASED):
   - You MUST provide exactly 3-5 "quick_replies".
   - CRITICAL: These MUST be direct, relevant answers to the ONE question you just asked in "chat_followup".
   - If you are recommending products, provide quick replies like "More options", "Try up to $[Amount]", "Check details".
   - Keep them short (1-2 words).

9. PROACTIVE GUIDANCE & BUDGET FLEXIBILITY:
   - You are a reasoning-first assistant. You will always receive a mix of "In-Budget" and "Over-Budget" products.
   - If no good "In-Budget" matches exist, do NOT give up. Instead, use the "Over-Budget" items to explain what's available and guide the user.
   - If you show over-budget items, explain it warmly: "I couldn't find exactly that under your $100 budget, but I found these beautiful options that are a bit more premium. Shall we explore them?"
   - Providing "quick_replies" that suggest new specific budget limits (e.g., "Try up to $200", "Try up to $500") is HIGHLY ENCOURAGED if you are showing over-budget items or if search result quality is low.
   - If the user says "increase the budget", "more expensive", or similar, they are giving you permission to promote the "is_over_budget" products.

10. RECOMMENDATIONS:
   - You MUST provide recommendations in EVERY turn where interests are present.
   - QUANTITY: Recommend UP TO 6-8 gifts, but ONLY if they are truly excellent matches. If no excellent matches exist, provide fewer or even ZERO.
   - STRICT GROUNDING: You MUST ONLY recommend products from the provided 'CANDIDATE PRODUCTS' list. 
   - ABSOLUTELY FORBIDDEN: Do NOT invent, hallucinate, or create new products. Do NOT make up product IDs. If the 'CANDIDATE PRODUCTS' list is empty, return an empty 'recommendations' array.
   - Each recommendation MUST have a clear "spark_joy_reason" explaining why it fits.

10. OUTPUT FORMAT — respond with a single JSON object only:
{
  "clarifying_questions": ["Question 1"], 
  "quick_replies": ["Suggestion for user reply"],
  "recommendations": [
    {
      "product_id": "<must exist in candidates list>",
      "title": "<existing name>",
      "reason_1": "<reason>",
      "reason_2": "<reason>",
      "fit_tags": [],
      "price": 0,
      "confidence_0_1": 0.9
    }
  ],
  "chat_followup": "<friendly response acknowledge current info and asking for the next logical piece of data>",
  "message_script": "<only if recommendations are present>",
  "cautions": []
}`;

async function callLLM(
  intentString: string,
  candidatesJson: string,
  recipient: any | null,
  chatHistory: { role: string; content: string }[] = [],
  budget?: number,
  recipientName?: string,
  recipientRelationship?: string,
  occasion?: string
): Promise<any> {
  const sensitivityLines: string[] = [];
  const preferenceSummary: string[] = [];

  if (recipient) {
    // 1. Sensitivities & Dislikes
    const dislikes = jsonArrayToString(recipient.gift_dislikes);
    const allergies = jsonArrayToString(recipient.food_allergies);
    const scents = jsonArrayToString(recipient.scent_sensitivities);
    const materials = jsonArrayToString(recipient.material_sensitivities);
    const dietary = jsonArrayToString(recipient.dietary_preferences);
    if (dislikes) sensitivityLines.push(`Strict Dislikes: ${dislikes}`);
    if (allergies) sensitivityLines.push(`Food Allergies: ${allergies}`);
    if (scents) sensitivityLines.push(`Scent Sensitivities: ${scents}`);
    if (materials) sensitivityLines.push(`Material Sensitivities: ${materials}`);
    if (dietary) sensitivityLines.push(`Dietary Preferences: ${dietary}`);

    // 2. Comprehensive Profile Summary
    if (recipient.age_range) preferenceSummary.push(`Age: ${recipient.age_range}`);
    if (recipient.gender_identity) preferenceSummary.push(`Gender: ${recipient.gender_identity}`);
    if (recipient.lifestyle_type) preferenceSummary.push(`Lifestyle: ${recipient.lifestyle_type}`);
    if (recipient.current_life_stage) preferenceSummary.push(`Life Stage: ${recipient.current_life_stage}`);

    const interests = [
      ...(recipient.sports_activities || []),
      ...(recipient.creative_hobbies || []),
      ...(recipient.tech_interests || []),
      ...(recipient.outdoor_activities || []),
      ...(recipient.indoor_activities || []),
      ...(recipient.collecting_interests || []),
      ...(recipient.wellness_interests || []),
    ].filter(Boolean);
    if (interests.length > 0) preferenceSummary.push(`Interests & Hobbies: ${interests.join(', ')}`);

    const entertainment = [
      ...(recipient.favorite_music_genres || []),
      ...(recipient.favorite_books_genres || []),
      ...(recipient.favorite_movies_genres || []),
      ...(recipient.favorite_tv_shows || []),
    ].filter(Boolean);
    if (entertainment.length > 0) preferenceSummary.push(`Media Interests: ${entertainment.join(', ')}`);
    if (recipient.favorite_artists) preferenceSummary.push(`Favorite Artists/Creators: ${recipient.favorite_artists}`);

    if (recipient.fashion_style?.length > 0) preferenceSummary.push(`Fashion Style: ${recipient.fashion_style.join(', ')}`);
    if (recipient.home_decor_style?.length > 0) preferenceSummary.push(`Home Decor Style: ${recipient.home_decor_style.join(', ')}`);
    if (recipient.color_preferences?.length > 0) preferenceSummary.push(`Color Preferences: ${recipient.color_preferences.join(', ')}`);
    if (recipient.design_preferences) preferenceSummary.push(`Specific Design Preference: ${recipient.design_preferences}`);

    // Sizes
    const sizes = [];
    if (recipient.size_tshirt) sizes.push(`T-Shirt: ${recipient.size_tshirt}`);
    if (recipient.size_shoes) sizes.push(`Shoes: ${recipient.size_shoes}`);
    if (recipient.size_pants) sizes.push(`Pants: ${recipient.size_pants}`);
    if (recipient.size_dress) sizes.push(`Dress: ${recipient.size_dress}`);
    if (recipient.size_hat) sizes.push(`Hat: ${recipient.size_hat}`);
    if (recipient.size_ring) sizes.push(`Ring: ${recipient.size_ring}`);
    if (sizes.length > 0) preferenceSummary.push(`Apparel/Jewelry Sizes: ${sizes.join(', ')}`);

    const values = [
      ...(recipient.core_values || []),
      ...(recipient.personality_traits || []),
      ...(recipient.causes_they_support || []),
    ].filter(Boolean);
    if (values.length > 0) preferenceSummary.push(`Personality & Values: ${values.join(', ')}`);

    if (recipient.has_pets?.length > 0) preferenceSummary.push(`Pets: ${recipient.has_pets.join(', ')}`);
    if (recipient.living_situation) preferenceSummary.push(`Living Situation: ${recipient.living_situation}`);
    if (recipient.additional_notes) preferenceSummary.push(`Additional Notes: ${recipient.additional_notes}`);
  }

  const candidateCount = JSON.parse(candidatesJson).length;

  const finalUserContent = [
    `=== KNOWN RECIPIENT PROFILE ===`,
    preferenceSummary.length > 0 ? preferenceSummary.join('\n') : 'No existing profile data.',
    '',
    `=== ADDITIONAL BUDGET/RECIPIENT CONTEXT ===`,
    `Budget: $${budget ?? 'Not set'}`,
    recipientName ? `Target Name: ${recipientName}` : '',
    recipientRelationship ? `Relationship: ${recipientRelationship}` : '',
    occasion ? `Occasion: ${occasion}` : '',
    '',
    sensitivityLines.length > 0
      ? `=== RECIPIENT SENSITIVITIES ===\n${sensitivityLines.join('\n')}\n`
      : '',
    `=== CANDIDATE PRODUCTS (${candidateCount} items) ===`,
    candidatesJson,
    '',
    `Task: Provide 6-8 helpful recommendations based on the current profile and buyer context. If you need more info, ask a friendly question in 'clarifying_questions' while still showing the recommendations.`
  ]
    .filter(Boolean)
    .join('\n');

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  for (const msg of chatHistory.slice(-10)) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    });
  }

  messages.push({ role: 'user', content: finalUserContent });

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI chat error ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? '';
  if (!raw) throw new Error('OpenAI returned empty content');

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse LLM JSON: ${raw.slice(0, 300)}`);
  }

  const validCandidateIds = new Set(JSON.parse(candidatesJson).map((c: any) => String(c.id)));

  const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
    .filter((r: any) => {
      const id = String(r?.product_id ?? '');
      if (!id || !validCandidateIds.has(id)) {
        console.warn(`[ai-recommend] LLM suggested invalid/hallucinated product_id: ${id}`);
        return false;
      }
      return true;
    })
    .slice(0, 8)
    .map((r: any) => ({
      product_id: String(r.product_id),
      title: String(r.title ?? ''),
      reason_1: String(r.reason_1 ?? ''),
      reason_2: String(r.reason_2 ?? ''),
      fit_tags: Array.isArray(r.fit_tags) ? r.fit_tags : [],
      price: typeof r.price === 'number' ? r.price : 0,
      confidence_0_1: typeof r.confidence_0_1 === 'number'
        ? Math.min(1, Math.max(0, r.confidence_0_1))
        : 0,
    }));

  return {
    clarifying_questions: Array.isArray(parsed.clarifying_questions) ? parsed.clarifying_questions : [],
    quick_replies: Array.isArray(parsed.quick_replies) ? parsed.quick_replies : [],
    recommendations,
    chat_followup: typeof parsed.chat_followup === 'string' ? parsed.chat_followup : '',
    message_script: typeof parsed.message_script === 'string' ? parsed.message_script : '',
    cautions: Array.isArray(parsed.cautions) ? parsed.cautions : [],
    candidates_evaluated: candidateCount,
  };
}

// ---------------------------------------------------------------------------
// Request body shape
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Weighting System
// ---------------------------------------------------------------------------
const PREFERENCE_WEIGHTS = {
  // MUST FIT (Positive)
  CRITICAL_CONSTRAINTS: 100, // gender_identity, age_range
  CORE_FIT: 90,             // sizes
  EXPLICIT_NEEDS: 80,       // dietary_preferences, gift_type_preference, design_preferences
  STRONG_INTERESTS: 70,     // fashion_style, home_decor_style, core_values, sports_activities
  SOFT_INTERESTS: 60,       // favorite_music_genres, favorite_movies_genres, etc.

  // MUST AVOID (Negative)
  PHYSICAL_DEALBREAKERS: -100, // food_allergies, scent_sensitivities, material_sensitivities
  PREFERENCE_DEALBREAKERS: -90, // gift_dislikes
};

interface RequestBody {
  recipientProfileId?: string | null;
  recipientName?: string;
  recipientRelationship?: string;
  occasion?: string;
  budget?: number;
  freeText?: string;
  chatHistory?: { role: string; content: string }[];
  feedbackHistory?: { productId: string; productName: string; type: 'like' | 'dislike'; reason?: string; }[];
  constraints?: {
    gift_wrap_required?: boolean;
    personalization_required?: boolean;
    shipping_deadline_days?: number;
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // ── Auth: resolve userId from JWT ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return errorResponse('Missing Authorization header', 401);
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse('Unauthorized', 401);

    const userId = user.id;

    // ── Parse body ────────────────────────────────────────────────────────
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body');
    }

    const { recipientProfileId, recipientName, recipientRelationship, occasion, budget, freeText, chatHistory, feedbackHistory, constraints } = body;

    console.log('[DEBUG] ai-recommend START', {
      userId,
      recipientProfileId,
      occasion,
      budget
    });

    // ── Step 1: Load recipient preferences ────────────────────────────────
    let recipient = null;
    if (recipientProfileId) {
      console.log(`[DEBUG] Loading preferences for recipient: ${recipientProfileId}`);
      try {
        recipient = await loadRecipientPreferences(recipientProfileId);
      } catch (e) {
        console.warn(`[DEBUG] Failed to load preferences for ${recipientProfileId}:`, e.message);
      }
    } else {
      console.log('[DEBUG] No recipient ProfileId provided.');
    }

    // ── Step 2: Build intent string ───────────────────────────────────────
    const intentParts: string[] = [];
    
    // Core buyer context
    if (occasion) intentParts.push(`Occasion: ${occasion}`);
    if (budget) intentParts.push(`Budget: $${budget.toFixed(2)}`);
    if (freeText?.trim()) intentParts.push(`Buyer Notes: ${freeText.trim()}`);

    // Process single recipient with weights
    if (recipient) {
      const rec = recipient;
      // Weight 100: Critical Constraints
      if (rec.gender_identity) intentParts.push(`Recipient Gender: ${rec.gender_identity} [Weight: ${PREFERENCE_WEIGHTS.CRITICAL_CONSTRAINTS}]`);
      if (rec.age_range) intentParts.push(`Recipient Age Group: ${rec.age_range} [Weight: ${PREFERENCE_WEIGHTS.CRITICAL_CONSTRAINTS}]`);
      
      // Weight 90: Core Fit
      const sizes = [];
      if (rec.size_tshirt) sizes.push(`T-Shirt: ${rec.size_tshirt}`);
      if (rec.size_shoes) sizes.push(`Shoes: ${rec.size_shoes}`);
      if (rec.size_pants) sizes.push(`Pants: ${rec.size_pants}`);
      if (rec.size_dress) sizes.push(`Dress: ${rec.size_dress}`);
      if (rec.size_hat) sizes.push(`Hat: ${rec.size_hat}`);
      if (rec.size_ring) sizes.push(`Ring: ${rec.size_ring}`);
      if (sizes.length > 0) intentParts.push(`Recipient Sizes: ${sizes.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.CORE_FIT}]`);

      // Weight 80: Explicit Needs
      if (rec.dietary_preferences?.length > 0) intentParts.push(`Dietary: ${rec.dietary_preferences.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.EXPLICIT_NEEDS}]`);
      if (rec.gift_type_preference?.length > 0) intentParts.push(`Preferred Gift Types: ${rec.gift_type_preference.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.EXPLICIT_NEEDS}]`);
      if (rec.design_preferences) intentParts.push(`Design Preference: ${rec.design_preferences} [Weight: ${PREFERENCE_WEIGHTS.EXPLICIT_NEEDS}]`);

      // Weight 70: Strong Interests
      const strongInterests = [
        ...(rec.sports_activities || []),
        ...(rec.fashion_style || []),
        ...(rec.home_decor_style || []),
        ...(rec.core_values || []),
      ].filter(Boolean);
      if (strongInterests.length > 0) intentParts.push(`Strong Interests: ${strongInterests.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.STRONG_INTERESTS}]`);

      // Weight 60: Soft Interests
      const softInterests = [
        ...(rec.favorite_music_genres || []),
        ...(rec.favorite_movies_genres || []),
        ...(rec.favorite_tv_shows || []),
        ...(rec.tech_interests || []),
        ...(rec.creative_hobbies || []),
      ].filter(Boolean);
      if (softInterests.length > 0) intentParts.push(`General Interests: ${softInterests.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.SOFT_INTERESTS}]`);

      // Weight -100: Physical Dealbreakers
      const physicalAvoid = [
        ...(rec.food_allergies || []),
        ...(rec.scent_sensitivities || []),
        ...(rec.material_sensitivities || []),
      ].filter(Boolean);
      if (physicalAvoid.length > 0) intentParts.push(`MUST AVOID (Allergies/Sensitivities): ${physicalAvoid.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.PHYSICAL_DEALBREAKERS}]`);

      // Weight -90: Preference Dealbreakers
      if (rec.gift_dislikes?.length > 0) intentParts.push(`MUST AVOID (Dislikes): ${rec.gift_dislikes.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.PREFERENCE_DEALBREAKERS}]`);
    }

    // History is handled separately in the messages array

    if (feedbackHistory && feedbackHistory.length > 0) {
      const feedbackText = feedbackHistory.map(f => `${f.type === 'like' ? 'Liked' : 'Disliked'} product: ${f.productName}${f.reason ? ` (Reason: ${f.reason})` : ''}`).join('\n');
      intentParts.push(`Immediate Feedback on previous suggestions:\n${feedbackText}`);
    }

    const constraintParts: string[] = [];
    if (constraints?.gift_wrap_required) constraintParts.push('gift wrap required');
    if (constraints?.personalization_required) constraintParts.push('personalization required');
    if (constraintParts.length > 0) intentParts.push(`Constraints: ${constraintParts.join(', ')}`);

    const intentString = intentParts.join('\n\n');

    // ── Step 3: Embed intent + RAG retrieval (Two-Phase) ──────────────────
    const embedding = await embedText(intentString);
    const initialBudget = budget ?? 9999;
    
    // Phase 1: Search within budget
    let candidates = await searchRAG({
      embedding,
      maxPrice: initialBudget,
      giftWrap: constraints?.gift_wrap_required ?? null,
      personalization: constraints?.personalization_required ?? null,
      limit: 40,
    });

    // Phase 2: ALWAYS Peeking Broadly (Unlimited Price)
    // We do a second search with NO price cap to find the best quality matches globally
    const broadCandidates = await searchRAG({
      embedding,
      maxPrice: 99999, // Essentially unlimited
      giftWrap: constraints?.gift_wrap_required ?? null,
      personalization: constraints?.personalization_required ?? null,
      limit: 15,
    });

    // Merge and label
    const initialIds = new Set(candidates.map((c: any) => c.id));
    const premiumAddition = broadCandidates
      .filter((c: any) => !initialIds.has(c.id))
      .map((c: any) => ({ ...c, is_over_budget: true }));
    
    candidates = [...candidates, ...premiumAddition];

    const dislikedIds = (feedbackHistory || [])
      .filter((f: any) => f.type === 'dislike')
      .map((f: any) => f.productId);

    const filteredCandidates = candidates.filter((c: any) => !dislikedIds.includes(c.id));

    // Intelligence: We NO LONGER return an early "empty" response here.
    // Instead, we let the LLM see whatever we found (even if empty) 
    // and decide how to talk to the user about it.


    // ── Step 4: LLM reranker ──────────────────────────────────────────────
    const candidatesJson = serializeCandidates(filteredCandidates);
    const output = await callLLM(intentString, candidatesJson, recipient, chatHistory || [], budget, recipientName, recipientRelationship, occasion);

    // ── Step 4b: Enrich recommendations with images from candidates ───────
    if (output.recommendations) {
      output.recommendations = output.recommendations.map((r: any) => {
        const candidate = filteredCandidates.find((c: any) => c.id === r.product_id);
        if (!candidate) return r;

        let imageUrl: string | undefined;
        let candidateImages: string[] | undefined;
        try {
          const rawImages = candidate.images;
          if (rawImages) {
            const imgParsed = typeof rawImages === 'string' ? JSON.parse(rawImages) : rawImages;
            if (Array.isArray(imgParsed) && imgParsed.length > 0) {
              candidateImages = imgParsed.filter(Boolean);
              imageUrl = candidateImages[0];
            } else if (typeof imgParsed === 'string') {
              imageUrl = imgParsed;
            }
          }
        } catch {
          if (typeof candidate.images === 'string') {
            imageUrl = candidate.images;
          }
        }

        return {
          ...r,
          price: r.price || candidate.price || 0,
          image_url: imageUrl,
          images: candidateImages,
        };
      });
    }

    // ── Step 5: Log session (non-blocking) ────────────────────────────────
    const retrievedIds = candidates.map((c: any) => c.id);
    supabaseAdmin
      .from('ai_recommendation_sessions')
      .insert({
        user_id: userId,
        recipient_profile_id: recipientProfileId || null,
        occasion: occasion || 'General',
        budget: budget || null,
        free_text: freeText ?? null,
        intent_text: intentString,
        retrieved_product_ids: retrievedIds,
        final_recommendations: output,
        model_used: 'gpt-4o',
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.error('[ai-recommend] session log failed:', logError.message);
        }
      });

    return jsonResponse(output);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai-recommend]', msg);
    return errorResponse(`Internal error: ${msg}`, 500);
  }
});
