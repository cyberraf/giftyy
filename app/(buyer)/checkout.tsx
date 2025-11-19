import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CheckoutScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Checkout</Text>
			<Text style={styles.subtitle}>Payment + QR Memory Card generation</Text>
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


