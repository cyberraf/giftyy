-- Allow buyers to update (e.g., cancel) their own plan assignments
-- Previously only INSERT/SELECT were allowed, causing client updates to fail under RLS.
-- This policy permits updates when buyer_id = auth.uid().

ALTER TABLE public.buyer_plan_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can update their own plan assignments" ON public.buyer_plan_assignments;
CREATE POLICY "Buyers can update their own plan assignments"
ON public.buyer_plan_assignments
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());


