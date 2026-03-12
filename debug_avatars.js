const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    if (pErr) console.error("Profile Error:", pErr);

    // specifically checking why the images don't load.
    const output = {
        profiles: (profiles || []).map(p => ({
            id: p.id,
            name: p.full_name || p.first_name,
            image: p.profile_image_url,
            avatar: p.avatar_url
        })),
    };

    fs.writeFileSync('db_debug_profiles.json', JSON.stringify(output, null, 2));
}

debugData();
