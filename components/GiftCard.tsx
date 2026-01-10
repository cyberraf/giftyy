import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
	card: { borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', position: 'relative' },
	image: { width: '100%', aspectRatio: 1, backgroundColor: '#f3f4f6' },
	imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
	discountBadge: {
		position: 'absolute',
		top: 6,
		left: 6,
		backgroundColor: '#ef4444',
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 4,
		zIndex: 1,
	},
	discountText: {
		color: 'white',
		fontSize: 9,
		fontWeight: '800',
	},
	info: { padding: 8 },
	name: { fontWeight: '700', color: '#111', fontSize: 11, lineHeight: 14, minHeight: 28 },
	priceContainer: {
		marginTop: 4,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	price: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
	originalPrice: {
		color: '#9ca3af',
		fontSize: 10,
		textDecorationLine: 'line-through',
		fontWeight: '500',
	},
});


