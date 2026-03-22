import Stripe from "npm:stripe@^14.16.0"
import { verifyUserAuth, unauthorizedResponse } from '../_shared/auth.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    console.log(`[Stripe] Function invoked: ${req.method}`)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify the caller is an authenticated user
        const { user, error: authError } = await verifyUserAuth(req)
        if (!user) {
            console.error('[Stripe] Auth failed:', authError)
            return unauthorizedResponse(authError || 'Unauthorized', corsHeaders)
        }

        const body = await req.json()
        console.log('[Stripe] Request body:', JSON.stringify(body))

        // Use the authenticated user's email, falling back to provided email
        const { amount, currency = 'usd', customerEmail: bodyEmail, metadata } = body
        const customerEmail = user.email || bodyEmail

        if (!amount || amount < 50) {
            console.error(`[Stripe] Error: Invalid amount: ${amount}`)
            return new Response(
                JSON.stringify({ error: 'Minimum payment amount is 50 cents', code: 'INVALID_AMOUNT' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (!customerEmail || customerEmail.trim() === '') {
            console.error('[Stripe] Error: customerEmail is missing')
            return new Response(
                JSON.stringify({ error: 'Customer email is required', code: 'MISSING_EMAIL' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (!STRIPE_SECRET_KEY) {
            console.error('[Stripe] Error: STRIPE_SECRET_KEY is missing from environment variables')
            return new Response(
                JSON.stringify({ error: 'Server key configuration error', code: 'SERVER_CONFIG_ERROR' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2024-11-20.acacia' as any,
            httpClient: Stripe.createFetchHttpClient(),
        })

        console.log(`[Stripe] Initialized client. Mode: ${amount} ${currency} for ${customerEmail}`)

        // Create or find customer
        let customerId;
        console.log(`[Stripe] Searching for customer: ${customerEmail}`)
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 })
        if (customers.data.length > 0) {
            customerId = customers.data[0].id
            console.log(`[Stripe] Found existing customer: ${customerId}`)
        } else {
            console.log(`[Stripe] Creating new customer: ${customerEmail}`)
            const customer = await stripe.customers.create({ email: customerEmail })
            customerId = customer.id
            console.log(`[Stripe] Created customer: ${customerId}`)
        }

        // Create Ephemeral Key for the Payment Sheet
        console.log(`[Stripe] Creating ephemeral key for: ${customerId}`)
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: '2024-11-20.acacia' as any }
        )
        console.log('[Stripe] Ephemeral key created')

        // Create PaymentIntent with idempotency key to prevent duplicate charges on retry
        // The key is derived from user + amount + timestamp window (5-minute granularity)
        const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000))
        const idempotencyKey = `pi_${user.id}_${amount}_${currency}_${timeWindow}`
        console.log(`[Stripe] Creating payment intent for amount: ${amount} (idempotency: ${idempotencyKey})`)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            customer: customerId,
            receipt_email: customerEmail,
            metadata: {
                ...metadata,
                platform: 'giftyy-mobile',
                userId: user.id,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        }, {
            idempotencyKey,
        })
        console.log(`[Stripe] Payment intent created: ${paymentIntent.id}`)

        return new Response(
            JSON.stringify({
                paymentIntent: paymentIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customer: customerId,
                publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        console.error('[Stripe] Error:', error)

        // Map Stripe errors to user-friendly messages
        let message = 'An unexpected error occurred. Please try again.'
        let code = 'UNKNOWN_ERROR'
        let status = 500

        if (error.type === 'StripeAuthenticationError') {
            message = 'Payment service configuration error. Please contact support.'
            code = 'STRIPE_AUTH_ERROR'
            status = 500
        } else if (error.type === 'StripeInvalidRequestError') {
            message = error.message
            code = 'INVALID_REQUEST'
            status = 400
        } else if (error.type === 'StripeCardError') {
            message = error.message || 'Your card was declined. Please try a different payment method.'
            code = error.code || 'CARD_DECLINED'
            status = 402
        } else if (error.type === 'StripeRateLimitError') {
            message = 'Too many requests. Please wait a moment and try again.'
            code = 'RATE_LIMIT'
            status = 429
        } else if (error.type === 'StripeConnectionError') {
            message = 'Could not connect to payment service. Please try again.'
            code = 'CONNECTION_ERROR'
            status = 503
        } else if (error.type === 'StripeIdempotencyError') {
            message = 'A payment is already being processed. Please wait.'
            code = 'IDEMPOTENCY_ERROR'
            status = 409
        }

        return new Response(
            JSON.stringify({ error: message, code }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status,
            }
        )
    }
})
