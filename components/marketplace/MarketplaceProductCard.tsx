/**
 * Marketplace Product Card Component
 * Premium product card with wishlist, vendor info, reviews, and animations
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 3; // 3 columns

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type MarketplaceProductCardProps = {
	id: string;
	name: string;
	price: number;
	originalPrice?: number;
	discountPercentage?: number;
	imageUrl?: string;
	vendorName?: string;
	vendorId?: string;
	rating?: number;
	reviewCount?: number;
	onPress?: () => void;
	showWishlist?: boolean;
	showAddToCart?: boolean;
};

export function MarketplaceProductCard({
	id,
	name,
	price,
	originalPrice,
	discountPercentage = 0,
	imageUrl,
	vendorName,
	vendorId,
	rating,
	reviewCount,
	onPress,
	showWishlist = true,
	showAddToCart = true,
}: MarketplaceProductCardProps) {
	const { isWishlisted, toggleWishlist } = useWishlist();
	const { addToCart } = useCart();
	const [isWishlist, setIsWishlist] = useState(isWishlisted(id));

	const scale = useSharedValue(1);
	const heartScale = useSharedValue(1);
	const wishlistOpacity = useSharedValue(isWishlist ? 1 : 0.6);

	const animatedCardStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const animatedHeartStyle = useAnimatedStyle(() => ({
		transform: [{ scale: heartScale.value }],
		opacity: wishlistOpacity.value,
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};

	const handleWishlistPress = async (e: any) => {
		e?.stopPropagation();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		
		const newWishlistState = !isWishlist;
		setIsWishlist(newWishlistState);
		
		// Animate heart
		heartScale.value = withSequence(
			withTiming(1.4, { duration: 150 }),
			withSpring(1, { damping: 10, stiffness: 300 })
		);
		wishlistOpacity.value = withTiming(newWishlistState ? 1 : 0.6, { duration: 200 });
		
		await toggleWishlist(id);
	};

	const handleAddToCart = async (e: any) => {
		e?.stopPropagation();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		
		const product = {
			id,
			name,
			price: `$${price.toFixed(2)}`,
			image: imageUrl,
			vendorId,
		};
		
		await addToCart(product);
	};

	const imageUri = imageUrl ? (() => {
		try {
			const parsed = JSON.parse(imageUrl);
			return Array.isArray(parsed) ? parsed[0] : imageUrl;
		} catch {
			return imageUrl;
		}
	})() : undefined;

	const finalPrice = discountPercentage > 0 
		? price * (1 - discountPercentage / 100)
		: price;

	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.card, animatedCardStyle]}
		>
			{/* Product Image */}
			<View style={styles.imageContainer}>
				{imageUri ? (
					<Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
				) : (
					<View style={styles.imagePlaceholder}>
						<IconSymbol name="photo" size={24} color={GIFTYY_THEME.colors.gray300} />
					</View>
				)}
				
				{/* Discount Badge */}
				{discountPercentage > 0 && (
					<View style={styles.discountBadge}>
						<Text style={styles.discountText}>-{discountPercentage}%</Text>
					</View>
				)}

				{/* Wishlist Button */}
				{showWishlist && (
					<Pressable
						onPress={handleWishlistPress}
						style={styles.wishlistButton}
						hitSlop={8}
					>
						<Animated.View style={animatedHeartStyle}>
							<IconSymbol
								name={isWishlist ? "heart.fill" : "heart"}
								size={18}
								color={isWishlist ? GIFTYY_THEME.colors.error : "#FFFFFF"}
							/>
						</Animated.View>
					</Pressable>
				)}

				{/* Quick Add to Cart */}
				{showAddToCart && (
					<Pressable
						onPress={handleAddToCart}
						style={styles.addToCartButton}
						hitSlop={8}
					>
						<IconSymbol name="plus" size={14} color="#FFFFFF" />
					</Pressable>
				)}
			</View>

			{/* Product Info */}
			<View style={styles.info}>
				{/* Vendor Name */}
				{vendorName && (
					<Text style={styles.vendorName} numberOfLines={1}>
						{vendorName}
					</Text>
				)}

				{/* Product Name */}
				<Text style={styles.productName} numberOfLines={2}>
					{name}
				</Text>

				{/* Rating & Reviews */}
				{rating !== undefined && rating > 0 && (
					<View style={styles.ratingRow}>
						<IconSymbol name="star.fill" size={11} color="#fbbf24" />
						<Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
						{reviewCount !== undefined && reviewCount > 0 && (
							<Text style={styles.reviewCount}>({reviewCount})</Text>
						)}
					</View>
				)}

				{/* Price */}
				<View style={styles.priceRow}>
					<Text style={styles.price}>${finalPrice.toFixed(2)}</Text>
					{originalPrice && originalPrice > finalPrice && (
						<Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
					)}
				</View>
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	card: {
		width: CARD_WIDTH,
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.borderLight,
		...GIFTYY_THEME.shadows.sm,
	},
	imageContainer: {
		width: '100%',
		aspectRatio: 1,
		position: 'relative',
		backgroundColor: GIFTYY_THEME.colors.gray100,
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
		backgroundColor: GIFTYY_THEME.colors.error,
		paddingVertical: 3,
		paddingHorizontal: 6,
		borderRadius: 4,
	},
	discountText: {
		color: '#FFFFFF',
		fontSize: 9,
		fontWeight: '800',
	},
	wishlistButton: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
		alignItems: 'center',
		justifyContent: 'center',
		backdropFilter: 'blur(10px)',
	},
	addToCartButton: {
		position: 'absolute',
		bottom: 6,
		right: 6,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	info: {
		padding: 8,
		gap: 4,
	},
	vendorName: {
		fontSize: 9,
		color: GIFTYY_THEME.colors.textSecondary,
		fontWeight: '500',
	},
	productName: {
		fontSize: 11,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.text,
		lineHeight: 14,
		minHeight: 28,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: 2,
	},
	ratingText: {
		fontSize: 10,
		fontWeight: '600',
		color: GIFTYY_THEME.colors.text,
	},
	reviewCount: {
		fontSize: 9,
		color: GIFTYY_THEME.colors.textSecondary,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	price: {
		fontSize: 13,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.success,
	},
	originalPrice: {
		fontSize: 10,
		color: GIFTYY_THEME.colors.textTertiary,
		textDecorationLine: 'line-through',
		fontWeight: '500',
	},
});

