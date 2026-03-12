// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    // Query `user_notifications` to see if we already sent a `gift_opened` notification for this order.
    const { data: existingNotification, error: checkError } = await supabaseAdmin
      .from('user_notifications')
      .select('id')
      .eq('user_id', payload.buyerId)
      // metadata is a JSONB column, so we query it using json path or contains
      .contains('metadata', { type: 'gift_opened', order_id: payload.orderId })
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
        data: { url: href },
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
