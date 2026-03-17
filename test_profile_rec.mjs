import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaftabktuogxisioeeua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg0MTMsImV4cCI6MjA3ODY0NDQxM30.Q7wDLbMAE9Ugc57EnncnB-dKvveLQgG4HH6SQ5zx4LI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("Testing ai-profile-recommend...");
    
    // We need to bypass auth or use a valid token. 
    // Since I'm testing from outside, I'll try to invoke it.
    // The function checks for auth. I'll use the service role key to see if I can bypass it OR just see if it fails with 401.
    // Actually, I'll use the service role key for the client to see if the function itself has issues.
    
    const { data, error } = await supabase.functions.invoke('ai-profile-recommend', {
        body: {
            recipientProfileId: '34f0c406-8fb5-4071-87a4-098553655106',
            recipientName: 'Kank',
            recipientRelationship: 'Friend',
            occasion: 'Birthday'
        }
    });

    if (error) {
        console.error("Error:", error);
        try {
            const details = await error.context?.text();
            console.log("Error details:", details);
        } catch (e) {}
    } else {
        console.log("Success:", data);
    }
}

test();
