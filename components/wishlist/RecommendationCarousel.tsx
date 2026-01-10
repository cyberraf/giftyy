/**
 * Recommendation Carousel Component
 * "You May Also Love" horizontal carousel
 */

import { WishlistGridItem } from './WishlistGridItem';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { Product } from '@/contexts/ProductsContext';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
	products: Product[];
	onProductPress: (id: string) => void;
	onAddToCart?: (product: Product) => void;
	onAddToWishlist?: (productId: string) => void;
};

export function RecommendationCarousel({ products, onProductPress, onAddToCart, onAddToWishlist }: Props) {
	const [vendorsMap, setVendorsMap] = React.useState<Map<string, VendorInfo>>(new Map());
	
	// Fetch vendor info
	React.useEffect(() => {
		const fetchVendors = async () => {
			const vendorIds = Array.from(
				new Set(products.map(p => p.vendorId).filter(Boolean) as string[])
			);
			if (vendorIds.length > 0) {
				const vendors = await getVendorsInfo(vendorIds);
				setVendorsMap(vendors);
			}
		};
		
		if (products.length > 0) {
			fetchVendors();
		}
	}, [products]);
	
	if (products.length === 0) return null;
	
	const enrichedProducts = products.map(p => {
		const imageUrl = p.imageUrl ? (() => {
			try {
				const parsed = JSON.parse(p.imageUrl);
				return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
			} catch {
				return p.imageUrl;
			}
		})() : undefined;
		
		const vendor = p.vendorId ? vendorsMap.get(p.vendorId) : undefined;
		
		return {
			...p,
			imageUrl,
			vendorName: vendor?.storeName,
			vendorInfo: vendor,
		};
	});
	
	return (
		<Animated.View entering={FadeInUp.duration(400)} style={styles.container}>
			<View style={styles.header}>
				<IconSymbol name="sparkles" size={20} color={GIFTYY_THEME.colors.primary} />
				<Text style={styles.title}>You May Also Love</Text>
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				decelerationRate="fast"
			>
				{enrichedProducts.map((product) => (
					<View key={product.id} style={styles.cardContainer}>
						<WishlistGridItem
							product={product}
							onPress={() => onProductPress(product.id)}
							onRemove={() => {
								// For recommendations, clicking heart should add to wishlist
								if (onAddToWishlist) {
									onAddToWishlist(product.id);
								}
							}}
							onAddToCart={() => {
								if (onAddToCart) {
									onAddToCart(product);
								}
							}}
							onLongPress={() => {}}
							isRecommendation={true}
						/>
					</View>
				))}
			</ScrollView>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: GIFTYY_THEME.spacing.xl,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginLeft: 8,
	},
	scrollContent: {
		paddingRight: GIFTYY_THEME.spacing.lg,
	},
	cardContainer: {
		marginRight: 16,
	},
});

