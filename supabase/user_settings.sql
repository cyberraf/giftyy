-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_notifications_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT true,
    occasion_reminders_enabled BOOLEAN DEFAULT true,
    order_updates_enabled BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    language TEXT DEFAULT 'en',
    reminder_days_before INTEGER[] DEFAULT '{1, 7, 30}',
    timezone TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update the handle_new_user function to also create settings
-- (Assuming handle_new_user already exists from profiles-auto-create)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  -- Extract name info (re-using logic from handle_new_user)
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', NULL);
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', NULL);

  IF first_name_val IS NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    first_name_val := split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1);
    last_name_val := NULLIF(substring(NEW.raw_user_meta_data->>'full_name' FROM length(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1)) + 2), '');
  END IF;

  -- Create Profile
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (NEW.id, first_name_val, last_name_val, 'buyer')
  ON CONFLICT (id) DO NOTHING;

  -- Create Default Settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
