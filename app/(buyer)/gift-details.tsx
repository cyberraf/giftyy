import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function GiftDetailsScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Gift Details</Text>
			<Text style={styles.subtitle}>Product info, price, and seller info.</Text>
			<View style={{ height: 16 }} />
			<Link href="/(buyer)/video-message" asChild>
				<Pressable style={styles.button}>
					<Text style={styles.buttonLabel}>Add Video/Audio Message</Text>
				</Pressable>
			</Link>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: 'white',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
	},
	subtitle: {
		marginTop: 6,
		color: '#666',
	},
	button: {
		marginTop: 8,
		backgroundColor: '#F59E0B',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 10,
		alignSelf: 'flex-start',
	},
	buttonLabel: {
		color: 'white',
		fontWeight: '600',
	},
});


