import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { calculatePreferenceCompletion, PREFERENCE_THRESHOLD } from '@/lib/utils/onboarding';
import { dbRowToPreferences } from '@/types/recipient-preferences';
import type { RecipientPreferences } from '@/types/recipient-preferences';
import { router } from 'expo-router';

type OnboardingStatus = {
	needsPhone: boolean;
	needsPreferences: boolean;
	needsOccasion: boolean;
	needsAddress: boolean;
	preferencePct: number;
	loading: boolean;
};

type OnboardingContextValue = {
	status: OnboardingStatus;
	preferences: RecipientPreferences | null;
	recipientProfileId: string | null;
	ensureRecipientProfile: () => Promise<string | null>;
	refreshStatus: () => Promise<void>;
	completeOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
	const ctx = useContext(OnboardingContext);
	if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
	return ctx;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
	const { user, profile, updateProfile } = useAuth();
	const [loading, setLoading] = useState(true);
	const [preferences, setPreferences] = useState<RecipientPreferences | null>(null);
	const [occasionCount, setOccasionCount] = useState(0);
	const [recipientProfileId, setRecipientProfileId] = useState<string | null>(null);
	const [hasAddress, setHasAddress] = useState(false);
	const hasAutoCompleted = useRef(false);

	const fetchStatus = useCallback(async () => {
		if (!user) { setLoading(false); return; }

		try {
			// 1. Get user's recipient_profile (full row for address check)
			const { data: rp } = await supabase
				.from('recipient_profiles')
				.select('*')
				.eq('user_id', user.id)
				.maybeSingle();

			if (rp) {
				setRecipientProfileId(rp.id);
				setHasAddress(!!(rp.address && rp.city && rp.state && rp.zip));

				// 2. Get preferences
				const { data: prefs } = await supabase
					.from('recipient_preferences')
					.select('*')
					.eq('recipient_profile_id', rp.id)
					.maybeSingle();

				if (prefs) {
					setPreferences(dbRowToPreferences(prefs));
				} else {
					setPreferences(null);
				}

				// 3. Count own occasions
				const { count } = await supabase
					.from('occasions')
					.select('id', { count: 'exact', head: true })
					.eq('recipient_profile_id', rp.id);

				setOccasionCount(count ?? 0);
			} else {
				setRecipientProfileId(null);
				setPreferences(null);
				setOccasionCount(0);
				setHasAddress(false);
			}
		} catch (err) {
			console.error('[Onboarding] Error fetching status:', err);
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	const prefCompletion = calculatePreferenceCompletion(preferences);

	const needsPhone = !profile?.phone;
	const needsPreferences = prefCompletion.percentage < PREFERENCE_THRESHOLD;
	const needsOccasion = occasionCount === 0;
	const needsAddress = !hasAddress;
	const isComplete = !needsPhone && !needsPreferences && !needsOccasion && !needsAddress;

	// Auto-complete for existing users who already meet all requirements
	useEffect(() => {
		if (loading || hasAutoCompleted.current) return;
		if (!profile || !user) return;
		if (profile.onboarding_completed_at) return; // already done

		if (isComplete) {
			hasAutoCompleted.current = true;
			completeOnboarding();
		}
	}, [loading, isComplete, profile, user]);

	const ensureRecipientProfile = useCallback(async (): Promise<string | null> => {
		if (recipientProfileId) return recipientProfileId;
		if (!user || !profile) return null;

		const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Me';
		const { data, error } = await supabase
			.from('recipient_profiles')
			.upsert({ user_id: user.id, full_name: fullName }, { onConflict: 'user_id' })
			.select('id')
			.single();

		if (error) {
			console.error('[Onboarding] Error creating recipient_profile:', error);
			return null;
		}

		setRecipientProfileId(data.id);
		return data.id;
	}, [recipientProfileId, user, profile]);

	const completeOnboarding = useCallback(async () => {
		if (!user) return;
		await supabase
			.from('profiles')
			.update({ onboarding_completed_at: new Date().toISOString() })
			.eq('id', user.id);

		// Update local profile state
		await updateProfile({ onboarding_completed_at: new Date().toISOString() } as any);
	}, [user, updateProfile]);

	const refreshStatus = useCallback(async () => {
		setLoading(true);
		await fetchStatus();
	}, [fetchStatus]);

	return (
		<OnboardingContext.Provider
			value={{
				status: { needsPhone, needsPreferences, needsOccasion, needsAddress, preferencePct: prefCompletion.percentage, loading },
				preferences,
				recipientProfileId,
				ensureRecipientProfile,
				refreshStatus,
				completeOnboarding,
			}}
		>
			{children}
		</OnboardingContext.Provider>
	);
}
