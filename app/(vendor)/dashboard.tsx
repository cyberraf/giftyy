import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function VendorDashboardScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Vendor Dashboard</Text>
			<Text style={styles.subtitle}>Manage products and view orders.</Text>
			<View style={{ height: 16 }} />
			<Link href="/(vendor)/product-management" asChild>
				<Pressable style={styles.button}><Text style={styles.buttonLabel}>Manage Products</Text></Pressable>
			</Link>
			<View style={{ height: 8 }} />
			<Link href="/(vendor)/analytics" asChild>
				<Pressable style={styles.buttonSecondary}><Text style={styles.buttonSecondaryLabel}>View Analytics</Text></Pressable>
			</Link>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: 'white' },
	title: { fontSize: 20, fontWeight: '700' },
	subtitle: { marginTop: 6, color: '#666' },
	button: { backgroundColor: '#0EA5E9', paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start', paddingHorizontal: 16 },
	buttonLabel: { color: 'white', fontWeight: '600' },
	buttonSecondary: { borderWidth: 1, borderColor: '#ddd', paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start', paddingHorizontal: 16 },
	buttonSecondaryLabel: { color: '#111', fontWeight: '600' },
});


