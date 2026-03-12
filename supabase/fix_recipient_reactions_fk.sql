-- Fix foreign key mapping to `profiles` (Auth users)
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'recipient_reactions'
      AND kcu.column_name = 'recipient_user_id'
      AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.recipient_reactions DROP CONSTRAINT %I', fk_name);
        RAISE NOTICE 'Dropped old foreign key constraint: %', fk_name;
    ELSE
        ALTER TABLE public.recipient_reactions DROP CONSTRAINT IF EXISTS recipient_reactions_recipient_user_id_fkey;
    END IF;

    -- Map recipient_user_id to the profiles table containing auth IDs
    ALTER TABLE public.recipient_reactions 
    ADD CONSTRAINT recipient_reactions_recipient_user_id_fkey 
    FOREIGN KEY (recipient_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Successfully added new foreign key pointing to profiles(id)';
END $$;

-- Fix the legacy trigger function that crashed the db insert
CREATE OR REPLACE FUNCTION notify_buyer_reaction_recorded()
RETURNS TRIGGER AS $$
DECLARE
  v_order_record RECORD;
BEGIN
  SELECT o.user_id, o.order_code, o.id as order_id, o.recipient_first_name as first_name, sm.id as memory_id
  INTO v_order_record
  FROM orders o
  LEFT JOIN shared_memories sm ON o.shared_memory_id = sm.id
  WHERE o.id = NEW.order_id
  LIMIT 1;
  
  IF FOUND THEN
    PERFORM create_buyer_notification(
      v_order_record.user_id,
      'New Reaction! 💝',
      format('%s recorded a reaction to your gift for order #%s', 
        COALESCE(v_order_record.first_name, 'Your recipient'), 
        v_order_record.order_code
      ),
      'Watch Reaction',
      jsonb_build_object(
        'order_id', v_order_record.order_id,
        'order_code', v_order_record.order_code,
        'memory_id', v_order_record.memory_id,
        'reaction_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
