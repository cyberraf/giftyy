// @ts-nocheck
/**
 * ai-recommend – Supabase Edge Function (v4)
 *
 * v4 fixes every gap GPT identified in v3:
 *
 *  1. CONFIDENCE-AWARE PROFILE FIELDS
 *     Every profile value now carries { value, source, confidence }.
 *     source: "db" | "user_explicit" | "inferred" | "request"
 *     The system reasons differently based on how sure it is.
 *
 *  2. RECOMMENDATION CONFIDENCE THRESHOLD
 *     shouldRecommend() now scores the profile (0.0–1.0) and only
 *     returns true when the score crosses a tunable threshold (0.6).
 *     Prevents premature recommendations on thin context.
 *
 *  3. CONTEXT-AWARE INTENT CLASSIFIER
 *     classifyIntent() now receives the full KnownProfile (with
 *     confidence metadata) so it knows what we already know, what
 *     we just asked, and how confident we are — making intent
 *     detection dramatically more accurate.
 *
 *  4. RAG GATING
 *     Embedding + RAG is skipped entirely when SHOW_RECOMMENDATIONS
 *     is false and intent is not product_followup. Saves ~200ms + cost
 *     per discovery-phase turn.
 *
 *  5. DEEP FEEDBACK LEARNING
 *     Feedback reasons (e.g. "too feminine", "wrong material") are
 *     parsed into structured avoidances and injected back into the
 *     KnownProfile as softAvoids/hardAvoids. These bias future RAG
 *     queries, not just filter exact product IDs.
 *
 *  6. STICKY PHASE TRANSITIONS
 *     Phase logic is now history-aware. A user in 'refining' doesn't
 *     snap back to 'exploring' just because one message looks vague.
 *     'discovery' requires explicit new evidence to escape.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const errorResponse = (msg: string, status = 400) =>
  jsonResponse({ error: msg }, status);

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const HISTORY_SUMMARIZE_AT = 10;
const HISTORY_KEEP_RECENT = 6;

// ── Token usage tracking helper ──
type TokenAccumulator = { prompt_tokens: number; completion_tokens: number; total_tokens: number; embedding_tokens: number };
let _requestTokens: TokenAccumulator = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, embedding_tokens: 0 };
function trackTokens(json: any, isEmbedding = false): void {
  const u = json?.usage;
  if (!u) return;
  if (isEmbedding) {
    _requestTokens.embedding_tokens += u.total_tokens ?? 0;
  } else {
    _requestTokens.prompt_tokens += u.prompt_tokens ?? 0;
    _requestTokens.completion_tokens += u.completion_tokens ?? 0;
  }
  _requestTokens.total_tokens += u.total_tokens ?? 0;
}

// Recommendation confidence threshold.
// 0.0 = recommend on any signal, 1.0 = never recommend.
// 0.55 = need at least WHO + one taste signal, or 3 weaker signals.
const RECOMMEND_THRESHOLD = 0.55;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ===========================================================================
// TYPES
// ===========================================================================

/** How a profile value was learned. Determines trust level. */
type ProfileSource = 'db' | 'user_explicit' | 'inferred' | 'request';

/**
 * ProfileValue — every field in KnownProfile carries its provenance.
 * This lets the system distinguish "user said she loves hiking" (0.95)
 * from "LLM guessed outdoorsy" (0.55).
 */
interface ProfileValue<T = string> {
  value: T;
  source: ProfileSource;
  confidence: number; // 0.0 – 1.0
}

/**
 * KnownProfile v4 — typed, confidence-annotated in-memory profile.
 *
 * Scalar fields use ProfileValue<string>.
 * Array fields use ProfileValue<string>[] so individual items
 * can have different sources (some from DB, some from chat).
 */
interface KnownProfile {
  relationship?: ProfileValue;
  recipientName?: ProfileValue;
  gender?: ProfileValue;
  ageRange?: ProfileValue;
  occasion?: ProfileValue;
  budget?: ProfileValue<number>;

  interests?: ProfileValue[];  // hobbies, passions, activities
  styles?: ProfileValue[];  // minimalist, luxury, playful, etc.
  values?: ProfileValue[];  // core values, personality traits

  hardAvoids?: ProfileValue[];  // allergies, sensitivities — NEVER recommend
  softAvoids?: ProfileValue[];  // dislikes — strong filter
}

type ConversationPhase =
  | 'discovery'
  | 'exploring'
  | 'refining'
  | 'follow_up'
  | 'off_topic';

interface SessionState {
  phase: ConversationPhase;
  turnCount: number;
  knownProfile: KnownProfile;
  hasRecommendedOnce: boolean;
  lastQuestionField: string | null;
  historySummary: string;
  profileScore: number; // last computed recommendation confidence score
}

type IntentType =
  | 'provide_info'
  | 'refine_budget'
  | 'increase_budget'
  | 'product_followup'
  | 'more_options'
  | 'off_topic'
  | 'new_search'
  | 'express_feedback';

interface IntentResult {
  type: IntentType;
  extractedFacts: Partial<KnownProfile>;
  budgetMentioned?: number;
  focusProductRef?: string;
  confidence: number;
  raw: string;
  // v4: feedback parsed into structured avoidances
  feedbackSignals?: {
    avoidStyles?: string[];
    avoidMaterials?: string[];
    avoidCategories?: string[];
    positiveSignals?: string[];
  };
}

// ===========================================================================
// PROFILE VALUE HELPERS
// ===========================================================================

/** Create a scalar ProfileValue */
function pv(value: string, source: ProfileSource, confidence: number): ProfileValue {
  return { value, source, confidence };
}

/** Create a numeric ProfileValue (for budget) */
function pvNum(value: number, source: ProfileSource, confidence: number): ProfileValue<number> {
  return { value, source, confidence };
}

/** Extract the raw value from a ProfileValue (or undefined) */
function val<T>(pv?: ProfileValue<T>): T | undefined {
  return pv?.value;
}

/** Extract raw string[] from ProfileValue[] */
function vals(pvArr?: ProfileValue[]): string[] {
  return (pvArr ?? []).map((p) => p.value).filter(Boolean);
}

/**
 * Merge two ProfileValue arrays, deduplicating by value.
 * Higher confidence wins on collision.
 */
function mergeValueArrays(
  existing: ProfileValue[] = [],
  incoming: ProfileValue[] = []
): ProfileValue[] {
  const map = new Map<string, ProfileValue>();
  for (const item of existing) map.set(item.value.toLowerCase(), item);
  for (const item of incoming) {
    const key = item.value.toLowerCase();
    const current = map.get(key);
    if (!current || item.confidence > current.confidence) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

/**
 * Merge scalar ProfileValue — only update if new value has higher confidence
 * or existing is undefined.
 */
function mergeScalar<T>(
  existing?: ProfileValue<T>,
  incoming?: ProfileValue<T>
): ProfileValue<T> | undefined {
  if (!incoming) return existing;
  if (!existing) return incoming;
  return incoming.confidence >= existing.confidence ? incoming : existing;
}

// ===========================================================================
// WIZARD QUESTION ENGINE
// ===========================================================================
type WizardField = 'relationship' | 'occasion' | 'ageRange' | 'interests' | 'budget';

const WIZARD_PRIORITY: WizardField[] = [
  'relationship', 'occasion', 'ageRange', 'interests', 'budget',
];

const WIZARD_PROMPTS: Record<WizardField, string> = {
  relationship: 'Who is this gift for? (e.g. girlfriend, dad, best friend)',
  occasion: 'What\'s the occasion?',
  ageRange: 'How old are they roughly? (Teen, 20s, 30s, 50s+, etc.)',
  interests: 'What are they into? Hobbies, passions, things they love?',
  budget: 'What\'s your budget? Even a rough range helps!',
};

/**
 * nextWizardField — returns the highest-priority field still below
 * our confidence threshold, or null if we have enough signal.
 * Skips budget unless we've recommended at least once.
 */
function nextWizardField(profile: KnownProfile, hasRecommendedOnce: boolean): WizardField | null {
  const CONFIDENCE_NEEDED = 0.7;
  for (const field of WIZARD_PRIORITY) {
    switch (field) {
      case 'relationship':
        if (!profile.relationship || profile.relationship.confidence < CONFIDENCE_NEEDED) return field;
        break;
      case 'occasion':
        if (!profile.occasion || profile.occasion.confidence < CONFIDENCE_NEEDED) return field;
        break;
      case 'ageRange':
        if (!profile.ageRange || profile.ageRange.confidence < CONFIDENCE_NEEDED) return field;
        break;
      case 'interests': {
        const highConf = (profile.interests ?? []).filter((p) => p.confidence >= 0.7);
        if (highConf.length === 0) return field;
        break;
      }
      case 'budget':
        // Only ask about budget after first recommendation, and only if unknown
        if (hasRecommendedOnce && !profile.budget) return field;
        break;
    }
  }
  return null;
}

// ===========================================================================
// RECOMMENDATION CONFIDENCE THRESHOLD  (Fix #2)
// ===========================================================================

/**
 * scoreProfile — returns a 0.0–1.0 score of how well we know the recipient.
 *
 * Scoring weights:
 *   relationship  0.25  (who is it for?)
 *   occasion      0.20  (why are we giving?)
 *   interests     0.30  (what do they like? — most important for good recs)
 *   ageRange      0.15  (helps filter appropriately)
 *   budget        0.10  (nice to have, not blocking)
 *
 * Each field is weighted by its own confidence score so a low-confidence
 * inference doesn't count as much as an explicit user statement.
 */
function scoreProfile(profile: KnownProfile): number {
  const WEIGHTS = {
    relationship: 0.25,
    occasion: 0.20,
    interests: 0.30,
    ageRange: 0.15,
    budget: 0.10,
  };

  let score = 0;

  if (profile.relationship)
    score += WEIGHTS.relationship * profile.relationship.confidence;

  if (profile.occasion)
    score += WEIGHTS.occasion * profile.occasion.confidence;

  // Interests: take the average confidence of up to 3 best signals
  const sortedInterests = [...(profile.interests ?? []), ...(profile.styles ?? [])]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  if (sortedInterests.length > 0) {
    const avgConf = sortedInterests.reduce((s, p) => s + p.confidence, 0) / sortedInterests.length;
    score += WEIGHTS.interests * avgConf;
  }

  if (profile.ageRange)
    score += WEIGHTS.ageRange * profile.ageRange.confidence;

  if (profile.budget)
    score += WEIGHTS.budget * profile.budget.confidence;

  return Math.min(1, score);
}

function shouldRecommend(profile: KnownProfile, state: SessionState, intentType?: IntentType): boolean {
  // Never show products when user is starting fresh or going off-topic
  if (intentType === 'new_search' || intentType === 'off_topic') return false;
  // Feedback on a single product should NOT trigger a whole new recommendation list.
  // The user's feedback gets absorbed into the profile (avoids/preferences), and
  // new recommendations only appear when they explicitly ask (more_options).
  if (intentType === 'express_feedback') return false;
  // Once we've successfully shown products, keep showing them
  if (state.hasRecommendedOnce) return true;
  // If we've never shown products, always check the score threshold —
  // even if phase is 'exploring'. Prevents the "stuck in exploring with 0 results" loop.
  const score = scoreProfile(profile);
  return score >= RECOMMEND_THRESHOLD;
}

// ===========================================================================
// PHASE TRANSITION — STICKY  (Fix #6)
// ===========================================================================

/**
 * derivePhase — sticky phase transitions.
 *
 * Rules:
 *   - off_topic and follow_up override immediately
 *   - new_search resets to discovery
 *   - discovery → exploring requires profile score crossing threshold
 *   - exploring/refining → stay unless explicitly starting over
 *   - refining is "sticky" — user stays in refine even if one vague message
 */
function derivePhase(
  intent: IntentResult,
  state: SessionState,
  willRecommend: boolean,
  profileScore: number
): ConversationPhase {
  // Hard overrides
  if (intent.type === 'off_topic') return 'off_topic';
  if (intent.type === 'product_followup') return 'follow_up';
  if (intent.type === 'new_search') return 'discovery';

  // Refining signals — stay/enter refining
  if (
    intent.type === 'refine_budget' ||
    intent.type === 'increase_budget' ||
    intent.type === 'more_options' ||
    intent.type === 'express_feedback'
  ) return 'refining';

  // Sticky: once in refining, only go back if score drops significantly
  // (e.g. user says something totally off) — in practice nearly never
  if (state.phase === 'refining' && intent.type === 'provide_info') return 'refining';

  // Discovery → exploring: requires threshold
  if (state.phase === 'discovery') {
    return profileScore >= RECOMMEND_THRESHOLD ? 'exploring' : 'discovery';
  }

  // Already exploring: stay only if we've successfully shown products before.
  // If we're exploring but never showed products (RAG returned 0), re-evaluate.
  if (state.phase === 'exploring') {
    if (state.hasRecommendedOnce) return 'exploring';
    return profileScore >= RECOMMEND_THRESHOLD ? 'exploring' : 'discovery';
  }

  // Default
  return willRecommend ? 'exploring' : 'discovery';
}

// ===========================================================================
// FEEDBACK LEARNING  (Fix #5)
// ===========================================================================

/**
 * parseFeedbackIntoAvoids — converts free-text feedback reasons into
 * structured avoidances that get merged into KnownProfile.
 *
 * Examples:
 *   "too feminine"           → softAvoids: ["feminine style"]
 *   "not her style, too loud"→ softAvoids: ["loud design", "bold style"]
 *   "she's allergic to latex"→ hardAvoids: ["latex"]
 *   "loved the minimalist one"→ (positive — extracted into styles)
 */
async function parseFeedbackIntoAvoids(
  feedbackHistory: { productId: string; productName: string; type: 'like' | 'dislike'; reason?: string }[]
): Promise<{ hardAvoids: ProfileValue[]; softAvoids: ProfileValue[]; positiveStyles: ProfileValue[] }> {

  const withReasons = feedbackHistory.filter((f) => f.reason?.trim());
  if (withReasons.length === 0) {
    return { hardAvoids: [], softAvoids: [], positiveStyles: [] };
  }

  const prompt = `You parse gift feedback into structured avoidances and preferences.

For each feedback entry, extract:
  - avoidStyles:     design/vibe styles to avoid (e.g. "feminine", "loud", "kitschy")
  - avoidMaterials:  materials/ingredients to avoid (e.g. "latex", "wool", "lavender")
  - avoidCategories: gift categories to avoid (e.g. "candles", "clothing")
  - positiveStyles:  styles the user liked (e.g. "minimalist", "cozy", "premium")

FEEDBACK ENTRIES:
${withReasons.map((f) => `[${f.type.toUpperCase()}] "${f.productName}" — reason: "${f.reason}"`).join('\n')}

Return ONLY JSON:
{
  "avoidStyles":     [],
  "avoidMaterials":  [],
  "avoidCategories": [],
  "positiveStyles":  []
}`;

  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const json = await res.json();
    trackTokens(json);
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');

    const toProfileValues = (arr: string[], confidence: number): ProfileValue[] =>
      (arr ?? []).filter(Boolean).map((v: string) => pv(v, 'inferred', confidence));

    return {
      hardAvoids: toProfileValues(parsed.avoidMaterials ?? [], 0.9),
      softAvoids: [
        ...toProfileValues(parsed.avoidStyles ?? [], 0.8),
        ...toProfileValues(parsed.avoidCategories ?? [], 0.75),
      ],
      positiveStyles: toProfileValues(parsed.positiveStyles ?? [], 0.7),
    };
  } catch (e) {
    console.warn('[parseFeedback] error:', (e as Error).message);
    return { hardAvoids: [], softAvoids: [], positiveStyles: [] };
  }
}

// ===========================================================================
// INTENT CLASSIFIER — NOW CONTEXT-AWARE  (Fix #3)
// ===========================================================================

async function classifyIntent(
  userMessage: string,
  chatHistory: { role: string; content: string }[],
  knownProfile: KnownProfile,   // ← was always {} in v3, now actually used
  currentPhase: ConversationPhase,
  lastQuestion: string | null
): Promise<IntentResult> {

  const historySnippet = chatHistory
    .slice(-4)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  // Summarize known profile for the classifier (flat, readable)
  const knownSummary: string[] = [];
  if (val(knownProfile.relationship)) knownSummary.push(`relationship: ${val(knownProfile.relationship)}`);
  if (val(knownProfile.occasion)) knownSummary.push(`occasion: ${val(knownProfile.occasion)}`);
  if (val(knownProfile.ageRange)) knownSummary.push(`age: ${val(knownProfile.ageRange)}`);
  if (val(knownProfile.gender)) knownSummary.push(`gender: ${val(knownProfile.gender)}`);
  if (knownProfile.budget) knownSummary.push(`budget: $${val(knownProfile.budget)}`);
  const interestVals = vals(knownProfile.interests);
  if (interestVals.length) knownSummary.push(`interests: ${interestVals.join(', ')}`);

  const prompt = `You are an intent classifier for a gift recommendation assistant.

CONVERSATION CONTEXT:
  Current phase:     ${currentPhase}
  Last question asked: ${lastQuestion ?? '(none)'}
  What we already know: ${knownSummary.length > 0 ? knownSummary.join(' | ') : 'nothing yet'}

INTENT TYPES:
  provide_info      → user answering a question or sharing facts about recipient
  refine_budget     → user mentions a specific budget or price limit
  increase_budget   → user wants more expensive / premium options
  product_followup  → user asks about a specific product from the list shown
  more_options      → user wants different/more recommendations
  off_topic         → unrelated to gifting
  new_search        → user wants to start over or gift someone different
  express_feedback  → user reacts to suggestions (love it, wrong vibe, etc.)

EXTRACTABLE FACTS (only include what's explicitly stated or very strongly implied):
  relationship   string          e.g. "girlfriend", "dad"
  recipientName  string          first name if mentioned
  gender         "Male"|"Female"|"Non-binary"|"Unknown"
  ageRange       "Baby"|"Toddler"|"Kid"|"Teen"|"Young Adult"|"Adult"|"Senior"
  occasion       string          e.g. "Birthday", "Anniversary"
  interests      string[]        hobbies, passions
  styles         string[]        minimalist, luxury, playful, sporty, cozy, etc.
  values         string[]
  hardAvoids     string[]        allergies, sensitivities (material/scent/food)
  softAvoids     string[]        dislikes, wrong vibes

RECENT CONVERSATION:
${historySnippet}

USER'S LATEST MESSAGE:
"${userMessage}"

FEEDBACK SIGNALS (if express_feedback intent):
  Extract avoidStyles, avoidMaterials, avoidCategories, positiveStyles from the message.

Return ONLY JSON, no markdown:
{
  "type": "<intent type>",
  "extractedFacts": {
    "<field>": "<value — scalars as string, arrays as string[]>"
  },
  "budgetMentioned": <number or null>,
  "focusProductRef": "<ordinal or name reference if product_followup, else null>",
  "confidence": <0.0–1.0>,
  "feedbackSignals": {
    "avoidStyles":     [],
    "avoidMaterials":  [],
    "avoidCategories": [],
    "positiveStyles":  []
  }
}`;

  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const json = await res.json();
    trackTokens(json);
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');

    // Convert extracted flat facts into ProfileValues
    const f = parsed.extractedFacts ?? {};
    const extractedProfile: Partial<KnownProfile> = {};

    if (f.relationship) extractedProfile.relationship = pv(f.relationship, 'user_explicit', 0.95);
    if (f.recipientName) extractedProfile.recipientName = pv(f.recipientName, 'user_explicit', 0.95);
    if (f.gender) extractedProfile.gender = pv(f.gender, 'user_explicit', 0.95);
    if (f.ageRange) extractedProfile.ageRange = pv(f.ageRange, 'user_explicit', 0.90);
    if (f.occasion) extractedProfile.occasion = pv(f.occasion, 'user_explicit', 0.95);
    if (typeof parsed.budgetMentioned === 'number')
      extractedProfile.budget = pvNum(parsed.budgetMentioned, 'user_explicit', 0.95);

    const source: ProfileSource = 'user_explicit';
    if (f.interests?.length)
      extractedProfile.interests = f.interests.map((v: string) => pv(v, source, 0.85));
    if (f.styles?.length)
      extractedProfile.styles = f.styles.map((v: string) => pv(v, source, 0.85));
    if (f.values?.length)
      extractedProfile.values = f.values.map((v: string) => pv(v, source, 0.85));
    if (f.hardAvoids?.length)
      extractedProfile.hardAvoids = f.hardAvoids.map((v: string) => pv(v, source, 0.95));
    if (f.softAvoids?.length)
      extractedProfile.softAvoids = f.softAvoids.map((v: string) => pv(v, source, 0.90));

    return {
      type: parsed.type ?? 'provide_info',
      extractedFacts: extractedProfile,
      budgetMentioned: typeof parsed.budgetMentioned === 'number' ? parsed.budgetMentioned : undefined,
      focusProductRef: parsed.focusProductRef ?? null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      feedbackSignals: parsed.feedbackSignals ?? {},
      raw: userMessage,
    };
  } catch (e) {
    console.warn('[classifyIntent] error, using fallback:', (e as Error).message);
    return { type: 'provide_info', extractedFacts: {}, confidence: 0.5, raw: userMessage };
  }
}

// ===========================================================================
// SESSION STATE MANAGER
// ===========================================================================

function initSessionState(): SessionState {
  return {
    phase: 'discovery',
    turnCount: 0,
    knownProfile: {},
    hasRecommendedOnce: false,
    lastQuestionField: null,
    historySummary: '',
    profileScore: 0,
  };
}

/**
 * mergeProfileIntoState v4 — all values carry source + confidence.
 *
 * Precedence:
 *   db hard avoids   > everything (safety)
 *   user_explicit    > inferred   > db (for taste/preference)
 *   request fields   = user_explicit (came from app context)
 */
function mergeProfileIntoState(
  state: SessionState,
  dbProfile: Record<string, any> | null,
  intent: IntentResult,
  overrides: {
    recipientName?: string;
    recipientRelationship?: string;
    occasion?: string;
    budget?: number;
  },
  feedbackAvoids: { hardAvoids: ProfileValue[]; softAvoids: ProfileValue[]; positiveStyles: ProfileValue[] }
): SessionState {
  let p: KnownProfile = { ...state.knownProfile };

  // ── DB profile: authoritative for identity + hard constraints ──────────
  if (dbProfile) {
    if (dbProfile.gender_identity)
      p.gender = mergeScalar(p.gender, pv(dbProfile.gender_identity, 'db', 0.85));
    if (dbProfile.age_range)
      p.ageRange = mergeScalar(p.ageRange, pv(dbProfile.age_range, 'db', 0.85));
    if (dbProfile.relationship)
      p.relationship = mergeScalar(p.relationship, pv(dbProfile.relationship, 'db', 0.85));
    if (dbProfile.full_name)
      p.recipientName = mergeScalar(p.recipientName, pv(dbProfile.full_name, 'db', 0.9));

    // DB hard avoids are always authoritative — merge at 1.0 confidence
    const dbHardAvoids: ProfileValue[] = [
      ...(dbProfile.food_allergies ?? []),
      ...(dbProfile.scent_sensitivities ?? []),
      ...(dbProfile.material_sensitivities ?? []),
    ].filter(Boolean).map((v: string) => pv(v, 'db', 1.0));
    p.hardAvoids = mergeValueArrays(p.hardAvoids, dbHardAvoids);

    if (dbProfile.gift_dislikes?.length > 0) {
      const dbSoftAvoids = dbProfile.gift_dislikes.map((v: string) => pv(v, 'db', 0.95));
      p.softAvoids = mergeValueArrays(p.softAvoids, dbSoftAvoids);
    }

    // DB interests (lower confidence — may be outdated)
    const dbInterests: ProfileValue[] = [
      ...(dbProfile.sports_activities ?? []),
      ...(dbProfile.creative_hobbies ?? []),
      ...(dbProfile.outdoor_activities ?? []),
      ...(dbProfile.indoor_activities ?? []),
      ...(dbProfile.wellness_interests ?? []),
      ...(dbProfile.collecting_interests ?? []),
    ].filter(Boolean).map((v: string) => pv(v, 'db', 0.75));
    p.interests = mergeValueArrays(p.interests, dbInterests);

    const dbStyles: ProfileValue[] = [
      ...(dbProfile.fashion_style ?? []),
      ...(dbProfile.home_decor_style ?? []),
    ].filter(Boolean).map((v: string) => pv(v, 'db', 0.75));
    p.styles = mergeValueArrays(p.styles, dbStyles);
  }

  // ── Request overrides (explicit app fields) ──────────────────────────
  if (overrides.recipientName)
    p.recipientName = mergeScalar(p.recipientName, pv(overrides.recipientName, 'request', 1.0));
  if (overrides.recipientRelationship)
    p.relationship = mergeScalar(p.relationship, pv(overrides.recipientRelationship, 'request', 1.0));
  if (overrides.occasion)
    p.occasion = mergeScalar(p.occasion, pv(overrides.occasion, 'request', 1.0));
  if (overrides.budget)
    // Lower confidence (0.5) — this was explicitly typed by user in the request,
    // but could be a pre-set default, so it shouldn't dominate the profile score.
    p.budget = mergeScalar(p.budget, pvNum(overrides.budget, 'request', 0.5));

  // ── Intent-extracted facts (this turn) ──────────────────────────────
  const f = intent.extractedFacts;
  if (f.relationship) p.relationship = mergeScalar(p.relationship, f.relationship);
  if (f.recipientName) p.recipientName = mergeScalar(p.recipientName, f.recipientName);
  if (f.gender) p.gender = mergeScalar(p.gender, f.gender);
  if (f.ageRange) p.ageRange = mergeScalar(p.ageRange, f.ageRange);
  if (f.occasion) p.occasion = mergeScalar(p.occasion, f.occasion);
  if (f.budget) p.budget = mergeScalar(p.budget, f.budget);
  if (intent.budgetMentioned)
    p.budget = mergeScalar(p.budget, pvNum(intent.budgetMentioned, 'user_explicit', 0.95));

  if (f.interests?.length) p.interests = mergeValueArrays(p.interests, f.interests as ProfileValue[]);
  if (f.styles?.length) p.styles = mergeValueArrays(p.styles, f.styles as ProfileValue[]);
  if (f.values?.length) p.values = mergeValueArrays(p.values, f.values as ProfileValue[]);
  if (f.hardAvoids?.length) p.hardAvoids = mergeValueArrays(p.hardAvoids, f.hardAvoids as ProfileValue[]);
  if (f.softAvoids?.length) p.softAvoids = mergeValueArrays(p.softAvoids, f.softAvoids as ProfileValue[]);

  // ── Feedback-derived avoidances (Fix #5) ────────────────────────────
  if (feedbackAvoids.hardAvoids.length > 0)
    p.hardAvoids = mergeValueArrays(p.hardAvoids, feedbackAvoids.hardAvoids);
  if (feedbackAvoids.softAvoids.length > 0)
    p.softAvoids = mergeValueArrays(p.softAvoids, feedbackAvoids.softAvoids);
  // Positive feedback → add to styles at moderate confidence
  if (feedbackAvoids.positiveStyles.length > 0)
    p.styles = mergeValueArrays(p.styles, feedbackAvoids.positiveStyles);

  return { ...state, knownProfile: p };
}

// ===========================================================================
// CLEAN EMBEDDING QUERY BUILDER
// ===========================================================================

/**
 * buildEmbeddingQuery — produces natural prose for semantic search.
 *
 * Now uses confidence-aware values: only includes interests/styles
 * above a minimum confidence threshold so low-confidence inferences
 * don't pollute the embedding.
 */
function buildEmbeddingQuery(profile: KnownProfile, intent: IntentResult): string {
  const INTEREST_MIN_CONF = 0.6;
  const parts: string[] = [];

  const occasion = val(profile.occasion) ?? val((intent.extractedFacts as any).occasion);
  const relation = val(profile.relationship) ?? val((intent.extractedFacts as any).relationship);
  const age = val(profile.ageRange) ?? val((intent.extractedFacts as any).ageRange);
  const gender = val(profile.gender);
  const budget = profile.budget?.value ?? intent.budgetMentioned;

  // Only include interests/styles above confidence threshold
  const confidentInterests = [
    ...(profile.interests ?? []),
    ...(profile.styles ?? []),
  ]
    .filter((p) => p.confidence >= INTEREST_MIN_CONF)
    .map((p) => p.value);

  // Also append feedback-derived styles
  const avoidPhrases = vals(profile.softAvoids).slice(0, 3);

  if (occasion && occasion.toLowerCase() !== 'gift') parts.push(occasion);
  parts.push('gift');
  if (relation) parts.push(`for ${relation}`);
  if (age) parts.push(age);
  if (gender && gender !== 'Unknown') parts.push(gender.toLowerCase());
  if (confidentInterests.length > 0)
    parts.push(`who loves ${confidentInterests.slice(0, 4).join(', ')}`);
  if (avoidPhrases.length > 0)
    parts.push(`avoid ${avoidPhrases.join(', ')}`);
  if (budget) parts.push(`under $${budget}`);

  return parts.length > 1 ? parts.join(' ') : 'thoughtful gift recommendation';
}

// ===========================================================================
// HISTORY SUMMARIZER (from v2/v3)
// ===========================================================================
async function summarizeChatHistory(
  chatHistory: { role: string; content: string }[]
): Promise<{ summary: string; recentMessages: { role: string; content: string }[] }> {

  if (chatHistory.length <= HISTORY_SUMMARIZE_AT)
    return { summary: '', recentMessages: chatHistory };

  const toSummarize = chatHistory.slice(0, chatHistory.length - HISTORY_KEEP_RECENT);
  const recentMessages = chatHistory.slice(-HISTORY_KEEP_RECENT);

  const prompt = `Summarize this gift-finding conversation into 3–5 plain sentences.
Keep ALL facts: names, relationships, ages, interests, occasions, budget, liked/disliked products.
No opinions. Just facts.

${toSummarize.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}`;

  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const json = await res.json();
    trackTokens(json);
    const summary = json.choices?.[0]?.message?.content?.trim() ?? '';
    return { summary, recentMessages };
  } catch {
    return { summary: '', recentMessages: chatHistory };
  }
}

// ===========================================================================
// PRODUCT FOLLOW-UP DETECTOR (from v3)
// ===========================================================================
function detectProductFollowUp(
  userMessage: string,
  focusRef: string | null,
  lastRecommendations: { product_id: string; title: string }[]
): string | null {
  if (!lastRecommendations?.length) return null;
  const lower = (focusRef ?? userMessage ?? '').toLowerCase();

  const ORDINAL_MAP: Record<string, number> = {
    'first': 0, '1st': 0, '1': 0, '#1': 0, 'one': 0,
    'second': 1, '2nd': 1, '2': 1, '#2': 1, 'two': 1,
    'third': 2, '3rd': 2, '3': 2, '#3': 2, 'three': 2,
    'fourth': 3, '4th': 3, '4': 3, '#4': 3, 'four': 3,
    'fifth': 4, '5th': 4, '5': 4, '#5': 4, 'five': 4,
    'sixth': 5, '6th': 5, '6': 5, '#6': 5, 'six': 5,
  };
  for (const [word, idx] of Object.entries(ORDINAL_MAP)) {
    if (new RegExp(`\\b${word}\\b`).test(lower) && lastRecommendations[idx])
      return lastRecommendations[idx].product_id;
  }
  for (const rec of lastRecommendations) {
    const snippet = rec.title?.toLowerCase().slice(0, 14);
    if (snippet && lower.includes(snippet)) return rec.product_id;
  }
  return null;
}

// ===========================================================================
// NLU PROFILE EXTRACTOR + PERSISTER (background, from v2/v3)
// ===========================================================================
async function extractAndPersistProfile(
  recipientProfileId: string,
  chatHistory: { role: string; content: string }[],
  freeText: string,
  existingProfile: Record<string, any>
): Promise<void> {
  const conversationText = chatHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `Extract NEW or CORRECTED recipient profile facts from this conversation.
Return ONLY a JSON object with fields you confidently infer.
Skip fields already in existing profile unless being corrected.

Extractable fields:
full_name, gender_identity, age_range, relationship, lifestyle_type,
sports_activities (array), creative_hobbies (array), tech_interests (array),
outdoor_activities (array), indoor_activities (array), collecting_interests (array),
wellness_interests (array), favorite_music_genres (array), favorite_books_genres (array),
favorite_movies_genres (array), favorite_tv_shows (array), favorite_artists,
fashion_style (array), home_decor_style (array), color_preferences (array),
design_preferences, gift_dislikes (array), food_allergies (array),
scent_sensitivities (array), material_sensitivities (array),
dietary_preferences (array), personality_traits (array), core_values (array),
causes_they_support (array), has_pets (array), living_situation, additional_notes

EXISTING PROFILE: ${JSON.stringify(existingProfile, null, 2)}
CONVERSATION: ${conversationText}
BUYER NOTE: ${freeText || '(none)'}

Return ONLY valid JSON.`;

  const PROFILE_FIELDS = new Set(['full_name', 'gender_identity', 'age_range', 'relationship']);
  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const json = await res.json();
    trackTokens(json);
    const extracted = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
    if (Object.keys(extracted).length === 0) return;

    const profileUp: Record<string, any> = {};
    const prefsUp: Record<string, any> = {};
    for (const [k, v] of Object.entries(extracted)) {
      if (PROFILE_FIELDS.has(k)) profileUp[k] = v;
      else prefsUp[k] = v;
    }
    const ops: Promise<any>[] = [];
    if (Object.keys(profileUp).length > 0)
      ops.push(supabaseAdmin.from('recipient_profiles').update(profileUp).eq('id', recipientProfileId));
    if (Object.keys(prefsUp).length > 0)
      ops.push(supabaseAdmin.from('recipient_preferences').upsert({ recipient_profile_id: recipientProfileId, ...prefsUp }));
    await Promise.all(ops);
  } catch (e) {
    console.warn('[extractAndPersistProfile]', (e as Error).message);
  }
}

// ===========================================================================
// RAG HELPERS
// ===========================================================================
async function embedText(text: string): Promise<number[]> {
  const res = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: [text], encoding_format: 'float' }),
  });
  if (!res.ok) throw new Error(`Embedding error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  trackTokens(json, true);
  return json.data[0].embedding as number[];
}

async function searchRAG(params: {
  embedding: number[]; maxPrice: number;
  giftWrap: boolean | null; personalization: boolean | null; limit: number;
}) {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
    if (!error) return data ?? [];
    if (attempt < MAX_RETRIES && /connection|reset|timeout/i.test(error.message)) {
      console.warn(`[RAG] Retry ${attempt + 1}/${MAX_RETRIES}: ${error.message}`);
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    throw new Error(`RAG RPC error: ${error.message}`);
  }
  return [];
}

function serializeCandidates(products: any[]): string {
  return JSON.stringify(products.map((p) => ({
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
    in_stock: p.in_stock,
    product_text: p.product_text,
    similarity_distance: Number((p.similarity_distance ?? 0).toFixed(4)),
    is_over_budget: p.is_over_budget ?? false,
  })));
}

// ===========================================================================
// SYSTEM PROMPT v4
// ===========================================================================
const SYSTEM_PROMPT = `
You are Giftyy 🎁 — a warm, witty gift-finding bestie. You chat like a friend who
happens to be amazing at picking gifts. The backend has already made every structural
decision — your job is to make the conversation feel fun and human.

╔═══════════════════════════════════════════════════════╗
║  WHAT THE BACKEND HAS ALREADY DECIDED                ║
╚═══════════════════════════════════════════════════════╝
You will always receive:
  CONVERSATION_PHASE     — discovery | exploring | refining | follow_up | off_topic
  INTENT_TYPE            — what the user is doing this turn
  SHOW_RECOMMENDATIONS   — true/false: backend decided this, not you
  NEXT_WIZARD_QUESTION   — the exact question to ask if needed, or "(none)"
  PRODUCT_FOCUS          — product_id to describe in detail, or "(none)"
  PROFILE_SCORE          — 0.0–1.0 how well we know the recipient
  PROFILE_CONFIDENCE     — a summary of high vs low confidence facts

Your job: write warmly and naturally following those decisions. Don't second-guess them.

╔═══════════════════════════════════════════════════════╗
║  TONE & PERSONALITY                                   ║
╚═══════════════════════════════════════════════════════╝
• Talk like a friend — casual, warm, sometimes playful or witty
• React genuinely to what they share: "Ooh, a cooking lover? I already have ideas!"
• Use varied reactions — surprise, excitement, curiosity. DON'T repeat the same opener.
  BAD: "How lovely! 💖" every time.   GOOD: mix it up naturally.
• Emojis: ✨ 💖 🎁 🌟 — sprinkle lightly, not every sentence
• ALWAYS acknowledge what the user just shared before moving on
• Keep responses SHORT. Chat-length, not essay-length.
• NEVER sound like a form or wizard. You're having a conversation, not collecting fields.
• AVOID formulaic patterns like "Great! Now let me ask about X." Instead, let the
  conversation flow naturally: "Ooh nice — and what kind of stuff is she into?"

╔═══════════════════════════════════════════════════════╗
║  PHASE RESPONSES                                      ║
╚═══════════════════════════════════════════════════════╝
DISCOVERY (SHOW_RECOMMENDATIONS = false):
  ⚠️  CRITICAL RULES:
      1. You MUST NOT reference products, their absence, or availability AT ALL.
         Do not say "we don't have any products" or "let me find options".
      2. You MUST end your "chat_followup" with a question. NEVER just acknowledge
         without asking something. If NEXT_WIZARD_QUESTION is provided, weave it
         into your response NATURALLY — don't ask it word-for-word.
      3. "recommendations" array MUST be empty [].
  • Keep it to 1–3 short sentences. Conversational, not mechanical.
  • Vary your phrasing every turn. If you said "how lovely" last time, say something
    different now. React to the SPECIFIC thing they said, don't use generic filler.
  • "quick_replies" MUST directly answer whatever question you just asked.
    e.g. if you asked "What's the occasion?", replies should be ["Birthday 🎂", "Anniversary 💍", "Just because 💝"]
    e.g. if you asked about interests, replies should be ["She loves cooking 🍳", "Into fitness 💪", "Bookworm 📚"]
  Good examples (notice how each feels different):
    "A gift for your wife — love it! 💖 What's the occasion?"
    "Birthday, nice! What kind of stuff is she into?"
    "A foodie! Okay I'm already thinking of ideas 🍳 Any budget in mind?"
    "Ooh your brother sounds fun. Is he more of a gadget guy or outdoorsy type?"

EXPLORING / REFINING (SHOW_RECOMMENDATIONS = true):
  • Brief, excited transition → products
  • "Okay I found some great picks based on what you told me!"
  • Keep the intro SHORT — 1–2 sentences max. The products speak for themselves.
  • If confidence is low: hedge casually — "Going off what I know so far…"
  • If candidate list is empty: warmly ask for more info to widen the search

REFINING — FEEDBACK (SHOW_RECOMMENDATIONS = false, INTENT = express_feedback):
  • The user gave feedback on a specific product (e.g. "too expensive", "not their style").
  • Acknowledge the feedback warmly and briefly — show you understood WHY they didn't like it.
  • Do NOT show a new list of recommendations. The feedback has been noted.
  • Ask if they'd like to see more options, or if there's anything else to refine.
  • "recommendations" array MUST be empty [].
  • Keep it to 1–2 sentences. Examples:
    "Got it, I'll steer clear of that style! Want me to find some alternatives? ✨"
    "Noted — too pricey! Want me to look for options in a lower range? 💫"
    "Okay, skipping that one! Anything else you'd like me to keep in mind?"

FOLLOW_UP:
  • Describe PRODUCT_FOCUS in detail: materials, experience, why it fits this person
  • Still include the full recommendation list

OFF_TOPIC:
  • Redirect warmly: "Ha, I wish I could help with that! But I'm all about gifts 🎁 Want to keep going?"
  • "recommendations" array MUST be empty []

╔═══════════════════════════════════════════════════════╗
║  RECOMMENDATIONS                                      ║
╚═══════════════════════════════════════════════════════╝
• ONLY recommend when SHOW_RECOMMENDATIONS = true
• ONLY use products from the CANDIDATE PRODUCTS list
• NEVER invent product IDs or names
• Include a "spark_joy_reason" for each
• Label is_over_budget items warmly and clearly
• Target 4–6 products; 8 max for excellent matches
• If SHOW_RECOMMENDATIONS = true but candidate list is empty → return empty array,
  warmly ask for more details to refine the search (interests, style, etc.)

╔═══════════════════════════════════════════════════════╗
║  CONFIDENCE-AWARE LANGUAGE                           ║
╚═══════════════════════════════════════════════════════╝
When PROFILE_SCORE < 0.6 and SHOW_RECOMMENDATIONS = true:
  • Casual hedge: "Based on what I know so far…"
  • Invite correction: "Let me know if I'm off!"
When PROFILE_SCORE >= 0.85:
  • Be confident: "Oh she is going to LOVE these…"

╔═══════════════════════════════════════════════════════╗
║  QUICK REPLIES (always 3–5)                          ║
╚═══════════════════════════════════════════════════════╝
  ⚠️  Quick replies must be SHORT (2–5 words max) and tappable answers.
  ⚠️  NEVER use generic/hardcoded replies. Always derive from context.

  Discovery → direct answers to your question. Match the question:
      Occasion?  → ["Birthday 🎂", "Anniversary 💍", "Just because 💝"]
      Interests? → ["She loves cooking 🍳", "Into fitness 💪", "Bookworm 📚"]
      Age?       → ["In her 20s", "In her 30s", "In her 40s"]

  Exploring / Refining → CONTEXTUAL replies based on shown products + profile gaps:
      Pick from these categories (include at least 2 types):
      1. STYLE REFINEMENT (based on product categories/vibes shown):
         → "More cozy picks", "Something luxury", "Handmade only"
      2. BUDGET PIVOT (use actual price range from candidates):
         → "Under $40" (if median is ~$60), "Splurge-worthy picks"
      3. PROFILE GAP (suggest a value for the most impactful missing field):
         → "She's outdoorsy 🏕", "He's a tech geek 💻" (if interests missing)
         → "It's for Eid 🌙" (if occasion missing)
      4. SEARCH PIVOT:
         → "Something different", "More like #2", "Try another style"
      ⚠️  Do NOT include "Gift wrap it", "Buy this", or other action phrases
           the chat cannot fulfill — keep replies as SEARCH REFINEMENTS only.

  Follow-up → "Find similar", "Show more like this", refinement based on focus product

  No budget yet → ["Under $50", "Under $100", "$100+ splurge", "Surprise me! ✨"]

╔═══════════════════════════════════════════════════════╗
║  OUTPUT — single JSON object only                    ║
╚═══════════════════════════════════════════════════════╝
{
  "clarifying_questions": [],
  "quick_replies": ["reply 1", "reply 2", "reply 3"],
  "recommendations": [
    {
      "product_id":       "<from candidate list>",
      "title":            "<exact product name>",
      "reason_1":         "<reason>",
      "reason_2":         "<second reason>",
      "spark_joy_reason": "<one-liner: why they'll love it>",
      "fit_tags":         [],
      "price":            0,
      "confidence_0_1":   0.9
    }
  ],
  "chat_followup":  "<warm, natural — short>",
  "cautions":       [],
  "extracted_profile_hints": {
    "<field>": "<value you inferred this turn>"
  }
}

⚠️  Do NOT include a "message_script" field. No gift notes or card messages.
`.trim();

// ===========================================================================
// MAIN LLM CALL
// ===========================================================================
async function callLLM(params: {
  state: SessionState;
  intent: IntentResult;
  nextWizardField: WizardField | null;
  showRecommendations: boolean;
  focusProductId: string | null;
  dbProfile: Record<string, any> | null;
  candidatesJson: string;
  chatHistory: { role: string; content: string }[];
  historySummary: string;
  feedbackHistory: any[];
  lastRecommendations: { product_id: string; title: string }[];
  profileScore: number;
  freeText?: string;
}): Promise<any> {

  const {
    state, intent, nextWizardField: wizField, showRecommendations,
    focusProductId, dbProfile, candidatesJson, chatHistory,
    historySummary, feedbackHistory, lastRecommendations,
    profileScore, freeText,
  } = params;

  const p = state.knownProfile;

  // ── Profile summary for LLM — flat readable + confidence hints ─────────
  const profileLines: string[] = [];
  if (val(p.recipientName)) profileLines.push(`Name:         ${val(p.recipientName)} [${p.recipientName!.source}, conf: ${p.recipientName!.confidence.toFixed(2)}]`);
  if (val(p.relationship)) profileLines.push(`Relationship: ${val(p.relationship)} [${p.relationship!.source}, conf: ${p.relationship!.confidence.toFixed(2)}]`);
  if (val(p.gender)) profileLines.push(`Gender:       ${val(p.gender)}`);
  if (val(p.ageRange)) profileLines.push(`Age Range:    ${val(p.ageRange)} [conf: ${p.ageRange!.confidence.toFixed(2)}]`);
  if (val(p.occasion)) profileLines.push(`Occasion:     ${val(p.occasion)}`);
  if (p.budget) profileLines.push(`Budget:       $${val(p.budget)}`);

  const highConf = [...(p.interests ?? []), ...(p.styles ?? [])]
    .filter((x) => x.confidence >= 0.7)
    .map((x) => x.value);
  const lowConf = [...(p.interests ?? []), ...(p.styles ?? [])]
    .filter((x) => x.confidence < 0.7)
    .map((x) => `${x.value}?`);

  if (highConf.length > 0) profileLines.push(`Interests (confident):  ${highConf.join(', ')}`);
  if (lowConf.length > 0) profileLines.push(`Interests (inferred):   ${lowConf.join(', ')}`);

  const hardAvoidVals = vals(p.hardAvoids);
  const softAvoidVals = vals(p.softAvoids);
  if (hardAvoidVals.length > 0) profileLines.push(`⛔ HARD AVOID: ${hardAvoidVals.join(', ')}`);
  if (softAvoidVals.length > 0) profileLines.push(`🚫 Dislikes:  ${softAvoidVals.join(', ')}`);

  if (dbProfile) {
    const sizes: string[] = [];
    if (dbProfile.size_tshirt) sizes.push(`T-Shirt: ${dbProfile.size_tshirt}`);
    if (dbProfile.size_shoes) sizes.push(`Shoes: ${dbProfile.size_shoes}`);
    if (dbProfile.size_pants) sizes.push(`Pants: ${dbProfile.size_pants}`);
    if (dbProfile.size_dress) sizes.push(`Dress: ${dbProfile.size_dress}`);
    if (dbProfile.size_hat) sizes.push(`Hat: ${dbProfile.size_hat}`);
    if (dbProfile.size_ring) sizes.push(`Ring: ${dbProfile.size_ring}`);
    if (sizes.length > 0) profileLines.push(`Sizes:        ${sizes.join(', ')}`);
    if (dbProfile.design_preferences)
      profileLines.push(`Design Pref:  ${dbProfile.design_preferences}`);
  }

  const feedbackLines = feedbackHistory
    .map((f: any) => `${f.type === 'like' ? '👍' : '👎'} ${f.productName}${f.reason ? ` (${f.reason})` : ''}`)
    .join('\n');

  const candidateCount = JSON.parse(candidatesJson).length;

  const userContent = [
    historySummary ? `=== EARLIER CONVERSATION SUMMARY ===\n${historySummary}\n` : '',

    '=== RECIPIENT PROFILE ===',
    profileLines.length > 0 ? profileLines.join('\n') : 'Nothing known yet.',

    '',
    '=== BACKEND DECISIONS ===',
    `CONVERSATION_PHASE:    ${state.phase}`,
    `INTENT_TYPE:           ${intent.type}`,
    `SHOW_RECOMMENDATIONS:  ${showRecommendations}`,
    `PROFILE_SCORE:         ${profileScore.toFixed(2)} / 1.00`,
    wizField
      ? `NEXT_WIZARD_QUESTION:  ${WIZARD_PROMPTS[wizField]}`
      : 'NEXT_WIZARD_QUESTION:  (none)',
    focusProductId
      ? `PRODUCT_FOCUS:         ${focusProductId}`
      : 'PRODUCT_FOCUS:         (none)',
    `TURN_NUMBER:           ${state.turnCount}`,

    '',
    feedbackLines ? `=== FEEDBACK HISTORY ===\n${feedbackLines}\n` : '',
    lastRecommendations?.length
      ? `=== LAST SHOWN PRODUCTS ===\n${lastRecommendations.map((r, i) => `${i + 1}. [${r.product_id}] ${r.title}`).join('\n')}\n`
      : '',
    freeText?.trim() ? `=== BUYER'S NOTE ===\n${freeText.trim()}\n` : '',

    `=== CANDIDATE PRODUCTS (${candidateCount} items) ===`,
    candidatesJson,
  ].filter(Boolean).join('\n');

  const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const msg of chatHistory) {
    messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  }
  messages.push({ role: 'user', content: userContent });

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o', temperature: 0.45,
      response_format: { type: 'json_object' },
      messages,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);

  const json = await res.json();
  trackTokens(json);
  const raw = json.choices?.[0]?.message?.content ?? '';
  if (!raw) throw new Error('OpenAI returned empty content');

  let parsed: any;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error(`Failed to parse LLM JSON: ${raw.slice(0, 300)}`); }

  const validIds = new Set(JSON.parse(candidatesJson).map((c: any) => String(c.id)));
  const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
    .filter((r: any) => {
      const id = String(r?.product_id ?? '');
      if (!id || !validIds.has(id)) { console.warn(`[ai-recommend] hallucinated id: ${id}`); return false; }
      return true;
    })
    .slice(0, 8)
    .map((r: any) => ({
      product_id: String(r.product_id),
      title: String(r.title ?? ''),
      reason_1: String(r.reason_1 ?? ''),
      reason_2: String(r.reason_2 ?? ''),
      spark_joy_reason: String(r.spark_joy_reason ?? r.reason_1 ?? ''),
      fit_tags: Array.isArray(r.fit_tags) ? r.fit_tags : [],
      price: typeof r.price === 'number' ? r.price : 0,
      confidence_0_1: typeof r.confidence_0_1 === 'number'
        ? Math.min(1, Math.max(0, r.confidence_0_1)) : 0,
    }));

  return {
    clarifying_questions: Array.isArray(parsed.clarifying_questions) ? parsed.clarifying_questions : [],
    quick_replies: Array.isArray(parsed.quick_replies) ? parsed.quick_replies : [],
    recommendations,
    chat_followup: typeof parsed.chat_followup === 'string' ? parsed.chat_followup : '',
    cautions: Array.isArray(parsed.cautions) ? parsed.cautions : [],
    extracted_profile_hints: typeof parsed.extracted_profile_hints === 'object'
      ? parsed.extracted_profile_hints : {},
    candidates_evaluated: candidateCount,
  };
}

// ===========================================================================
// REQUEST / RESPONSE TYPES
// ===========================================================================
interface RequestBody {
  recipientProfileId?: string | null;
  recipientName?: string;
  recipientRelationship?: string;
  occasion?: string;
  budget?: number;
  freeText?: string;
  chatHistory?: { role: string; content: string }[];
  feedbackHistory?: { productId: string; productName: string; type: 'like' | 'dislike'; reason?: string }[];
  lastRecommendations?: { product_id: string; title: string }[];
  sessionState?: SessionState;
  constraints?: {
    gift_wrap_required?: boolean;
    personalization_required?: boolean;
    shipping_deadline_days?: number;
  };
}

// ===========================================================================
// HANDLER
// ===========================================================================
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const _startMs = Date.now();
    // Reset per-request token accumulator (module-level for helper function access)
    _requestTokens = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, embedding_tokens: 0 };

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return errorResponse('Missing Authorization header', 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse('Unauthorized', 401);
    const userId = user.id;

    // ── Parse body ────────────────────────────────────────────────────────
    let body: RequestBody;
    try { body = await req.json(); }
    catch { return errorResponse('Invalid JSON body'); }

    const {
      recipientProfileId,
      recipientName,
      recipientRelationship,
      occasion,
      budget,
      freeText,
      chatHistory = [],
      feedbackHistory = [],
      lastRecommendations = [],
      sessionState: incomingState,
      constraints,
    } = body;

    console.log('[v4] START', { userId, recipientProfileId, occasion, budget });

    // ── Step 1: Load DB profile ───────────────────────────────────────────
    let dbProfile: Record<string, any> | null = null;
    if (recipientProfileId) {
      try {
        const { data: pref } = await supabaseAdmin.from('recipient_preferences').select('*')
          .eq('recipient_profile_id', recipientProfileId).maybeSingle();
        const { data: profile } = await supabaseAdmin.from('recipient_profiles')
          .select('full_name, avatar_url, gender_identity, birth_date, age_range, relationship')
          .eq('id', recipientProfileId).maybeSingle();
        dbProfile = { ...(pref ?? {}), ...(profile ?? {}) };
      } catch (e) { console.warn('[v4] profile load failed:', (e as Error).message); }
    }

    // ── Step 2: Summarize long history ────────────────────────────────────
    const { summary: historySummary, recentMessages } = await summarizeChatHistory(chatHistory);

    // ── Step 3: Initialize / restore session state ────────────────────────
    let state: SessionState = incomingState ?? initSessionState();
    state = { ...state, turnCount: state.turnCount + 1 };

    // ── Step 4: Parse feedback into structured avoids (Fix #5) ──────────
    // Run only if there are feedback entries with reasons
    const feedbackWithReasons = feedbackHistory.filter((f) => f.reason?.trim());
    let feedbackAvoids = { hardAvoids: [] as ProfileValue[], softAvoids: [] as ProfileValue[], positiveStyles: [] as ProfileValue[] };
    if (feedbackWithReasons.length > 0) {
      feedbackAvoids = await parseFeedbackIntoAvoids(feedbackHistory);
      console.log('[v4] Feedback avoids parsed:', feedbackAvoids);
    }

    // ── Step 5: Classify intent with full context (Fix #3) ───────────────
    const latestUserMessage =
      [...chatHistory].reverse().find((m) => m.role === 'user')?.content ?? freeText ?? '';

    const intent = await classifyIntent(
      latestUserMessage,
      chatHistory.slice(-4),
      state.knownProfile,       // ← now passing actual profile, not {}
      state.phase,
      state.lastQuestionField
    );
    console.log(`[v4] Intent: ${intent.type} (conf: ${intent.confidence})`);

    // ── Step 6: Merge all sources → KnownProfile ─────────────────────────
    state = mergeProfileIntoState(
      state,
      dbProfile,
      intent,
      { recipientName, recipientRelationship, occasion, budget },
      feedbackAvoids
    );

    // ── Step 7: Backend decisions (pure logic) ───────────────────────────
    const profileScore = scoreProfile(state.knownProfile);
    state = { ...state, profileScore };
    const willRecommend = shouldRecommend(state.knownProfile, state, intent.type);
    const newPhase = derivePhase(intent, state, willRecommend, profileScore);
    state = { ...state, phase: newPhase };
    const wizField = nextWizardField(state.knownProfile, state.hasRecommendedOnce);

    const focusProductId = intent.type === 'product_followup'
      ? detectProductFollowUp(latestUserMessage, intent.focusProductRef ?? null, lastRecommendations)
      : null;

    console.log(`[v4] Phase: ${newPhase} | Score: ${profileScore.toFixed(2)} | Recommend: ${willRecommend} | Focus: ${focusProductId}`);

    // ── Step 8: RAG GATING (Fix #4) ──────────────────────────────────────
    // Skip embedding + search entirely when we don't need products.
    // Saves ~150–250ms and embedding cost on every discovery-phase turn.
    let filteredCandidates: any[] = [];
    let candidatesJson = '[]';

    const needsProducts = willRecommend || intent.type === 'product_followup';

    if (needsProducts) {
      const embeddingQuery = buildEmbeddingQuery(state.knownProfile, intent);
      console.log(`[v4] Embedding: "${embeddingQuery}"`);

      const embedding = await embedText(embeddingQuery);
      console.log('[v4] Embedding generated successfully');

      const effectiveBudget = state.knownProfile.budget?.value ?? 9999;
      console.log('[v4] Effective budget:', effectiveBudget);

      console.log('[v4] Starting searchRAG for candidates...');
      let candidates = await searchRAG({
        embedding, maxPrice: effectiveBudget,
        giftWrap: constraints?.gift_wrap_required === true ? true : null,
        personalization: constraints?.personalization_required === true ? true : null,
        limit: 40,
      });
      console.log(`[v4] Found ${candidates.length} candidates after regular search`);

      console.log('[v4] Starting searchRAG for broad candidates...');
      const broadCandidates = await searchRAG({
        embedding, maxPrice: 99999,
        giftWrap: constraints?.gift_wrap_required === true ? true : null,
        personalization: constraints?.personalization_required === true ? true : null,
        limit: 15,
      });
      console.log(`[v4] Found ${broadCandidates.length} broad candidates`);

      const initialIds = new Set(candidates.map((c: any) => c.id));
      const premiumAddition = broadCandidates
        .filter((c: any) => !initialIds.has(c.id))
        .map((c: any) => ({ ...c, is_over_budget: true }));
      candidates = [...candidates, ...premiumAddition];
      console.log(`[v4] Total candidates for LLM: ${candidates.length}`);

      const dislikedIds = feedbackHistory.filter((f) => f.type === 'dislike').map((f) => f.productId);
      filteredCandidates = candidates.filter((c: any) => !dislikedIds.includes(c.id));
      candidatesJson = serializeCandidates(filteredCandidates);
    } else {
      console.log('[v4] RAG skipped — discovery phase, no products needed');
    }

    // ── Step 9: LLM response ─────────────────────────────────────────────
    console.log('[v4] Calling callLLM with candidates...');
    const output = await callLLM({
      state,
      intent,
      nextWizardField: wizField,
      showRecommendations: willRecommend,
      focusProductId,
      dbProfile,
      candidatesJson,
      chatHistory: recentMessages,
      historySummary,
      feedbackHistory,
      lastRecommendations,
      profileScore,
      freeText,
    });

    // ── Step 10: Enrich recommendations with images ───────────────────────
    if (output.recommendations?.length > 0) {
      output.recommendations = output.recommendations.map((r: any) => {
        const candidate = filteredCandidates.find((c: any) => c.id === r.product_id);
        if (!candidate) return r;
        let imageUrl: string | undefined;
        let candidateImages: string[] | undefined;
        try {
          const raw = candidate.images;
          if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed) && parsed.length > 0) {
              candidateImages = parsed.filter(Boolean);
              imageUrl = candidateImages[0];
            } else if (typeof parsed === 'string') { imageUrl = parsed; }
          }
        } catch { if (typeof candidate.images === 'string') imageUrl = candidate.images; }
        return { ...r, price: r.price || candidate.price || 0, image_url: imageUrl, images: candidateImages };
      });
      state.hasRecommendedOnce = true;
    }

    // ── Step 11: Finalise state ───────────────────────────────────────────
    state = {
      ...state,
      historySummary: historySummary || state.historySummary,
      lastQuestionField: wizField ?? null,
      profileScore,
    };

    // ── Step 12: Background — deep NLU persist ───────────────────────────
    if (recipientProfileId && chatHistory.length >= 2) {
      extractAndPersistProfile(recipientProfileId, chatHistory, freeText ?? '', dbProfile ?? {})
        .catch((e) => console.warn('[persist]', (e as Error).message));
    }

    // Inline persist of LLM-spotted hints
    if (recipientProfileId && Object.keys(output.extracted_profile_hints ?? {}).length > 0) {
      const PROFILE_FIELDS = new Set(['full_name', 'gender_identity', 'age_range', 'relationship']);
      const profileUp: Record<string, any> = {};
      const prefsUp: Record<string, any> = {};
      for (const [k, v] of Object.entries(output.extracted_profile_hints)) {
        if (PROFILE_FIELDS.has(k)) profileUp[k] = v;
        else prefsUp[k] = v;
      }
      const ops: Promise<any>[] = [];
      if (Object.keys(profileUp).length > 0)
        ops.push(supabaseAdmin.from('recipient_profiles').update(profileUp).eq('id', recipientProfileId));
      if (Object.keys(prefsUp).length > 0)
        ops.push(supabaseAdmin.from('recipient_preferences').upsert({ recipient_profile_id: recipientProfileId, ...prefsUp }));
      Promise.all(ops).catch((e) => console.warn('[hints persist]', (e as Error).message));
    }

    // ── Step 13: Log session ──────────────────────────────────────────────
    const _latencyMs = Date.now() - _startMs;
    supabaseAdmin.from('ai_recommendation_sessions').insert({
      user_id: userId,
      recipient_profile_id: recipientProfileId || null,
      occasion: val(state.knownProfile.occasion) || 'General',
      budget: state.knownProfile.budget?.value || null,
      free_text: freeText ?? null,
      intent_text: needsProducts ? buildEmbeddingQuery(state.knownProfile, intent) : '(discovery)',
      retrieved_product_ids: filteredCandidates.map((c: any) => c.id),
      final_recommendations: output,
      model_used: 'gpt-4o',
      latency_ms: _latencyMs,
      token_usage: _requestTokens,
    }).then(({ error: e }) => { if (e) console.error('[session log]', e.message); });

    return jsonResponse({
      ...output,
      sessionState: state,
      intent: { type: intent.type, confidence: intent.confidence },
      profileScore,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai-recommend v4]', msg);
    return errorResponse(`Internal error: ${msg}`, 500);
  }
});