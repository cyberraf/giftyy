-- Supabase migration: Vaults tables
-- Run this SQL in your Supabase SQL editor after the base migrations

-- Create vaults table
CREATE TABLE IF NOT EXISTS vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_type TEXT NOT NULL, -- 'time-based', 'location-based', 'occasion-based', etc.
  last_categorized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vault_videos junction table
CREATE TABLE IF NOT EXISTS vault_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  video_message_id UUID NOT NULL REFERENCES video_messages(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_id, video_message_id) -- Prevent duplicate entries
);

-- Enable RLS and add policies for vaults
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vaults" ON vaults;
DROP POLICY IF EXISTS "Users can insert own vaults" ON vaults;
DROP POLICY IF EXISTS "Users can update own vaults" ON vaults;
DROP POLICY IF EXISTS "Users can delete own vaults" ON vaults;

-- Users can only view their own vaults (AI-generated, read-only for users)
CREATE POLICY "Users can view own vaults"
  ON vaults FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert vaults (for AI categorization function)
CREATE POLICY "Users can insert own vaults"
  ON vaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update vaults (for AI categorization function)
CREATE POLICY "Users can update own vaults"
  ON vaults FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can delete vaults (for cleanup)
CREATE POLICY "Users can delete own vaults"
  ON vaults FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS and add policies for vault_videos
ALTER TABLE vault_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vault videos" ON vault_videos;
DROP POLICY IF EXISTS "Users can insert own vault videos" ON vault_videos;
DROP POLICY IF EXISTS "Users can update own vault videos" ON vault_videos;
DROP POLICY IF EXISTS "Users can delete own vault videos" ON vault_videos;

-- Users can view vault_videos for their own vaults
CREATE POLICY "Users can view own vault videos"
  ON vault_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_videos.vault_id
      AND vaults.user_id = auth.uid()
    )
  );

-- Service role can insert vault_videos (for AI categorization function)
CREATE POLICY "Users can insert own vault videos"
  ON vault_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_videos.vault_id
      AND vaults.user_id = auth.uid()
    )
  );

-- Service role can update vault_videos
CREATE POLICY "Users can update own vault videos"
  ON vault_videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_videos.vault_id
      AND vaults.user_id = auth.uid()
    )
  );

-- Service role can delete vault_videos
CREATE POLICY "Users can delete own vault videos"
  ON vault_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_videos.vault_id
      AND vaults.user_id = auth.uid()
    )
  );

-- Indexes for vaults table
CREATE INDEX IF NOT EXISTS vaults_user_id_created_at_idx
  ON vaults(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vaults_category_type_idx
  ON vaults(category_type);

CREATE INDEX IF NOT EXISTS vaults_last_categorized_at_idx
  ON vaults(last_categorized_at);

-- Indexes for vault_videos table
CREATE INDEX IF NOT EXISTS vault_videos_vault_id_idx
  ON vault_videos(vault_id);

CREATE INDEX IF NOT EXISTS vault_videos_video_message_id_idx
  ON vault_videos(video_message_id);

CREATE INDEX IF NOT EXISTS vault_videos_vault_id_video_message_id_idx
  ON vault_videos(vault_id, video_message_id);

CREATE INDEX IF NOT EXISTS vault_videos_added_at_idx
  ON vault_videos(added_at DESC);

