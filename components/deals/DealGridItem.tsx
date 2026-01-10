/**
 * Deal Grid Item Component
 * Two-column product card with discount badge, wishlist, and animations
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useWishlist } from '@/contexts/WishlistContext';
import type { Product } from '@/contexts/ProductsContext';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 3-column grid width: screen minus horizontal padding (lg*2) minus two gaps (md*2)
const CARD_WIDTH =
	(SCREEN_WIDTH - GIFTYY_THEME.spacing.lg * 2 - GIFTYY_THEME.spacing.md * 2) / 3;

type Props = {
	product: Product & { imageUrl?: string; vendorName?: string };
	onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DealGridItem({ product, onPress }: Props) {
	const { isWishlisted: isInWishlist, toggleWishlist } = useWishlist();
	const isWishlisted = isInWishlist(product.id);
	
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
			withSpring(1.4, { damping: 10 }),
			withSpring(1, { damping: 10 })
		);
		
		toggleWishlist(product.id);
	};
	
	const discount = product.discountPercentage || 0;
	const originalPrice = product.price || 0;
	const discountedPrice = originalPrice * (1 - discount / 100);
	
	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle, { width: CARD_WIDTH }]}
		>
			{/* Product Image */}
			<View style={styles.imageContainer}>
				{product.imageUrl && !imageError ? (
					<Image
						source={{ uri: product.imageUrl }}
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
				{discount > 0 && (
					<View style={styles.discountBadge}>
						<Text style={styles.discountText}>-{Math.round(discount)}%</Text>
					</View>
				)}
				
				{/* Wishlist Button */}
				<Pressable 
					style={styles.wishlistButton}
					onPress={handleWishlistPress}
				>
					<Animated.View style={heartAnimatedStyle}>
						<IconSymbol 
							name={isWishlisted ? "heart.fill" : "heart"} 
							size={20} 
							color={isWishlisted ? GIFTYY_THEME.colors.error : '#fff'} 
						/>
					</Animated.View>
				</Pressable>
			</View>
			
			{/* Product Info */}
			<View style={styles.infoContainer}>
				{/* Vendor Name */}
				{product.vendorName && (
					<Text style={styles.vendorName} numberOfLines={1}>
						{product.vendorName}
					</Text>
				)}
				
				{/* Product Name */}
				<Text style={styles.productName} numberOfLines={2}>
					{product.name || 'Product'}
				</Text>
				
				{/* Price */}
				<View style={styles.priceContainer}>
					<Text style={styles.price}>${discountedPrice.toFixed(2)}</Text>
					{discount > 0 && (
						<Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
					)}
				</View>
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.md,
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
		top: 8,
		left: 8,
		backgroundColor: GIFTYY_THEME.colors.error,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: GIFTYY_THEME.radius.sm,
	},
	discountText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	wishlistButton: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		alignItems: 'center',
		justifyContent: 'center',
		backdropFilter: 'blur(10px)',
	},
	infoContainer: {
		padding: 12,
	},
	vendorName: {
		fontSize: 9,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		marginBottom: 3,
	},
	productName: {
		fontSize: 11,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		lineHeight: 14,
		marginBottom: 4,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	price: {
		fontSize: 14,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.success,
		marginRight: 5,
	},
	originalPrice: {
		fontSize: 10,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
});

