/**
 * AI sessions, messages, gift_recommendations, and ai_feedback API.
 * All Supabase writes for AI-related tables go through here.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const NOT_CONFIGURED = { message: 'Supabase is not configured', code: 'SUPABASE_NOT_CONFIGURED' } as const;

export type CreateSessionOptions = {
  userId: string;
  title?: string | null;
};

/**
 * Create a new AI session. Uses DB defaults for started_at/last_active_at.
 */
export async function createAISession(
  options: CreateSessionOptions
): Promise<{ data: { id: string } | null; error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED };
  const { userId, title = null } = options;

  // Check current session count
  const { count, error: countError } = await supabase
    .from('ai_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    return { data: null, error: { message: countError.message, code: countError.code } };
  }

  if (count !== null && count >= 3) {
    return { 
      data: null, 
      error: { 
        message: 'You have reached the limit of 3 AI chat sessions. Please delete an older session to start a new one.', 
        code: 'SESSION_LIMIT_REACHED' 
      } 
    };
  }

  const { data, error } = await supabase
    .from('ai_sessions')
    .insert({
      user_id: userId,
      ...(title != null && { title }),
    })
    .select('id')
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }
  return { data: data ? { id: data.id } : null, error: null };
}

export async function insertAIMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: any
): Promise<{ error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  let finalContent = content;
  if (metadata) {
    finalContent = `${content}\n\n[METADATA]\n${JSON.stringify(metadata)}\n[/METADATA]`;
  }

  const { error } = await supabase.from('ai_messages').insert({
    session_id: sessionId,
    role,
    content: finalContent,
  });
  return error ? { error: { message: error.message, code: error.code } } : { error: null };
}

export async function updateSessionLastActive(
  sessionId: string
): Promise<{ error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const { error } = await supabase
    .from('ai_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', sessionId);
  return error ? { error: { message: error.message, code: error.code } } : { error: null };
}

export async function getUserAISessions(
  userId: string
): Promise<{ data: any[] | null; error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED };

  // Fetch sessions along with their first message to use as a preview/title
  const { data, error } = await supabase
    .from('ai_sessions')
    .select(`
      *,
      ai_messages (
        content,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('last_active_at', { ascending: false });

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  // Format the data to easily grab the first message
  const formattedData = data?.map(session => {
    // Sort messages by created_at to get the first one
    const sortedMessages = session.ai_messages?.sort((a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstMessage = sortedMessages && sortedMessages.length > 0 ? sortedMessages[0].content : null;

    // We don't want to send back the whole message array in the session list overview
    const { ai_messages, ...rest } = session;
    return {
      ...rest,
      previewText: session.title || firstMessage || 'Sparks of joy ✨'
    };
  });

  return { data: formattedData, error: null };
}

export async function deleteAISession(
  sessionId: string
): Promise<{ error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const { error } = await supabase
    .from('ai_sessions')
    .delete()
    .eq('id', sessionId);
  return error ? { error: { message: error.message, code: error.code } } : { error: null };
}

export async function getAISessionMessages(
  sessionId: string
): Promise<{ data: any[] | null; error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }
  return { data, error: null };
}

/** UUID v4-ish check so we don't insert invalid product_id */
function isValidUUID(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  const u = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return u.test(s);
}

export type InsertGiftRecommendationOptions = {
  userId: string;
  productId: string;
  recipientId?: string | null;
  occasionId?: string | null;
  status?: 'suggested' | 'purchased' | 'rejected' | 'saved';
};

/**
 * Insert a gift recommendation (e.g. after AI suggests a product). Skips if productId is not a valid UUID.
 */
export async function insertGiftRecommendation(
  options: InsertGiftRecommendationOptions
): Promise<{ error: { message: string; code?: string } | null }> {
  const { userId, productId, recipientId = null, occasionId = null, status = 'suggested' } = options;
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  if (!isValidUUID(productId)) {
    return { error: { message: 'Invalid product ID for gift_recommendations', code: 'INVALID_UUID' } };
  }
  const { error } = await supabase.from('gift_recommendations').insert({
    user_id: userId,
    product_id: productId,
    recipient_id: recipientId,
    occasion_id: occasionId,
    status,
  });
  return error ? { error: { message: error.message, code: error.code } } : { error: null };
}

export type InsertAIFeedbackOptions = {
  userId: string;
  feedbackType: 'like' | 'dislike';
  productId?: string | null;
  recipientId?: string | null;
  reason?: string | null;
};

/**
 * Record AI feedback (e.g. user liked or disliked a recommendation).
 */
export async function insertAIFeedback(
  options: InsertAIFeedbackOptions
): Promise<{ error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const { userId, feedbackType, productId = null, recipientId = null, reason = null } = options;
  const { error } = await supabase.from('ai_feedback').insert({
    user_id: userId,
    feedback_type: feedbackType,
    product_id: productId ?? undefined,
    recipient_id: recipientId ?? undefined,
    reason: reason ?? undefined,
  });
  return error ? { error: { message: error.message, code: error.code } } : { error: null };
}

/**
 * Fetch AI feedback for a user and optionally a specific recipient.
 */
export async function getAIFeedback(
  userId: string,
  recipientId?: string | null
): Promise<{ data: any[] | null; error: { message: string, code?: string } | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED };

  let query = supabase
    .from('ai_feedback')
    .select(`
      feedback_type,
      product_id,
      recipient_id,
      reason,
      created_at
    `)
    .eq('user_id', userId);

  if (recipientId != null) {
    query = query.eq('recipient_id', recipientId);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  // Map to the format expected by the recommender (feedbackHistory)
  const formattedData = data?.map(f => ({
    productId: f.product_id,
    type: f.feedback_type,
    reason: f.reason,
  }));

  return { data: formattedData, error: null };
}

export type UpdateGiftRecommendationStatusOptions = {
  userId: string;
  productId: string;
  status: 'suggested' | 'purchased' | 'rejected' | 'saved';
  recipientId?: string | null;
};

/**
 * Update gift_recommendations status (e.g. when product is added to cart or purchased).
 * Updates all matching recommendations for this user/product (optionally filtered by recipient_id).
 */
export async function updateGiftRecommendationStatus(
  options: UpdateGiftRecommendationStatusOptions
): Promise<{ error: { message: string; code?: string } | null }> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const { userId, productId, status, recipientId } = options;
  if (!isValidUUID(productId)) {
    return { error: { message: 'Invalid product ID', code: 'INVALID_UUID' } };
  }

  let query = supabase
    .from('gift_recommendations')
    .update({ status })
    .eq('user_id', userId)
    .eq('product_id', productId);

  // If recipientId is provided, only update recommendations for that recipient
  // Otherwise, update all recommendations for this product
  if (recipientId != null) {
    query = query.eq('recipient_id', recipientId);
  }

  const { error } = await query;
  return error ? { error: { message: error.message, code: error.code } } : { error: null };
}

// ---------------------------------------------------------------------------
// AI Recommender Edge Function Client
// ---------------------------------------------------------------------------

export interface RecommenderParams {
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

export interface RecommendedProduct {
  product_id: string;
  title: string;
  reason_1: string;
  reason_2: string;
  fit_tags: string[];
  price: number;
  original_price?: number;
  confidence_0_1: number;
  image_url?: string;
  images?: string[];
}

export interface RecommenderOutput {
  clarifying_questions: string[];
  recommendations: RecommendedProduct[];
  quick_replies?: string[];
  chat_followup: string;
  message_script: string;
  cautions: string[];
  candidates_evaluated: number;
}

/**
 * Calls the appropriate AI Recommend Edge Function:
 * - 'ai-recommend' for discovery (untagged)
 * - 'ai-recommend-tagged' for experts (tagged)
 */
export async function callAIRecommendFunction(
  params: RecommenderParams,
  isTagged?: boolean
): Promise<{ data: RecommenderOutput | null; error: { message: string } | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED };

  // Get current session for Authorization header
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session?.access_token) {
    return { data: null, error: { message: 'Must be logged in to use AI recommender' } };
  }

  const functionName = isTagged ? 'ai-recommend-tagged' : 'ai-recommend';

  const { data, error } = await supabase.functions.invoke<RecommenderOutput>(functionName, {
    body: params,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    }
  });

  if (error) {
    console.error(`[callAIRecommendFunction] Error calling ${functionName}:`, error);
    return { data: null, error: { message: error.message || 'Failed to fetch recommendations' } };
  }

  return { data, error: null };
}
