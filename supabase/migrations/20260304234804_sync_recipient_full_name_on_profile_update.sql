-- Add missing columns to recipient_profiles if they don't exist
ALTER TABLE public.recipient_profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill first_name and last_name for existing recipient_profiles where possible
UPDATE public.recipient_profiles rp
SET 
    first_name = p.first_name,
    last_name = p.last_name
FROM public.profiles p
WHERE rp.user_id = p.id AND rp.first_name IS NULL;

-- Create or replace the function to sync full_name
CREATE OR REPLACE FUNCTION sync_recipient_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if first_name or last_name has changed
  IF NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    -- Update the recipient_profiles where user_id matches the profiles.id
    UPDATE public.recipient_profiles
    SET 
        first_name = NEW.first_name,
        last_name = NEW.last_name,
        full_name = trim(concat(NEW.first_name, ' ', NEW.last_name))
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_profile_name_update ON public.profiles;

-- Create the trigger
CREATE TRIGGER on_profile_name_update
AFTER UPDATE OF first_name, last_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION sync_recipient_full_name();
