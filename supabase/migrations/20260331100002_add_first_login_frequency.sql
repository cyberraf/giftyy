-- Add first_login frequency support to get_active_announcements RPC
-- first_login: shown only once to users who have never seen it (first app open)

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
