
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting Profiles and Recipient Profiles...');

    // Get Rafik's profile (Auth User)
    const rafikId = '652e1167-b838-4f60-96a6-1dc88c697007';
    const { data: rafikProfile } = await supabase.from('profiles').select('*').eq('id', rafikId).maybeSingle();
    console.log('Rafik Profile:', rafikProfile);

    // Get Komou's profile
    const komouUserId = '94006097-d311-4625-a606-fdbf9d0c4c78';
    const { data: komouProfile } = await supabase.from('profiles').select('*').eq('id', komouUserId).maybeSingle();
    console.log('Komou Profile:', komouProfile);

    // Get Komou's recipient profile
    const { data: komouRecProfile } = await supabase.from('recipient_profiles').select('*').eq('user_id', komouUserId).maybeSingle();
    console.log('Komou Recipient Profile:', komouRecProfile);

    // Check specific connection
    const connId = '955b15b7-fe13-4664-98b5-d514dc62b06c';
    const { data: conn } = await supabase.from('connections').select('*, sender:profiles!sender_id(*), recipient:recipient_profiles(*)').eq('id', connId).maybeSingle();
    console.log('Specific Connection:', JSON.stringify(conn, null, 2));
}

inspectSchema();
