import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Inspecting recipient_preferences table...");
    const { data: cols, error } = await supabase.rpc('get_table_columns', { p_table_name: 'recipient_preferences' });
    
    if (error) {
        // Fallback: query a row and check keys
        console.log("RPC get_table_columns failed, fallback to sample query...");
        const { data, error: err2 } = await supabase.from('recipient_preferences').select('*').limit(1);
        if (err2) {
            console.error("Query failed:", err2);
        } else if (data && data.length > 0) {
            console.log("Columns found in sample row:", Object.keys(data[0]));
        } else {
            console.log("No data in table to inspect.");
        }
    } else {
        console.log("Columns:", cols);
    }
}

inspect();
