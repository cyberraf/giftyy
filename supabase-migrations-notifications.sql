-- Supabase migration: Notifications table
-- Run this SQL in your Supabase SQL editor after the base migrations

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_label TEXT,
  action_href TEXT,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policies
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;

CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS user_notifications_user_id_created_at_idx
  ON user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_notifications_read_at_idx
  ON user_notifications(user_id, read_at);
