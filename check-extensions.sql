-- Check which HTTP extensions are available in your Supabase instance

-- Check if http extension exists and is enabled
SELECT 
    extname as extension_name,
    extversion as version,
    'http' as extension_type
FROM pg_extension 
WHERE extname = 'http';

-- Check if net extension exists and is enabled
SELECT 
    extname as extension_name,
    extversion as version,
    'net' as extension_type
FROM pg_extension 
WHERE extname = 'net';

-- List all available extensions
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
ORDER BY extname;

