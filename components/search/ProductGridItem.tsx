/**
 * Product Grid Item Component
 * Marketplace-style product card for search results
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useWishlist } from '@/contexts/WishlistContext';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

type ProductGridItemProps = {
	product: any;
	imageUrl?: string;
	vendorName?: string;
	onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProductGridItem({
	product,
	imageUrl,
	vendorName,
	onPress,
}: ProductGridItemProps) {
	const { isWishlisted, toggleWishlist } = useWishlist();
	const isInWishlist = isWishlisted(product.id);
	
	const [imageError, setImageError] = useState(false);
	
	const scale = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.96, { damping: 15 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15 });
	};

	const handleWishlistPress = (e: any) => {
		e.stopPropagation();
		toggleWishlist(product.id);
	};

	// Safely calculate price with fallbacks
	const productPrice = typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0;
	const discountPercentage = typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : 0;
	const originalPrice = typeof product.originalPrice === 'number' && !isNaN(product.originalPrice) ? product.originalPrice : undefined;
	
	// If originalPrice is provided, it means the price is already the discounted price
	// Otherwise, apply discountPercentage if available
	const discountedPrice = originalPrice !== undefined && originalPrice > productPrice
		? productPrice
		: (discountPercentage > 0 && productPrice > 0
			? productPrice * (1 - discountPercentage / 100)
			: productPrice);
	
	// Use originalPrice if available, otherwise use productPrice for the original price display
	const displayOriginalPrice = originalPrice !== undefined && originalPrice > discountedPrice
		? originalPrice
		: (discountPercentage > 0 && productPrice > 0 ? productPrice : undefined);

	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle]}
		>
			{/* Image Container */}
			<View style={styles.imageContainer}>
				{imageUrl && !imageError ? (
					<Image
						source={{ uri: imageUrl }}
						style={styles.image}
						resizeMode="cover"
						onError={() => setImageError(true)}
					/>
				) : (
					<View style={styles.imagePlaceholder}>
						<IconSymbol name="photo" size={32} color={GIFTYY_THEME.colors.gray300} />
					</View>
				)}

				{/* Discount Badge */}
				{discountPercentage > 0 && (
					<View style={styles.discountBadge}>
						<Text style={styles.discountText}>-{Math.round(discountPercentage)}%</Text>
					</View>
				)}

				{/* Wishlist Button */}
				<Pressable 
					style={styles.wishlistButton}
					onPress={handleWishlistPress}
				>
					<IconSymbol 
						name={isInWishlist ? "heart.fill" : "heart"} 
						size={18} 
						color={isInWishlist ? GIFTYY_THEME.colors.error : GIFTYY_THEME.colors.gray400} 
					/>
				</Pressable>
			</View>

			{/* Product Info */}
			<View style={styles.infoContainer}>
				{vendorName && (
					<Text style={styles.vendorName} numberOfLines={1}>
						{vendorName}
					</Text>
				)}
				<Text style={styles.productName} numberOfLines={2}>
					{product.name || 'Product'}
				</Text>
				
				{/* Rating (placeholder) */}
				{/* {product.rating && (
					<View style={styles.ratingContainer}>
						<IconSymbol name="star.fill" size={10} color="#fbbf24" />
						<Text style={styles.ratingText}>
							{product.rating.toFixed(1)} ({product.reviewCount || 0})
						</Text>
					</View>
				)} */}

				{/* Price */}
				<View style={styles.priceContainer}>
					<Text style={styles.price}>
						${typeof discountedPrice === 'number' && !isNaN(discountedPrice) ? discountedPrice.toFixed(2) : '0.00'}
					</Text>
					{displayOriginalPrice !== undefined && displayOriginalPrice > discountedPrice && (
						<Text style={styles.originalPrice}>
							${typeof displayOriginalPrice === 'number' && !isNaN(displayOriginalPrice) ? displayOriginalPrice.toFixed(2) : '0.00'}
						</Text>
					)}
				</View>
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
	},
	imageContainer: {
		width: '100%',
		aspectRatio: 1,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		position: 'relative',
	},
	image: {
		width: '100%',
		height: '100%',
	},
	imagePlaceholder: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	discountBadge: {
		position: 'absolute',
		top: 8,
		left: 8,
		backgroundColor: GIFTYY_THEME.colors.error,
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 6,
	},
	discountText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	wishlistButton: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.sm,
	},
	infoContainer: {
		padding: GIFTYY_THEME.spacing.md,
	},
	vendorName: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		marginBottom: 4,
	},
	productName: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 6,
		minHeight: 32,
	},
	ratingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
		gap: 4,
	},
	ratingText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 'auto',
	},
	price: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.success,
	},
	originalPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
	},
});

