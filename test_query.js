
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const connId = '955b15b7-fe13-4664-98b5-d514dc62b06c';

    console.log('Fetching connection with nested sender RP...');
    const { data: conn, error } = await supabase
        .from('connections')
        .select(`
            *,
            sender:profiles!sender_id(*, recipient_profiles(*)),
            recipient_profiles(*)
        `)
        .eq('id', connId)
        .maybeSingle();

    if (error) {
        console.error('Query failed:', error);
        return;
    }

    console.log('Connection ID:', conn.id);
    console.log('Nickname:', conn.nickname);
    console.log('Sender Profile Name:', conn.sender.first_name, conn.sender.last_name);

    const senderRp = Array.isArray(conn.sender.recipient_profiles) ? conn.sender.recipient_profiles[0] : conn.sender.recipient_profiles;
    if (senderRp) {
        console.log('Sender Recipient Profile FOUND:');
        console.log('  ID:', senderRp.id);
        console.log('  FullName:', senderRp.full_name);
        console.log('  Email:', senderRp.email);
    } else {
        console.log('Sender Recipient Profile: MISSING');
    }

    const recipientRp = Array.isArray(conn.recipient_profiles) ? conn.recipient_profiles[0] : conn.recipient_profiles;
    console.log('Top-level Recipient Profile (Recipient of connection):', recipientRp.full_name);
}

testQuery();
