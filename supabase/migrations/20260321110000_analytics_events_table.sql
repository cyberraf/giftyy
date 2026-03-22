-- ============================================================================
-- Analytics Events Table
-- Stores user-level analytics events (screen views, funnel steps, searches)
-- Product-specific events remain in product_analytics_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  screen text,
  metadata jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for querying by event type and time range
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON analytics_events (event_type, created_at DESC);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Index for funnel analysis
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id, created_at);

-- Enable RLS — INSERT only for authenticated users, no client-side reads
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert events
CREATE POLICY "Users can insert analytics events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No SELECT policy for authenticated users — analytics are read via
-- service_role in dashboards/edge functions only
