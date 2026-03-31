import { ConversationalRecipientForm } from '@/components/recipients/ConversationalRecipientForm';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { dbRowToPreferences } from '@/types/recipient-preferences';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';

export default function OnboardingPreferencesScreen() {
	const router = useRouter();
	const { user, profile: authProfile } = useAuth();
	const { recipientProfileId, ensureRecipientProfile, refreshStatus } = useOnboarding();

	const [rpId, setRpId] = useState<string | null>(recipientProfileId);
	const [myPrefs, setMyPrefs] = useState<any>(null);
	const [myProfileData, setMyProfileData] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				let id = recipientProfileId;
				if (!id) {
					id = await ensureRecipientProfile();
				}
				setRpId(id);

				if (id) {
					const [{ data: prefs }, { data: profileData }] = await Promise.all([
						supabase
							.from('recipient_preferences')
							.select('*')
							.eq('recipient_profile_id', id)
							.maybeSingle(),
						supabase
							.from('recipient_profiles')
							.select('*')
							.eq('id', id)
							.maybeSingle(),
					]);

					if (prefs) setMyPrefs(dbRowToPreferences(prefs));
					if (profileData) setMyProfileData(profileData);
				}
			} catch (err) {
				console.error('[OnboardingPreferences] Error loading data:', err);
			} finally {
				setLoading(false);
			}
		})();
	}, [recipientProfileId]);

	const handleClose = async () => {
		await refreshStatus();
		router.back();
	};

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff5f0' }}>
				<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
			</View>
		);
	}

	return (
		<ConversationalRecipientForm
			visible={true}
			onClose={handleClose}
			isSelf={true}
			recipientProfileId={rpId || undefined}
			recipient={{
				firstName: authProfile?.first_name || '',
				lastName: authProfile?.last_name || '',
				phone: authProfile?.phone || '',
				email: user?.email || '',
				profileId: rpId || undefined,
				preferences: {
					...(myPrefs || {}),
					address: myProfileData?.address,
					apartment: myProfileData?.apartment,
					city: myProfileData?.city,
					state: myProfileData?.state,
					country: myProfileData?.country,
					zip: myProfileData?.zip,
				},
			} as any}
		/>
	);
}
