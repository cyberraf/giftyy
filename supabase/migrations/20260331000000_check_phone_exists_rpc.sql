-- RPC function to check if a phone number already exists in profiles or recipient_profiles.
-- Mirrors the existing check_email_exists pattern.

CREATE OR REPLACE FUNCTION public.check_phone_exists(phone_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    phone_found boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE phone = phone_to_check
        UNION ALL
        SELECT 1 FROM public.recipient_profiles WHERE phone = phone_to_check
    ) INTO phone_found;
    RETURN phone_found;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO anon, authenticated;
