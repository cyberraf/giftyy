import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CelebrationWallScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Celebration Wall</Text>
			<Text style={styles.subtitle}>Your saved memories will appear here.</Text>
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
});


