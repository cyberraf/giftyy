// @ts-nocheck
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Giftyy <info@giftyy.store>';

type BuyerNotifyPayload = {
    buyerEmail: string;
    buyerName: string;
    orderCode: string;
    totalAmount: number;
    recipientName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    estimatedArrival?: string;
    shippingAddress?: string;
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (!RESEND_API_KEY) {
        return new Response(
            JSON.stringify({ error: 'Missing RESEND_API_KEY environment variable' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }

    try {
        const payload: BuyerNotifyPayload = await req.json();

        if (!payload.buyerEmail) {
            return new Response(
                JSON.stringify({ error: 'buyerEmail is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Company brand colors
        const BRAND_ORANGE = '#f75507';
        const WHITE = '#ffffff';
        const TEXT_DARK = '#111827';
        const TEXT_LIGHT = '#64748b';

        // Logo URL
        const LOGO_URL = Deno.env.get('GIFTYY_LOGO_URL') || 'https://qaftabktuogxisioeeua.supabase.co/storage/v1/object/public/brand-assets/giftyy.png';

        const buyerName = payload.buyerName || 'Valued Customer';
        const firstName = buyerName.split(' ')[0] || buyerName;
        const estimatedDays = payload.estimatedArrival || '3-5 business days';

        // Format items list
        const itemsListHtml = payload.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: ${TEXT_DARK}; font-size: 14px;">${item.quantity}x ${item.name}</span>
        <span style="color: ${TEXT_DARK}; font-weight: 600; font-size: 14px;">$${item.price.toFixed(2)}</span>
      </div>
    `).join('');

        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          body { margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
          .button { background-color: ${BRAND_ORANGE}; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); margin-top: 40px; margin-bottom: 40px;">
                
                <!-- HEADER -->
                <div style="background-color: ${BRAND_ORANGE}; padding: 32px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                  <a href="https://giftyy.store" target="_blank" style="text-decoration: none;">
                    <img src="${LOGO_URL}" width="120" alt="Giftyy" style="display: block; margin: 0 auto; border: 0; margin-bottom: 16px;">
                  </a>
                  <div style="color: #ffffff; font-weight: 800; font-size: 24px; margin-bottom: 4px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Giftyy</div>
                  <div style="color: #ffffff; font-size: 14px; opacity: 0.9; letter-spacing: 0.5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Because Every Gift Deserves a Story</div>
                </div>
                
                <!-- BODY -->
                <div style="padding: 40px 48px;">
                  <h1 style="color: ${TEXT_DARK}; font-size: 24px; margin-bottom: 24px; margin-top: 0; font-weight: 700; text-align: center;">Order Confirmed! 🎉</h1>
                  
                  <p style="color: ${TEXT_DARK}; font-size: 16px; line-height: 26px; margin-bottom: 16px;">
                    Hi ${firstName},
                  </p>
                  
                  <p style="color: ${TEXT_DARK}; font-size: 16px; line-height: 26px; margin-bottom: 24px;">
                    Thank you for your order! We're preparing your gift for <strong>${payload.recipientName}</strong>. You've just created a memory that will last a lifetime.
                  </p>
                  
                  <!-- Order Summary -->
                  <div style="margin: 32px 0; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                      <span style="font-size: 14px; font-weight: 700; color: ${TEXT_LIGHT}; text-transform: uppercase; letter-spacing: 1px;">Order #${payload.orderCode}</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      ${itemsListHtml}
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 700; color: ${TEXT_DARK};">Total</span>
                      <span style="font-weight: 700; color: ${BRAND_ORANGE}; font-size: 18px;">$${payload.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <!-- Shipping Info -->
                  <div style="margin-bottom: 32px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${TEXT_LIGHT}; text-transform: uppercase; letter-spacing: 0.5px;">Estimated Delivery</p>
                    <p style="margin: 0; font-size: 15px; color: ${TEXT_DARK}; line-height: 1.5;">${estimatedDays}</p>
                    
                    ${payload.shippingAddress ? `
                      <div style="margin-top: 16px;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${TEXT_LIGHT}; text-transform: uppercase; letter-spacing: 0.5px;">Shipping To</p>
                        <p style="margin: 0; font-size: 15px; color: ${TEXT_DARK}; line-height: 1.5;">${payload.recipientName}<br>${payload.shippingAddress}</p>
                      </div>
                    ` : ''}
                  </div>
                  
                  <!-- CTAs -->
                  <div style="text-align: center; margin-top: 40px;">
                    <a href="https://giftyy.store" class="button" style="color: #ffffff;">View Order Status</a>
                  </div>
                  
                  <p style="margin-top: 40px; font-size: 15px; color: ${TEXT_DARK};">
                    <strong>— Team Giftyy</strong>
                  </p>
                </div>
                
                <!-- FOOTER -->
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #f0f0f0;">
                  <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0 0 16px 0;">
                    &copy; 2024 Giftyy. Because every gift deserves a story.
                  </p>
                  <div>
                    <a href="https://www.instagram.com/giftyy_llc" style="color: #9ca3af; text-decoration: none; margin: 0 8px; font-size: 12px;">Instagram</a>
                    <span style="color: #e5e7eb;">|</span>
                    <a href="https://www.tiktok.com/@giftyy_llc" style="color: #9ca3af; text-decoration: none; margin: 0 8px; font-size: 12px;">TikTok</a>
                    <span style="color: #e5e7eb;">|</span>
                    <a href="https://linkedin.com/company/giftyy-store" style="color: #9ca3af; text-decoration: none; margin: 0 8px; font-size: 12px;">LinkedIn</a>
                  </div>
                </div>
                
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: payload.buyerEmail,
                subject: `Order Confirmation #${payload.orderCode} 🎁`,
                html,
            }),
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('Resend API error:', errorText);
            return new Response(
                JSON.stringify({ error: 'Failed to send email', details: errorText }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (error) {
        console.error('notify-buyer-email error:', error);
        return new Response(
            JSON.stringify({ error: 'Unexpected error', details: error.message || String(error) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
