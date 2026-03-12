import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch'; // if global fetch isn't available
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function embedText(text) {
    const res = await (globalThis.fetch || fetch)('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: [text], encoding_format: 'float' }),
    });
    if (!res.ok) throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.data[0].embedding;
}

async function fix() {
    const { data, error } = await supabase.from('products').select('id, search_text, name').is('embedding', null);
    console.log(`Need to fix ${data?.length || 0} products`);

    if (data) {
        for (const p of data) {
            console.log(`Embedding ${p.name}...`);
            try {
                const emb = await embedText(p.search_text || p.name);
                const { error: upErr } = await supabase.from('products').update({ embedding: emb }).eq('id', p.id);
                if (upErr) console.error("Update err:", upErr);
            } catch (e) {
                console.error("Failed", e);
            }
        }
    }
}
fix();
