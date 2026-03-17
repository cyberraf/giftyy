import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    console.log("Backfilling embedding metadata...");
    
    const { error } = await supabase
        .from('products')
        .update({ 
            embedding_model: 'text-embedding-3-small',
            embedding_updated_at: new Date().toISOString()
        })
        .not('embedding', 'is', null)
        .is('embedding_model', null);

    if (error) {
        console.error("Error backfilling:", error);
    } else {
        console.log("Successfully backfilled metadata for products.");
    }
}

backfill();
