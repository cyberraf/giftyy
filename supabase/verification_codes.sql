-- Create verification_codes table for profile claiming OTPs
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_info TEXT NOT NULL, -- Email or phone
    code TEXT NOT NULL,         -- 6-digit OTP
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_verification_codes_contact ON public.verification_codes(contact_info);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service role or Edge Functions (service_role) should manage this table
-- Authenticated users shouldn't have direct access to verification codes
CREATE POLICY "Service role only" 
ON public.verification_codes 
FOR ALL 
TO service_role 
USING (true);
