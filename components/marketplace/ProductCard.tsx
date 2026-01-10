/**
 * Premium Marketplace Product Card Component
 * Modern design with animations, wishlist interaction, and vendor info
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useWishlist } from '@/contexts/WishlistContext';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (SCREEN_WIDTH - 52) / 3; // 3 columns default

type ProductCardProps = {
	id: string;
	name: string;
	price: number;
	originalPrice?: number;
	discountPercentage?: number;
	image?: string;
	vendorName?: string;
	vendorId?: string;
	rating?: number;
	reviewCount?: number;
	onPress: () => void;
	size?: 'small' | 'medium';
	width?: number; // Allow custom width for different grid layouts
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MarketplaceProductCard({
	id,
	name,
	price,
	originalPrice,
	discountPercentage,
	image,
	vendorName,
	vendorId,
	rating = 4.5,
	reviewCount = 0,
	onPress,
	size = 'small',
	width,
}: ProductCardProps) {
	const cardWidth = width ?? DEFAULT_CARD_WIDTH;
	const { isWishlisted: isInWishlist, toggleWishlist } = useWishlist();
	const isWishlisted = isInWishlist(id);
	
	const [imageError, setImageError] = useState(false);
	const scale = useSharedValue(1);
	const heartScale = useSharedValue(1);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const heartAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: heartScale.value }],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};
	
	const handleWishlistPress = (e: any) => {
		e.stopPropagation();
		heartScale.value = withSequence(
			withSpring(1.3, { damping: 10 }),
			withSpring(1, { damping: 10 })
		);
		
		toggleWishlist(id);
	};
	
	// If originalPrice is provided, it means the price is already the discounted price
	// Otherwise, apply discountPercentage if available
	const discountedPrice = originalPrice !== undefined && originalPrice > price
		? (typeof price === 'number' && !isNaN(price) ? price : 0)
		: (typeof discountPercentage === 'number' && !isNaN(discountPercentage) && discountPercentage > 0)
			? (typeof price === 'number' && !isNaN(price) ? price * (1 - discountPercentage / 100) : 0)
			: (typeof price === 'number' && !isNaN(price) ? price : 0);
	
	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle, { width: cardWidth }]}
		>
			{/* Product Image */}
			<View style={styles.imageContainer}>
				{image && !imageError ? (
					<Image
						source={{ uri: image }}
						style={styles.image}
						resizeMode="cover"
						onError={() => setImageError(true)}
					/>
				) : (
					<View style={styles.imagePlaceholder}>
						<IconSymbol name="photo" size={24} color={GIFTYY_THEME.colors.gray300} />
					</View>
				)}
				
				{/* Discount Badge */}
				{typeof discountPercentage === 'number' && discountPercentage > 0 ? (
					<View style={styles.discountBadge}>
						<Text style={styles.discountText}>-{String(Math.round(discountPercentage))}%</Text>
					</View>
				) : null}
				
				{/* Wishlist Button */}
				<Pressable 
					style={styles.wishlistButton}
					onPress={handleWishlistPress}
				>
					<Animated.View style={heartAnimatedStyle}>
						<IconSymbol 
							name={isWishlisted ? "heart.fill" : "heart"} 
							size={18} 
							color={isWishlisted ? GIFTYY_THEME.colors.error : GIFTYY_THEME.colors.gray400} 
						/>
					</Animated.View>
				</Pressable>
			</View>
			
			{/* Product Info */}
			<View style={styles.infoContainer}>
				{/* Vendor Name (if available) */}
				{vendorName && typeof vendorName === 'string' && vendorName.trim() ? (
					<Text style={styles.vendorName} numberOfLines={1}>
						{String(vendorName)}
					</Text>
				) : null}
				
				{/* Product Name */}
				<Text style={styles.productName} numberOfLines={2}>
					{String(name || '')}
				</Text>
				
				{/* Rating (if available) */}
				{typeof reviewCount === 'number' && reviewCount > 0 ? (
					<View style={styles.ratingContainer}>
						<IconSymbol name="star.fill" size={10} color="#fbbf24" />
						<Text style={styles.ratingText}>{typeof rating === 'number' && !isNaN(rating) ? String(rating.toFixed(1)) : '0.0'}</Text>
						<Text style={styles.reviewCount}> ({String(reviewCount)})</Text>
					</View>
				) : null}
				
				{/* Price */}
				<View style={styles.priceContainer}>
					<Text style={styles.price}>${typeof discountedPrice === 'number' && !isNaN(discountedPrice) ? discountedPrice.toFixed(2) : '0.00'}</Text>
					{originalPrice && typeof originalPrice === 'number' && !isNaN(originalPrice) && originalPrice > discountedPrice ? (
						<Text style={[styles.originalPrice, { marginLeft: 4 }]}>${originalPrice.toFixed(2)}</Text>
					) : null}
				</View>
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.md,
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
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	discountBadge: {
		position: 'absolute',
		top: 6,
		left: 6,
		backgroundColor: GIFTYY_THEME.colors.discount,
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 4,
	},
	discountText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 9,
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
		padding: 8,
	},
	vendorName: {
		fontSize: 9,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		marginBottom: 4,
	},
	productName: {
		fontSize: 11,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		lineHeight: 14,
		minHeight: 28,
		marginBottom: 4,
	},
	ratingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	ratingText: {
		fontSize: 9,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		marginLeft: 3,
	},
	reviewCount: {
		fontSize: 9,
		color: GIFTYY_THEME.colors.gray500,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	price: {
		fontSize: 13,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.success,
	},
	originalPrice: {
		fontSize: 10,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
});

