-- Supabase migration: Add RLS policies for orders table
-- This allows users to read their own orders and ensures proper access control

-- Enable Row Level Security on orders table (if not already enabled)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.orders;

-- Policy: Users can read their own orders
CREATE POLICY "Users can read their own orders"
    ON public.orders
    FOR SELECT
    USING (user_id = auth.uid()::uuid);

-- Policy: Users can create their own orders
CREATE POLICY "Users can create their own orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::uuid);

-- Policy: Users can update their own orders
CREATE POLICY "Users can update their own orders"
    ON public.orders
    FOR UPDATE
    USING (user_id = auth.uid()::uuid)
    WITH CHECK (user_id = auth.uid()::uuid);

-- Policy: Service role can manage all orders (for admin operations, edge functions, etc.)
CREATE POLICY "Service role can manage all orders"
    ON public.orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments to document the policies
COMMENT ON POLICY "Users can read their own orders" ON public.orders IS 
    'Allows authenticated users to read orders where they are the owner (user_id matches auth.uid())';

COMMENT ON POLICY "Users can create their own orders" ON public.orders IS 
    'Allows authenticated users to create orders where they are the owner (user_id matches auth.uid())';

COMMENT ON POLICY "Users can update their own orders" ON public.orders IS 
    'Allows authenticated users to update orders where they are the owner (user_id matches auth.uid())';

COMMENT ON POLICY "Service role can manage all orders" ON public.orders IS 
    'Allows service role (edge functions, admin operations) to perform all operations on orders';

