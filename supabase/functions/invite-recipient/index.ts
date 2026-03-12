// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    console.log(`[INVITE_RECIPIENT] Incoming: ${req.method} ${req.url}`);

    // Explicit CORS check for all requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse body carefully
        let body;
        try {
            body = await req.json();
            console.log("INVITE_RECIPIENT: Body parsed successfully", { action: body?.action });
        } catch (e) {
            console.error("INVITE_RECIPIENT: Failed to parse request body", e);
            return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        const {
            fullName,
            phone: rawPhone,
            email,
            relationship,
            nickname,
            senderId,
            profileId: passedProfileId,
            address,
            apartment,
            city,
            state,
            country,
            zip,
            isAnonymous = false,
            action = 'invite'
        } = body;

        const normalizePhone = (input: string): string | null => {
            if (!input || typeof input !== 'string' || input.trim() === '') return null
            let normalized = input.replace(/[^\d+]/g, '')
            if (normalized.includes('+')) {
                const parts = normalized.split('+')
                normalized = '+' + parts.join('')
            }
            if (!normalized.startsWith('+') && normalized.length > 0) {
                return `+${normalized}`
            }
            return normalized.length > 0 ? normalized : null
        }

        const phone = normalizePhone(rawPhone)
        const sanitizedEmail = (email && typeof email === 'string' && email.trim() !== '') ? email.trim() : null

        console.log("INVITE_RECIPIENT: Context", { phone, email: sanitizedEmail, action, senderId });

        // --- Action: Search Preview ---
        if (action === 'search') {
            if (!phone && !sanitizedEmail) {
                return new Response(JSON.stringify({ success: false, error: "Phone or email required for search" }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                });
            }

            // Build OR filter string with QUOTES to avoid PostgREST parsing errors
            const orConditions = [];
            if (phone) orConditions.push(`phone.eq."${phone}"`);
            if (sanitizedEmail) orConditions.push(`email.eq."${sanitizedEmail}"`);
            const orFilter = orConditions.join(',');

            // 1. Search Global Profiles (Priority 1: Members)
            console.log("INVITE_RECIPIENT: Searching profiles first...");
            const { data: memberProfile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('id, first_name, last_name, profile_image_url')
                .or(orFilter)
                .maybeSingle();

            if (memberProfile) {
                console.log("INVITE_RECIPIENT: Found member in profiles, checking for existing recipient record...");
                // Check if this member already has a recipient_profile record
                const { data: existingRp } = await supabaseClient
                    .from('recipient_profiles')
                    .select('id, full_name, avatar_url, is_claimed')
                    .eq('user_id', memberProfile.id)
                    .maybeSingle();

                const memberFullName = memberProfile.first_name || memberProfile.last_name
                    ? `${memberProfile.first_name || ''} ${memberProfile.last_name || ''}`.trim()
                    : (memberProfile as any).full_name;

                return new Response(JSON.stringify({
                    success: true,
                    type: 'member',
                    profile: {
                        id: existingRp?.id || memberProfile.id, // Prefer RP ID if it exists
                        userId: memberProfile.id,
                        full_name: existingRp?.full_name || memberFullName,
                        avatar_url: existingRp?.avatar_url || memberProfile.profile_image_url,
                        is_claimed: true
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            }

            // 2. Search Recipient Profiles (Priority 2: Phantoms)
            console.log("INVITE_RECIPIENT: Falling back to recipient_profiles...");
            const { data: recipientProfile, error: rpError } = await supabaseClient
                .from('recipient_profiles')
                .select('id, full_name, avatar_url, is_claimed, user_id')
                .or(orFilter)
                .maybeSingle();

            if (recipientProfile) {
                console.log("INVITE_RECIPIENT: Found recipient_profile");

                // If phantom has a linked auth account, fetch their actual profile picture
                let avatarUrl = recipientProfile.avatar_url;
                if (recipientProfile.user_id) {
                    const { data: linkedProfile } = await supabaseClient
                        .from('profiles')
                        .select('profile_image_url')
                        .eq('id', recipientProfile.user_id)
                        .maybeSingle();
                    if (linkedProfile?.profile_image_url) {
                        avatarUrl = linkedProfile.profile_image_url;
                    }
                }

                return new Response(JSON.stringify({
                    success: true,
                    type: 'phantom',
                    profile: {
                        ...recipientProfile,
                        avatar_url: avatarUrl,
                        type: recipientProfile.user_id ? 'member' : 'phantom'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            }

            console.log("INVITE_RECIPIENT: No match found");
            return new Response(JSON.stringify({ success: true, profile: null }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // --- Action: Accept ---
        if (action === 'accept') {
            const { connectionId, relationship: receiverRelationship, nickname: receiverNickname } = body;

            if (!connectionId) {
                throw new Error("Connection ID is required for accept action");
            }

            console.log(`[INVITE_RECIPIENT] Accepting connection ${connectionId}`);

            // 1. Get connection details to find the sender
            const { data: connection, error: connError } = await supabaseClient
                .from('connections')
                .select('*, sender_id')
                .eq('id', connectionId)
                .single();

            if (connError || !connection) {
                throw new Error(`Connection not found: ${connError?.message || 'Unknown error'}`);
            }

            // 2. Update connection (how the acceptor sees the sender)
            const { error: updateError } = await supabaseClient
                .from('connections')
                .update({
                    status: 'approved',
                    receiver_relationship: receiverRelationship,
                    sender_nickname: receiverNickname // Receiver nicknaming the sender
                })
                .eq('id', connectionId);

            if (updateError) throw updateError;

            // 3. Notify the original sender
            const acceptorUserId = senderId; // The person calling this function is the one accepting
            const originalSenderId = connection.sender_id;

            // Get acceptor's name
            const { data: acceptorProfile } = await supabaseClient
                .from('profiles')
                .select('first_name, last_name, full_name')
                .eq('id', acceptorUserId)
                .single();

            const acceptorProfileName = acceptorProfile?.first_name
                ? `${acceptorProfile.first_name}${acceptorProfile.last_name ? ' ' + acceptorProfile.last_name : ''}`.trim()
                : (acceptorProfile as any)?.full_name || 'Someone';

            // IMPORTANT: Use the nickname the ORIGINAL SENDER used for this person
            const acceptorDisplayName = connection.receiver_nickname || acceptorProfileName;

            try {
                const title = `${acceptorDisplayName} accepted your invite! 🎁`;
                const bodyNotif = `You are now connected on Giftyy. You can now see their occasions and preferences! ✨`;

                await supabaseClient.from('notifications').insert({
                    user_id: originalSenderId,
                    type: 'connection_accepted',
                    title,
                    body: bodyNotif,
                    data: { acceptorId: acceptorUserId, connectionId }
                });

                // Send PUSH to original sender
                const { data: tokenRows } = await supabaseClient
                    .from('push_tokens')
                    .select('token')
                    .eq('user_id', originalSenderId);

                if (tokenRows && tokenRows.length > 0) {
                    const messages = tokenRows.map(row => ({
                        to: row.token,
                        sound: 'default',
                        title: 'Connection accepted! 🎁',
                        body: `${acceptorDisplayName} accepted your invite! ✨`,
                        data: { type: 'connection_accepted', acceptorId: acceptorUserId }
                    }));

                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(messages),
                    });
                }
            } catch (notifErr) {
                console.warn('[INVITE_RECIPIENT] Failed to send acceptance notification:', notifErr);
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // --- Action: Invite (Original Logic) ---

        // 0. Prevent user from adding themselves (Check sender's own profile)
        const { data: senderOwnProfile, error: senderError } = await supabaseClient
            .from('profiles')
            .select('phone, email, first_name, last_name')
            .eq('id', senderId)
            .single()

        if (!senderError && senderOwnProfile) {
            const normalizedSenderPhone = normalizePhone(senderOwnProfile.phone)
            const isSamePhone = phone && normalizedSenderPhone && phone === normalizedSenderPhone
            const isSameEmail = sanitizedEmail && senderOwnProfile.email && sanitizedEmail.toLowerCase() === senderOwnProfile.email.toLowerCase()

            if (isSamePhone || isSameEmail) {
                throw new Error("You cannot add yourself as a recipient")
            }
        }

        if (!phone && !sanitizedEmail && !passedProfileId) {
            throw new Error("Profile ID, Phone or Email is required")
        }

        const senderName = senderOwnProfile?.first_name
            ? `${senderOwnProfile.first_name}${senderOwnProfile.last_name ? ' ' + senderOwnProfile.last_name : ''}`.trim()
            : (senderOwnProfile as any)?.full_name || 'Your friend';
        console.log(`[INVITE_RECIPIENT] Sender info: ${senderName}`);

        let profileId: string
        let existingProfile: any = null
        let isNewPhantom = false

        // 1. Get or Create Profile
        if (passedProfileId) {
            const { data, error: fetchError } = await supabaseClient
                .from('recipient_profiles')
                .select('*')
                .eq('id', passedProfileId)
                .maybeSingle()

            if (data) {
                if (data.user_id === senderId) {
                    throw new Error("You cannot add yourself as a recipient")
                }
                existingProfile = data
                profileId = data.id
            } else {
                const { data: profileByUserId } = await supabaseClient
                    .from('recipient_profiles')
                    .select('*')
                    .eq('user_id', passedProfileId)
                    .maybeSingle();

                if (profileByUserId) {
                    existingProfile = profileByUserId;
                    profileId = profileByUserId.id;
                } else {
                    const { data: memberObj } = await supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', passedProfileId)
                        .maybeSingle();

                    if (memberObj) {
                        const { data: newRP, error: createError } = await supabaseClient
                            .from('recipient_profiles')
                            .insert({
                                full_name: memberObj.full_name,
                                phone: memberObj.phone,
                                email: memberObj.email,
                                user_id: memberObj.id,
                                is_claimed: true,
                                address, apartment, city, state, country, zip
                            })
                            .select()
                            .single();
                        if (createError) throw createError;
                        profileId = newRP.id;
                        existingProfile = newRP;
                    } else {
                        throw new Error("Profile not found")
                    }
                }
            }
        } else {
            let orFilter = []
            if (phone) orFilter.push(`phone.eq."${phone}"`)
            if (email) orFilter.push(`email.eq."${email}"`)

            const { data, error: searchError } = await supabaseClient
                .from('recipient_profiles')
                .select('*')
                .or(orFilter.join(','))
                .maybeSingle()

            if (searchError) throw searchError
            existingProfile = data

            if (existingProfile) {
                if (existingProfile.user_id === senderId) {
                    throw new Error("You cannot add yourself as a recipient")
                }
                profileId = existingProfile.id
            } else {
                const { data: newProfile, error: createError } = await supabaseClient
                    .from('recipient_profiles')
                    .insert({
                        full_name: fullName || 'Giftyy Friend',
                        phone,
                        email: sanitizedEmail,
                        is_claimed: false,
                        address, apartment, city, state, country, zip
                    })
                    .select()
                    .single()

                if (createError) throw createError
                profileId = newProfile.id
                isNewPhantom = true
            }
        }

        // 3. Create Connection using UPSERT
        const { error: connectionError } = await supabaseClient
            .from('connections')
            .upsert({
                sender_id: senderId,
                recipient_profile_id: profileId,
                receiver_nickname: nickname || fullName,
                sender_nickname: senderName,
                sender_relationship: relationship,
                status: 'pending'
            }, { onConflict: 'sender_id, recipient_profile_id' });

        if (connectionError) {
            console.error("[INVITE_RECIPIENT] Connection upsert error:", connectionError);
            throw connectionError;
        }

        // 5. Notifications
        const recipientUserId = existingProfile?.user_id;
        if (recipientUserId) {
            try {
                // Use first_name for a more personal touch if available
                const personalName = senderOwnProfile?.first_name || senderName;
                const title = `${personalName} wants to connect! 🎁`;
                const bodyNotif = `${personalName} wants to connect with you. They want to celebrate you the right way. Update your preferences so they can gift you perfectly! ✨`;

                await supabaseClient.from('notifications').insert({
                    user_id: recipientUserId,
                    type: 'connection_request',
                    title,
                    body: bodyNotif,
                    data: {
                        senderId,
                        action_label: "Accept Invitation",
                        action_href: "/(tabs)/recipients?tab=circle"
                    }
                });

                const { data: tokenRows } = await supabaseClient
                    .from('push_tokens')
                    .select('token')
                    .eq('user_id', recipientUserId);

                if (tokenRows && tokenRows.length > 0) {
                    const messages = tokenRows.map(row => ({
                        to: row.token,
                        sound: 'default',
                        title: 'Relationship Alert! 🎁',
                        body: `${personalName} wants to connect with you. Update your preferences so they can gift you perfectly! ✨`,
                        data: { type: 'connection_request', senderId }
                    }));

                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(messages),
                    });
                }
            } catch (notifErr) {
                console.warn('[INVITE_RECIPIENT] Failed to send notification:', notifErr)
            }
        }

        return new Response(JSON.stringify({ success: true, profileId, isNewPhantom }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error("Error in invite-recipient:", error)
        return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})
