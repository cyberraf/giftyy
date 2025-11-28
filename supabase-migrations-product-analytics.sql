-- Supabase migration: Product analytics logging + summary tables
-- Tracks wishlist, share, view, purchase, add-to-cart counts per product

CREATE TABLE IF NOT EXISTS public.product_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'share', 'wishlist', 'added_to_cart', 'purchase')),
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.product_analytics_summary (
    product_id UUID PRIMARY KEY REFERENCES public.products (id) ON DELETE CASCADE,
    view_count BIGINT NOT NULL DEFAULT 0,
    share_count BIGINT NOT NULL DEFAULT 0,
    wishlist_count BIGINT NOT NULL DEFAULT 0,
    added_to_cart_count BIGINT NOT NULL DEFAULT 0,
    purchase_count BIGINT NOT NULL DEFAULT 0,
    last_event_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_events_product_id ON public.product_analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_events_type ON public.product_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_product_analytics_events_occurred_at ON public.product_analytics_events(occurred_at DESC);

CREATE OR REPLACE FUNCTION public.update_product_analytics_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_delta_view INTEGER := 0;
    v_delta_share INTEGER := 0;
    v_delta_wishlist INTEGER := 0;
    v_delta_added INTEGER := 0;
    v_delta_purchase INTEGER := 0;
BEGIN
    IF NEW.event_type = 'view' THEN
        v_delta_view := 1;
    ELSIF NEW.event_type = 'share' THEN
        v_delta_share := 1;
    ELSIF NEW.event_type = 'wishlist' THEN
        v_delta_wishlist := 1;
    ELSIF NEW.event_type = 'added_to_cart' THEN
        v_delta_added := 1;
    ELSIF NEW.event_type = 'purchase' THEN
        v_delta_purchase := 1;
    END IF;

    INSERT INTO public.product_analytics_summary(
        product_id,
        view_count,
        share_count,
        wishlist_count,
        added_to_cart_count,
        purchase_count,
        last_event_at
    )
    VALUES(
        NEW.product_id,
        v_delta_view,
        v_delta_share,
        v_delta_wishlist,
        v_delta_added,
        v_delta_purchase,
        NEW.occurred_at
    )
    ON CONFLICT (product_id) DO UPDATE
    SET
        view_count = public.product_analytics_summary.view_count + v_delta_view,
        share_count = public.product_analytics_summary.share_count + v_delta_share,
        wishlist_count = public.product_analytics_summary.wishlist_count + v_delta_wishlist,
        added_to_cart_count = public.product_analytics_summary.added_to_cart_count + v_delta_added,
        purchase_count = public.product_analytics_summary.purchase_count + v_delta_purchase,
        last_event_at = GREATEST(public.product_analytics_summary.last_event_at, NEW.occurred_at),
        updated_at = timezone('utc', now());

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_analytics_events_summary ON public.product_analytics_events;
CREATE TRIGGER trg_product_analytics_events_summary
AFTER INSERT ON public.product_analytics_events
FOR EACH ROW EXECUTE FUNCTION public.update_product_analytics_summary();

ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert analytics events" ON public.product_analytics_events;
DROP POLICY IF EXISTS "Service role can manage analytics events" ON public.product_analytics_events;
DROP POLICY IF EXISTS "Users can read analytics summary" ON public.product_analytics_summary;
DROP POLICY IF EXISTS "Service role can manage analytics summary" ON public.product_analytics_summary;

CREATE POLICY "Users can insert analytics events"
  ON public.product_analytics_events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage analytics events"
  ON public.product_analytics_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can read analytics summary"
  ON public.product_analytics_summary
  FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Service role can manage analytics summary"
  ON public.product_analytics_summary
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

