import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    'https://qaftabktuogxisioeeua.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg0MTMsImV4cCI6MjA3ODY0NDQxM30.Q7wDLbMAE9Ugc57EnncnB-dKvveLQgG4HH6SQ5zx4LI'
);

async function check() {
    const { data: recipients } = await supabase
        .from('recipient_profiles')
        .select('id, full_name, state, country');

    fs.writeFileSync('scripts/all_recipients.json', JSON.stringify(recipients, null, 2));
    console.log('Done');
}

check();
