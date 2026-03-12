import Stripe from "npm:stripe@^14.16.0"

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
        const body = await req.json()
        console.log('[Stripe] Request body:', JSON.stringify(body))

        const { amount, currency = 'usd', customerEmail, metadata } = body

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

        // Create PaymentIntent
        console.log(`[Stripe] Creating payment intent for amount: ${amount}`)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            customer: customerId,
            receipt_email: customerEmail,
            metadata: {
                ...metadata,
                platform: 'giftyy-mobile'
            },
            automatic_payment_methods: {
                enabled: true,
            },
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
        console.error('[Stripe] Unexpected error caught in block:', error)

        // Map common Stripe errors to friendly messages
        let message = error.message
        let code = 'UNKNOWN_ERROR'

        if (error.type === 'StripeAuthenticationError') {
            message = 'Invalid API Key configuration on server'
            code = 'STRIPE_AUTH_ERROR'
        } else if (error.type === 'StripeInvalidRequestError') {
            code = 'INVALID_REQUEST'
        }

        return new Response(
            JSON.stringify({ error: message, code, stack: error.stack }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
