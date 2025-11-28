-- Supabase migration: Shared Memories table
-- Run this SQL in your Supabase SQL editor after the base migrations
-- This table stores shared memories (videos and photos) uploaded by users

-- Create shared_memories table
CREATE TABLE IF NOT EXISTS shared_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'photo')),
  file_url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policies for shared_memories
ALTER TABLE shared_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shared memories" ON shared_memories;
DROP POLICY IF EXISTS "Users can insert own shared memories" ON shared_memories;
DROP POLICY IF EXISTS "Users can update own shared memories" ON shared_memories;
DROP POLICY IF EXISTS "Users can delete own shared memories" ON shared_memories;

-- Users can view their own shared memories
CREATE POLICY "Users can view own shared memories"
  ON shared_memories FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own shared memories
CREATE POLICY "Users can insert own shared memories"
  ON shared_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own shared memories
CREATE POLICY "Users can update own shared memories"
  ON shared_memories FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own shared memories
CREATE POLICY "Users can delete own shared memories"
  ON shared_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for shared_memories table
CREATE INDEX IF NOT EXISTS shared_memories_user_id_created_at_idx
  ON shared_memories(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS shared_memories_media_type_idx
  ON shared_memories(media_type);

CREATE INDEX IF NOT EXISTS shared_memories_user_id_media_type_idx
  ON shared_memories(user_id, media_type);

-- Note: After running this migration, run supabase-migrations-shared-memories-storage.sql
-- to create the storage bucket and set up storage policies for shared memories files.
