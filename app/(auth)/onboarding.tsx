import { Link } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import React from 'react';

export default function OnboardingScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Giftyy – Turning Gifts into Memories</Text>
			<Text style={styles.subtitle}>
				Connects physical gifts with emotional, digital memories.
			</Text>
			<View style={{ height: 24 }} />
			<Link href="/(auth)/role-select" asChild>
				<Pressable style={styles.primaryButton}>
					<Text style={styles.primaryLabel}>Get Started</Text>
				</Pressable>
			</Link>
			<View style={{ height: 12 }} />
			<Link href="/(auth)/login" asChild>
				<Pressable style={styles.secondaryButton}>
					<Text style={styles.secondaryLabel}>I already have an account</Text>
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
		fontSize: 24,
		fontWeight: '700',
		textAlign: 'center',
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		color: '#555',
		textAlign: 'center',
	},
	primaryButton: {
		backgroundColor: '#EC4899',
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


