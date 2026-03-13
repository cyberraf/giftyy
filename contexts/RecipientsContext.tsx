import { supabase } from '@/lib/supabase';
import { getNormalizedContacts, normalizeForMatching } from '@/lib/utils/contacts';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

export type Recipient = {
    id: string; // Connection ID
    profileId?: string; // Global profile ID
    firstName: string;
    lastName?: string;
    relationship: string;
    email?: string;
    phone: string;
    birthDate?: string;
    address: string;
    apartment?: string;
    city: string;
    state?: string;
    country: string;
    zip: string;
    status: 'pending' | 'approved' | 'rejected';
    isOutgoing: boolean;
    isClaimed: boolean;
    displayName: string;
    actualProfileId?: string;
    avatarUrl?: string;
    senderAvatarUrl?: string;
    senderName?: string;
};

export type MatchedContact = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    userId?: string;
    avatarUrl?: string;
    imageUri?: string;
    isGiftyyUser: boolean;
    connectionStatus?: 'pending' | 'approved' | 'rejected' | 'none';
    connectionId?: string;
    isIncomingInvitation?: boolean;
};

type RecipientsContextValue = {
    recipients: Recipient[];
    loading: boolean;
    setRecipients: (recipients: Recipient[]) => void;
    addRecipient: (recipient: any) => Promise<{ id?: string; error: Error | null }>;
    updateRecipient: (id: string, updates: any) => Promise<{ error: Error | null }>;
    deleteRecipient: (id: string) => Promise<{ error: Error | null }>;
    refreshRecipients: () => Promise<void>;
    approveConnection: (id: string, updates?: any) => Promise<{ error: Error | null }>;
    rejectConnection: (id: string) => Promise<{ error: Error | null }>;
    syncedContacts: MatchedContact[];
    isSyncingContacts: boolean;
    syncContacts: (force?: boolean) => Promise<void>;
};

const RecipientsContext = createContext<RecipientsContextValue | undefined>(undefined);

// Helper to map DB connection + profile to Recipient
function mapToRecipient(conn: any, currentUserId?: string): Recipient {
    const profile = conn.recipient_profile || {};
    const senderProfile = conn.sender_profile || {};
    const isOutgoing = conn.sender_id === currentUserId;

    // Logic for display name:
    // If I am the sender, I want to see the name I gave the receiver (receiver_nickname)
    // If I am the receiver, I want to see the name the sender gave themselves (sender_nickname) OR their profile name
    const senderFullName = senderProfile.first_name || senderProfile.last_name
        ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim()
        : senderProfile.full_name;

    const displayName = isOutgoing
        ? (conn.receiver_nickname || profile.full_name || 'Recipient')
        : (conn.sender_nickname || senderFullName || 'Sender');

    const senderRpId = senderProfile.recipient_profiles?.[0]?.id;

    return {
        id: conn.id,
        profileId: isOutgoing ? conn.recipient_profile_id : conn.sender_id,
        actualProfileId: isOutgoing ? conn.recipient_profile_id : senderRpId,
        firstName: displayName.split(' ')[0] || 'Recipient',
        lastName: displayName.split(' ').slice(1).join(' ') || '',
        relationship: isOutgoing ? conn.sender_relationship : conn.receiver_relationship || 'Friend',
        email: isOutgoing ? (profile.email || '') : (senderProfile.email || ''),
        phone: isOutgoing ? (profile.phone || '') : (senderProfile.phone || ''),
        birthDate: profile.birth_date || '',
        address: isOutgoing ? (profile.address || '') : (senderProfile.recipient_profiles?.[0]?.address || ''),
        apartment: isOutgoing ? (profile.apartment || '') : (senderProfile.recipient_profiles?.[0]?.apartment || ''),
        city: isOutgoing ? (profile.city || '') : (senderProfile.recipient_profiles?.[0]?.city || ''),
        state: isOutgoing ? (profile.state || '') : (senderProfile.recipient_profiles?.[0]?.state || ''),
        country: isOutgoing ? (profile.country || '') : (senderProfile.recipient_profiles?.[0]?.country || ''),
        zip: isOutgoing ? (profile.zip || '') : (senderProfile.recipient_profiles?.[0]?.zip || ''),
        status: conn.status as any,
        isOutgoing,
        isClaimed: profile.is_claimed || false,
        displayName,
        avatarUrl: profile?.profiles?.profile_image_url || profile.avatar_url,
        senderAvatarUrl: senderProfile?.profile_image_url,
        senderName: conn.sender_nickname || senderFullName,
    };
}

export function RecipientsProvider({ children }: { children: React.ReactNode }) {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncedContacts, setSyncedContacts] = useState<MatchedContact[]>([]);
    const [isSyncingContacts, setIsSyncingContacts] = useState(false);
    const syncingRef = useRef(false);
    const { user } = useAuth();

    const refreshRecipients = useCallback(async () => {
        if (!user) {
            setRecipients([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // 1. Get current user's recipient profile ID to fetch incoming connections
            const { data: myRp } = await supabase
                .from('recipient_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            const myRpId = myRp?.id;

            // 2. Fetch connections where user is sender OR recipient (via profile)
            let query = supabase
                .from('connections')
                .select(`
                    *,
                    recipient_profile:recipient_profile_id (
                        *,
                        profiles:user_id ( profile_image_url )
                    ),
                    sender_profile:profiles!sender_id (
                        first_name,
                        last_name,
                        profile_image_url,
                        email,
                        phone,
                        recipient_profiles!user_id ( 
                            id,
                            address,
                            city,
                            state,
                            country,
                            zip,
                            apartment
                        )
                    )
                `);

            if (myRpId) {
                query = query.or(`sender_id.eq.${user.id},recipient_profile_id.eq.${myRpId}`);
            } else {
                query = query.eq('sender_id', user.id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            const mapped = (data || []).map(conn => mapToRecipient(conn, user.id));
            setRecipients(mapped);
        } catch (err) {
            console.error('Error fetching connections:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refreshRecipients();
    }, [refreshRecipients]);

    // Keep synced contacts updated with current connection statuses
    useEffect(() => {
        setSyncedContacts(prev => {
            let hasChanges = false;
            const updated = prev.map(c => {
                if (!c.userId) return c;
                const recipient = recipients.find(r => r.profileId === c.userId);
                if (recipient) {
                    const status = recipient.status;
                    const isIncoming = !recipient.isOutgoing && recipient.status === 'pending';
                    if (c.connectionStatus !== status || c.isIncomingInvitation !== isIncoming) {
                        hasChanges = true;
                        return {
                            ...c,
                            connectionStatus: status,
                            connectionId: recipient.id,
                            isIncomingInvitation: isIncoming,
                        };
                    }
                }
                return c;
            });
            return hasChanges ? updated : prev;
        });
    }, [recipients]);

    const addRecipient = useCallback(async (details: any) => {
        if (!user) return { error: new Error('Not authenticated') };

        try {
            console.log('[RecipientsContext] Calling invite-recipient edge function for:', details.fullName || details.phone);

            const { data, error: functionError } = await supabase.functions.invoke('invite-recipient', {
                body: {
                    action: 'invite',
                    senderId: user.id,
                    fullName: details.fullName,
                    phone: details.phone,
                    email: details.email,
                    relationship: details.relationship,
                    nickname: details.nickname,
                    profileId: details.profileId,
                }
            });

            if (functionError) {
                console.error('[RecipientsContext] Edge function error:', functionError);
                throw functionError;
            }

            if (data?.success === false) {
                throw new Error(data.error || 'Failed to add recipient');
            }

            await refreshRecipients();
            return { id: data?.profileId, error: null };
        } catch (err: any) {
            console.error('[RecipientsContext] Error adding recipient:', err);
            return { id: undefined, error: err };
        }
    }, [user, refreshRecipients]);

    const updateRecipient = useCallback(async (id: string, updates: any) => {
        try {
            const { error } = await supabase.from('connections').update(updates).eq('id', id);
            if (error) throw error;
            await refreshRecipients();
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    }, [refreshRecipients]);

    const deleteRecipient = useCallback(async (id: string) => {
        try {
            const { error } = await supabase.from('connections').delete().eq('id', id);
            if (error) throw error;
            await refreshRecipients();
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    }, [refreshRecipients]);

    const approveConnection = useCallback(async (id: string, updates?: any) => {
        if (!user) return { error: new Error('Not authenticated') };

        try {
            console.log('[RecipientsContext] Calling invite-recipient edge function to accept:', id);

            const { data, error: functionError } = await supabase.functions.invoke('invite-recipient', {
                body: {
                    action: 'accept',
                    senderId: user.id, // Current user is the acceptor
                    connectionId: id,
                    relationship: updates?.relationship,
                    nickname: updates?.nickname
                }
            });

            if (functionError) throw functionError;
            if (data?.success === false) throw new Error(data.error || 'Failed to approve connection');

            // Optionally update local state immediately or just refresh
            await refreshRecipients();
            return { error: null };
        } catch (err: any) {
            console.error('[RecipientsContext] Error approving connection:', err);
            return { error: err };
        }
    }, [user, refreshRecipients]);

    const rejectConnection = useCallback(async (id: string) => {
        try {
            const { error } = await supabase.from('connections').update({ status: 'rejected' }).eq('id', id);
            if (error) throw error;
            await refreshRecipients();
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    }, [refreshRecipients]);

    // ── Contact Sync ──────────────────────────────────────────────────────
    const syncContacts = useCallback(async (force?: boolean) => {
        if (!user) return;
        if (syncingRef.current && !force) return;

        syncingRef.current = true;
        setIsSyncingContacts(true);
        try {
            // 1. Fetch device contacts
            const deviceContacts = await getNormalizedContacts();

            if (deviceContacts.length === 0) {
                setSyncedContacts([]);
                return;
            }

            // 2. Collect all phone numbers for matching
            const phoneNumbers = deviceContacts
                .map(c => c.phone)
                .filter(Boolean) as string[];

            // Normalize for matching
            const normalizedPhones = phoneNumbers.map(p => normalizeForMatching(p));

            // optimization: Query profiles matching the phones of device contacts
            // We include both raw digits and '+' prefixed versions to be safe
            const searchTerms = [
                ...normalizedPhones,
                ...normalizedPhones.map(p => `+${p}`)
            ];
            
            let matchedProfiles: any[] = [];
            
            // Query by phone in batches to avoid URL length issues or Supabase limits
            const batchSize = 100;
            for (let i = 0; i < searchTerms.length; i += batchSize) {
                const batch = searchTerms.slice(i, i + batchSize);
                const { data: phoneBatch, error: phoneErr } = await supabase
                    .from('recipient_profiles')
                    .select('id, full_name, phone, email, avatar_url, user_id, is_claimed')
                    .in('phone', batch); 
                
                if (phoneErr) console.warn('[syncContacts] Phone match batch error:', phoneErr);
                if (phoneBatch) matchedProfiles = [...matchedProfiles, ...phoneBatch];
            }
            
            // Also matching by email if available in device contacts
            const emails = deviceContacts.flatMap(c => c.emails || []).filter(Boolean);
            if (emails.length > 0) {
                for (let i = 0; i < emails.length; i += batchSize) {
                    const batch = emails.slice(i, i + batchSize);
                    const { data: emailBatch, error: emailErr } = await supabase
                        .from('recipient_profiles')
                        .select('id, full_name, phone, email, avatar_url, user_id, is_claimed')
                        .in('email', batch);
                    
                    if (emailErr) console.warn('[syncContacts] Email match batch error:', emailErr);
                    if (emailBatch) {
                        // Merge without duplicates
                        const existingIds = new Set(matchedProfiles.map(p => p.id));
                        emailBatch.forEach(p => {
                            if (!existingIds.has(p.id)) {
                                matchedProfiles.push(p);
                                existingIds.add(p.id);
                            }
                        });
                    }
                }
            }

            // 4. Fetch existing connections for this user
            const { data: existingConnections } = await supabase
                .from('connections')
                .select('id, sender_id, recipient_profile_id, status')
                .or(`sender_id.eq.${user.id}`);

            // Build lookup maps — match by both phone AND email
            const profilesByPhone = new Map<string, any>();
            const profilesByEmail = new Map<string, any>();
            (matchedProfiles || []).forEach(p => {
                if (p.phone) {
                    // Store both the raw normalized and also try different variations
                    const normalized = normalizeForMatching(p.phone);
                    profilesByPhone.set(normalized, p);
                    profilesByPhone.set(`+${normalized}`, p);
                    
                    // Also store last 10 digits for more lenient matching (extremely important for international vs local)
                    if (normalized.length >= 10) {
                        profilesByPhone.set(normalized.slice(-10), p);
                    }
                }
                if (p.email) {
                    profilesByEmail.set(p.email.toLowerCase().trim(), p);
                }
            });

            const connectionsByProfileId = new Map<string, any>();
            (existingConnections || []).forEach(c => {
                if (c.recipient_profile_id) {
                    connectionsByProfileId.set(c.recipient_profile_id, c);
                }
            });

            // 5. Build matched contacts list
            const matched: MatchedContact[] = deviceContacts.map(contact => {
                const normalizedPhone = contact.phone ? normalizeForMatching(contact.phone) : '';
                // Try full number match first, then last-10-digits match
                let profile = normalizedPhone ? profilesByPhone.get(normalizedPhone) : null;
                
                // Extra check for '+' prefix if it was stored that way in the map
                if (!profile && normalizedPhone) {
                    profile = profilesByPhone.get(`+${normalizedPhone}`);
                }

                if (!profile && normalizedPhone.length >= 10) {
                    profile = profilesByPhone.get(normalizedPhone.slice(-10));
                }
                // Also try email matching
                if (!profile && contact.emails) {
                    for (const email of contact.emails) {
                        if (email) {
                            profile = profilesByEmail.get(email.toLowerCase().trim());
                            if (profile) break;
                        }
                    }
                }

                // Prevent self-matching
                if (profile && profile.user_id === user.id) {
                    profile = null;
                }

                const connection = profile ? connectionsByProfileId.get(profile.id) : null;

                return {
                    id: contact.id,
                    name: contact.name,
                    phone: contact.phone,
                    email: contact.emails?.[0],
                    imageUri: contact.imageUri,
                    isGiftyyUser: !!profile,
                    userId: profile?.id,
                    avatarUrl: profile?.avatar_url,
                    connectionStatus: connection?.status || 'none',
                    connectionId: connection?.id,
                    isIncomingInvitation: connection?.sender_id !== user.id && connection?.status === 'pending',
                };
            });

            // Sort: Giftyy users first, then alphabetically
            matched.sort((a, b) => {
                if (a.isGiftyyUser && !b.isGiftyyUser) return -1;
                if (!a.isGiftyyUser && b.isGiftyyUser) return 1;
                return a.name.localeCompare(b.name);
            });

            setSyncedContacts(matched);
        } catch (err: any) {
            console.error('[syncContacts] Error:', err);
            throw err;
        } finally {
            syncingRef.current = false;
            setIsSyncingContacts(false);
        }
    }, [user]);

    // Proactive background contact sync on app load / login
    useEffect(() => {
        if (user && !syncedContacts.length && !syncingRef.current) {
            console.log('[RecipientsContext] Starting proactive background sync');
            syncContacts();
        }
    }, [user, syncContacts, syncedContacts.length]);

    const value = useMemo(() => ({
        recipients,
        loading,
        setRecipients,
        addRecipient,
        updateRecipient,
        deleteRecipient,
        refreshRecipients,
        approveConnection,
        rejectConnection,
        syncedContacts,
        isSyncingContacts,
        syncContacts,
    }), [recipients, loading, addRecipient, updateRecipient, deleteRecipient, refreshRecipients, approveConnection, rejectConnection, syncedContacts, isSyncingContacts, syncContacts]);

    return <RecipientsContext.Provider value={value}>{children}</RecipientsContext.Provider>;
}

export function useRecipients() {
    const ctx = useContext(RecipientsContext);
    if (!ctx) throw new Error('useRecipients must be used within RecipientsProvider');
    return ctx;
}

