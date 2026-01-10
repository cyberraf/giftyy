import CustomTabBar from '@/components/CustomTabBar';
import { Tabs } from 'expo-router';
import React from 'react';

export default function BuyerTabsLayout() {
	return (
		<Tabs
			tabBar={(props) => <CustomTabBar {...props} />}
			screenOptions={{
				headerShown: false,
			}}>
			<Tabs.Screen name="home" options={{ title: 'Home' }} />
			<Tabs.Screen name="cart" options={{ title: 'Cart' }} />
			<Tabs.Screen name="memory" options={{ title: 'Memories' }} />
			<Tabs.Screen name="profile" options={{ title: 'Profile' }} />
			<Tabs.Screen name="search" options={{ href: null }} />
			<Tabs.Screen name="product/[id]" options={{ href: null }} />
		</Tabs>
	);
}


