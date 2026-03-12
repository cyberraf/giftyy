// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
// Clients
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
  if (!res.ok) throw new Error(`Embedding error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding as number[];
}

async function searchRAG(params: {
  embedding: number[];
  maxPrice: number;
  giftWrap: boolean | null;
  personalization: boolean | null;
  limit: number;
}) {
  console.log('[ai-recommend-tagged] searchRAG calling match_products_rag');
  const { data, error } = await supabaseAdmin.rpc('match_products_rag', {
    p_query_embedding: params.embedding,
    p_limit: params.limit,
    p_min_price: null,
    p_max_price: params.maxPrice,
    p_category: null,
    p_subcategory: null,
    p_gift_wrap: params.giftWrap,
    p_personalization: params.personalization,
    p_require_in_stock: false,
  });
  if (error) {
    console.error('[ai-recommend-tagged] RAG RPC error:', error.message);
    throw new Error(`RAG error: ${error.message}`);
  }
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
      interests: p.interests,
      vibes: p.vibes,
      tags: p.tags,
      product_text: p.product_text,
      is_over_budget: p.is_over_budget ?? false,
    }))
  );
}

function jsonArrayToString(val: unknown): string {
  if (!val || !Array.isArray(val)) return '';
  return (val as string[]).filter(Boolean).join(', ');
}

async function loadRecipientPreferences(id: string) {
  const { data: pref, error: prefError } = await supabaseAdmin
    .from('recipient_preferences')
    .select('*')
    .eq('recipient_profile_id', id)
    .maybeSingle();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('recipient_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (prefError) throw new Error(`Preferences load error: ${prefError.message}`);
  if (profileError) throw new Error(`Profile load error: ${profileError.message}`);

  return { ...pref, ...profile };
}

// ---------------------------------------------------------------------------
// SYSTEM PROMPT: EXPERT MODE (TAGGED RECIPIENTS)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `1. PERSONALITY: You are Giftyy, a super cute, encouraging, and warm gift specialist. You are an EXPERT on this recipient and you absolutely LOVE finding the perfect "spark of joy" for them! ✨🎁
   - TONE: Soft, friendly, and nurturing. Use emojis (✨, 💖, 🧸, 🌟) naturally.
   - ENCOURAGEMENT: Celebrate the user's input: "Oh, that's such a lovely idea! ✨" "I'm so excited to help find something special! 💖"

2. EXPERT MODE: You are assisting with a KNOWN RECIPIENT. 
   - DO NOT ask for basic demographics (Age, Gender, Relationship) if they are already in the profile.
   - FOCUS: Jump straight into the Occasion or specific interests.
   - CONVERSATIONAL FLOW: Acknowledge user input warmly. Ask for one specific detail if truly needed, but prioritise showing products if the profile is starting to look good.
   - RECOMMENDATIONS: You are ENCOURAGED to provide recommendations as soon as you have a few meaningful interests and the basics (demographics).
   - QUANTITY: Recommend UP TO 6-8 gifts, but ONLY if they are truly excellent matches. If no excellent matches exist, provide fewer or even ZERO.
   - STRICT GROUNDING: You MUST ONLY recommend products from the provided 'CANDIDATE PRODUCTS' list. 
   - ABSOLUTELY FORBIDDEN: Do NOT invent, hallucinate, or create new products. Do NOT make up product IDs. If the 'CANDIDATE PRODUCTS' list is empty, return an empty 'recommendations' array.

3. PROACTIVE GUIDANCE & BUDGET FLEXIBILITY:
   - You are a reasoning-first assistant. You will always receive a mix of "In-Budget" and "is_over_budget: true" products.
   - If no good "In-Budget" matches exist, do NOT give up. Instead, use the over-budget items to explain what's available and guide the user.
   - If you show over-budget items, explain it warmly: "I couldn't find exactly that under your $[budget], but I found these beautiful options that are a bit more premium. Shall we explore them?"
   - Provide 3-5 "quick_replies" that suggest new specific budget limits (e.g. 'Try up to $200', 'Try up to $500') if you recommend items over budget.
   - If the user says "increase the budget", they are officially giving you permission to promote the "is_over_budget" products.

4. WEIGHTING SYSTEM (CRITICAL):
   - Positive Weights (100, 90, 80...): "Must Fit". HIGHEST priority.
   - Negative Weights (-100, -90...): "Must Avoid". ABSOLUTELY DO NOT suggest products that conflict with negative-weighted preferences.

4. QUICK REPLIES (CONTEXT-BASED):
   - You MUST provide exactly 3-5 "quick_replies".
   - CRITICAL: These MUST be direct, relevant answers to the ONE question you just asked in "chat_followup".
   - If you are recommending products, provide quick replies like "More options", "Different budget", "Check details".
   - If you are asking a question (e.g., hobby), provide specific examples (e.g., "Photography", "Cooking").
   - Keep them short (1-2 words).

5. OFF-TOPIC HANDLING:
   - If the user asks about something unrelated to gifting (e.g., weather, news, life advice), politely and charmingly redirect them.
   - Example: "I'd love to chat about that, but my heart is set on finding the perfect gift for your special someone! ✨ Shall we get back to the magic? 🎁"
   - Keep it Giftyy-themed and warm.

6. CAUTIONS: List ALL potential conflicts with negative-weighted preferences or mismatched demographics in the "cautions" array.

7. OUTPUT FORMAT — respond with a single JSON object:
{
  "clarifying_questions": ["Question 1 (exactly one, only if info is missing)"], 
  "quick_replies": ["Short suggestion for user reply"],
  "recommendations": [
     {
       "product_id": "<must exist in candidates list>",
       "title": "<existing name>",
       "reason_1": "<cute fit reason>",
       "reason_2": "<another reason>",
       "fit_tags": ["<tag>"],
       "price": 0,
       "confidence_0_1": 0.9
     }
  ],
  "chat_followup": "<friendly followup text>",
  "message_script": "<cute gift note template>",
  "cautions": [],
  "candidates_evaluated": 0
}`;

async function callLLM(
  intentString: string,
  candidatesJson: string,
  recipient: any | null,
  chatHistory: { role: string; content: string }[] = []
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
    if (recipient.relationship) preferenceSummary.push(`Relationship: ${recipient.relationship}`);
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
    `=== CURRENT BUYER CONTEXT ===`,
    intentString,
    '',
    sensitivityLines.length > 0 ? `=== RECIPIENT SENSITIVITIES ===\n${sensitivityLines.join('\n')}\n` : '',
    `=== CANDIDATE PRODUCTS (${candidateCount} candidates) ===`,
    candidatesJson,
    '',
    `Task: Provide your response as a valid JSON object matching the EXPERT MODE format.`
  ].join('\n');

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const msg of chatHistory.slice(-8)) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    });
  }
  messages.push({ role: 'user', content: finalUserContent });

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const raw = json.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(raw);
    const validCandidateIds = new Set(JSON.parse(candidatesJson).map((c: any) => String(c.id)));

    const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
      .filter((r: any) => {
        const id = String(r?.product_id ?? '');
        if (!id || !validCandidateIds.has(id)) {
          console.warn(`[ai-recommend-tagged] LLM suggested invalid product_id: ${id}`);
          return false;
        }
        return true;
      })
      .slice(0, 8);

    return { 
      ...parsed, 
      recommendations,
      candidates_evaluated: candidateCount 
    };
  } catch (e) {
    console.error('[ai-recommend-tagged] LLM JSON failure:', raw);
    throw new Error(`Failed to parse AI response`);
  }
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return errorResponse('Missing Auth', 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[ai-recommend-tagged] Auth failure:', authError?.message);
      return errorResponse('Unauthorized', 401);
    }
    const userId = user.id;

    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON');
    }

    const { 
      recipientProfileId, 
      recipientName, 
      recipientRelationship, 
      occasion, 
      budget, 
      freeText, 
      chatHistory,
      feedbackHistory,
      constraints 
    } = body;

    console.log(`[ai-recommend-tagged] Request for user: ${userId}`);
    
    let recipient = null;
    if (recipientProfileId) {
      try {
        recipient = await loadRecipientPreferences(recipientProfileId);
      } catch (e) {
        console.warn(`[ai-recommend-tagged] Recipient load failed:`, e.message);
      }
    }

    const intentParts = [
      `Recipient Name: ${recipientName || recipient?.full_name || 'Friend'}`,
      `Relationship: ${recipientRelationship || recipient?.relationship || 'Unknown'}`,
      `Occasion: ${occasion || 'Gift'}`,
      `Initial Request: ${freeText || ''}`,
    ];

    const embedding = await embedText(intentParts.join(' '));
    const initialBudget = budget ?? 9999;
    
    // Phase 1: Within budget
    let candidates = await searchRAG({
      embedding,
      maxPrice: initialBudget,
      giftWrap: constraints?.gift_wrap_required ?? null,
      personalization: constraints?.personalization_required ?? null,
      limit: 30,
    });

    // Phase 2: ALWAYS Peeking Broadly
    const broadSearch = await searchRAG({
      embedding,
      maxPrice: 99999,
      giftWrap: constraints?.gift_wrap_required ?? null,
      personalization: constraints?.personalization_required ?? null,
      limit: 15,
    });

    const initialIds = new Set(candidates.map((c: any) => c.id));
    const premiumAddition = broadSearch
      .filter((c: any) => !initialIds.has(c.id))
      .map((c: any) => ({ ...c, is_over_budget: true }));
    
    candidates = [...candidates, ...premiumAddition];

    const dislikedIds = (feedbackHistory || [])
      .filter((f: any) => f.type === 'dislike')
      .map((f: any) => f.productId);

    const filteredCandidates = candidates.filter((c: any) => !dislikedIds.includes(c.id));

    // NO early empty return. Let the LLM handle it.


    const candidatesJson = serializeCandidates(filteredCandidates);
    const output = await callLLM(intentParts.join('\n'), candidatesJson, recipient, chatHistory || []);


    if (feedbackHistory && feedbackHistory.length > 0) {
      const feedbackText = feedbackHistory.map(f => `${f.type === 'like' ? 'Liked' : 'Disliked'} product: ${f.productName}${f.reason ? ` (Reason: ${f.reason})` : ''}`).join('\n');
      intentParts.push(`Immediate Feedback on previous suggestions:\n${feedbackText}`);
    }

    // Enrich images
    if (output.recommendations && Array.isArray(output.recommendations)) {
      output.recommendations = output.recommendations.map((r: any) => {
        const candidate = filteredCandidates.find((c: any) => c.id === r.product_id);
        if (!candidate) return r;

        let imageUrl: string | undefined;
        let images: string[] | undefined;
        try {
          const raw = candidate.images;
          if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed) && parsed.length > 0) {
              images = parsed.filter(Boolean);
              imageUrl = images[0];
            } else if (typeof parsed === 'string') {
              imageUrl = parsed;
            }
          }
        } catch {}

        return {
          ...r,
          price: r.price || candidate.price || 0,
          image_url: imageUrl,
          images,
        };
      });
    }

    // Async log
    const retrievedIds = candidates.map((c: any) => c.id);
    supabaseAdmin
      .from('ai_recommendation_sessions')
      .insert({
        user_id: userId,
        recipient_profile_id: recipientProfileId || null,
        occasion: occasion || 'General',
        budget: budget || null,
        free_text: freeText ?? null,
        intent_text: intentParts.join('\n'),
        retrieved_product_ids: retrievedIds,
        final_recommendations: output,
        model_used: 'gpt-4o',
      })
      .then(({ error: logError }) => {
        if (logError) console.error('[ai-recommend-tagged] Log fail:', logError.message);
      });

    return jsonResponse(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai-recommend-tagged] CRITICAL:', msg);
    return errorResponse(`Server Error: ${msg}`, 500);
  }
});
