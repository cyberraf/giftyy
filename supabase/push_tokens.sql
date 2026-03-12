-- Create a table for storing push tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_name TEXT,
    platform TEXT, -- 'ios', 'android', 'web'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own tokens" 
ON public.push_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tokens" 
ON public.push_tokens FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
ON public.push_tokens FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON public.push_tokens FOR UPDATE 
USING (auth.uid() = user_id);

-- Create a function to handle token registration (upsert)
CREATE OR REPLACE FUNCTION public.register_push_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_name TEXT DEFAULT NULL,
    p_platform TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.push_tokens (user_id, token, device_name, platform, updated_at)
    VALUES (p_user_id, p_token, p_device_name, p_platform, now())
    ON CONFLICT (user_id, token) 
    DO UPDATE SET 
        device_name = EXCLUDED.device_name,
        platform = EXCLUDED.platform,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
