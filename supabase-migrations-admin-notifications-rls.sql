-- Supabase migration: Add RLS policies for admin_notifications
-- This allows users to read admin notifications they are recipients of

-- Enable Row Level Security on admin_notifications if not already enabled
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read notifications they are recipients of" ON admin_notifications;

-- Policy: Users can read admin_notifications if they have a corresponding row in admin_notification_recipients
CREATE POLICY "Users can read notifications they are recipients of"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM admin_notification_recipients
      WHERE admin_notification_recipients.notification_id = admin_notifications.id
        AND admin_notification_recipients.user_id = auth.uid()
    )
  );

-- Note: This policy allows any authenticated user to read admin_notifications
-- where they have a corresponding recipient record, which is exactly what we need
-- for the notification system to work.

