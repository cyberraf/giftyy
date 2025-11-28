-- Supabase migration: create RPC helper to decrement product stock
-- Ensures stock updates happen atomically inside the database

CREATE OR REPLACE FUNCTION public.decrement_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN;
    END IF;

    UPDATE public.products
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - p_quantity)
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found when decrementing stock', p_product_id
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_stock(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(UUID, INTEGER) TO authenticated, service_role;

