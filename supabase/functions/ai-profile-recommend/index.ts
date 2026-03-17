// @ts-nocheck
/**
 * ai-profile-recommend – Supabase Edge Function
 * Specialized for the Recipient Profile screen.
 * 
 * POST /functions/v1/ai-profile-recommend
 * 
 * Body (JSON):
 * {
 *   "recipientProfileId": "<uuid>",
 *   "recipientName": "Rafik",
 *   "recipientRelationship": "Friend",
 *   "occasion": "Birthday"
 * }
 */

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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const EMBEDDING_MODEL = 'text-embedding-3-small';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

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
    const { data, error } = await supabaseAdmin
        .from('recipient_preferences')
        .select('*')
        .eq('recipient_profile_id', id)
        .maybeSingle();
    if (error) throw new Error(`load recipient error: ${error.message}`);
    return data;
}

async function searchRAG(params: {
    embedding: number[];
    limit: number;
}) {
    const { data, error } = await supabaseAdmin.rpc('match_products_rag', {
        p_query_embedding: params.embedding,
        p_limit: params.limit,
        p_min_price: null,
        p_max_price: 10000,
        p_category: null,
        p_subcategory: null,
        p_gift_wrap: null,
        p_personalization: null,
        p_require_in_stock: false, // Set to false to ensure we find candidates in dev/test environments
    });
    if (error) throw new Error(`RAG RPC error: ${error.message}`);
    return data ?? [];
}

// ---------------------------------------------------------------------------
// Weighting System (Expert Mode)
// ---------------------------------------------------------------------------
const PREFERENCE_WEIGHTS = {
    CRITICAL_CONSTRAINTS: 100, // gender_identity, age_range, relationship
    CORE_FIT: 90,             // sizes
    EXPLICIT_NEEDS: 80,       // dietary_preferences, design_preferences
    STRONG_INTERESTS: 70,     // fashion_style, home_decor_style, core_values, sports_activities
    SOFT_INTERESTS: 60,       // favorite_music_genres, tech_interests, hobbies
    PHYSICAL_DEALBREAKERS: -100, // food_allergies, scent_sensitivities
    PREFERENCE_DEALBREAKERS: -90, // gift_dislikes
};

function serializeCandidates(products: any[]): string {
    return JSON.stringify(
        products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: (p.description ?? '').slice(0, 100),
            category: p.category,
            subcategory: p.subcategory,
            product_text: (p.product_text ?? '').slice(0, 1000),
            similarity_distance: Number((p.similarity_distance ?? 0).toFixed(4)),
        }))
    );
}

const SYSTEM_PROMPT = `1. PERSONALITY: You are Giftyy, a super cute, encouraging, and warm gift specialist. You are an EXPERT on this recipient and you absolutely LOVE finding the perfect "spark of joy" for them! ✨🎁
   - TONE: Soft, friendly, and nurturing. Use emojis (✨, 💖, 🧸, 🌟) naturally.
   - ENCOURAGEMENT: Celebrate finding items for them: "Oh, I found such lovely things for ${'{{recipientName}}'}! ✨"

2. EXPERT MODE (PROFILE PAGE):
   - You are selecting gifts for a recipient whose profile is already built.
   - FOCUS: Use their specific granular preferences, demographics, and relationship to find matches.
   - WEIGHTING: Respect the Weighting System (Critical=100, etc.). ABSOLUTELY DO NOT suggest products that conflict with negative-weighted preferences (MUST AVOID).

3. RULES:
   - QUANTITY: Recommend 6-8 gifts from the CANDIDATE LIST.
   - GROUNDING: ONLY recommend products from the provided CANDIDATE LIST. Do NOT hallucinate.
   - INSIGHT: Provide a warm, 1-sentence insight about why these top picks were chosen.

4. OUTPUT FORMAT (JSON):
{
  "recommendations": [
    {
      "product_id": "<uuid>",
      "title": "<name>",
      "reason": "<specific fit reason>",
      "fit_tags": ["<tag>"],
      "confidence_0_1": 0.9
    }
  ],
  "insight": "<A 1-sentence warm insight>",
  "cautions": ["<noting any slight mismatches or allergy concerns>"]
}`;

async function callLLM(
    intentString: string,
    candidatesJson: string,
    recipient: any | null,
    recipientName: string
): Promise<any> {
    const sensitivityLines: string[] = [];
    if (recipient) {
        const dislikes = recipient.gift_dislikes?.join(', ');
        const allergies = recipient.food_allergies?.join(', ');
        if (dislikes) sensitivityLines.push(`Gift dislikes: ${dislikes}`);
        if (allergies) sensitivityLines.push(`Food allergies: ${allergies}`);
    }

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT.replace('{{recipientName}}', recipientName || 'them') },
        { role: 'user', content: `=== CONTEXT ===\n${intentString}\n\n${sensitivityLines.length > 0 ? `=== RECIPIENT SENSITIVITIES ===\n${sensitivityLines.join('\n')}\n` : ''}\n=== CANDIDATE PRODUCTS ===\n${candidatesJson}\n\nReturn the best matches in JSON format.` }
    ];

    const res = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`[ai-profile-recommend] OpenAI chat error ${res.status}:`, errText);
        throw new Error(`OpenAI chat error ${res.status}`);
    }

    const json = await res.json();
    let raw = json.choices?.[0]?.message?.content ?? '';

    // Robust JSON cleaning: GPT sometimes wraps json_object in markdown blocks despite the flag
    if (raw.includes('```json')) {
        raw = raw.split('```json')[1].split('```')[0].trim();
    } else if (raw.includes('```')) {
        raw = raw.split('```')[1].split('```')[0].trim();
    }

    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error("[ai-profile-recommend] Failed to parse LLM JSON. Raw output:", raw);
        throw new Error("Invalid JSON returned from LLM");
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    try {
        const authHeader = req.headers.get('Authorization') ?? '';
        const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: userData, error: authError } = await userClient.auth.getUser();
        if (authError || !userData?.user) {
            console.error('[ai-profile-recommend] Auth error:', authError);
            return errorResponse('Unauthorized', 401);
        }
        const user = userData.user;

        const { recipientProfileId, recipientName, recipientRelationship, occasion, excludeProductIds = [] } = await req.json();

        let recipient;
        if (recipientProfileId) {
            recipient = await loadRecipientPreferences(recipientProfileId);
        }

        const interests = [
            ...(recipient?.sports_activities || []),
            ...(recipient?.creative_hobbies || []),
            ...(recipient?.tech_interests || []),
            ...(recipient?.outdoor_activities || []),
            ...(recipient?.indoor_activities || []),
            ...(recipient?.collecting_interests || []),
            ...(recipient?.wellness_interests || []),
        ].filter(Boolean);

        const style = [
            ...(recipient?.fashion_style || []),
            ...(recipient?.color_preferences || []),
            ...(recipient?.home_decor_style || []),
        ].filter(Boolean);

        const diet = [
            ...(recipient?.dietary_preferences || []),
            ...(recipient?.food_allergies || []),
            ...(recipient?.favorite_cuisines || []),
            ...(recipient?.beverage_preferences || []),
        ].filter(Boolean);

        const values = [
            ...(recipient?.personality_traits || []),
            ...(recipient?.core_values || []),
            ...(recipient?.causes_they_support || []),
        ].filter(Boolean);

        const sizes = [
            recipient?.size_tshirt ? `T-Shirt: ${recipient.size_tshirt}` : null,
            recipient?.size_shoes ? `Shoes: ${recipient.size_shoes}` : null,
            recipient?.size_pants ? `Pants: ${recipient.size_pants}` : null,
            recipient?.size_dress ? `Dress: ${recipient.size_dress}` : null,
            recipient?.size_hat ? `Hat: ${recipient.size_hat}` : null,
            recipient?.size_ring ? `Ring: ${recipient.size_ring}` : null,
        ].filter(Boolean);

        const media = [
            ...(recipient?.favorite_music_genres || []),
            ...(recipient?.favorite_books_genres || []),
            ...(recipient?.favorite_movies_genres || []),
            ...(recipient?.favorite_tv_shows || []),
        ].filter(Boolean);

        const prefBlocks = [
            // CRITICAL (Weight: 100)
            recipientName ? `Recipient Name: ${recipientName} [Weight: ${PREFERENCE_WEIGHTS.CRITICAL_CONSTRAINTS}]` : null,
            recipientRelationship ? `Relationship: ${recipientRelationship} [Weight: ${PREFERENCE_WEIGHTS.CRITICAL_CONSTRAINTS}]` : null,
            recipient?.gender_identity ? `Gender: ${recipient.gender_identity} [Weight: ${PREFERENCE_WEIGHTS.CRITICAL_CONSTRAINTS}]` : null,
            recipient?.age_range ? `Age Range: ${recipient.age_range} [Weight: ${PREFERENCE_WEIGHTS.CRITICAL_CONSTRAINTS}]` : null,

            // CORE FIT (Weight: 90)
            sizes.length > 0 ? `Sizes: ${sizes.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.CORE_FIT}]` : null,

            // EXPLICIT NEEDS (Weight: 80)
            diet.length > 0 ? `Diet/Allergies: ${diet.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.EXPLICIT_NEEDS}]` : null,
            recipient?.design_preferences ? `Design Pref: ${recipient.design_preferences} [Weight: ${PREFERENCE_WEIGHTS.EXPLICIT_NEEDS}]` : null,

            // STRONG INTERESTS (Weight: 70)
            interests.length > 0 ? `Interests: ${interests.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.STRONG_INTERESTS}]` : null,
            style.length > 0 ? `Style: ${style.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.STRONG_INTERESTS}]` : null,
            values.length > 0 ? `Values & Personality: ${values.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.STRONG_INTERESTS}]` : null,

            // SOFT INTERESTS (Weight: 60)
            media.length > 0 ? `Media & Entertainment: ${media.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.SOFT_INTERESTS}]` : null,
            recipient?.favorite_artists ? `Fav Artists: ${recipient.favorite_artists} [Weight: ${PREFERENCE_WEIGHTS.SOFT_INTERESTS}]` : null,
            recipient?.lifestyle_type ? `Lifestyle: ${recipient.lifestyle_type} [Weight: ${PREFERENCE_WEIGHTS.SOFT_INTERESTS}]` : null,

            // MUST AVOID (Negative Weights: -90 to -100)
            (recipient?.food_allergies?.length > 0 || recipient?.scent_sensitivities?.length > 0)
                ? `MUST AVOID (Health): ${[...(recipient.food_allergies || []), ...(recipient.scent_sensitivities || [])].join(', ')} [Weight: ${PREFERENCE_WEIGHTS.PHYSICAL_DEALBREAKERS}]`
                : null,
            recipient?.gift_dislikes?.length > 0
                ? `MUST AVOID (Dislikes): ${recipient.gift_dislikes.join(', ')} [Weight: ${PREFERENCE_WEIGHTS.PREFERENCE_DEALBREAKERS}]`
                : null,

            // Misc Context
            recipient?.profile_text ? `Bio Notes: ${recipient.profile_text}` : null,
            recipient?.has_pets?.length > 0 ? `Pets: ${recipient.has_pets.join(', ')}` : null,
            recipient?.living_situation ? `Living: ${recipient.living_situation}` : null,
            recipient?.additional_notes ? `Notes: ${recipient.additional_notes}` : null,
        ].filter(Boolean);

        // RELEVANCE BOOST: Emphasize the occasion repeatedly to the embedding engine 
        const intentString = `URGENT: Finding the best gift for ${recipientName} (${recipientRelationship}) for their ${occasion}.\nFocus on items that fit the vibe of ${occasion} and their profile:\n${prefBlocks.join('\n')}`;

        console.log(`[ai-profile-recommend] Generating embedding for ${recipientName} / ${occasion}...`);
        const embedding = await embedText(intentString);

        console.log(`[ai-profile-recommend] Searching RAG for ${occasion}...`);
        let candidates = await searchRAG({ embedding, limit: 50 }); // Reduced initial fetch to save DB/IO

        // Filter out excluded products
        if (excludeProductIds.length > 0) {
            const excludeSet = new Set(excludeProductIds);
            candidates = candidates.filter(p => !excludeSet.has(p.id));
            console.log(`[ai-profile-recommend] Excluded ${excludeProductIds.length} products. Candidates remaining: ${candidates.length}`);
        }

        console.log(`[ai-profile-recommend] Occasion: ${occasion}, Candidates found: ${candidates.length}`);
        if (candidates.length > 0) {
            console.log(`[ai-profile-recommend] Top candidate: ${candidates[0].name} (Distance: ${candidates[0].similarity_distance})`);
        }

        if (candidates.length === 0) {
            return jsonResponse({ recommendations: [], insight: 'No matching products found at the moment.', cautions: [] });
        }

        // OPTIMIZATION: Send a healthy pool to LLM for 6-8 final recommendations
        const finalCandidates = candidates.slice(0, 20);
        const candidatesJson = serializeCandidates(finalCandidates);

        console.log(`[ai-profile-recommend] Calling LLM reranker for ${occasion}...`);
        const output = await callLLM(intentString, candidatesJson, recipient, recipientName);

        // Enrich recommendations with images and full details from candidates
        if (output.recommendations) {
            output.recommendations = output.recommendations.map((r: any) => {
                const candidate = finalCandidates.find((c: any) => c.id === r.product_id);
                if (!candidate) return r;

                // Handle image extraction
                let primaryImage = '';
                if (candidate.images && Array.isArray(candidate.images) && candidate.images.length > 0) {
                    primaryImage = candidate.images[0];
                } else if (candidate.image_url) {
                    try {
                        const parsed = JSON.parse(candidate.image_url);
                        primaryImage = Array.isArray(parsed) ? parsed[0] : candidate.image_url;
                    } catch {
                        primaryImage = candidate.image_url;
                    }
                }

                return {
                    ...r,
                    name: candidate.name,
                    price: candidate.price,
                    image_url: primaryImage,
                    category: candidate.category,
                    subcategory: candidate.subcategory
                };
            });
        }

        console.log(`[ai-profile-recommend] Success for ${occasion}. Recs count: ${output.recommendations?.length || 0}`);

        return jsonResponse(output);

    } catch (err) {
        console.error('[ai-profile-recommend] FATAL ERROR:', err);
        return errorResponse(`Internal error: ${err.message}`, 500);
    }
});
