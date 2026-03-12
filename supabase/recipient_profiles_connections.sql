-- Migration: Create recipient_profiles and connections tables
-- This implements the Hybrid Phantom Profile model

-- Create recipient_profiles table (Global Identities)
CREATE TABLE IF NOT EXISTS public.recipient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Null for phantoms
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    avatar_url TEXT,
    is_claimed BOOLEAN DEFAULT false,
    
    -- Common address fields (Global but can be crowdsourced initially)
    address TEXT,
    apartment TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    zip TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for recipient_profiles
ALTER TABLE public.recipient_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for recipient_profiles
-- Anyone can search for a profile by phone or email
CREATE POLICY "Recipient profiles are searchable by phone or email"
ON public.recipient_profiles FOR SELECT
USING (true);

-- Users can update their own claimed profile
CREATE POLICY "Users can update their own claimed profile"
ON public.recipient_profiles FOR UPDATE
USING (auth.uid() = user_id);


-- Create connections table (Relationship settings)
-- Replaces legacy 'recipients' table
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_profile_id UUID NOT NULL REFERENCES public.recipient_profiles(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    nickname TEXT, -- Private nickname (e.g., "Mom")
    relationship TEXT, -- Relationship category
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique connection per sender/recipient pair
    UNIQUE(sender_id, recipient_profile_id)
);

-- Enable RLS for connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Policies for connections
CREATE POLICY "Users can view their own connections"
ON public.connections FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() IN (
    SELECT user_id FROM public.recipient_profiles WHERE id = recipient_profile_id
));

CREATE POLICY "Users can manage their own connections"
ON public.connections FOR ALL
USING (auth.uid() = sender_id);

CREATE POLICY "Recipients can respond to their own connections"
ON public.connections FOR UPDATE
USING (auth.uid() IN (
    SELECT user_id FROM public.recipient_profiles WHERE id = recipient_profile_id
));


-- Update related tables to point to recipient_profile_id
ALTER TABLE public.occasions 
ADD COLUMN IF NOT EXISTS recipient_profile_id UUID REFERENCES public.recipient_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.recipient_preferences 
ADD COLUMN IF NOT EXISTS recipient_profile_id UUID REFERENCES public.recipient_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.gift_recommendations 
ADD COLUMN IF NOT EXISTS recipient_profile_id UUID REFERENCES public.recipient_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ai_feedback 
ADD COLUMN IF NOT EXISTS recipient_profile_id UUID REFERENCES public.recipient_profiles(id) ON DELETE SET NULL;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_recipient_profiles_timestamp
BEFORE UPDATE ON public.recipient_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_update_connections_timestamp
BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
