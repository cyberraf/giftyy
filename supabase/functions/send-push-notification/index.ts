// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
    userId: string
    title: string
    body: string
    data?: Record<string, any>
    sound?: string | null
    badge?: number
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            // Supabase API URL - env var automatically populated by functions client
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase API ANON KEY - env var automatically populated by functions client
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            // Create client with Auth context of the user that called the function.
            // This way your row-level-security (RLS) policies are applied.
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // For this specific admin-like function, we might actually need the SERVICE_ROLE_KEY
        // if we want to allow sending notifications TO a user FROM a triggered event (system).
        // However, if we want strict security where a user triggers it, we stick to ANON + RLS.
        // BUT, usually "send push" is a system action. 
        // Let's use the Service Role key to bypass RLS for reading tokens of the target user,
        // assuming this function is protected or only called by authorized logic.
        // If called from client, we should verify the caller is allowed to notify the target.
        // For now, let's assume this is an internal/admin utility or the user notifying themselves (testing).
        // To be safe and versatile:
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const payload: NotificationPayload = await req.json()

        if (!payload.userId || !payload.title || !payload.body) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log(`Sending notification to user: ${payload.userId}`)

        // 1. Get push tokens for the user
        const { data: tokens, error: tokenError } = await supabaseAdmin
            .from('push_tokens')
            .select('token')
            .eq('user_id', payload.userId)

        if (tokenError) {
            console.error('Error fetching tokens:', tokenError)
            throw tokenError
        }

        if (!tokens || tokens.length === 0) {
            console.log(`No tokens found for user ${payload.userId}`)
            return new Response(
                JSON.stringify({ message: 'No devices registered for this user' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 2. Format messages for Expo
        // https://docs.expo.dev/push-notifications/sending-notifications/#message-format
        const messages = tokens.map((t) => ({
            to: t.token,
            sound: payload.sound || 'default',
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
            badge: payload.badge,
        }))

        // 3. Send to Expo Push API
        // Note: If sending to many tokens, we should chunk these (max 100 per request).
        // For a single user, it's unlikely to exceed 100 devices.
        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        })

        const expoResult = await expoResponse.json()
        console.log('Expo API Result:', expoResult)

        // Check for ticket errors (e.g. invalid tokens)
        // In a production app, you should process these tickets to remove invalid tokens from your DB.
        // For now, we'll just return the result.

        return new Response(
            JSON.stringify({
                success: true,
                sent_count: messages.length,
                expo_data: expoResult
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
