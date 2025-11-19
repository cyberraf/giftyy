-- Supabase migration: Add RLS policies for admin_notification_recipients
-- This allows users to read and update their own notification recipients

-- Enable Row Level Security on admin_notification_recipients if not already enabled
ALTER TABLE admin_notification_recipients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notification recipients" ON admin_notification_recipients;
DROP POLICY IF EXISTS "Users can update their own notification recipients" ON admin_notification_recipients;

-- Policy: Users can SELECT (read) their own notification recipients
CREATE POLICY "Users can view their own notification recipients"
  ON admin_notification_recipients FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can UPDATE their own notification recipients (e.g., mark as read)
-- This allows users to update the read_at column for their own notifications
CREATE POLICY "Users can update their own notification recipients"
  ON admin_notification_recipients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: 
-- - Users can only view and update notification recipients where user_id matches their auth.uid()
-- - This ensures users can only mark their own notifications as read
-- - The WITH CHECK clause ensures users can't change the user_id to another user's ID

