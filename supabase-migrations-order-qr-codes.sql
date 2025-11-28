-- Supabase migration: Create order_qr_codes table for admin/vendor QR access
-- Stores the generated QR code for each order so privileged users can verify them

-- To ensure clean deployment across environments, drop the existing table (if any)
DROP TABLE IF EXISTS public.order_qr_codes CASCADE;

CREATE TABLE public.order_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
    qr_code_url TEXT NOT NULL,
    qr_code_data TEXT,
    created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.order_qr_codes IS 'Stores generated QR codes for orders so admins and vendors can reference them';
COMMENT ON COLUMN public.order_qr_codes.qr_code_data IS 'Optional raw data payload used to generate the QR code';

-- Each order should only have a single QR code record
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_qr_codes_order_vendor_unique ON public.order_qr_codes(order_id, vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_qr_codes_order_null_vendor ON public.order_qr_codes(order_id) WHERE vendor_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_qr_codes_vendor_id ON public.order_qr_codes(vendor_id);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_order_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_qr_codes_updated_at ON public.order_qr_codes;
CREATE TRIGGER trg_order_qr_codes_updated_at
BEFORE UPDATE ON public.order_qr_codes
FOR EACH ROW EXECUTE FUNCTION public.set_order_qr_codes_updated_at();

-- Enable Row Level Security
ALTER TABLE public.order_qr_codes ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid duplicates
DROP POLICY IF EXISTS "Admins can access all order QR codes" ON public.order_qr_codes;
DROP POLICY IF EXISTS "Vendors can access their order QR codes" ON public.order_qr_codes;
DROP POLICY IF EXISTS "Privileged users can insert order QR codes" ON public.order_qr_codes;
DROP POLICY IF EXISTS "Buyers can create their order QR codes" ON public.order_qr_codes;

-- Admins can read every QR code entry
CREATE POLICY "Admins can access all order QR codes"
  ON public.order_qr_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()::uuid
      AND role = 'admin'
    )
  );

-- Vendors can read QR codes tied to their vendor account
CREATE POLICY "Vendors can access their order QR codes"
  ON public.order_qr_codes
  FOR SELECT
  USING (
    vendor_id = auth.uid()::uuid
  );

-- Only service role (Edge Function) can insert rows
CREATE POLICY "Service role can insert order QR codes"
  ON public.order_qr_codes
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

