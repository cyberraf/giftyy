const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Comprehensive Occasion Debug v3 ---');

    const { data: occasions, error: occError } = await supabase.from('occasions').select('*');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');

    if (occError || pError) {
        console.error('Error fetching data:', { occError, pError });
        return;
    }

    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.id, p.full_name || p.first_name || 'Unnamed'));

    console.log('\n--- Occasions Detail ---');
    occasions.forEach(occ => {
        const ownerName = profileMap.get(occ.user_id);
        console.log(`Occasion: ${occ.title}`);
        console.log(`  Date: ${occ.date}`);
        console.log(`  Recurring: ${occ.recurring}`);
        console.log(`  Pattern: ${occ.recurrence_pattern}`);
        console.log(`  For RP: ${occ.recipient_profile_id}`);
        console.log(`  Owner: ${ownerName} (${occ.user_id})`);
        console.log('---');
    });
}

debug();
