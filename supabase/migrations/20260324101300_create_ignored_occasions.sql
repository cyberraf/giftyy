-- Migration: Create ignored_occasions table
-- Allows users to hide specific shared occasions from their feeds/reminders

CREATE TABLE IF NOT EXISTS public.ignored_occasions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    occasion_id UUID NOT NULL REFERENCES public.occasions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (user_id, occasion_id)
);

-- Enable RLS for ignored_occasions
ALTER TABLE public.ignored_occasions ENABLE ROW LEVEL SECURITY;

-- Policies for ignored_occasions
CREATE POLICY "Users can manage their own ignored occasions"
ON public.ignored_occasions FOR ALL
USING (auth.uid() = user_id);

-- Optional: Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_ignored_occasions_user_id ON public.ignored_occasions(user_id);
