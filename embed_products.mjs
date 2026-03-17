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
        body: JSON.stringify({ 
            model: 'text-embedding-3-small', 
            input: [text], 
            encoding_format: 'float' 
        }),
    });
    if (!res.ok) throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.data[0].embedding;
}

async function run() {
    console.log("Fetching products missing embeddings...");
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, category, subcategory, tags')
        .eq('is_active', true)
        .is('embedding', null);

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    console.log(`Found ${products.length} products to embed.`);

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '');
        const textToEmbed = `
            Name: ${p.name}
            Category: ${p.category} > ${p.subcategory}
            Tags: ${tagsStr}
            Description: ${p.description}
        `.trim();

        console.log(`[${i + 1}/${products.length}] Embedding: ${p.name}...`);
        
        try {
            const embedding = await embedText(textToEmbed);
            const { error: updateError } = await supabase
                .from('products')
                .update({ embedding })
                .eq('id', p.id);

            if (updateError) {
                console.error(`Failed to update product ${p.id}:`, updateError);
            }
        } catch (e) {
            console.error(`Error embedding product ${p.id}:`, e.message);
        }

        // Small delay to avoid aggressive rate limiting if needed
        // await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log("Finished embedding products.");
}

run();
