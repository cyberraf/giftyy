/**
 * Sticky Bottom Bar Component
 * Always visible bottom bar with price, Add to Cart, and Buy Now buttons
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type StickyBottomBarProps = {
	price: string;
	originalPrice?: string;
	onAddToCart: () => void;
	onBuyNow: () => void;
	disabled?: boolean;
	stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
	bottomOffset?: number; // Offset from bottom (for tab bar spacing)
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StickyBottomBar({
	price,
	originalPrice,
	onAddToCart,
	onBuyNow,
	disabled = false,
	stockStatus = 'in_stock',
	bottomOffset = 0,
}: StickyBottomBarProps) {
	const { bottom } = useSafeAreaInsets();
	const addToCartScale = useSharedValue(1);
	const buyNowScale = useSharedValue(1);

	const addToCartAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: addToCartScale.value }],
	}));

	const buyNowAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: buyNowScale.value }],
	}));

	const handleAddToCartPressIn = () => {
		addToCartScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
	};

	const handleAddToCartPressOut = () => {
		addToCartScale.value = withSequence(
			withSpring(1.05, { damping: 10 }),
			withSpring(1, { damping: 15 })
		);
	};

	const handleBuyNowPressIn = () => {
		buyNowScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
	};

	const handleBuyNowPressOut = () => {
		buyNowScale.value = withSequence(
			withSpring(1.05, { damping: 10 }),
			withSpring(1, { damping: 15 })
		);
	};

	const isOutOfStock = stockStatus === 'out_of_stock';
	const isLowStock = stockStatus === 'low_stock';

	return (
		<View style={[styles.container, { bottom: bottomOffset }]}>
			<View style={styles.content}>
				{/* Price Section */}
				<View style={styles.priceSection}>
					<Text style={styles.priceLabel}>Price</Text>
					<View style={styles.priceRow}>
						<Text style={styles.price}>{price}</Text>
						{originalPrice && (
							<Text style={styles.originalPrice}>{originalPrice}</Text>
						)}
					</View>
					{isLowStock && (
						<Text style={styles.stockWarning}>Limited stock available</Text>
					)}
				</View>

				{/* Action Buttons */}
				<View style={styles.actionsContainer}>
					{/* Add to Cart Button */}
					<AnimatedPressable
						onPress={onAddToCart}
						onPressIn={handleAddToCartPressIn}
						onPressOut={handleAddToCartPressOut}
						disabled={disabled || isOutOfStock}
						style={[
							styles.addToCartButton,
							(disabled || isOutOfStock) && styles.buttonDisabled,
							addToCartAnimatedStyle,
						]}
					>
						<IconSymbol
							name="cart.fill"
							size={16}
							color={
								disabled || isOutOfStock
									? GIFTYY_THEME.colors.gray400
									: GIFTYY_THEME.colors.primary
							}
						/>
						<Text
							style={[
								styles.addToCartText,
								(disabled || isOutOfStock) && styles.buttonTextDisabled,
							]}
						>
							Cart
						</Text>
					</AnimatedPressable>

					{/* Buy Now Button */}
					<AnimatedPressable
						onPress={onBuyNow}
						onPressIn={handleBuyNowPressIn}
						onPressOut={handleBuyNowPressOut}
						disabled={disabled || isOutOfStock}
						style={[buyNowAnimatedStyle, { flex: 1 }]}
					>
						<LinearGradient
							colors={
								disabled || isOutOfStock
									? [GIFTYY_THEME.colors.gray300, GIFTYY_THEME.colors.gray400]
									: [GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]
							}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.buyNowButton}
						>
							<Text
								style={[
									styles.buyNowText,
									(disabled || isOutOfStock) && styles.buttonTextDisabled,
								]}
							>
								{isOutOfStock ? 'Out of Stock' : 'Buy Now'}
							</Text>
						</LinearGradient>
					</AnimatedPressable>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 0,
		right: 0,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.xl,
		zIndex: 99, // Below tab bar (999) but above content
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingTop: GIFTYY_THEME.spacing.sm,
		paddingBottom: GIFTYY_THEME.spacing.sm,
		gap: GIFTYY_THEME.spacing.sm,
	},
	priceSection: {
		minWidth: 70,
	},
	priceLabel: {
		fontSize: 10,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		marginBottom: 2,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 4,
	},
	price: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.success,
	},
	originalPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	stockWarning: {
		fontSize: 9,
		color: GIFTYY_THEME.colors.error,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		marginTop: 1,
	},
	actionsContainer: {
		flex: 1,
		flexDirection: 'row',
		gap: GIFTYY_THEME.spacing.md,
		alignItems: 'center',
	},
	addToCartButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderWidth: 1.5,
		borderColor: GIFTYY_THEME.colors.primary,
		gap: 6,
	},
	buttonDisabled: {
		backgroundColor: GIFTYY_THEME.colors.gray200,
		borderColor: GIFTYY_THEME.colors.gray300,
	},
	addToCartText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
	},
	buyNowButton: {
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: GIFTYY_THEME.radius.full,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	buyNowText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
	buttonTextDisabled: {
		color: GIFTYY_THEME.colors.gray500,
	},
});

