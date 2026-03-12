import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    'https://qaftabktuogxisioeeua.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg0MTMsImV4cCI6MjA3ODY0NDQxM30.Q7wDLbMAE9Ugc57EnncnB-dKvveLQgG4HH6SQ5zx4LI'
);

async function check() {
    const result = {
        vendors: [],
        zones: [],
        recipients: []
    };

    const { data: vendors } = await supabase
        .from('profiles')
        .select('id, store_name')
        .ilike('store_name', '%RAAY%');

    result.vendors = vendors || [];

    for (const v of result.vendors) {
        const { data: zones } = await supabase
            .from('vendor_shipping_zones')
            .select('*')
            .eq('vendor_id', v.id);
        result.zones = result.zones.concat(zones || []);
    }

    const { data: recipients } = await supabase
        .from('recipient_profiles')
        .select('*')
        .ilike('full_name', '%Najib%');

    result.recipients = recipients || [];

    fs.writeFileSync('scripts/shipping_debug_result.json', JSON.stringify(result, null, 2));
    console.log('Done. Check scripts/shipping_debug_result.json');
}

check();
