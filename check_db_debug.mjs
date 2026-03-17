import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/raf97/Downloads/GIFTYY/giftyy/.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking products table...");
    
    const { count: total, error: err1 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
        
    const { count: active, error: err2 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
        
    const { count: embedded, error: err3 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('embedding', 'is', null);

    const { data: samples, error: err4 } = await supabase
        .from('products')
        .select('id, name, price, is_active, embedding')
        .limit(5);

    console.log("Total products:", total);
    console.log("Active products:", active);
    console.log("Active & Embedded products:", embedded);
    
    if (samples) {
        console.log("Sample products:");
        samples.forEach(s => {
            console.log(`- ${s.name}: Price=${s.price}, Active=${s.is_active}, HasEmbedding=${!!s.embedding}`);
        });
    }

    if (err1 || err2 || err3 || err4) {
        console.error("Errors:", { err1, err2, err3, err4 });
    }
}

check();
