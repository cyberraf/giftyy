import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';

type Props = {
	name: string;
	price: string;
	image?: string;
	onPress?: () => void;
	originalPrice?: string;
	discount?: number;
};

export function GiftCard({ name, price, image, onPress, originalPrice, discount }: Props) {
	return (
		<Pressable onPress={onPress} style={styles.card}>
			{image ? (
				<Image source={{ uri: image }} style={styles.image} />
			) : (
				<View style={[styles.image, styles.imagePlaceholder]} />
			)}
			{discount && discount > 0 && (
				<View style={styles.discountBadge}>
					<Text style={styles.discountText}>{discount}% off</Text>
				</View>
			)}
			<View style={styles.info}>
				<Text style={styles.name}>{name}</Text>
				<View style={styles.priceContainer}>
					<Text style={styles.price}>{price}</Text>
					{originalPrice && (
						<Text style={styles.originalPrice}>{originalPrice}</Text>
					)}
				</View>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: { borderRadius: 14, overflow: 'hidden', backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', position: 'relative' },
	image: { width: '100%', height: 160, backgroundColor: '#f3f4f6' },
	imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
	discountBadge: {
		position: 'absolute',
		top: 8,
		left: 8,
		backgroundColor: '#ef4444',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		zIndex: 1,
	},
	discountText: {
		color: 'white',
		fontSize: 11,
		fontWeight: '800',
	},
	info: { padding: 12 },
	name: { fontWeight: '700', color: '#111' },
	priceContainer: {
		marginTop: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	price: { color: '#16a34a', fontWeight: '700' },
	originalPrice: {
		color: '#9ca3af',
		fontSize: 12,
		textDecorationLine: 'line-through',
		fontWeight: '500',
	},
});


