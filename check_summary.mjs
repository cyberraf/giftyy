import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count: total } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: active } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: embedded } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).not('embedding', 'is', null);
    const { count: nullEmbedding } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).is('embedding', null);

    console.log(`SUMMARY: Total=${total}, Active=${active}, Embedded=${embedded}, NullEmbedding=${nullEmbedding}`);
}

check();
