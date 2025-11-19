import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { title: string; subtitle?: string };

export function Header({ title, subtitle }: Props) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			{!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { paddingVertical: 8 },
	title: { fontSize: 22, fontWeight: '800' },
	subtitle: { marginTop: 4, color: '#6b7280' },
});


