import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Save reaction function up and running')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error')
    }

    const { orderId, videoMessageId, reactionVideoUrl, duration, isPublic, userId } = await req.json()

    if (!orderId || !reactionVideoUrl || !duration) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orderId, reactionVideoUrl, duration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to Supabase with Service Role to bypass RLS for inserting
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if order exists (for security)
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Define payload
    const payload: any = {
      order_id: orderId,
      video_message_id: videoMessageId || null,
      reaction_video_url: reactionVideoUrl,
      duration_seconds: parseInt(duration, 10),
      is_public: typeof isPublic === 'boolean' ? isPublic : false,
      recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Attempt to add recipient_user_id if provided
    if (userId) {
      payload.recipient_user_id = userId
    }

    const doUpsert = async (pld: any) => {
      return await adminSupabase
        .from('recipient_reactions')
        .upsert(pld, { onConflict: 'order_id', ignoreDuplicates: false })
    }

    let result = await doUpsert(payload);

    // Fallback if insertion hits a FK constraint error for recipient_user_id
    // This handles both the old "relation recipients does not exist" and the new
    // FK violation when the user_id is not present in recipient_profiles
    if (result.error && payload.recipient_user_id && (
      result.error.message.includes('relation "recipients" does not exist') ||
      result.error.code === '23503' // FK violation
    )) {
      console.warn('Fallback: Attempting upsert without recipient_user_id due to FK constraint:', result.error.message);
      const fallbackPayload = { ...payload };
      delete fallbackPayload.recipient_user_id;
      result = await doUpsert(fallbackPayload);
    }

    if (result.error) {
      console.error('Error saving reaction:', result.error)
      return new Response(
        JSON.stringify({ error: 'Failed to save reaction: ' + result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, reaction: result.data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
