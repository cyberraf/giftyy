import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { getReadableTextColor, withAlpha } from '@/lib/color-utils';
import type { SimpleProduct } from '@/lib/gift-data';

type GiftCollectionCardProps = {
	title: string;
	description?: string;
	color: string;
	products: SimpleProduct[];
	style?: StyleProp<ViewStyle>;
	onPress?: () => void;
};

export function GiftCollectionCard({ title, description, color, products, style, onPress }: GiftCollectionCardProps) {
	const router = useRouter();
	const textColor = getReadableTextColor(color);
	const patternColor = withAlpha(color, 0.2) ?? 'rgba(255, 255, 255, 0.18)';

	const handleProductPress = (item: SimpleProduct) => {
		router.push({
			pathname: '/(buyer)/(tabs)/product/[id]',
			params: { id: item.id, name: item.name, price: item.price, image: item.image },
		});
	};

	return (
		<Pressable style={[styles.card, { backgroundColor: color }, style]} onPress={onPress}>
			<View style={[styles.pattern, { backgroundColor: patternColor }]} />
			<View style={styles.header}>
				<Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
					{title}
				</Text>
				{description ? (
					<Text style={[styles.subtitle, { color: textColor }]} numberOfLines={2}>
						{description}
					</Text>
				) : null}
			</View>
			<View style={styles.productsGrid}>
				{products.map((item, index) => (
					<Pressable
						key={`${item.id}-${index}`}
						style={styles.productItem}
						onPress={(e) => {
							e.stopPropagation();
							handleProductPress(item);
						}}
					>
						<Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
					</Pressable>
				))}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		width: 320,
		height: 360,
		borderRadius: 16,
		overflow: 'hidden',
		position: 'relative',
		padding: 16,
		justifyContent: 'space-between',
	},
	pattern: {
		position: 'absolute',
		top: 0,
		right: 0,
		width: '60%',
		height: '60%',
		borderRadius: 16,
		transform: [{ rotate: '15deg' }],
	},
	header: {
		zIndex: 1,
	},
	title: {
		fontSize: 20,
		fontWeight: '800',
		textShadowColor: 'rgba(0,0,0,0.3)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	subtitle: {
		fontSize: 13,
		fontWeight: '500',
		opacity: 0.9,
		marginTop: 4,
	},
	productsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 12,
	},
	productItem: {
		width: '47%',
		aspectRatio: 1,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: 'rgba(255, 255, 255, 0.95)',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	productImage: {
		width: '100%',
		height: '100%',
	},
});

export default GiftCollectionCard;

