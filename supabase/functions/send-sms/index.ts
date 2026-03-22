// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.17'
import { verifyUserAuth, verifyServiceRole, unauthorizedResponse } from '../_shared/auth.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Allow either authenticated user or service role (internal calls)
        const { authorized: isServiceRole } = verifyServiceRole(req)
        if (!isServiceRole) {
            const { user, error: authError } = await verifyUserAuth(req)
            if (!user) {
                return unauthorizedResponse(authError || 'Unauthorized', corsHeaders)
            }
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { userId, phoneNumber: rawPhoneNumber, message } = await req.json()

        const normalizePhone = (input: string): string => {
            if (!input) return ''
            const normalized = input.replace(/[^\d+]/g, '')
            if (!normalized.startsWith('+') && normalized.length > 0) {
                return `+${normalized}`
            }
            return normalized
        }

        const phoneNumber = normalizePhone(rawPhoneNumber)

        if (!message) {
            throw new Error("Message is required")
        }

        let targetPhone = phoneNumber

        // If userId provided, look up phone number from auth.users (requires service role)
        if (userId && !targetPhone) {
            const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId)

            if (userError || !userData.user) {
                throw new Error("User not found or error fetching user")
            }

            targetPhone = userData.user.phone
        }

        if (!targetPhone) {
            throw new Error("Target phone number not found")
        }

        // Configure AWS via aws4fetch (Lightweight)
        const region = Deno.env.get('AWS_REGION') || 'us-east-1'
        const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
        const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')

        if (!accessKeyId || !secretAccessKey) {
            throw new Error("AWS Credentials not configured in Supabase Secrets")
        }

        const aws = new AwsClient({
            accessKeyId,
            secretAccessKey,
            region,
            service: "sns",
        })

        const params = new URLSearchParams({
            Action: 'Publish',
            PhoneNumber: targetPhone,
            Message: message,
            Version: '2010-03-31'
        })

        const response = await aws.fetch(`https://sns.${region}.amazonaws.com/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        })

        const responseText = await response.text()

        if (!response.ok) {
            throw new Error(`AWS SNS Error: ${response.status} ${response.statusText} - ${responseText}`)
        }

        // Parse XML response locally or just return success (regex to find MessageId is enough for debug)
        const messageIdMatch = responseText.match(/<MessageId>(.*?)<\/MessageId>/)
        const messageId = messageIdMatch ? messageIdMatch[1] : "Unknown"

        console.log("MessageID is " + messageId)

        return new Response(
            JSON.stringify({ success: true, messageId: messageId, phone: targetPhone }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        console.error("Error sending SMS:", error)

        // Log config status for debugging
        const awsConfig = {
            accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
            region: Deno.env.get('AWS_REGION')
        }
        console.log("AWS Config Status:", {
            hasAccessKey: !!awsConfig.accessKeyId,
            hasSecretKey: !!awsConfig.secretAccessKey,
            region: awsConfig.region
        })

        return new Response(
            JSON.stringify({ success: false, error: error.message || String(error) }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    }
})
