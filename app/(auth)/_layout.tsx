import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="onboarding" />
			<Stack.Screen name="login" />
			<Stack.Screen name="signup" />
			<Stack.Screen name="verify-email" />
			<Stack.Screen name="forgot-password" />
			<Stack.Screen name="reset-password" />
			<Stack.Screen name="role-select" />
			<Stack.Screen name="auth/callback" />
		</Stack>
	);
}


