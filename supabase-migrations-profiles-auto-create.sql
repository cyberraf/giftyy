-- Supabase migration: Auto-create profiles when users sign up
-- This ensures that profiles are automatically created when users register,
-- including when they sign up via OAuth providers like Google

-- Step 1: Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  -- Extract first name and last name from user metadata
  -- For OAuth providers like Google, the name might be in different fields
  first_name_val := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NULL
  );
  last_name_val := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NULL
  );

  -- If name is in full_name (common for Google OAuth), split it
  IF first_name_val IS NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    first_name_val := split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1);
    last_name_val := NULLIF(
      substring(NEW.raw_user_meta_data->>'full_name' FROM length(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1)) + 2),
      ''
    );
  END IF;

  -- Fallback to name field if available
  IF first_name_val IS NULL AND NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
    first_name_val := split_part(NEW.raw_user_meta_data->>'name', ' ', 1);
    last_name_val := NULLIF(
      substring(NEW.raw_user_meta_data->>'name' FROM length(split_part(NEW.raw_user_meta_data->>'name', ' ', 1)) + 2),
      ''
    );
  END IF;

  -- Insert new profile for the user
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (NEW.id, first_name_val, last_name_val, 'buyer')
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security hardening: lock down the search_path for SECURITY DEFINER function
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;

-- Step 2: Create trigger on auth.users to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Add INSERT policy to allow users to create their own profile (fallback)
-- This is useful if the trigger fails or for manual profile creation
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a profile in the profiles table when a new user is created in auth.users. Extracts name information from user metadata for OAuth providers.';

COMMENT ON POLICY "Users can create their own profile" ON public.profiles IS 
'Allows users to create their own profile. This is a fallback mechanism in case the database trigger fails.';

-- ============================================================
-- OPTIONAL: Backfill profiles for existing auth users
-- (Run once if you already have users missing profiles.)
-- ============================================================
-- INSERT INTO public.profiles (id, first_name, last_name, role)
-- SELECT
--   u.id,
--   COALESCE(
--     u.raw_user_meta_data->>'first_name',
--     split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1),
--     NULL
--   ) AS first_name,
--   NULLIF(
--     substring(
--       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
--       FROM length(split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1)) + 2
--     ),
--     ''
--   ) AS last_name,
--   'buyer' AS role
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- WHERE p.id IS NULL;
