-- Supabase migration: Create giftyy_cards table for physical QR card inventory
-- Physical QR cards are pre-generated and assigned by vendors to orders

-- Drop existing table and enum if they exist (for clean deployments)
DROP TABLE IF EXISTS public.giftyy_cards CASCADE;
DROP TYPE IF EXISTS public.giftyy_card_status CASCADE;

-- Create enum type for QR card status
CREATE TYPE public.giftyy_card_status AS ENUM ('inactive', 'pending_activation', 'active');

CREATE TABLE public.giftyy_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_token TEXT NOT NULL UNIQUE,
    status public.giftyy_card_status NOT NULL DEFAULT 'inactive',
    assigned_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    pending_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    activated_by_vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    -- Ensure active cards have an assigned order
    CONSTRAINT active_card_has_order CHECK (
        (status = 'active' AND assigned_order_id IS NOT NULL) OR
        status != 'active'
    )
);

COMMENT ON TABLE public.giftyy_cards IS 'Physical QR card inventory - pre-generated cards that vendors assign to orders';
COMMENT ON COLUMN public.giftyy_cards.public_token IS 'Public token used in QR URL for recipient scanning';
COMMENT ON COLUMN public.giftyy_cards.status IS 'Card status: inactive (available), pending_activation (reserved), active (assigned and locked)';
COMMENT ON COLUMN public.giftyy_cards.assigned_order_id IS 'Order this card is permanently assigned to (set when activated)';
COMMENT ON COLUMN public.giftyy_cards.pending_order_id IS 'Temporary order assignment during activation flow';
COMMENT ON COLUMN public.giftyy_cards.activated_by_vendor_id IS 'Vendor who activated this card';

-- Indexes for efficient lookups
CREATE UNIQUE INDEX idx_giftyy_cards_public_token ON public.giftyy_cards(public_token);
CREATE UNIQUE INDEX idx_giftyy_cards_assigned_order ON public.giftyy_cards(assigned_order_id) WHERE assigned_order_id IS NOT NULL;
CREATE INDEX idx_giftyy_cards_status ON public.giftyy_cards(status);
CREATE INDEX idx_giftyy_cards_pending_order ON public.giftyy_cards(pending_order_id) WHERE pending_order_id IS NOT NULL;
CREATE INDEX idx_giftyy_cards_vendor ON public.giftyy_cards(activated_by_vendor_id);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_giftyy_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_giftyy_cards_updated_at ON public.giftyy_cards;
CREATE TRIGGER trg_giftyy_cards_updated_at
BEFORE UPDATE ON public.giftyy_cards
FOR EACH ROW EXECUTE FUNCTION public.set_giftyy_cards_updated_at();

-- Enable Row Level Security
ALTER TABLE public.giftyy_cards ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DROP POLICY IF EXISTS "Admins can access all giftyy cards" ON public.giftyy_cards;
DROP POLICY IF EXISTS "Vendors can access giftyy cards" ON public.giftyy_cards;
DROP POLICY IF EXISTS "Vendors can activate giftyy cards" ON public.giftyy_cards;
DROP POLICY IF EXISTS "Public can read active cards for scanning" ON public.giftyy_cards;

-- Admins can read all cards
CREATE POLICY "Admins can access all giftyy cards"
    ON public.giftyy_cards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()::uuid
            AND role = 'admin'
        )
    );

-- Vendors can read cards (to see available inventory and their activations)
CREATE POLICY "Vendors can access giftyy cards"
    ON public.giftyy_cards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()::uuid
            AND role = 'vendor'
        )
    );

-- Only service role (edge functions) can update cards for activation
-- This ensures all activation logic goes through the controlled edge function
CREATE POLICY "Service role can update giftyy cards"
    ON public.giftyy_cards
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- Service role can insert new QR cards (for inventory management)
CREATE POLICY "Service role can insert giftyy cards"
    ON public.giftyy_cards
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Public (unauthenticated) can read active cards by public_token for QR scanning
-- This allows recipients to scan QR codes without authentication
CREATE POLICY "Public can read active cards for scanning"
    ON public.giftyy_cards
    FOR SELECT
    USING (status = 'active');

