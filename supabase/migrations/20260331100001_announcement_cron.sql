-- ============================================================
-- Announcements Cron Jobs
-- Auto-publish scheduled announcements and auto-expire
-- Requires pg_cron extension (available on Supabase Pro+)
-- ============================================================

-- If pg_cron is not available, run these queries manually on a schedule
-- or use a Supabase Edge Function with a cron trigger instead.

-- Auto-publish: runs every minute, publishes scheduled announcements whose time has come
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'publish-scheduled-announcements',
      '* * * * *',
      $inner$UPDATE public.announcements SET status = 'published', updated_at = NOW()
        WHERE status = 'scheduled' AND scheduled_at <= NOW()$inner$
    );

    -- Auto-expire: runs every 5 minutes, expires published announcements past their expiration
    PERFORM cron.schedule(
      'expire-announcements',
      '*/5 * * * *',
      $inner2$UPDATE public.announcements SET status = 'expired', updated_at = NOW()
        WHERE status = 'published' AND expires_at IS NOT NULL AND expires_at <= NOW()$inner2$
    );
  END IF;
END $outer$;
