import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type Props = {
	name: string;
	status?: string;
	onPress?: () => void;
};

export function ProductCard({ name, status, onPress }: Props) {
	return (
		<Pressable onPress={onPress} style={styles.card}>
			<View style={styles.avatar} />
			<View style={{ flex: 1 }}>
				<Text style={styles.name}>{name}</Text>
				{!!status && <Text style={styles.status}>{status}</Text>}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#eee' },
	avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f3f4f6' },
	name: { fontWeight: '600' },
	status: { color: '#6b7280', marginTop: 2 },
});


