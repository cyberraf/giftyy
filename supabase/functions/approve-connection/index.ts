// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    console.log(`[APPROVE_CONNECTION] Incoming: ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse body
        const { connectionId, relationship, nickname } = await req.json();

        // Get the caller's auth context (the person approving)
        const authHeader = req.headers.get('Authorization')!;
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) {
            throw new Error('User not authenticated');
        }

        console.log(`[APPROVE_CONNECTION] User ${user.id} approving connection ${connectionId}`);

        // 1. Get connection and sender details
        const { data: connection, error: connError } = await supabaseClient
            .from('connections')
            .select('sender_id, recipient_profile_id, status')
            .eq('id', connectionId)
            .single();

        if (connError || !connection) {
            throw new Error('Connection not found');
        }

        // Security check: Only the recipient can approve (or the sender if it was a mutual add)
        // But usually, only the recipient of the 'pending' request approves.
        // We'll trust the RLS or the lookup for now, but better to verify the user is the recipient profile's owner.
        const { data: recipientProfile } = await supabaseClient
            .from('recipient_profiles')
            .select('user_id')
            .eq('id', connection.recipient_profile_id)
            .single();

        if (recipientProfile?.user_id !== user.id && connection.sender_id !== user.id) {
            throw new Error('Not authorized to approve this connection');
        }

        // 2. Perform the update
        const { error: updateError } = await supabaseClient
            .from('connections')
            .update({
                status: 'approved',
                receiver_relationship: relationship,
                receiver_nickname: nickname
            })
            .eq('id', connectionId);

        if (updateError) throw updateError;

        // 3. Send Notifications to the original sender (if it's not the current user)
        const targetUserId = connection.sender_id === user.id ? null : connection.sender_id;

        if (targetUserId) {
            // Get approver's name
            const { data: approverProfile } = await supabaseClient
                .from('profiles')
                .select('full_name, first_name')
                .eq('id', user.id)
                .single();

            const approverName = approverProfile?.full_name || approverProfile?.first_name || 'Your friend';
            const title = 'Connection Confirmed! 🎁';
            const body = `${approverName} is now connected with you on Giftyy.`;

            // A. In-app notification
            await supabaseClient.from('notifications').insert({
                user_id: targetUserId,
                type: 'connection_approved',
                title,
                body,
                data: { connectionId }
            });

            // B. Push notification via Expo
            const { data: tokenRows } = await supabaseClient
                .from('push_tokens')
                .select('token')
                .eq('user_id', targetUserId);

            if (tokenRows && tokenRows.length > 0) {
                const messages = tokenRows.map(row => ({
                    to: row.token,
                    sound: 'default',
                    title,
                    body,
                    data: { type: 'connection_approved', connectionId }
                }));

                await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(messages),
                });
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error("[APPROVE_CONNECTION] Error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})
