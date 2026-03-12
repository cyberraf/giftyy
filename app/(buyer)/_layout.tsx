import GlobalHeader from '@/components/GlobalHeader';
import { useAuth } from '@/contexts/AuthContext';
import { BottomBarVisibilityProvider } from '@/contexts/BottomBarVisibility';
import { TourProvider } from '@/contexts/TourContext';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function BuyerRootLayout() {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff5f0' }}>
				<ActivityIndicator size="large" color="#f75507" />
			</View>
		);
	}

	if (!user) {
		return <Redirect href="/(auth)/login" />;
	}

	return (
		<TourProvider>
			<BottomBarVisibilityProvider>
				<View style={{ flex: 1, backgroundColor: '#fff5f0' }}>
					<GlobalHeader />
					<Stack screenOptions={{ headerShown: false }}>
						<Stack.Screen name="(tabs)" />
						<Stack.Screen name="notifications" />
						<Stack.Screen name="deals" />
						<Stack.Screen name="wishlist/index" />
						<Stack.Screen name="bundles" />
						<Stack.Screen name="bundle/[id]" />
						<Stack.Screen name="vendors" />
						<Stack.Screen name="vendor/[id]" />
						<Stack.Screen name="orders/index" />
						<Stack.Screen name="orders/[id]" />
						<Stack.Screen name="checkout" />
						<Stack.Screen name="checkout/cart" />
						<Stack.Screen name="checkout/design" />
						<Stack.Screen name="checkout/recipient" />
						<Stack.Screen name="checkout/video" />
						<Stack.Screen name="checkout/shared-memory" />
						<Stack.Screen name="checkout/payment" />
						<Stack.Screen name="checkout/confirmation" />
					</Stack>
				</View>
			</BottomBarVisibilityProvider>
		</TourProvider>
	);
}
