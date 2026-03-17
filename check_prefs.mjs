import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const rpId = '34f0c406-8fb5-4071-87a4-098553655106';
    const { data, error } = await supabase
        .from('recipient_preferences')
        .select('*')
        .eq('recipient_profile_id', rpId);
    
    if (error) {
        console.error(error);
        return;
    }
    console.log("Preferences for RP", rpId, ":", data);
}

check();
