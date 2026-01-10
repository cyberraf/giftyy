-- Supabase migration: Add DELETE policy for shared_memories table
-- Allows users to delete their own shared memories

-- Drop existing delete policy if it exists (for clean re-runs)
DROP POLICY IF EXISTS "Users can delete their own shared memories" ON public.shared_memories;

-- Create policy to allow users to delete their own shared memories
CREATE POLICY "Users can delete their own shared memories"
    ON public.shared_memories
    FOR DELETE
    USING (user_id = auth.uid()::uuid);

-- Verify RLS is enabled on the table
ALTER TABLE public.shared_memories ENABLE ROW LEVEL SECURITY;

-- Display current policies for verification
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'shared_memories'
ORDER BY policyname;

