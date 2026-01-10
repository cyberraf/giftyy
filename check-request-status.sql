-- Check the status of the HTTP request we just made
-- Replace 29902 with your actual request_id if different

-- Check the status of the pg_net request
SELECT 
    id,
    created,
    method,
    url,
    status_code,
    content,
    error_msg,
    timeout_ms
FROM net.http_request_queue
WHERE id = 29902;

-- Check recent HTTP requests (last 10)
SELECT 
    id,
    created,
    url,
    status_code,
    LEFT(content, 100) as content_preview,
    error_msg
FROM net.http_request_queue
ORDER BY created DESC
LIMIT 10;

-- Also check if there are any videos that need categorization
SELECT 
    COUNT(*) as total_videos,
    COUNT(DISTINCT user_id) as users_with_videos
FROM video_messages
WHERE user_id IS NOT NULL;

