import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
	return (
		<OnboardingProvider>
			<Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="phone" />
				<Stack.Screen name="preferences" />
				<Stack.Screen name="address" />
				<Stack.Screen name="occasion" />
			</Stack>
		</OnboardingProvider>
	);
}
