const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    const { data: occasions, error: occError } = await supabase.from('occasions').select('*');

    // Now let's try with an anon key or user key to see what we get
    console.log(`Service Role returned ${occasions?.length} occasions`);

    // Create an auth client for Komou
    const komouUserId = '94006097-d311-4625-a606-fdbf9d0c4c78';

    // Generate a JWT for Komou manually since we don't have his password
    // Actually simpler: just find the RLS policy defined by querying pg_policies via a function or edge function? No, we don't have one.
    // Let's create an RPC function to list policies on occasions.

    const { data, error } = await supabase.rpc('inline_code_block', {
        code: `
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'occasions';
        `
    });

    if (error) {
        // Try another way: just execute SQL
        console.error("RPC Error:", error.message);
        return;
    }

    console.log("Policies:", data);
}

checkRLS();
