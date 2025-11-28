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
  city?: string;
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

    const recipientName = payload.recipientName || 'there';
    const orderCode = payload.orderCode ? `Order code: ${payload.orderCode}` : '';
    const estimatedArrival = payload.estimatedArrival ? `Estimated arrival: ${payload.estimatedArrival}` : '';
    const cityLine = payload.city ? `Shipping to ${payload.city}.` : '';
    const customMessage = payload.message ? `<p style="margin:16px 0;font-size:15px;color:#111827;">${payload.message}</p>` : '';

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; background: #f7f7f9;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 12px 30px rgba(15,23,42,0.08);">
          <div style="text-align:center; margin-bottom: 24px;">
            <img src="https://giftyy.store/brand/logo.png" alt="Giftyy" style="height: 48px;" />
          </div>
          <p style="font-size: 15px; color: #475569;">Hi ${recipientName},</p>
          <p style="font-size: 16px; color: #111827; line-height: 1.6;">
            Someone special has something on the way for you. Expect a delivery within 3-5 business days.
          </p>
          ${customMessage}
          <div style="margin: 24px 0; padding: 16px; background: #f1f5f9; border-radius: 12px; color: #0f172a; font-size: 14px;">
            <p style="margin: 0; font-weight: 700;">Gift Snapshot</p>
            <p style="margin: 6px 0;">${orderCode}</p>
            <p style="margin: 0;">${estimatedArrival}</p>
            <p style="margin: 0;">${cityLine}</p>
          </div>
          <p style="font-size: 14px; color: #475569;">
            We’ll send another update as soon as it’s on the move.
          </p>
          <p style="font-size: 14px; color: #94a3b8;">— Team Giftyy</p>
        </div>
      </div>
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