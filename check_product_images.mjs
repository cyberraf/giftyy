import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductImages() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url')
        .limit(10);

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    console.log("Product Image Check:");
    data.forEach(p => {
        console.log(`Product: ${p.name}`);
        console.log(`Image URL raw: ${p.image_url}`);
        let parsed = null;
        try {
            parsed = JSON.parse(p.image_url);
            console.log(`Parsed JSON:`, parsed);
        } catch (e) {
            console.log("Could not parse as JSON");
        }
        console.log("-------------------");
    });
}

checkProductImages();
