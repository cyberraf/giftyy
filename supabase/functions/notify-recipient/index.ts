// @ts-nocheck
// notify-recipient — handles all three notification channels:
//   1. ✉️  Email (via Resend)
//   2. 🔔  In-app notification (insert into notifications table)
//   3. 📲  Push notification (via Expo Push API)
//
// Designed to preserve sender anonymity — no item details or sender info in recipient-facing content.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Giftyy <info@giftyy.store>'
const BRAND_ORANGE = '#f75507'
const LOGO_URL = 'https://giftyy.store/assets/images/logo.png'

type NotifyPayload = {
    // Recipient identification (at least one required for push/in-app)
    recipientEmail?: string       // used for email channel
    recipientFirstName?: string
    recipientLastName?: string
    recipientName?: string        // fallback display name

    // Order context
    orderCode?: string
    estimatedArrival?: string

    // Shipping (shown in email only)
    street?: string
    apartment?: string
    city?: string
    state?: string
    zip?: string
    country?: string

    // Channels to trigger (default: all)
    sendEmail?: boolean
    sendInApp?: boolean
    sendPush?: boolean
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Verify caller has service_role authorization (internal calls only)
    const { authorized, error: authError } = verifyServiceRole(req)
    if (!authorized) {
        return unauthorizedResponse(authError || 'Forbidden', corsHeaders, 403)
    }

    try {
        const payload: NotifyPayload = await req.json()

        // ── Resolve display name ────────────────────────────────────────────────
        const recipientName = payload.recipientName ||
            [payload.recipientFirstName, payload.recipientLastName].filter(Boolean).join(' ') ||
            'there'
        const firstName = recipientName.split(' ')[0] || recipientName
        const estimatedDays = payload.estimatedArrival || '3-5 business days'

        // ── Supabase admin client (bypasses RLS for insert) ─────────────────────
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const results: Record<string, any> = {}
        let sendEmail = payload.sendEmail !== false
        let sendInApp = payload.sendInApp !== false
        let sendPush = payload.sendPush !== false

        // ══════════════════════════════════════════════════════════════════════
        // STEP 1 — Resolve recipient's user_id (needed for in-app + push)
        // ══════════════════════════════════════════════════════════════════════
        let recipientUserId: string | null = null

        if (sendInApp || sendPush) {
            // Try by email in profiles (case-insensitive — emails are case-insensitive per RFC)
            if (payload.recipientEmail) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('email', payload.recipientEmail)
                    .single()
                if (profileData?.id) recipientUserId = profileData.id
            }

            // Fallback: search recipient_profiles by name
            if (!recipientUserId && payload.recipientFirstName) {
                const query = supabase
                    .from('recipient_profiles')
                    .select('user_id')
                    .eq('first_name', payload.recipientFirstName)
                    .not('user_id', 'is', null)
                    .limit(1)

                if (payload.recipientLastName) {
                    query.eq('last_name', payload.recipientLastName)
                }

                const { data: rpData } = await query
                if (rpData?.[0]?.user_id) recipientUserId = rpData[0].user_id
            }

            console.log('[notify-recipient] Resolved recipientUserId:', recipientUserId)

            // Check recipient's notification preferences
            if (recipientUserId) {
                const { data: recipientSettings } = await supabase
                    .from('user_settings')
                    .select('push_notifications_enabled, email_notifications_enabled')
                    .eq('user_id', recipientUserId)
                    .maybeSingle()

                if (recipientSettings) {
                    if (recipientSettings.push_notifications_enabled === false) {
                        console.log('[notify-recipient] Push disabled by recipient, skipping')
                        sendPush = false
                    }
                    if (recipientSettings.email_notifications_enabled === false) {
                        console.log('[notify-recipient] Email disabled by recipient, skipping')
                        sendEmail = false
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // STEP 2 — ✉️  Email via Resend
        // ══════════════════════════════════════════════════════════════════════
        if (sendEmail && payload.recipientEmail && RESEND_API_KEY) {
            try {
                const addressParts: string[] = []
                if (payload.street) addressParts.push(payload.street)
                if (payload.apartment) addressParts.push(payload.apartment)
                if (payload.city) addressParts.push(payload.city)
                if (payload.state) addressParts.push(payload.state)
                if (payload.zip) addressParts.push(payload.zip)
                if (payload.country) addressParts.push(payload.country)
                const fullAddress = addressParts.join(', ')

                const TEXT_DARK = '#111827'
                const TEXT_LIGHT = '#64748b'

                const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Surprise is on its Way!</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .btn-primary { background-color: ${BRAND_ORANGE}; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <div style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- HEADER -->
          <div style="background-color: ${BRAND_ORANGE}; padding: 32px 40px; text-align: center;">
            <img src="${LOGO_URL}" width="120" alt="Giftyy" style="display:block; margin: 0 auto 16px; border: 0;">
            <div style="color:#fff; font-weight:800; font-size:24px; margin-bottom:4px;">Giftyy</div>
            <div style="color:#fff; font-size:14px; opacity:0.9;">Your AI Gift Assistant</div>
          </div>
          <!-- BODY -->
          <div style="padding: 40px 48px;">
            <h1 style="color:${TEXT_DARK}; font-size:24px; text-align:center; margin-top:0;">A Surprise is on its Way! 🎁</h1>
            <p style="color:${TEXT_DARK}; font-size:16px; line-height:26px;">Hi ${firstName},</p>
            <p style="color:${TEXT_DARK}; font-size:16px; line-height:26px;">
              Someone special is sending you a surprise gift through Giftyy. Curious who it is? That's part of the fun — it's a surprise! 😉
            </p>
            <div style="margin: 32px 0; background-color:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; padding:24px;">
              <p style="margin:0 0 16px; font-size:12px; font-weight:700; color:${TEXT_LIGHT}; text-transform:uppercase; letter-spacing:1px;">Gift Snapshot</p>
              ${fullAddress ? `
              <div style="margin-bottom:16px;">
                <p style="margin:0 0 4px; font-size:12px; font-weight:600; color:${TEXT_LIGHT};">SHIPPING ADDRESS</p>
                <p style="margin:0; font-size:15px; color:${TEXT_DARK}; line-height:1.5;">${fullAddress}</p>
              </div>` : ''}
              <div>
                <p style="margin:0 0 4px; font-size:12px; font-weight:600; color:${TEXT_LIGHT};">ESTIMATED DELIVERY</p>
                <p style="margin:0; font-size:15px; color:${TEXT_DARK};">${estimatedDays}</p>
              </div>
            </div>
            <div style="text-align:center; margin-top:40px;">
              <a href="https://giftyy.store" class="btn-primary">Visit Giftyy</a>
              <p style="margin:16px 0; font-size:14px; color:${TEXT_LIGHT};">or</p>
              <a href="https://giftyy.store/download" style="display:inline-block; padding:12px 30px; background:#fff; color:${BRAND_ORANGE}; text-decoration:none; border-radius:8px; font-weight:600; font-size:16px; border:1px solid ${BRAND_ORANGE};">Download the App</a>
            </div>
            <p style="margin-top:40px; font-size:15px; color:${TEXT_DARK};"><strong>— Giftyy Team</strong></p>
          </div>
          <!-- FOOTER -->
          <div style="background-color:#f9fafb; padding:24px; text-align:center; border-top:1px solid #f0f0f0;">
            <p style="color:#9ca3af; font-size:12px; margin: 0 0 16px;">© 2024 Giftyy. powered by Giftyy AI technology.</p>
            <div>
              <a href="https://www.instagram.com/giftyy_llc" style="color:#9ca3af; font-size:12px; text-decoration:none; margin:0 8px;">Instagram</a>
              <span style="color:#e5e7eb;">|</span>
              <a href="https://www.tiktok.com/@giftyy_llc" style="color:#9ca3af; font-size:12px; text-decoration:none; margin:0 8px;">TikTok</a>
              <span style="color:#e5e7eb;">|</span>
              <a href="https://linkedin.com/company/giftyy-store" style="color:#9ca3af; font-size:12px; text-decoration:none; margin:0 8px;">LinkedIn</a>
            </div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`

                const emailResp = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: FROM_EMAIL,
                        to: payload.recipientEmail,
                        subject: 'A surprise is on its way to you 🎁',
                        html,
                    }),
                })

                results.email = emailResp.ok
                    ? { success: true }
                    : { success: false, error: await emailResp.text() }

                console.log('[notify-recipient] Email result:', results.email)
            } catch (emailErr) {
                console.error('[notify-recipient] Email error:', emailErr)
                results.email = { success: false, error: String(emailErr) }
            }
        } else {
            results.email = { skipped: true, reason: sendEmail ? 'no recipientEmail' : 'disabled' }
        }

        // ══════════════════════════════════════════════════════════════════════
        // STEP 3 — 🔔  In-app notification (insert into notifications table)
        // ══════════════════════════════════════════════════════════════════════
        if (sendInApp && recipientUserId) {
            try {
                // 2. Insert record into in-app notifications feed
                // Note: The 'notifications' table schema is [id, user_id, type, title, body, data, is_read, created_at]
                const { error: notifyError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: recipientUserId,
                        type: 'gift_incoming',
                        title: `You've got a gift from Giftyy! 🎁`, // Changed from buyerName as it's not defined
                        body: `A special surprise is heading to: ${payload.street || 'your address'}. Please update your shipping address to ensure delivery.`, // Added fallback for street
                        data: {
                            orderCode: payload.orderCode || null, // Ensure orderCode is nullable
                            type: 'gift_incoming',
                            estimatedArrival: payload.estimatedArrival || estimatedDays // Use resolved estimatedDays
                        }
                    });

                if (notifyError) {
                    console.error('[notify-recipient] Failed to create in-app notification:', notifyError);
                    results.inApp = { success: false, error: notifyError.message };
                    // We don't throw here to allow email and push to still attempt delivery
                } else {
                    console.log('[notify-recipient] In-app notification created for user:', recipientUserId);
                    results.inApp = { success: true };
                }

                console.log('[notify-recipient] In-app result:', results.inApp)
            } catch (inAppErr) {
                console.error('[notify-recipient] In-app error:', inAppErr)
                results.inApp = { success: false, error: String(inAppErr) }
            }
        } else {
            results.inApp = {
                skipped: true,
                reason: sendInApp ? 'no recipientUserId resolved' : 'disabled',
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // STEP 4 — 📲  Push notification via Expo Push API
        // ══════════════════════════════════════════════════════════════════════
        if (sendPush && recipientUserId) {
            try {
                // Fetch all Expo push tokens for the recipient's devices
                console.log('[notify-recipient] Fetching push tokens for user:', recipientUserId)
                const { data: tokenRows, error: tokenError } = await supabase
                    .from('push_tokens')
                    .select('token, platform, device_name')
                    .eq('user_id', recipientUserId)

                if (tokenError) {
                    console.error('[notify-recipient] Error fetching push tokens:', tokenError)
                    throw tokenError
                }

                console.log('[notify-recipient] Found push tokens:', tokenRows?.length || 0,
                    tokenRows?.map((r: any) => ({ platform: r.platform, device: r.device_name })))

                if (!tokenRows || tokenRows.length === 0) {
                    console.log('[notify-recipient] No push tokens for user:', recipientUserId)
                    results.push = { skipped: true, reason: 'no push tokens registered' }
                } else {
                    // Chunk into batches of 100 (Expo API limit)
                    const chunkSize = 100
                    const allMessages = tokenRows.map((row: any) => ({
                        to: row.token,
                        sound: 'default',
                        title: '🎁 Giftyy has a surprise for you!',
                        body: `Someone special sent you a gift! Please update your shipping address to ensure delivery. 😉`,
                        categoryId: 'gift_received',
                        data: {
                            type: 'gift_received',
                            orderCode: payload.orderCode || null,
                            estimatedArrival: estimatedDays,
                        },
                    }))

                    const chunks: any[][] = []
                    for (let i = 0; i < allMessages.length; i += chunkSize) {
                        chunks.push(allMessages.slice(i, i + chunkSize))
                    }

                    const pushResults = await Promise.all(
                        chunks.map(async (chunk) => {
                            const resp = await fetch('https://exp.host/--/api/v2/push/send', {
                                method: 'POST',
                                headers: {
                                    Accept: 'application/json',
                                    'Accept-encoding': 'gzip, deflate',
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(chunk),
                            })
                            const result = await resp.json()
                            // Log individual ticket statuses for debugging
                            if (result?.data) {
                                result.data.forEach((ticket: any, idx: number) => {
                                    if (ticket.status === 'error') {
                                        console.error(`[notify-recipient] Push ticket error for token ${idx}:`, ticket.message, ticket.details)
                                    }
                                })
                            }
                            return result
                        })
                    )

                    results.push = { success: true, sent: tokenRows.length, expoResponse: pushResults }
                    console.log('[notify-recipient] Push result:', JSON.stringify(results.push))
                }
            } catch (pushErr) {
                console.error('[notify-recipient] Push error:', pushErr)
                results.push = { success: false, error: String(pushErr) }
            }
        } else {
            results.push = {
                skipped: true,
                reason: sendPush ? 'no recipientUserId resolved' : 'disabled',
            }
            console.log('[notify-recipient] Push skipped:', results.push)
        }

        // ── Return combined results ─────────────────────────────────────────
        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (err) {
        console.error('[notify-recipient] Unexpected error:', err)
        return new Response(
            JSON.stringify({ error: 'Unexpected error', details: err.message || String(err) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
