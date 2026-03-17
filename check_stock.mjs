import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const ids = [
        '9ae720a1-ceb7-45e4-ba1a-2f3a7a78a192',
        '8754e34a-e554-403c-9c13-4b761049ce49',
        'c580a11f-b4d4-45c4-8f02-d809557a7cf5'
    ];
    const { data, error } = await supabase.from('products').select('id, name, stock_quantity, is_active').in('id', ids);
    if (error) {
        console.error(error);
        return;
    }
    console.log("Stock status of AI results:", data);
}

check();
