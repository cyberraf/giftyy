-- Migration: Add is_featured column to video_messages table
-- This allows users to feature their videos on the app/website

-- Add is_featured column to video_messages table
ALTER TABLE public.video_messages
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false NOT NULL;

-- Create index for featured videos (for efficient queries)
CREATE INDEX IF NOT EXISTS video_messages_is_featured_idx 
    ON public.video_messages(is_featured) 
    WHERE is_featured = true;

-- Add comment to document the column
COMMENT ON COLUMN public.video_messages.is_featured IS 'Whether this video is featured on the app/website. Users can toggle this in the full-screen video viewer.';

