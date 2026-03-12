// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.17'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Giftyy <info@giftyy.store>'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { contactInfo, code, action } = await req.json()

        if (!contactInfo) {
            throw new Error("Contact information is required")
        }

        const isEmail = contactInfo.includes('@')
        const normalizedContact = isEmail
            ? contactInfo.trim().toLowerCase()
            : contactInfo.replace(/[^\d+]/g, '').startsWith('+') ? contactInfo.replace(/[^\d+]/g, '') : `+${contactInfo.replace(/[^\d+]/g, '')}`

        if (action === 'send') {
            // 1. Generate 6-digit code
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

            // 2. Clear old codes for this contact
            await supabaseClient
                .from('verification_codes')
                .delete()
                .eq('contact_info', normalizedContact)

            // 3. Store new code
            const { error: storeError } = await supabaseClient
                .from('verification_codes')
                .insert({
                    contact_info: normalizedContact,
                    code: otpCode,
                    expires_at: expiresAt.toISOString()
                })

            if (storeError) throw storeError

            // 4. Send delivery
            if (isEmail) {
                // Send Email via Resend
                const html = `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Giftyy Profile Verification</h2>
                        <p>Your verification code to claim your gifting profile is:</p>
                        <h1 style="color: #f75507; font-size: 32px; letter-spacing: 5px;">${otpCode}</h1>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                `
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: FROM_EMAIL,
                        to: normalizedContact,
                        subject: `Your Giftyy Verification Code: ${otpCode}`,
                        html,
                    }),
                })
                if (!emailResponse.ok) throw new Error(`Email delivery failed: ${await emailResponse.text()}`)
            } else {
                // Send SMS via AWS SNS
                const region = Deno.env.get('AWS_REGION') || 'us-east-1'
                const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
                const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')

                if (!accessKeyId || !secretAccessKey) throw new Error("AWS Credentials not configured")

                const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: "sns" })
                const params = new URLSearchParams({
                    Action: 'Publish',
                    PhoneNumber: normalizedContact,
                    Message: `Your Giftyy verification code is: ${otpCode}. It expires in 10 minutes.`,
                    Version: '2010-03-31'
                })

                const smsResponse = await aws.fetch(`https://sns.${region}.amazonaws.com/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString()
                })
                if (!smsResponse.ok) throw new Error(`SMS delivery failed: ${await smsResponse.text()}`)
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })

        } else if (action === 'verify') {
            if (!code) throw new Error("Verification code is required")

            // 1. Fetch unverified code
            const { data, error } = await supabaseClient
                .from('verification_codes')
                .select('*')
                .eq('contact_info', normalizedContact)
                .eq('code', code)
                .is('verified_at', null)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle()

            if (error) throw error
            if (!data) return new Response(JSON.stringify({ success: false, error: "Invalid or expired code" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })

            // 2. Mark as verified
            await supabaseClient
                .from('verification_codes')
                .update({ verified_at: new Date().toISOString() })
                .eq('id', data.id)

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        } else {
            throw new Error("Invalid action")
        }

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
