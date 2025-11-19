import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function VideoMessageScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Video/Audio Message</Text>
			<Text style={styles.subtitle}>Record or upload a short message.</Text>
			<View style={{ height: 16 }} />
			<Link href="/(buyer)/checkout" asChild>
				<Pressable style={styles.button}>
					<Text style={styles.buttonLabel}>Continue to Checkout</Text>
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
		backgroundColor: '#10B981',
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


