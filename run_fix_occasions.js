const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for data migration

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFix() {
    console.log('--- Starting Occasion Data Fix ---');

    // 1. Fetch all connections
    const { data: connections, error: connError } = await supabase
        .from('connections')
        .select('id, recipient_profile_id');

    if (connError) {
        console.error('Error fetching connections:', connError);
        return;
    }

    const connMap = new Map();
    connections.forEach(c => connMap.set(c.id, c.recipient_profile_id));
    console.log(`Loaded ${connections.length} connections for mapping.`);
    connections.forEach(c => console.log(`  - ConnectionID: ${c.id} -> ProfileID: ${c.recipient_profile_id}`));

    // 2. Fetch all occasions
    const { data: occasions, error: occError } = await supabase
        .from('occasions')
        .select('id, title, recipient_id, recipient_profile_id');

    if (occError) {
        console.error('Error fetching occasions:', occError);
        return;
    }

    console.log(`Checking ${occasions.length} occasions...`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const occ of occasions) {
        let newProfileId = null;

        // Choice 1: recipient_profile_id is actually a connection ID
        if (occ.recipient_profile_id && connMap.has(occ.recipient_profile_id)) {
            newProfileId = connMap.get(occ.recipient_profile_id);
            console.log(`- Occasion "${occ.title}" (${occ.id}): ProfileID was ConnectionID. Correcting to: ${newProfileId}`);
        }
        // Choice 2: recipient_profile_id is null but recipient_id is a connection ID
        else if (!occ.recipient_profile_id && occ.recipient_id && connMap.has(occ.recipient_id)) {
            newProfileId = connMap.get(occ.recipient_id);
            console.log(`- Occasion "${occ.title}" (${occ.id}): NULL ProfileID. Mapping legacy recipient_id to: ${newProfileId}`);
        }

        if (newProfileId) {
            const { error: updateError } = await supabase
                .from('occasions')
                .update({ recipient_profile_id: newProfileId })
                .eq('id', occ.id);

            if (updateError) {
                console.error(`  [ERROR] updating occasion ${occ.id}:`, updateError.message);
            } else {
                fixedCount++;
            }
        } else {
            console.log(`- Occasion "${occ.title}" (${occ.id}): No match found. RecipientID: ${occ.recipient_id}, ProfileID: ${occ.recipient_profile_id}`);
            skippedCount++;
        }
    }

    console.log('\n--- Fix Summary ---');
    console.log(`Total checked: ${occasions.length}`);
    console.log(`Total fixed:   ${fixedCount}`);
    console.log(`Total skipped: ${skippedCount}`);
    console.log('-------------------');
}

runFix();
