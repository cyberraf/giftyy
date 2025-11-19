import { Tabs } from 'expo-router';
import React from 'react';
import CustomTabBar from '@/components/CustomTabBar';
import FloatingAI from '@/components/FloatingAI';
import { AISectionProvider } from '@/contexts/AISectionContext';

export default function BuyerTabsLayout() {
	return (
		<AISectionProvider>
			<Tabs
				tabBar={(props) => <CustomTabBar {...props} />}
				screenOptions={{
					headerShown: false,
				}}>
				<Tabs.Screen name="home" options={{ title: 'Home' }} />
				<Tabs.Screen name="cart" options={{ title: 'Cart' }} />
				<Tabs.Screen name="memory" options={{ title: 'Memories' }} />
				<Tabs.Screen name="store-profile" options={{ title: 'Store' }} />
				<Tabs.Screen name="profile" options={{ title: 'Profile' }} />
				<Tabs.Screen name="product/[id]" options={{ href: null }} />
			</Tabs>
			<FloatingAI />
		</AISectionProvider>
	);
}


