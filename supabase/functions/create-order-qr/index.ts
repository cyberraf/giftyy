// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CreateOrderQrRequest = {
  orderId?: string;
};

type OrderRecord = {
  id: string;
  order_code: string;
  user_id: string | null;
};

type OrderItem = {
  product_id: string;
};

type ProductRecord = {
  id: string;
  vendor_id: string | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId }: CreateOrderQrRequest = await req.json().catch(() => ({}));

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_code, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items', itemsError);
      throw new Error('Unable to fetch order items');
    }

    const productIds = Array.from(
      new Set((items as OrderItem[] | null)?.map((item) => item.product_id) || []),
    );

    let vendorIds: string[] = [];

    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, vendor_id')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products for QR creation', productsError);
        throw new Error('Unable to fetch product vendors');
      }

      vendorIds = Array.from(
        new Set(
          (products as ProductRecord[] | null)
            ?.map((product) => product.vendor_id)
            .filter((id): id is string => Boolean(id)) || [],
        ),
      );
    }

    // Always create a general/admin QR record (vendor_id null) plus per-vendor records
    // Create a deep link URL that works for both app deep linking and universal links
    // Format: https://giftyy.store/gift/{orderId} (can be configured as universal link)
    // Falls back to giftyy://gift/{orderId} for direct deep linking
    const deepLinkUrl = `https://giftyy.store/gift/${order.id}`;
    const qrPayload = JSON.stringify({
      orderId: order.id,
      orderCode: order.order_code,
      url: deepLinkUrl,
    });

    // QR code should contain the URL for easy scanning - recipients can scan and open in app or web
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(deepLinkUrl)}`;
    const rows = [
      {
        order_id: order.id,
        vendor_id: null,
        qr_code_url: qrUrl,
        qr_code_data: qrPayload,
        created_by: order.user_id,
      },
      ...vendorIds.map((vendorId) => ({
        order_id: order.id,
        vendor_id: vendorId,
        qr_code_url: qrUrl,
        qr_code_data: qrPayload,
        created_by: order.user_id,
      })),
    ];

    const { error: upsertError } = await supabase
      .from('order_qr_codes')
      .upsert(rows, { onConflict: 'order_id,vendor_id' });

    if (upsertError) {
      console.error('Error upserting order_qr_codes', upsertError);
      throw new Error('Unable to store QR code metadata');
    }

    return new Response(
      JSON.stringify({
        success: true,
        vendorCount: vendorIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('create-order-qr function error', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});


