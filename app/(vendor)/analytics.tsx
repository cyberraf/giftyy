import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AnalyticsScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Analytics</Text>
			<Text style={styles.subtitle}>Sales and engagement metrics.</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: 'white' },
	title: { fontSize: 20, fontWeight: '700' },
	subtitle: { marginTop: 6, color: '#666' },
});


