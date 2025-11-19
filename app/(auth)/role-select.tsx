import { Link } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import React from 'react';

export default function RoleSelectScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Continue as</Text>
			<View style={{ height: 16 }} />
			<Link href="/(buyer)" asChild>
				<Pressable style={styles.primaryButton}>
					<Text style={styles.primaryLabel}>Buyer</Text>
				</Pressable>
			</Link>
			<View style={{ height: 12 }} />
			<Link href="/(vendor)" asChild>
				<Pressable style={styles.secondaryButton}>
					<Text style={styles.secondaryLabel}>Vendor</Text>
				</Pressable>
			</Link>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		backgroundColor: 'white',
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
	},
	primaryButton: {
		backgroundColor: '#0EA5E9',
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		alignSelf: 'stretch',
	},
	primaryLabel: {
		color: 'white',
		textAlign: 'center',
		fontSize: 16,
		fontWeight: '600',
	},
	secondaryButton: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#ddd',
		alignSelf: 'stretch',
	},
	secondaryLabel: {
		textAlign: 'center',
		fontSize: 14,
		color: '#111',
	},
});


