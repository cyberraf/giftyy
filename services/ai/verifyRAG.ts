
import { fetchEmbeddings, supabaseAdmin } from './config';

async function verifyRAG() {
    const testCases = [
        { name: 'Rafik', relationship: 'Friend', occasion: 'Ramadan' },
        { name: 'Sarah', relationship: 'Wife', occasion: 'Anniversary' },
        { name: 'Ahmed', relationship: 'Son', occasion: 'Birthday' }
    ];

    console.log('=== Giftyy RAG Verification ===\n');

    for (const test of testCases) {
        console.log(`Testing: [${test.occasion}] for ${test.name} (${test.relationship})`);

        const query = `Recipient: ${test.name}. Relationship: ${test.relationship}. Occasion: ${test.occasion}. Looking for thoughtful gifts.`;

        try {
            const vectors = await fetchEmbeddings([query]);
            const embedding = vectors[0];

            const { data, error } = await supabaseAdmin.rpc('match_products_rag', {
                p_query_embedding: embedding,
                p_limit: 5,
                p_require_in_stock: false
            });

            if (error) throw error;

            console.log('Top Results:');
            data?.forEach((p: any, i: number) => {
                console.log(`${i + 1}. ${p.name} ($${p.price}) - Dist: ${p.similarity_distance.toFixed(4)}`);
                // console.log(`   Text: ${p.product_text?.slice(0, 100)}...`);
            });
            console.log('---');

        } catch (err: any) {
            console.error(`Error in test case ${test.occasion}:`, err.message || err);
        }
    }
}

verifyRAG().catch(console.error);
