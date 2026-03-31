import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useOnboarding } from '@/contexts/OnboardingContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StepDef = {
	id: string;
	label: string;
	description: string;
	icon: keyof typeof MaterialIcons.glyphMap;
	completed: boolean;
	route: string;
};

export default function OnboardingHubScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { status, completeOnboarding, refreshStatus } = useOnboarding();

	// Refresh status every time the hub gains focus (user returns from a step)
	useFocusEffect(
		useCallback(() => {
			refreshStatus();
		}, [refreshStatus])
	);

	const steps: StepDef[] = [
		{
			id: 'phone',
			label: 'Phone Number',
			description: 'So your circle can find you',
			icon: 'phone',
			completed: !status.needsPhone,
			route: '/(onboarding)/phone',
		},
		{
			id: 'preferences',
			label: 'Your Preferences',
			description: 'Help us pick better gifts for you',
			icon: 'tune',
			completed: !status.needsPreferences,
			route: '/(onboarding)/preferences',
		},
		{
			id: 'address',
			label: 'Shipping Address',
			description: 'So gifts can find their way to you',
			icon: 'location-on',
			completed: !status.needsAddress,
			route: '/(onboarding)/address',
		},
		{
			id: 'occasion',
			label: 'Add an Occasion',
			description: 'When should people celebrate you?',
			icon: 'cake',
			completed: !status.needsOccasion,
			route: '/(onboarding)/occasion',
		},
	];

	const completedCount = steps.filter(s => s.completed).length;
	const allDone = completedCount === steps.length;
	const progress = completedCount / steps.length;

	// Find first incomplete step
	const nextStep = steps.find(s => !s.completed);

	const handleContinue = async () => {
		if (allDone) {
			await completeOnboarding();
			router.replace('/(buyer)/(tabs)');
		} else if (nextStep) {
			router.push(nextStep.route as any);
		}
	};

	const handleStepPress = (step: StepDef) => {
		router.push(step.route as any);
	};

	// Auto-complete redirect (for existing users who pass all checks)
	useEffect(() => {
		if (!status.loading && allDone) {
			completeOnboarding().then(() => {
				router.replace('/(buyer)/(tabs)');
			});
		}
	}, [status.loading, allDone]);

	if (status.loading) {
		return (
			<View style={[styles.container, styles.center, { paddingTop: top }]}>
				<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
			</View>
		);
	}

	return (
		<View style={[styles.container, { paddingTop: Math.max(top, 20) + 20, paddingBottom: Math.max(bottom, 20) }]}>
			{/* Header */}
			<View style={styles.header}>
				<Image
					source={require('@/assets/images/giftyy.png')}
					style={styles.logo}
					resizeMode="contain"
				/>
				<Text style={styles.title}>Let's set up your profile</Text>
				<Text style={styles.subtitle}>
					Complete these steps so your circle can find and gift you perfectly.
				</Text>
			</View>

			{/* Progress */}
			<View style={styles.progressContainer}>
				<View style={styles.progressBarBg}>
					<View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
				</View>
				<Text style={styles.progressText}>{completedCount} of {steps.length} completed</Text>
			</View>

			{/* Steps */}
			<View style={styles.stepsContainer}>
				{steps.map((step, i) => (
					<Pressable
						key={step.id}
						style={[styles.stepCard, step.completed && styles.stepCardDone]}
						onPress={() => handleStepPress(step)}
					>
						<View style={[styles.stepNumber, step.completed && styles.stepNumberDone]}>
							{step.completed ? (
								<MaterialIcons name="check" size={18} color="#fff" />
							) : (
								<Text style={styles.stepNumberText}>{i + 1}</Text>
							)}
						</View>
						<View style={styles.stepContent}>
							<Text style={[styles.stepLabel, step.completed && styles.stepLabelDone]}>{step.label}</Text>
							<Text style={styles.stepDescription}>{step.description}</Text>
						</View>
						<MaterialIcons
							name={step.completed ? 'check-circle' : 'chevron-right'}
							size={24}
							color={step.completed ? '#22c55e' : '#d1d5db'}
						/>
					</Pressable>
				))}
			</View>

			{/* CTA */}
			<View style={styles.ctaContainer}>
				<Pressable style={styles.ctaButton} onPress={handleContinue}>
					<Text style={styles.ctaText}>{allDone ? 'Finish' : 'Continue'}</Text>
					<MaterialIcons name={allDone ? 'check' : 'arrow-forward'} size={20} color="#fff" />
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff5f0', paddingHorizontal: 24 },
	center: { justifyContent: 'center', alignItems: 'center' },
	header: { alignItems: 'center', marginBottom: 24 },
	logo: { width: 100, height: 100, marginBottom: 16 },
	title: { fontSize: 26, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
	subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, maxWidth: 300 },
	progressContainer: { marginBottom: 24 },
	progressBarBg: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
	progressBarFill: { height: 6, backgroundColor: GIFTYY_THEME.colors.primary, borderRadius: 3 },
	progressText: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginTop: 6, textAlign: 'center' },
	stepsContainer: { gap: 12, marginBottom: 32 },
	stepCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	stepCardDone: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
	stepNumber: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	stepNumberDone: { backgroundColor: '#22c55e' },
	stepNumberText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
	stepContent: { flex: 1 },
	stepLabel: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
	stepLabelDone: { color: '#16a34a' },
	stepDescription: { fontSize: 12, color: '#9ca3af' },
	ctaContainer: { marginTop: 'auto', paddingVertical: 16 },
	ctaButton: {
		flexDirection: 'row',
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 14,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		shadowColor: GIFTYY_THEME.colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
