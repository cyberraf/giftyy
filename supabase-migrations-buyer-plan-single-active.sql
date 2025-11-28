-- Ensure a buyer can have only ONE active plan at a time
-- Adds a partial unique index across buyer_id for active assignments
-- Safe to run multiple times (IF NOT EXISTS)

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyer_plan_assignments_single_active
ON public.buyer_plan_assignments (buyer_id)
WHERE status = 'active';

-- Optional: keep the per-(buyer_id, plan_id) unique index if already present
-- This complements it by preventing more than one active plan overall.


