-- ============================================================================
-- AI Monitoring: Add latency and token tracking to recommendation sessions
-- ============================================================================

-- Latency in milliseconds for the full request
ALTER TABLE ai_recommendation_sessions
  ADD COLUMN IF NOT EXISTS latency_ms integer;

-- Token usage breakdown (prompt, completion, embedding, total)
ALTER TABLE ai_recommendation_sessions
  ADD COLUMN IF NOT EXISTS token_usage jsonb;

-- Index for monitoring slow requests
CREATE INDEX IF NOT EXISTS idx_ai_rec_sessions_latency
  ON ai_recommendation_sessions (latency_ms DESC)
  WHERE latency_ms IS NOT NULL;

COMMENT ON COLUMN ai_recommendation_sessions.latency_ms IS
'Total edge function execution time in milliseconds, from request start to response.';

COMMENT ON COLUMN ai_recommendation_sessions.token_usage IS
'Token usage breakdown: { prompt_tokens, completion_tokens, embedding_tokens, total_tokens }. Accumulated across all OpenAI calls in the request.';
