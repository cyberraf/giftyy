-- Create an RPC function to securely check if an email exists in auth.users
-- This function is designated SECURITY DEFINER so it can run with elevated privileges
-- and is placed in the public schema so it can be called by the anon role.

CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    email_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM auth.users
        WHERE email = email_to_check
    ) INTO email_exists;
    
    RETURN email_exists;
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon, authenticated;
