-- ============================================================
-- Announcements System
-- Tables, RPCs, indexes, and RLS policies
-- ============================================================

-- 1. Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | scheduled | published | expired | cancelled

  -- Targeting
  target_audience TEXT NOT NULL DEFAULT 'all_buyers',  -- all_users | all_buyers | all_vendors | custom
  target_filters JSONB DEFAULT '{}',

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Display control
  frequency TEXT NOT NULL DEFAULT 'once',  -- once | first_login | every_login | daily | weekly
  priority INT NOT NULL DEFAULT 0,

  -- CTA buttons: [{"label":"Shop Now","action":"navigate","route":"/(buyer)/(tabs)/shop"}]
  cta_buttons JSONB DEFAULT '[]',

  -- Analytics counters
  impressions_count INT NOT NULL DEFAULT 0,
  clicks_count INT NOT NULL DEFAULT 0,
  dismissals_count INT NOT NULL DEFAULT 0,

  -- Delivery
  send_push BOOLEAN NOT NULL DEFAULT true,
  push_sent BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcements_scheduled ON public.announcements(scheduled_at) WHERE status = 'scheduled';

-- 2. Announcement interactions (per-user tracking)
CREATE TABLE public.announcement_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_count INT NOT NULL DEFAULT 1,
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX idx_ann_interactions_user ON public.announcement_interactions(user_id);

-- 3. RPC: Get active announcements for a user (respects frequency rules)
CREATE OR REPLACE FUNCTION public.get_active_announcements(p_user_id UUID)
RETURNS SETOF public.announcements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT a.* FROM announcements a
    WHERE a.status = 'published'
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
      -- frequency = 'once': skip if already dismissed or clicked
      AND NOT EXISTS (
        SELECT 1 FROM announcement_interactions ai
        WHERE ai.announcement_id = a.id AND ai.user_id = p_user_id
          AND a.frequency = 'once'
          AND (ai.dismissed_at IS NOT NULL OR ai.clicked_at IS NOT NULL)
      )
      -- frequency = 'first_login': skip if user has ever seen it before
      AND NOT EXISTS (
        SELECT 1 FROM announcement_interactions ai
        WHERE ai.announcement_id = a.id AND ai.user_id = p_user_id
          AND a.frequency = 'first_login'
      )
      -- frequency = 'daily': skip if seen within last 24h
      AND NOT EXISTS (
        SELECT 1 FROM announcement_interactions ai
        WHERE ai.announcement_id = a.id AND ai.user_id = p_user_id
          AND a.frequency = 'daily'
          AND ai.last_seen_at > NOW() - INTERVAL '1 day'
      )
      -- frequency = 'weekly': skip if seen within last 7 days
      AND NOT EXISTS (
        SELECT 1 FROM announcement_interactions ai
        WHERE ai.announcement_id = a.id AND ai.user_id = p_user_id
          AND a.frequency = 'weekly'
          AND ai.last_seen_at > NOW() - INTERVAL '7 days'
      )
    ORDER BY a.priority DESC, a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_announcements(UUID) TO authenticated;

-- 4. RPC: Record announcement interaction (seen / clicked / dismissed)
CREATE OR REPLACE FUNCTION public.record_announcement_interaction(
  p_announcement_id UUID,
  p_user_id UUID,
  p_action TEXT  -- 'seen' | 'clicked' | 'dismissed'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Upsert interaction row
  INSERT INTO announcement_interactions (announcement_id, user_id)
  VALUES (p_announcement_id, p_user_id)
  ON CONFLICT (announcement_id, user_id) DO UPDATE SET
    last_seen_at = NOW(),
    seen_count = announcement_interactions.seen_count + 1;

  -- Record specific action
  IF p_action = 'clicked' THEN
    UPDATE announcement_interactions SET clicked_at = COALESCE(clicked_at, NOW())
    WHERE announcement_id = p_announcement_id AND user_id = p_user_id;
    UPDATE announcements SET clicks_count = clicks_count + 1 WHERE id = p_announcement_id;
  ELSIF p_action = 'dismissed' THEN
    UPDATE announcement_interactions SET dismissed_at = COALESCE(dismissed_at, NOW())
    WHERE announcement_id = p_announcement_id AND user_id = p_user_id;
    UPDATE announcements SET dismissals_count = dismissals_count + 1 WHERE id = p_announcement_id;
  END IF;

  -- Always increment impressions
  UPDATE announcements SET impressions_count = impressions_count + 1 WHERE id = p_announcement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_announcement_interaction(UUID, UUID, TEXT) TO authenticated;

-- 5. RLS policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read published announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (status = 'published');

CREATE POLICY "Admins have full access to announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access on announcements"
  ON public.announcements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users manage own interactions"
  ON public.announcement_interactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access on interactions"
  ON public.announcement_interactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
