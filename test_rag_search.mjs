import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
const openaiKey = 'YOUR_OPENAI_API_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function embedText(text) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: [text], encoding_format: 'float' }),
    });
    if (!res.ok) throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.data[0].embedding;
}

async function testRag() {
    const query = "Birthday gift for Rafik who loves tech and gadgets";
    console.log(`Testing RAG search for: "${query}"`);
    
    const embedding = await embedText(query);
    
    const { data, error } = await supabase.rpc('match_products_rag', {
        p_query_embedding: embedding,
        p_limit: 5,
        p_max_price: 200
    });

    if (error) {
        console.error("RAG Error:", error);
        return;
    }

    console.log(`Found ${data?.length || 0} candidates:`);
    data?.forEach(p => {
        console.log(`- ${p.name} ($${p.price}) [Dist: ${p.similarity_distance.toFixed(4)}]`);
    });
}

testRag();
