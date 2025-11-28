import React from 'react';
import { Stack } from 'expo-router';
import { BottomBarVisibilityProvider } from '@/contexts/BottomBarVisibility';
import { StandaloneBottomBar } from '@/components/StandaloneBottomBar';
import { View } from 'react-native';

export default function BuyerRootLayout() {
	return (
		<BottomBarVisibilityProvider>
			<View style={{ flex: 1, backgroundColor: '#fff' }}>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="(tabs)" />
				</Stack>
				<StandaloneBottomBar />
			</View>
		</BottomBarVisibilityProvider>
	);
}


