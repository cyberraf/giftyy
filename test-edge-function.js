
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSearch() {
    console.log('Testing Edge Function: invite-recipient');
    console.log('URL:', `${supabaseUrl}/functions/v1/invite-recipient`);

    const payload = {
        action: 'search',
        phone: '+15551234567', // Replace with a test value if needed
    };

    console.log('Payload:', payload);

    try {
        const { data, error } = await supabase.functions.invoke('invite-recipient', {
            body: payload
        });

        if (error) {
            console.error('Function Error Status:', error.status);
            console.error('Function Error Message:', error.message);
            try {
                const text = await error.context?.text();
                console.error('Error Context Body:', text);
            } catch (e) { }
        } else {
            console.log('Success!', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testSearch();
