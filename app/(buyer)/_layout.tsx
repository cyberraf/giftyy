import GlobalBottomBar from '@/components/GlobalBottomBar';
import { BottomBarVisibilityProvider } from '@/contexts/BottomBarVisibility';
import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function BuyerRootLayout() {
	return (
		<BottomBarVisibilityProvider>
			<View style={{ flex: 1, backgroundColor: '#fff' }}>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="(tabs)" />
					<Stack.Screen name="notifications" />
				<Stack.Screen name="deals" />
					<Stack.Screen name="wishlist" />
					<Stack.Screen name="bundles" />
					<Stack.Screen name="bundle/[id]" />
				<Stack.Screen name="vendors" />
				<Stack.Screen name="vendor/[id]" />
				<Stack.Screen name="recipients" />
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
				<GlobalBottomBar />
			</View>
		</BottomBarVisibilityProvider>
	);
}


