import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const claimPendingInvite = async (userId: string, providedInviteId?: string) => {
    console.error('[INVITE] claimPendingInvite starting. userId:', userId, 'providedId:', providedInviteId);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        console.error('[INVITE] Verified session UID:', session?.user?.id);

        // Use provided ID or fallback to storage
        let inviteId = providedInviteId;
        if (!inviteId) {
            console.error('[INVITE] No providedId, checking AsyncStorage...');
            inviteId = await AsyncStorage.getItem('@pending_invite_id') || undefined;
        }

        console.error('[INVITE] Final inviteId to process:', inviteId);

        if (!inviteId || inviteId === 'undefined' || inviteId === 'null') {
            console.error('[INVITE] ERROR: No valid invite ID found in parameters or storage.');
            return false;
        }

        console.error('[INVITE] Processing invite ID:', inviteId);

        // 1. Check current status (Idempotency check)
        const { data: profile, error: profileError } = await supabase
            .from('recipient_profiles')
            .select('user_id, is_claimed')
            .eq('id', inviteId)
            .single();

        if (profileError) {
            console.error('[INVITE] Error fetching profile:', profileError);
            return false;
        }

        console.error('[INVITE] Profile status:', profile);

        // CASE A: Already claimed by this user
        if (profile?.is_claimed && profile.user_id === userId) {
            console.error('[INVITE] Profile already claimed by this user. Ensuring connection is approved.');

            await supabase
                .from('connections')
                .update({ status: 'approved' })
                .eq('recipient_profile_id', inviteId);

            await AsyncStorage.removeItem('@pending_invite_id');
            return true;
        }

        // CASE B: Claimed by someone else
        if (profile?.is_claimed && profile.user_id !== userId) {
            console.error('[INVITE] Profile claimed by a different user:', profile.user_id);
            await AsyncStorage.removeItem('@pending_invite_id');
            return false;
        }

        // CASE C: Unclaimed phantom - proceed to claim
        console.error('[INVITE] Attempting to claim phantom profile...');

        // Consolidate: delete any other empty profiles for this user before claiming
        const { data: duplicates } = await supabase
            .from('recipient_profiles')
            .select('id')
            .eq('user_id', userId)
            .neq('id', inviteId);

        if (duplicates && duplicates.length > 0) {
            console.error(`[INVITE] Deleting ${duplicates.length} duplicate profiles`);
            await supabase
                .from('recipient_profiles')
                .delete()
                .in('id', duplicates.map(d => d.id));
        }

        // 3. Claim the profile
        const { error: claimError } = await supabase
            .from('recipient_profiles')
            .update({
                user_id: userId,
                is_claimed: true,
            })
            .eq('id', inviteId)
            .is('user_id', null);

        if (claimError) {
            console.error('[INVITE] Error claiming profile:', claimError);
            return false;
        }

        console.error('[INVITE] recipient_profiles update successful!');

        // 4. Update connection status
        console.error('[INVITE] Updating connections table status to approved...');
        const { error: connectionError } = await supabase
            .from('connections')
            .update({ status: 'approved' })
            .eq('recipient_profile_id', inviteId);

        if (connectionError) {
            console.error('[INVITE] Error updating connection status:', connectionError);
            // We return true anyway because the profile IS claimed now, 
            // and the user should see the success screen.
        }

        console.error('[INVITE] Claim complete. Cleaning up storage.');
        await AsyncStorage.removeItem('@pending_invite_id');
        return true;

    } catch (err) {
        console.error('[INVITE] Unexpected error in claimPendingInvite:', err);
    }
    return false;
};
