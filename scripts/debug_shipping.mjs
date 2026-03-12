import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qaftabktuogxisioeeua.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg0MTMsImV4cCI6MjA3ODY0NDQxM30.Q7wDLbMAE9Ugc57EnncnB-dKvveLQgG4HH6SQ5zx4LI'
);

async function check() {
    console.log('--- VENDOR ---');
    const { data: vendors, error: vendorErr } = await supabase
        .from('profiles')
        .select('id, store_name')
        .ilike('store_name', '%RAAY%');

    if (vendorErr) {
        console.error('Vendor error:', vendorErr);
        return;
    }
    console.log('Vendors:', JSON.stringify(vendors, null, 2));

    if (vendors && vendors.length > 0) {
        const vendorId = vendors[0].id;
        const { data: zones, error: zonesErr } = await supabase
            .from('vendor_shipping_zones')
            .select('*')
            .eq('vendor_id', vendorId);

        if (zonesErr) {
            console.error('Zones error:', zonesErr);
        } else {
            console.log('Zones:', JSON.stringify(zones, null, 2));
        }
    }

    console.log('--- RECIPIENT ---');
    const { data: recipients, error: recErr } = await supabase
        .from('recipient_profiles')
        .select('*')
        .ilike('full_name', '%Najib%');

    if (recErr) {
        console.error('Recipient error:', recErr);
    } else {
        console.log('Recipients:', JSON.stringify(recipients, null, 2));
    }
}

check();
