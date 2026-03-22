-- ============================================================
-- Performance indexes for hot queries
-- ============================================================

-- Orders: paginated list by user, sorted by date
CREATE INDEX IF NOT EXISTS idx_orders_user_created
    ON public.orders (user_id, created_at DESC);

-- Order items: fetched by order_id when loading order details
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON public.order_items (order_id);

-- Push tokens: looked up by user_id when sending notifications
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
    ON public.push_tokens (user_id);

-- AI messages: chat history loaded by session, sorted by date
CREATE INDEX IF NOT EXISTS idx_ai_messages_session_created
    ON public.ai_messages (session_id, created_at);

-- AI sessions: user's session list, sorted by last activity
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_active
    ON public.ai_sessions (user_id, last_active_at DESC);

-- Connections: looked up by sender or recipient profile
CREATE INDEX IF NOT EXISTS idx_connections_sender
    ON public.connections (sender_id);

CREATE INDEX IF NOT EXISTS idx_connections_recipient_profile
    ON public.connections (recipient_profile_id);

-- Recipient profiles: lookup by phone or email for invite search
CREATE INDEX IF NOT EXISTS idx_recipient_profiles_phone
    ON public.recipient_profiles (phone)
    WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipient_profiles_email
    ON public.recipient_profiles (email)
    WHERE email IS NOT NULL;

-- Occasions: fetched by user for reminders and display
CREATE INDEX IF NOT EXISTS idx_occasions_user_date
    ON public.occasions (user_id, date);

-- Wishlist: per-user list sorted by date added
CREATE INDEX IF NOT EXISTS idx_wishlist_user_created
    ON public.wishlist (user_id, created_at DESC);

-- User settings: looked up by user_id for notification preferences
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
    ON public.user_settings (user_id);
