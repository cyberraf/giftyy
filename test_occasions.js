const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOccasions() {
    console.log('--- Occasions Data ---');
    const { data, error } = await supabase
        .from('occasions')
        .select('*')
        .limit(10);

    if (error) {
        console.error('Error fetching occasions:', error);
        return;
    }

    console.log(`Found ${data.length} occasions.`);
    if (data.length > 0) {
        data.forEach((occ, i) => {
            console.log(`[${i}] Label: ${occ.label}, RecipientID: ${occ.recipient_id}, ProfileID: ${occ.recipient_profile_id}`);
        });
    }

    console.log('\n--- Checking for profile_id vs recipient_id ---');
    // Check if both columns exist by trying to select them specifically
    const { data: cols, error: colError } = await supabase
        .from('occasions')
        .select('recipient_id, recipient_profile_id')
        .limit(1);

    if (colError) {
        console.log('One or both columns might be missing:', colError.message);
    } else {
        console.log('Both recipient_id and recipient_profile_id exist.');
    }
}

checkOccasions();
