// @ts-nocheck
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Giftyy <info@giftyy.store>';

type NotifyPayload = {
  recipientEmail?: string;
  recipientName?: string;
  orderCode?: string;
  street?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  message?: string;
  estimatedArrival?: string;
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
    const payload: NotifyPayload = await req.json();

    if (!payload.recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'recipientEmail is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Company brand colors
    const BRAND_ORANGE = '#f75507';
    const WHITE = '#ffffff';
    const TEXT_DARK = '#111827';
    const TEXT_LIGHT = '#64748b';
    
    // Logo URL - Must be publicly accessible
    // To use your logo from assets/images/logo.png:
    // 1. Upload logo.png to Supabase Storage (public bucket) or your CDN
    // 2. Update LOGO_URL below with the public URL
    // Example: 'https://your-project.supabase.co/storage/v1/object/public/brand-assets/logo.png'
    const LOGO_URL = Deno.env.get('GIFTYY_LOGO_URL') || 'https://giftyy.store/assets/images/logo.png';

    const recipientName = payload.recipientName || 'there';
    const customMessage = payload.message ? `<div style="margin: 0 0 24px 0; padding: 20px; background-color: #fef7f0; border-left: 4px solid ${BRAND_ORANGE}; border-radius: 8px;"><p style="margin: 0; font-size: 15px; color: ${TEXT_DARK}; line-height: 1.6;">${payload.message}</p></div>` : '';
    
    // Extract first name from recipient name
    const firstName = recipientName.split(' ')[0] || recipientName;
    
    // Format full shipping address
    const addressParts: string[] = [];
    if (payload.street) addressParts.push(payload.street);
    if (payload.apartment) addressParts.push(payload.apartment);
    if (payload.city) addressParts.push(payload.city);
    if (payload.state) addressParts.push(payload.state);
    if (payload.zip) addressParts.push(payload.zip);
    if (payload.country) addressParts.push(payload.country);
    const fullShippingAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
    
    // Format estimated days
    const estimatedDays = payload.estimatedArrival || '3-5 business days';
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>A Surprise is on its Way!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${WHITE}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${WHITE};">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: ${WHITE};">
                
                <!-- ========== HEADER ========== -->
                <tr>
                  <td style="padding: 40px 32px 32px 32px; border-bottom: 1px solid #e2e8f0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="https://giftyy.store" style="text-decoration: none; display: inline-block;">
                            <img src="${LOGO_URL}" alt="Giftyy" style="height: 56px; width: auto; display: block; margin-bottom: 12px;" />
                          </a>
                          <h2 style="margin: 0 0 6px 0; font-size: 32px; font-weight: 700; color: ${BRAND_ORANGE};">
                            Giftyy
                          </h2>
                          <p style="margin: 0; font-size: 15px; color: ${TEXT_LIGHT}; font-style: italic;">
                            Making Gifting fun and memorable
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- ========== BODY ========== -->
                <tr>
                  <td style="padding: 40px 32px;">
                    <!-- Title -->
                    <h1 style="margin: 0 0 28px 0; font-size: 32px; font-weight: 800; color: ${TEXT_DARK}; line-height: 1.2; text-align: center;">
                      A Surprise is on its Way! 🎁
                    </h1>
                    
                    <!-- Message -->
                    <p style="margin: 0 0 16px 0; font-size: 17px; color: ${TEXT_DARK}; line-height: 1.6;">
                      Hi ${firstName},
                    </p>
                    
                    <p style="margin: 0 0 28px 0; font-size: 17px; color: ${TEXT_DARK}; line-height: 1.6;">
                      Someone special you may know is sending you a surprise gift. Curious who it is? Hahaaa! It's a surprise! 😉
                    </p>
                    
                    ${customMessage}
                    
                    <!-- Gift Snapshot Card -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 20px 0; font-size: 14px; font-weight: 700; color: ${TEXT_DARK}; text-transform: uppercase; letter-spacing: 1px;">
                            Gift Snapshot
                          </p>
                          
                          ${fullShippingAddress ? `
                            <div style="margin-bottom: 16px;">
                              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: ${TEXT_LIGHT}; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</p>
                              <p style="margin: 0; font-size: 15px; color: ${TEXT_DARK}; line-height: 1.6;">${fullShippingAddress}</p>
                            </div>
                          ` : ''}
                          
                          <div style="margin-bottom: ${fullShippingAddress ? '0' : '0'};">
                            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${TEXT_LIGHT}; text-transform: uppercase; letter-spacing: 0.5px;">Estimated Delivery</p>
                            <p style="margin: 0; font-size: 15px; color: ${TEXT_DARK}; line-height: 1.5;">${estimatedDays}</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Section -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 40px 0 32px 0;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center" style="padding-bottom: 16px;">
                                <a href="https://giftyy.store" style="display: inline-block; padding: 16px 40px; background-color: ${BRAND_ORANGE}; color: ${WHITE}; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; text-align: center;">
                                  Visit Giftyy Website
                                </a>
                              </td>
                            </tr>
                            <tr>
                              <td align="center">
                                <p style="margin: 0 0 16px 0; font-size: 15px; color: ${TEXT_DARK}; font-weight: 600;">or</p>
                                <a href="https://giftyy.store/download" style="display: inline-block; padding: 16px 40px; background-color: ${WHITE}; color: ${BRAND_ORANGE}; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; text-align: center; border: 2px solid ${BRAND_ORANGE};">
                                  Download Our App
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Signature -->
                    <p style="margin: 32px 0 0 0; font-size: 15px; color: ${TEXT_DARK}; line-height: 1.6;">
                      <strong>— Team Giftyy</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- ========== FOOTER ========== -->
                <tr>
                  <td style="padding: 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <a href="https://giftyy.store" style="font-size: 16px; color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 600;">
                            giftyy.store
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="padding: 0 12px;">
                                <a href="https://www.instagram.com/giftyy_llc/" style="font-size: 14px; color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 500;">
                                  Instagram
                                </a>
                              </td>
                              <td style="padding: 0 12px; border-left: 1px solid #cbd5e1;">
                                <a href="https://www.tiktok.com/@giftyy_llc" style="font-size: 14px; color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 500;">
                                  TikTok
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
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
        to: payload.recipientEmail,
        subject: `A surprise is on its way to you 🎁`,
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
    console.error('notify-recipient-email error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});