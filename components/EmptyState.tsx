import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { title: string; description?: string };

export function EmptyState({ title, description }: Props) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			{!!description && <Text style={styles.description}>{description}</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, alignItems: 'center' },
	title: { fontWeight: '700' },
	description: { color: '#6b7280', marginTop: 4, textAlign: 'center' },
});


