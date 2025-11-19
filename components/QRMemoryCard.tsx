import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { code?: string };

export function QRMemoryCard({ code = 'GIF-XXXX-XXXX' }: Props) {
	return (
		<View style={styles.card}>
			<View style={styles.qrBox} />
			<Text style={styles.title}>QR Memory Card</Text>
			<Text style={styles.code}>{code}</Text>
			<Text style={styles.caption}>Attach to the gift package</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: { borderWidth: 1, borderColor: '#eee', borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: 'white' },
	qrBox: { width: 120, height: 120, backgroundColor: '#111827', borderRadius: 8 },
	title: { marginTop: 12, fontWeight: '700' },
	code: { marginTop: 4, fontVariant: ['tabular-nums'], color: '#6b7280' },
	caption: { marginTop: 6, color: '#9ca3af', fontSize: 12 },
});


