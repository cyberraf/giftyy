import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';

type Props = {
	name: string;
	price: string;
	image?: string;
	onPress?: () => void;
};

export function GiftCard({ name, price, image, onPress }: Props) {
	return (
		<Pressable onPress={onPress} style={styles.card}>
			{image ? (
				<Image source={{ uri: image }} style={styles.image} />
			) : (
				<View style={[styles.image, styles.imagePlaceholder]} />
			)}
			<View style={styles.info}>
				<Text style={styles.name}>{name}</Text>
				<Text style={styles.price}>{price}</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: { borderRadius: 14, overflow: 'hidden', backgroundColor: 'white', borderWidth: 1, borderColor: '#eee' },
	image: { width: '100%', height: 160, backgroundColor: '#f3f4f6' },
	imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
	info: { padding: 12 },
	name: { fontWeight: '700', color: '#111' },
	price: { marginTop: 6, color: '#16a34a', fontWeight: '700' },
});


