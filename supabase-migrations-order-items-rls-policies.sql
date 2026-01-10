-- Supabase migration: Add RLS policies for order_items table
-- This allows users to insert order items for their own orders and ensures proper access control

-- Enable Row Level Security on order_items table (if not already enabled)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read order items for their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items for their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can update order items for their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Service role can manage all order items" ON public.order_items;

-- Drop the function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.user_owns_order(uuid);

-- Create a security definer function to check order ownership
-- SECURITY DEFINER runs with the privileges of the function owner (postgres by default)
-- This bypasses RLS on the orders table, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.user_owns_order(order_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    order_user_id uuid;
BEGIN
    -- Directly query the orders table, bypassing RLS due to SECURITY DEFINER
    SELECT user_id INTO order_user_id
    FROM public.orders
    WHERE id = order_uuid;
    
    -- Return true if order exists and belongs to current user
    RETURN order_user_id IS NOT NULL AND order_user_id = auth.uid()::uuid;
END;
$$;

-- Policy: Users can read order items for their own orders
CREATE POLICY "Users can read order items for their own orders"
    ON public.order_items
    FOR SELECT
    USING (public.user_owns_order(order_items.order_id));

-- Policy: Users can insert order items for their own orders
CREATE POLICY "Users can insert order items for their own orders"
    ON public.order_items
    FOR INSERT
    WITH CHECK (public.user_owns_order(order_items.order_id));

-- Policy: Users can update order items for their own orders
CREATE POLICY "Users can update order items for their own orders"
    ON public.order_items
    FOR UPDATE
    USING (public.user_owns_order(order_items.order_id))
    WITH CHECK (public.user_owns_order(order_items.order_id));

-- Policy: Service role can manage all order items (for admin operations, edge functions, etc.)
CREATE POLICY "Service role can manage all order items"
    ON public.order_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments to document the policies
COMMENT ON POLICY "Users can read order items for their own orders" ON public.order_items IS 
    'Allows authenticated users to read order items where the associated order belongs to them';

COMMENT ON POLICY "Users can insert order items for their own orders" ON public.order_items IS 
    'Allows authenticated users to insert order items where the associated order belongs to them';

COMMENT ON POLICY "Users can update order items for their own orders" ON public.order_items IS 
    'Allows authenticated users to update order items where the associated order belongs to them';

COMMENT ON POLICY "Service role can manage all order items" ON public.order_items IS 
    'Allows service role (edge functions, admin operations) to perform all operations on order items';

