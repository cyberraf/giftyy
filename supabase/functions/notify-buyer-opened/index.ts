// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// Inlined from _shared/auth.ts (dashboard deployment doesn't bundle _shared/)
function verifyServiceRole(req: Request): { authorized: boolean; error?: string } {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { authorized: false, error: 'Missing Authorization header' }
  try {
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return { authorized: false, error: 'Invalid token format' }
    const payload = JSON.parse(atob(parts[1]))
    if (payload.role !== 'service_role') return { authorized: false, error: 'Forbidden: service_role required' }
    return { authorized: true }
  } catch { return { authorized: false, error: 'Invalid authorization token' } }
}

function unauthorizedResponse(message: string, corsHeaders: Record<string, string>, status = 401): Response {
  return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotifyPayload = {
  buyerId?: string;
  buyerName?: string;
  recipientName?: string;
  orderCode?: string;
  orderId?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify caller has service_role authorization (internal calls only)
  const { authorized, error: authError } = verifyServiceRole(req);
  if (!authorized) {
    return unauthorizedResponse(authError || 'Forbidden', corsHeaders, 403);
  }

  // Set up Supabase Client using Service Role to bypass RLS when inserting notifications
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const payload: NotifyPayload = await req.json();
    console.log('notify-buyer-opened payload:', payload);

    if (!payload.orderId || !payload.buyerId) {
      return new Response(
        JSON.stringify({ error: 'orderId and buyerId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Deduplication Check
    // We only want to notify the buyer the FIRST time the gift is opened.
    // Query `notifications` to see if we already sent a `gift_opened` notification for this order.
    const { data: existingNotification, error: checkError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', payload.buyerId)
      // data is a JSONB column in notifications
      .contains('data', { type: 'gift_opened', orderId: payload.orderId })
      .maybeSingle();

    if (checkError) {
      console.warn('Could not check existing notifications:', checkError);
    }

    // If it already exists, gracefully exit so we don't spam the buyer
    if (existingNotification) {
      console.log('Notification already sent for order:', payload.orderId);
      return new Response(
        JSON.stringify({ success: true, message: 'Already notified, skipping.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check buyer's notification preferences
    const { data: buyerSettings } = await supabaseAdmin
      .from('user_settings')
      .select('push_notifications_enabled, order_updates_enabled')
      .eq('user_id', payload.buyerId)
      .maybeSingle();

    const pushEnabled = buyerSettings?.push_notifications_enabled !== false;
    const orderUpdatesEnabled = buyerSettings?.order_updates_enabled !== false;

    // If order updates are fully disabled, skip everything
    if (!orderUpdatesEnabled) {
      console.log('Order updates disabled for buyer:', payload.buyerId);
      return new Response(
        JSON.stringify({ success: true, message: 'Order updates disabled by user, skipping.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const recipientName = payload.recipientName || 'Your recipient';
    const title = 'Your message has been opened! \uD83C\uDF89';
    const bodyText = `${recipientName} just opened your video message! Keep an eye on your app for a possible video reaction.`;
    const href = `/gift/${payload.orderCode}`; // This assumes you want them to revisit the gift page in-app

    // 2. Insert into notifications for in-app bell menu
    const { error: notifyError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: payload.buyerId,
        type: 'gift_opened',
        title: title,
        body: bodyText,
        data: {
          orderId: payload.orderId,
          orderCode: payload.orderCode,
          type: 'gift_opened',
          actionHref: href,
          actionLabel: 'View Gift'
        }
      });

    if (notifyError) {
      console.error('Failed to create in-app notification:', notifyError);
    }

    // 3. Invoke push notification edge function directly to send Expo push 
    const { error: pushError } = await supabaseAdmin.functions.invoke('send-push-notification', {
      body: {
        userId: payload.buyerId,
        title: title,
        body: bodyText,
        categoryId: 'order_status',
        data: { url: href, orderId: payload.orderId, orderCode: payload.orderCode, type: 'gift_opened' },
        sound: 'default'
      }
    });

    if (pushError) {
      console.error('Failed to send push notification:', pushError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'In-app notification and push delivered.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('notify-buyer-opened error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
