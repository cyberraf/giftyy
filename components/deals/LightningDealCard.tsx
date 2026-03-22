/**
 * Lightning Deal Card Component - Redesigned
 * Premium card design with enhanced visual appeal and urgency indicators
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { Product } from '@/contexts/ProductsContext';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.55;

type Props = {
	product: Product & { imageUrl?: string };
	stockClaimed: number;
	totalStock: number;
	onPress: () => void;
	width?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function LightningDealCard({ product, stockClaimed, totalStock, onPress, width }: Props) {
	const scale = useSharedValue(1);
	const displayWidth = width || CARD_WIDTH;
	const isCompact = displayWidth < 135;

	const discount = product.discountPercentage || 0;
	const originalPrice = product.price || 0;
	const discountedPrice = originalPrice * (1 - discount / 100);
	const remainingStock = totalStock - stockClaimed;
	const isLowStock = remainingStock < 20;

	const cardAnimatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: scale.value },
		],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 400 });
	};

	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, cardAnimatedStyle, { width: displayWidth }]}
		>
			<View style={styles.card}>
				{/* Product Image Container */}
				<View style={styles.imageWrapper}>
					{product.imageUrl ? (
						<Image
							source={{ uri: product.imageUrl }}
							style={styles.image}
							resizeMode="cover"
						/>
					) : (
						<View style={styles.imagePlaceholder}>
							<IconSymbol name="photo" size={40} color={GIFTYY_THEME.colors.gray300} />
						</View>
					)}

					{/* Discount Badge - Elegant Gold */}
					{discount > 0 && (
						<View style={styles.discountBadge}>
							<View style={styles.discountBadgeContent}>
								<Text style={styles.discountPercent}>-{Math.round(discount)}%</Text>
							</View>
						</View>
					)}

					{/* Subtle overlay */}
					<View style={styles.imageOverlay} />
				</View>

				{/* Product Info Section */}
				<View style={[styles.infoSection, isCompact && styles.infoSectionCompact]}>
					{/* Product Name */}
					<Text style={[styles.productName, isCompact && styles.productNameCompact]} numberOfLines={2}>
						{product.name || 'Product'}
					</Text>

					{/* Price Section */}
					<View style={[styles.priceSection, isCompact && styles.priceSectionCompact]}>
						<View style={styles.priceRow}>
							<Text style={[styles.currentPrice, isCompact && styles.currentPriceCompact]}>${discountedPrice.toFixed(2)}</Text>
							{discount > 0 && (
								<Text style={[styles.originalPrice, isCompact && styles.originalPriceCompact]}>
									${originalPrice.toFixed(2)}
								</Text>
							)}
						</View>
					</View>

					{/* CTA Button - Brand Orange */}
					<View style={styles.ctaButton}>
						<LinearGradient
							colors={[GIFTYY_THEME.colors.primary, '#ff7a3d']}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={[styles.ctaInternal, isCompact && styles.ctaInternalCompact]}
						>
							<Text style={styles.ctaText}>{isCompact ? 'View' : 'View Offer'}</Text>
						</LinearGradient>
					</View>
				</View>
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
	},
	glowEffect: {
		position: 'absolute',
		top: -2,
		left: -2,
		right: -2,
		bottom: -2,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		backgroundColor: GIFTYY_THEME.colors.featured, // Amber/Gold glow instead of red
		zIndex: 0,
	},
	card: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray100,
	},
	imageWrapper: {
		width: '100%',
		aspectRatio: 1,
		position: 'relative',
		backgroundColor: '#F8F8F8',
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
		backgroundColor: '#F8F8F8',
	},
	imageOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: '100%',
		backgroundColor: 'rgba(0,0,0,0.01)',
	},
	discountBadge: {
		position: 'absolute',
		top: 12,
		right: 12,
		zIndex: 2,
	},
	discountBadgeContent: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		...GIFTYY_THEME.shadows.sm,
	},
	discountPercent: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 12,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	infoSection: {
		padding: 12,
	},
	productName: {
		fontSize: 13,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 6,
		lineHeight: 18,
		minHeight: 36,
	},
	priceSection: {
		marginBottom: 12,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 2,
		gap: 6,
	},
	currentPrice: {
		fontSize: 18,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.success,
	},
	originalPrice: {
		fontSize: 11,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	originalPriceCompact: {
		fontSize: 9,
	},
	ctaButton: {
		borderRadius: GIFTYY_THEME.radius.sm,
		overflow: 'hidden',
		alignSelf: 'center',
	},
	ctaInternal: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	ctaText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 12,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	// Compact Overrides
	infoSectionCompact: {
		padding: 8,
	},
	productNameCompact: {
		fontSize: 11,
		lineHeight: 14,
		minHeight: 28,
		marginBottom: 4,
	},
	priceSectionCompact: {
		marginBottom: 8,
	},
	currentPriceCompact: {
		fontSize: 15,
	},
	ctaInternalCompact: {
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
});
