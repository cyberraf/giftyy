-- Create a combined migration to handle phone synchronization

-- 1. Ensure phone column exists in public.profiles and public.recipient_profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.recipient_profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Create or replace the function to handle profile creation and updates from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  meta_first_name text;
  meta_last_name text;
  full_nm text;
BEGIN
  -- 1. Extract first_name from various possible keys
  meta_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'given_name'
  );

  -- 2. Extract last_name from various possible keys
  meta_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name'
  );

  -- 3. If still null, try parsing from full_name or name
  IF meta_first_name IS NULL THEN
    full_nm := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    );
    
    IF full_nm IS NOT NULL THEN
      meta_first_name := split_part(full_nm, ' ', 1);
      meta_last_name := COALESCE(meta_last_name, substring(full_nm from position(' ' in full_nm) + 1));
    END IF;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, phone, email)
  VALUES (
    NEW.id,
    NULLIF(meta_first_name, ''),
    NULLIF(meta_last_name, ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
    phone = COALESCE(profiles.phone, EXCLUDED.phone),
    email = COALESCE(profiles.email, EXCLUDED.email),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- 3. Create or replace the function to sync phone to recipient_profiles
CREATE OR REPLACE FUNCTION public.sync_recipient_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if phone has changed
  IF (NEW.phone IS DISTINCT FROM OLD.phone) THEN
    -- Update the recipient_profiles where user_id matches the profiles.id
    UPDATE public.recipient_profiles
    SET 
        phone = NEW.phone,
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Set up triggers

-- Trigger for auth.users -> profiles (assuming 'on_auth_user_created' or similar naming convention)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for profiles -> recipient_profiles
DROP TRIGGER IF EXISTS on_profile_phone_update ON public.profiles;
CREATE TRIGGER on_profile_phone_update
  AFTER UPDATE OF phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_recipient_phone();

-- 5. Backfill existing recipient_profiles with phone numbers from the profiles table
UPDATE public.recipient_profiles rp
SET 
    phone = p.phone,
    updated_at = now()
FROM public.profiles p
WHERE rp.user_id = p.id AND rp.phone IS NULL AND p.phone IS NOT NULL;
