import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function BuyerTabsLayout() {
	const { t } = useTranslation();

	return (
		<Tabs
			tabBar={() => null}
			screenOptions={{
				headerShown: false,
			}}>
			<Tabs.Screen name="index" options={{ title: t('navigation.home') }} />
			<Tabs.Screen name="shop" options={{ title: t('navigation.shop') }} />
			<Tabs.Screen name="cart" options={{ title: t('navigation.cart') }} />
			<Tabs.Screen name="memory" options={{ title: t('navigation.memories') }} />
			<Tabs.Screen name="search" options={{ href: null }} />
			<Tabs.Screen name="product/[id]" options={{ href: null }} />
		</Tabs>
	);
}
