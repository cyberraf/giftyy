ALTER TABLE admin_notification_recipients
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS admin_notification_recipients_user_read_idx
  ON admin_notification_recipients(user_id, read_at DESC);
