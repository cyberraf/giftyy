-- Supabase migration: Add shared_memory_id column to orders table
-- This allows orders to optionally reference a shared memory that was attached during checkout

-- Add shared_memory_id column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shared_memory_id UUID REFERENCES public.shared_memories(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_shared_memory_id ON public.orders(shared_memory_id);

-- Add comment to document the column
COMMENT ON COLUMN public.orders.shared_memory_id IS 'Optional reference to a shared memory attached to this order during checkout';

