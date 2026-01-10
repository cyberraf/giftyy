/**
 * Lightning Deal Card Component - Redesigned
 * Premium card design with enhanced visual appeal and urgency indicators
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { Product } from '@/contexts/ProductsContext';
import React, { useEffect } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;

type Props = {
	product: Product & { imageUrl?: string };
	stockClaimed: number;
	totalStock: number;
	onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function LightningDealCard({ product, stockClaimed, totalStock, onPress }: Props) {
	const scale = useSharedValue(1);
	const glowOpacity = useSharedValue(0.3);
	const pulseScale = useSharedValue(1);
	
	const discount = product.discountPercentage || 0;
	const originalPrice = product.price || 0;
	const discountedPrice = originalPrice * (1 - discount / 100);
	const remainingStock = totalStock - stockClaimed;
	const isLowStock = remainingStock < 20;
	
	// Pulsing glow animation for urgency
	useEffect(() => {
		if (isLowStock) {
			glowOpacity.value = withRepeat(
				withSequence(
					withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
					withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
				),
				-1,
				false
			);
			pulseScale.value = withRepeat(
				withSequence(
					withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
					withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
				),
				-1,
				false
			);
		}
	}, [isLowStock]);
	
	const cardAnimatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: scale.value * pulseScale.value },
		],
	}));
	
	const glowAnimatedStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value,
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
			style={[styles.container, cardAnimatedStyle, { width: CARD_WIDTH }]}
		>
			{/* Glow effect for low stock */}
			{isLowStock && (
				<Animated.View style={[styles.glowEffect, glowAnimatedStyle]} />
			)}
			
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
					
					{/* Discount Badge - Large and Prominent */}
					{discount > 0 && (
						<View style={styles.discountBadge}>
							<LinearGradient
								colors={[GIFTYY_THEME.colors.error, '#ff4444']}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={styles.discountGradient}
							>
								<Text style={styles.discountPercent}>-{Math.round(discount)}%</Text>
							</LinearGradient>
						</View>
					)}
					
					{/* Overlay gradient for better text readability */}
					<LinearGradient
						colors={['transparent', 'rgba(0,0,0,0.1)']}
						style={styles.imageOverlay}
					/>
				</View>
				
				{/* Product Info Section */}
				<View style={styles.infoSection}>
					{/* Product Name */}
					<Text style={styles.productName} numberOfLines={2}>
						{product.name || 'Product'}
					</Text>
					
					{/* Price Section */}
					<View style={styles.priceSection}>
						<View style={styles.priceRow}>
							<Text style={styles.currentPrice}>${discountedPrice.toFixed(2)}</Text>
							{discount > 0 && (
								<Text style={styles.originalPrice}>${originalPrice.toFixed(2)}</Text>
							)}
						</View>
						{discount > 0 && (
							<Text style={styles.savingsText}>
								Save ${(originalPrice - discountedPrice).toFixed(2)}
							</Text>
						)}
					</View>
					
					{/* CTA Button */}
					<View style={styles.ctaButton}>
						<LinearGradient
							colors={[GIFTYY_THEME.colors.primary, '#ff7a3d']}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.ctaGradient}
						>
							<Text style={styles.ctaText}>Shop Now</Text>
							<IconSymbol name="arrow.right" size={16} color="#fff" />
						</LinearGradient>
					</View>
				</View>
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		marginRight: 16,
		position: 'relative',
	},
	glowEffect: {
		position: 'absolute',
		top: -4,
		left: -4,
		right: -4,
		bottom: -4,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		backgroundColor: GIFTYY_THEME.colors.error,
		zIndex: 0,
	},
	card: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.xl,
		shadowColor: GIFTYY_THEME.colors.primary,
		shadowOpacity: 0.15,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray100,
	},
	imageWrapper: {
		width: '100%',
		aspectRatio: 1.1,
		position: 'relative',
		backgroundColor: GIFTYY_THEME.colors.gray50,
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
	imageOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: '30%',
	},
	discountBadge: {
		position: 'absolute',
		top: 12,
		right: 12,
		zIndex: 2,
	},
	discountGradient: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: GIFTYY_THEME.radius.lg,
		...GIFTYY_THEME.shadows.md,
	},
	discountPercent: {
		color: '#fff',
		fontSize: 18,
		fontWeight: GIFTYY_THEME.typography.weights.black,
		letterSpacing: -0.5,
	},
	infoSection: {
		padding: 16,
	},
	productName: {
		fontSize: 16,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 12,
		lineHeight: 20,
		minHeight: 40,
	},
	priceSection: {
		marginBottom: 14,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 4,
		gap: 8,
	},
	currentPrice: {
		fontSize: 24,
		fontWeight: GIFTYY_THEME.typography.weights.black,
		color: GIFTYY_THEME.colors.success,
		letterSpacing: -0.5,
	},
	originalPrice: {
		fontSize: 14,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	savingsText: {
		fontSize: 12,
		color: GIFTYY_THEME.colors.success,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	ctaButton: {
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.md,
	},
	ctaGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		gap: 8,
	},
	ctaText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		letterSpacing: 0.3,
	},
});
