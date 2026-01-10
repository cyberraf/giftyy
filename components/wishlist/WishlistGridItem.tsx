/**
 * Wishlist Grid Item Component
 * Two-column card with heart removal, swipe actions, and animations
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { Product } from '@/contexts/ProductsContext';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { VendorInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2; // 2 columns

type Props = {
	product: Product & { 
		imageUrl?: string; 
		vendorName?: string;
		vendorInfo?: VendorInfo;
		addedAt?: string;
	};
	onPress: () => void;
	onRemove: () => void;
	onAddToCart: () => void;
	onLongPress: () => void;
	isRecommendation?: boolean; // If true, heart button adds to wishlist instead of removing
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WishlistGridItem({ 
	product, 
	onPress, 
	onRemove, 
	onAddToCart,
	onLongPress,
	isRecommendation = false
}: Props) {
	const [imageError, setImageError] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);
	
	const scale = useSharedValue(1);
	const heartScale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const opacity = useSharedValue(1);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: scale.value },
			{ translateX: translateX.value },
		],
		opacity: opacity.value,
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
	
	const handleRemove = () => {
		setIsRemoving(true);
		// Heart burst animation
		heartScale.value = withSequence(
			withSpring(1.5, { damping: 8 }),
			withSpring(0, { damping: 10 })
		);
		
		// Fade out and slide animation
		opacity.value = withTiming(0, { duration: 300 });
		translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 });
		
		setTimeout(() => {
			onRemove();
		}, 300);
	};
	
	const handleHeartPress = (e: any) => {
		e.stopPropagation();
		if (isRecommendation) {
			// For recommendations, just call onRemove which maps to add to wishlist
			onRemove();
			// Quick animation feedback
			heartScale.value = withSequence(
				withSpring(1.4, { damping: 10 }),
				withSpring(1, { damping: 10 })
			);
		} else {
			handleRemove();
		}
	};
	
	// Swipe gesture for removal
	const panGesture = Gesture.Pan()
		.onUpdate((e) => {
			if (e.translationX < 0) {
				translateX.value = e.translationX;
				opacity.value = 1 - Math.abs(e.translationX) / 200;
			}
		})
		.onEnd((e) => {
			if (e.translationX < -100) {
				// Swipe left enough to remove
				handleRemove();
			} else {
				// Spring back
				translateX.value = withSpring(0);
				opacity.value = withSpring(1);
			}
		});
	
	const discount = product.discountPercentage || 0;
	const originalPrice = product.price || 0;
	const discountedPrice = originalPrice * (1 - discount / 100);
	
	if (isRemoving) {
		return null;
	}
	
	return (
		<GestureDetector gesture={panGesture}>
			<AnimatedPressable
				onPress={onPress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onLongPress={onLongPress}
				style={[styles.container, animatedStyle, { width: CARD_WIDTH }]}
				exiting={FadeOut.duration(300)}
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
					
					{/* Heart Button */}
					<Pressable 
						style={styles.heartButton}
						onPress={handleHeartPress}
					>
						<Animated.View style={heartAnimatedStyle}>
							<IconSymbol 
								name={isRecommendation ? "heart" : "heart.fill"} 
								size={20} 
								color={isRecommendation ? GIFTYY_THEME.colors.gray700 : GIFTYY_THEME.colors.error} 
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
					
					{/* Add to Cart Mini Button */}
					<Pressable 
						style={styles.addToCartButton}
						onPress={(e) => {
							e.stopPropagation();
							onAddToCart();
						}}
					>
						<IconSymbol name="cart.fill" size={14} color="#fff" />
						<Text style={styles.addToCartText}>Add</Text>
					</Pressable>
				</View>
				
				{/* Swipe indicator hint */}
				<View style={styles.swipeHint}>
					<IconSymbol name="chevron.left" size={12} color={GIFTYY_THEME.colors.gray400} />
					<Text style={styles.swipeHintText}>Swipe to remove</Text>
				</View>
			</AnimatedPressable>
		</GestureDetector>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
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
		fontSize: 11,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	heartButton: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.sm,
	},
	infoContainer: {
		padding: 12,
	},
	vendorName: {
		fontSize: 10,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		marginBottom: 4,
	},
	productName: {
		fontSize: 13,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		lineHeight: 16,
		minHeight: 32,
		marginBottom: 8,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	price: {
		fontSize: 16,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.success,
		marginRight: 6,
	},
	originalPrice: {
		fontSize: 12,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	addToCartButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: GIFTYY_THEME.radius.md,
	},
	addToCartText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		marginLeft: 4,
	},
	swipeHint: {
		position: 'absolute',
		right: -80,
		top: '50%',
		flexDirection: 'row',
		alignItems: 'center',
		opacity: 0.3,
	},
	swipeHintText: {
		fontSize: 10,
		color: GIFTYY_THEME.colors.gray400,
		marginLeft: 4,
	},
});

