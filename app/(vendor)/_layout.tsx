import { Stack } from 'expo-router';
import React from 'react';

export default function VendorLayout() {
	return (
		<Stack>
			<Stack.Screen name="dashboard" options={{ title: 'Vendor Dashboard' }} />
			<Stack.Screen name="product-management" options={{ title: 'Products' }} />
			<Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
		</Stack>
	);
}


