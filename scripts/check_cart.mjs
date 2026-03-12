import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    'https://qaftabktuogxisioeeua.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg0MTMsImV4cCI6MjA3ODY0NDQxM30.Q7wDLbMAE9Ugc57EnncnB-dKvveLQgG4HH6SQ5zx4LI'
);

async function check() {
    const userId = '94006097-d311-4625-a606-fdbf9d0c4c78'; // Najib's creator
    const { data: cartItems } = await supabase
        .from('cart_items')
        .select('*, products(name, vendor_id, profiles!vendor_id(store_name))')
        .eq('user_id', userId);

    fs.writeFileSync('scripts/cart_items_debug.json', JSON.stringify(cartItems, null, 2));
    console.log('Done');
}

check();
