import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count: activeNull } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).is('embedding', null);
    const { count: inactiveNull } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', false).is('embedding', null);
    const { count: activeEmbedded } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).not('embedding', 'is', null);
    const { count: missingModel } = await supabase.from('products').select('*', { count: 'exact', head: true }).not('embedding', 'is', null).is('embedding_model', null);

    console.log(`DIAGNOSTIC:`);
    console.log(`- Active with NULL embedding: ${activeNull}`);
    console.log(`- Inactive with NULL embedding: ${inactiveNull}`);
    console.log(`- Active with Embedding: ${activeEmbedded}`);
    console.log(`- Embedded but missing model name: ${missingModel}`);
}

check();
