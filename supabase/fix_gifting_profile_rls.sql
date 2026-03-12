-- Migration: Fix Gifting Profile RLS Error
-- Description: Allows authenticated users to create their own recipient profile.

-- 1. Check if policy exists and drop it to ensure clean apply
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.recipient_profiles;

-- 2. Create the INSERT policy
CREATE POLICY "Users can insert their own profile"
ON public.recipient_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure users can also update their own profile (existing policy, but good to ensure)
DROP POLICY IF EXISTS "Users can update their own claimed profile" ON public.recipient_profiles;
CREATE POLICY "Users can update their own claimed profile"
ON public.recipient_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Notification
DO $$
BEGIN
    RAISE NOTICE 'RLS policies for recipient_profiles updated to allow authenticated self-creation.';
END $$;
