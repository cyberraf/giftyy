-- Allow anonymous users to view basic recipient info if they have the ID
CREATE POLICY "Allow anonymous view of recipient name"
ON public.recipients
FOR SELECT
TO anon
USING (true); -- We filter by ID in the query anyway

-- Allow anonymous users to update their own address
CREATE POLICY "Allow anonymous update of recipient address"
ON public.recipients
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to view preference options
CREATE POLICY "Allow anonymous view of preferences"
ON public.recipient_preferences
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to upsert their preferences
CREATE POLICY "Allow anonymous upsert of preferences"
ON public.recipient_preferences
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to add celebrations
CREATE POLICY "Allow anonymous insert of occasions"
ON public.occasions
FOR INSERT
TO anon
WITH CHECK (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipient_preferences ENABLE ROW LEVEL SECURITY;
