import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeAIInterface from '@/components/home/HomeAIInterface';
import { OccasionList } from '@/components/home/OccasionList';
import { OnboardingSection, type OnboardingStep } from '@/components/home/OnboardingSection';
import { useAuth } from '@/contexts/AuthContext';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useOrders } from '@/contexts/OrdersContext';
import { useSharedMemories } from '@/contexts/SharedMemoriesContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useHome } from '@/lib/hooks/useHome';
import { useTour } from '@/contexts/TourContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Buyer Home: AI Chat Interface with Upcoming Celebrations & Onboarding
 */
export default function BuyerHomeIndexScreen() {
	const {
		recipients,
		upcomingOccasions,
		recipientsLoading,
		initialLoading,
		myPreferences,
		myProfileOccasions,
	} = useHome();
	const homeOccasions = upcomingOccasions.slice(0, 6);

	const router = useRouter();
	const { setVisible } = useBottomBarVisibility();
	const { profile, user } = useAuth();
	const { sharedMemories, refreshSharedMemories } = useSharedMemories();
	const { orders, refreshOrders } = useOrders();
	const { videoMessages, refreshVideoMessages } = useVideoMessages();
	const { refreshOccasions } = useHome();

	const [hasReactions, setHasReactions] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([
				refreshOccasions(),
				refreshOrders(),
				refreshVideoMessages(),
				refreshSharedMemories(),
			]);
		} catch (error) {
			console.error('Error refreshing home data:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshOccasions, refreshOrders, refreshVideoMessages, refreshSharedMemories]);

	useEffect(() => {
		async function checkReactions() {
			if (!user) return;
			const { count, error } = await supabase
				.from('recipient_reactions')
				.select('*', { count: 'exact', head: true })
				.eq('recipient_user_id', user.id);

			if (!error && count !== null) {
				setHasReactions(count > 0);
			}
		}
		checkReactions();
	}, [user]);

	// Hide bottom tab bar on the Home screen — we use the burger menu instead
	useEffect(() => {
		setVisible(false);
		return () => setVisible(true);
	}, [setVisible]);

	const handleSearch = (text: string) => {
		console.log('Searching for:', text);
	};

	const handlePressOccasion = useCallback(
		(recipientId: string, occasionId: string) => {
			router.push({
				pathname: '/(buyer)/recipient/[id]',
				params: { id: recipientId, occasionId }
			});
		},
		[router],
	);

	const handleAddOccasion = useCallback(() => {
		router.push('/(buyer)/(tabs)/recipients');
	}, [router]);

	// --- Onboarding progress ---
	// Check for actual recipients (excluding potential self-references if they exist in the list)
	const hasRecipients = recipients.length > 0;

	// Check for occasions specifically for others or meaningful profile occasions
	const hasOccasions = (myProfileOccasions ?? []).length > 0;

	const { startTour } = useTour();

	// Auto-start tour for new users
	useEffect(() => {
		const checkTour = async () => {
			try {
				const completed = await AsyncStorage.getItem('giftyy_interactive_tour_completed_v1');
				if (!completed && user) {
					// Add a small delay for the app to settle
					setTimeout(() => {
						startTour();
					}, 2000);
				}
			} catch (e) {
				console.warn('Failed to check tour state', e);
			}
		};
		checkTour();
	}, [user, startTour]);

	// Robust preference check: Ensure at least some key fields are populated
	const hasPreferences = useMemo(() => {
		if (!myPreferences) return false;
		// Check for at least one meaningful preference field
		const keyFields = [
			'age_range', 'lifestyle_type', 'gender_identity',
			'fashion_style', 'interests', 'dietary_preferences'
		];
		return keyFields.some(field => {
			const val = (myPreferences as any)[field];
			if (Array.isArray(val)) return val.length > 0;
			return val != null && val !== '';
		});
	}, [myPreferences]);

	const onboardingSteps: OnboardingStep[] = useMemo(
		() => {
			const steps: OnboardingStep[] = [
				{
					id: 'add-name',
					label: 'Add your name',
					completed: !!(profile?.first_name),
					onPress: () => router.push('/(buyer)/(tabs)/profile'),
				},
				{
					id: 'add-phone',
					label: 'Add phone number',
					completed: !!(profile?.phone),
					onPress: () => router.push('/(buyer)/(tabs)/profile'),
				},
				{
					id: 'add-birthday',
					label: 'Add your birthday',
					completed: !!(profile?.date_of_birth),
					onPress: () => router.push('/(buyer)/(tabs)/profile'),
				},
				{
					id: 'add-recipient',
					label: 'Add a recipient',
					completed: hasRecipients,
					onPress: () => router.push({ pathname: '/(buyer)/(tabs)/recipients', params: { tab: 'circle' } }),
				},
				{
					id: 'set-occasion',
					label: 'Set an occasion',
					completed: hasOccasions,
					onPress: () => router.push({ pathname: '/(buyer)/(tabs)/recipients', params: { tab: 'occasions' } }),
				},
				{
					id: 'fill-preferences',
					label: 'Fill your preferences',
					completed: hasPreferences,
					onPress: () => router.push({ pathname: '/(buyer)/(tabs)/recipients', params: { tab: 'preferences' } }),
				},
				{
					id: 'first-order',
					label: 'Place your first order',
					completed: orders.length > 0,
					onPress: () => router.push('/(buyer)/(tabs)/shop'),
				},
				{
					id: 'first-video',
					label: 'Record a video message',
					completed: videoMessages.some(v => v.direction === 'sent'),
					onPress: () => router.push({ pathname: '/(buyer)/(tabs)/memory', params: { tab: 'Messages' } }),
				},
				{
					id: 'first-memory',
					label: 'Upload a shared memory',
					completed: sharedMemories.length > 0,
					onPress: () => router.push({ pathname: '/(buyer)/(tabs)/memory', params: { tab: 'Shared memories' } }),
				},
				{
					id: 'first-reaction',
					label: 'Send your first reaction',
					completed: hasReactions,
					onPress: () => router.push({ pathname: '/(buyer)/(tabs)/memory', params: { tab: 'Reactions' } }),
				},
			];

			// Sort: incomplete steps first
			return steps.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
		},
		[profile, hasRecipients, hasOccasions, hasPreferences, orders, videoMessages, sharedMemories, hasReactions, router],
	);

	const onboardingPercentage = useMemo(() => {
		const done = onboardingSteps.filter((s) => s.completed).length;
		return Math.round((done / onboardingSteps.length) * 100);
	}, [onboardingSteps]);

	const isOnboardingComplete = onboardingPercentage === 100;

	return (
		<View style={styles.container}>
			<HomeAIInterface
				recipients={recipients}
				occasions={homeOccasions}
				onSearch={handleSearch}
				refreshing={refreshing}
				onRefresh={handleRefresh}
			>
				{/* Loading skeleton wrapper or empty container while initial data is loading */}
				{!initialLoading ? (
					<>
						{/* Upcoming Celebrations */}
						<OccasionList
							occasions={homeOccasions}
							loading={recipientsLoading}
							onPressOccasion={handlePressOccasion}
							onAddOccasion={handleAddOccasion}
						/>

						{/* Onboarding Steps (hide once fully complete) */}
						{!isOnboardingComplete && (
							<View style={styles.onboardingWrapper}>
								<OnboardingSection
									percentage={onboardingPercentage}
									steps={onboardingSteps}
								/>
							</View>
						)}
					</>
				) : (
					<View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
						<ActivityIndicator size="small" color="#f75507" />
					</View>
				)}
			</HomeAIInterface>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'transparent',
	},
	onboardingWrapper: {
		marginTop: 16,
	},
});
