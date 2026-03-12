const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
    const sql = fs.readFileSync('supabase/migrations/20260304000002_fix_occasions_rls_bidirectional.sql', 'utf8');

    const { data, error } = await supabase.rpc('inline_code_block', {
        code: sql
    });

    if (error) {
        console.error("RPC Error executing SQL:", error.message);
        return;
    }

    console.log("Migration executed successfully:", data);
}

runSQL();
