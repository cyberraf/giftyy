-- Migration: Auto-link new accounts to recipient profiles
-- This trigger fires whenever a new record is inserted into the profiles table.
-- It attempts to find a matching phantom recipient_profile (email or phone) and claims it.

CREATE OR REPLACE FUNCTION public.on_profile_created_link_recipient()
RETURNS TRIGGER AS $$
DECLARE
    found_recipient_id UUID;
BEGIN
    -- 1. Try to find a recipient profile that matches the new profile's phone or email
    -- Exclusion: Don't match if the recipient profile is already claimed by someone else
    SELECT id INTO found_recipient_id
    FROM public.recipient_profiles
    WHERE (
        (phone IS NOT NULL AND phone = NEW.phone)
        OR 
        (email IS NOT NULL AND LOWER(email) = LOWER(NEW.email))
    )
    AND is_claimed = false
    AND user_id IS NULL
    LIMIT 1;

    -- 2. If a matching phantom profile is found, claim it!
    IF found_recipient_id IS NOT NULL THEN
        UPDATE public.recipient_profiles
        SET 
            user_id = NEW.id,
            is_claimed = true,
            updated_at = now()
        WHERE id = found_recipient_id;
        
        RAISE NOTICE 'Linked new profile % to existing recipient profile %', NEW.id, found_recipient_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger execution
DROP TRIGGER IF EXISTS tr_on_profile_created_claim ON public.profiles;
CREATE TRIGGER tr_on_profile_created_claim
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_link_recipient();
