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

function serializeCandidates(products: any[]): string {
    return JSON.stringify(
        products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: (p.description ?? '').slice(0, 150),
            category: p.category,
            subcategory: p.subcategory,
            occasions: p.occasions,
            recipient_types: p.recipient_types,
            vibes: p.vibes,
            interests: p.interests,
            tags: p.tags,
            product_text: p.product_text,
            similarity_distance: Number((p.similarity_distance ?? 0).toFixed(4)),
        }))
    );
}

const SYSTEM_PROMPT = `You are Giftyy — an expert gift strategist.
Your goal is to provide highly personalized gift recommendations for a specific occasion on a recipient's profile page.

RULES:
1. Select the top 4 to 8 products from the CANDIDATE LIST that best fit the recipient's preferences and the specific occasion.
2. Even if the candidates don't seem like a "perfect" match, your job is to find the MOST relevant items from the provided list for this specific occasion and recipient.
3. If the list is small, you can recommend all of them if they are even remotely relevant.
4. You MUST only recommend products from the CANDIDATE LIST. Do NOT hallucinate products.
6. For each recommendation, use the \`product_text\` to justify why it fits the recipient's specific granular preferences.
7. Output MUST be a clean JSON object.

OUTPUT FORMAT:
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
  "insight": "<A 1-sentence warm insight about why these gifts are the best choices for this recipient and occasion>",
  "cautions": ["<caution if relevant regarding allergies/dislikes>"]
}`;

async function callLLM(
    intentString: string,
    candidatesJson: string,
    recipient: any | null
): Promise<any> {
    const sensitivityLines: string[] = [];
    if (recipient) {
        const dislikes = recipient.gift_dislikes?.join(', ');
        const allergies = recipient.food_allergies?.join(', ');
        if (dislikes) sensitivityLines.push(`Gift dislikes: ${dislikes}`);
        if (allergies) sensitivityLines.push(`Food allergies: ${allergies}`);
    }

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
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

    if (!res.ok) throw new Error(`OpenAI chat error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? '';
    return JSON.parse(raw);
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    try {
        const authHeader = req.headers.get('Authorization') ?? '';
        const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) return errorResponse('Unauthorized', 401);

        const { recipientProfileId, recipientName, recipientRelationship, occasion } = await req.json();

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
            recipient?.age_range ? `Age Range: ${recipient.age_range}` : null,
            recipient?.gender_identity ? `Gender: ${recipient.gender_identity}` : null,
            recipient?.lifestyle_type ? `Lifestyle: ${recipient.lifestyle_type}` : null,
            recipient?.current_life_stage ? `Life Stage: ${recipient.current_life_stage}` : null,
            recipient?.profile_text ? `Bio: ${recipient.profile_text}` : null,
            interests.length > 0 ? `Interests: ${interests.join(', ')}` : null,
            style.length > 0 ? `Style: ${style.join(', ')}` : null,
            recipient?.design_preferences ? `Design Pref: ${recipient.design_preferences}` : null,
            diet.length > 0 ? `Diet: ${diet.join(', ')}` : null,
            values.length > 0 ? `Values: ${values.join(', ')}` : null,
            sizes.length > 0 ? `Sizes: ${sizes.join(', ')}` : null,
            media.length > 0 ? `Media: ${media.join(', ')}` : null,
            recipient?.favorite_artists ? `Fav Artists: ${recipient.favorite_artists}` : null,
            recipient?.has_pets?.length > 0 ? `Pets: ${recipient.has_pets.join(', ')}` : null,
            recipient?.living_situation ? `Living: ${recipient.living_situation}` : null,
            recipient?.additional_notes ? `Notes: ${recipient.additional_notes}` : null,
        ].filter(Boolean);

        const intentString = `Recipient: ${recipientName}. Relationship: ${recipientRelationship}. Occasion: ${occasion}.\n${prefBlocks.join('\n')}`;

        const embedding = await embedText(intentString);
        const candidates = await searchRAG({ embedding, limit: 40 });

        console.log(`[DEBUG] Occasion: ${occasion}, Candidates found: ${candidates.length}`);
        if (candidates.length > 0) {
            console.log(`[DEBUG] Top 3 candidates: ${candidates.slice(0, 3).map(c => c.name).join(', ')}`);
        }

        if (candidates.length === 0) {
            return jsonResponse({ recommendations: [], insight: 'No matching products found at the moment.', cautions: [] });
        }

        const candidatesJson = serializeCandidates(candidates);
        const output = await callLLM(intentString, candidatesJson, recipient);

        console.log(`[DEBUG] LLM Output for ${occasion}:`, JSON.stringify(output));

        return jsonResponse(output);

    } catch (err) {
        console.error('[ai-profile-recommend]', err);
        return errorResponse(`Internal error: ${err.message}`, 500);
    }
});
