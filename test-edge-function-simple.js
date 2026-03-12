
const fs = require('fs');
const path = require('path');

async function testFunction() {
    console.log('--- Edge Function Connectivity Test ---');

    const envPath = path.resolve(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env.local not found');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

    const url = urlMatch[1].trim();
    const key = keyMatch[1].trim();

    const names = ['invite-recipient', 'inivite-recipients', 'invite-recipients'];

    for (const name of names) {
        const functionUrl = `${url}/functions/v1/${name}`;
        console.log(`\nTesting Name: ${name}`);
        console.log(`URL: ${functionUrl}`);

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'search', phone: 'ping' })
            });

            console.log(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log('Response Body:', text);
        } catch (err) {
            console.error(`❌ Request failed for ${name}:`, err.message);
        }
    }
}

testFunction();
