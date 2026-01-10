// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ActivateQrCardRequest = {
  orderId?: string;
  qrPublicToken?: string;
  finalize?: boolean; // If true, finalize pending activation; if false, reserve (pending_activation)
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, qrPublicToken, finalize = false }: ActivateQrCardRequest = await req.json().catch(() => ({}));

    if (!orderId || !qrPublicToken) {
      return new Response(
        JSON.stringify({ error: 'orderId and qrPublicToken are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    // Get auth header for vendor identification
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }

    // Create authenticated client to get vendor info
    const supabaseAuth = createClient(
      supabaseUrl,
      authHeader.replace('Bearer ', ''),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }

    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify user is a vendor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'vendor') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only vendors can activate QR cards' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
      );
    }

    const vendorId = profile.id;

    // Fetch and validate order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }

    // Validate order status
    if (order.status !== 'awaiting_qr_assignment') {
      return new Response(
        JSON.stringify({ 
          error: `Order status is ${order.status}, expected 'awaiting_qr_assignment'`,
          currentStatus: order.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    // Verify vendor has access to this order (order must contain products from this vendor)
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Unable to fetch order items' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const productIds = orderItems.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('vendor_id')
      .in('id', productIds);

    if (productsError) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify vendor access' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const hasAccess = products && products.some(p => p.vendor_id === vendorId);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Vendor does not have access to this order' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
      );
    }

    // Fetch and validate QR card
    const { data: qrCard, error: qrCardError } = await supabase
      .from('giftyy_cards')
      .select('*')
      .eq('public_token', qrPublicToken)
      .single();

    if (qrCardError || !qrCard) {
      return new Response(
        JSON.stringify({ error: 'QR card not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }

    // Handle finalization (step 2) or reservation (step 1)
    if (finalize) {
      // Step 2: Finalize activation
      if (qrCard.status !== 'pending_activation') {
        return new Response(
          JSON.stringify({ 
            error: `QR card status is ${qrCard.status}, expected 'pending_activation'`,
            currentStatus: qrCard.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      if (qrCard.pending_order_id !== orderId) {
        return new Response(
          JSON.stringify({ 
            error: 'QR card is reserved for a different order',
            expectedOrderId: qrCard.pending_order_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 },
        );
      }

      // Finalize: Update QR card to active and update order status
      const { error: updateQrError } = await supabase
        .from('giftyy_cards')
        .update({
          status: 'active',
          assigned_order_id: orderId,
          activated_at: new Date().toISOString(),
          pending_order_id: null, // Clear pending assignment
        })
        .eq('id', qrCard.id);

      if (updateQrError) {
        console.error('Error finalizing QR card activation:', updateQrError);
        return new Response(
          JSON.stringify({ error: 'Failed to finalize QR card activation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      // Update order status to qr_assigned
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ status: 'qr_assigned' })
        .eq('id', orderId);

      if (updateOrderError) {
        console.error('Error updating order status:', updateOrderError);
        // Note: QR card is already activated, so this is a partial failure
        // In production, consider using a transaction or compensating action
        return new Response(
          JSON.stringify({ 
            error: 'QR card activated but failed to update order status',
            warning: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'QR card activated and order status updated',
          qrCardId: qrCard.id,
          orderId: orderId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );

    } else {
      // Step 1: Reserve (pending_activation)
      if (qrCard.status !== 'inactive') {
        return new Response(
          JSON.stringify({ 
            error: `QR card status is ${qrCard.status}, expected 'inactive'`,
            currentStatus: qrCard.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      if (qrCard.assigned_order_id) {
        return new Response(
          JSON.stringify({ 
            error: 'QR card is already assigned to an order',
            assignedOrderId: qrCard.assigned_order_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 },
        );
      }

      // Reserve: Set to pending_activation
      const { error: reserveError } = await supabase
        .from('giftyy_cards')
        .update({
          status: 'pending_activation',
          pending_order_id: orderId,
          activated_by_vendor_id: vendorId,
        })
        .eq('id', qrCard.id);

      if (reserveError) {
        console.error('Error reserving QR card:', reserveError);
        return new Response(
          JSON.stringify({ error: 'Failed to reserve QR card' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'QR card reserved for activation',
          qrCardId: qrCard.id,
          orderId: orderId,
          nextStep: 'Call again with finalize=true to complete activation',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

  } catch (error) {
    console.error('activate-qr-card function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

