-- Add Stripe tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.orders.stripe_payment_intent_id IS 'Stored Stripe Payment Intent ID for auditing and refunds.';
COMMENT ON COLUMN public.orders.stripe_customer_id IS 'Stored Stripe Customer ID for the buyer.';
