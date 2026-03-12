-- ============================================================
-- notifications table (in-app notification feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,           -- e.g. 'gift_incoming', 'order_update', 'reaction'
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    data        JSONB DEFAULT '{}',      -- arbitrary payload (orderId, etc.)
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users read own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Service role inserts from Edge Functions
CREATE POLICY "Service role inserts notifications"
    ON notifications FOR INSERT
    WITH CHECK (TRUE);          -- enforced at function level via service_role key

-- Users can mark their own as read
CREATE POLICY "Users update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Index for fast per-user feed queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created
    ON notifications (user_id, created_at DESC);

-- ============================================================
-- push_tokens table (Expo push tokens per user device)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
    ON push_tokens FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
