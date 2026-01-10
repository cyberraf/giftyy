/**
 * Recommendations Carousel Component
 * Horizontal scrollable carousel for related products, frequently bought together, and more from vendor
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useWishlist } from '@/contexts/WishlistContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
	FadeInUp,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns in carousel

type RecommendationProduct = {
	id: string;
	name: string;
	price: number;
	originalPrice?: number;
	discountPercentage?: number;
	image?: string;
	vendorName?: string;
	rating?: number;
	reviewCount?: number;
};

type RecommendationsCarouselProps = {
	title: string;
	subtitle?: string;
	products: RecommendationProduct[];
	onProductPress?: (productId: string) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RecommendationCard({
	product,
	index,
	onPress,
}: {
	product: RecommendationProduct;
	index: number;
	onPress: () => void;
}) {
	const { isWishlisted, toggleWishlist } = useWishlist();
	const isInWishlist = isWishlisted(product.id);
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
		heartScale.value = withSpring(1.3, { damping: 10 }, () => {
			heartScale.value = withSpring(1, { damping: 10 });
		});
		toggleWishlist(product.id);
	};

	const discountedPrice =
		product.discountPercentage && product.discountPercentage > 0
			? product.price * (1 - product.discountPercentage / 100)
			: product.price;

	return (
		<AnimatedPressable
			entering={FadeInUp.duration(400).delay(index * 50)}
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.card, { width: CARD_WIDTH }, animatedStyle]}
		>
			{/* Product Image */}
			<View style={styles.imageContainer}>
				{product.image ? (
					<Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
				) : (
					<View style={styles.imagePlaceholder}>
						<IconSymbol name="photo" size={32} color={GIFTYY_THEME.colors.gray300} />
					</View>
				)}

				{/* Discount Badge */}
				{product.discountPercentage && product.discountPercentage > 0 && (
					<View style={styles.discountBadge}>
						<Text style={styles.discountText}>-{Math.round(product.discountPercentage)}%</Text>
					</View>
				)}

				{/* Wishlist Button */}
				<Pressable style={styles.wishlistButton} onPress={handleWishlistPress}>
					<Animated.View style={heartAnimatedStyle}>
						<IconSymbol
							name={isInWishlist ? 'heart.fill' : 'heart'}
							size={18}
							color={isInWishlist ? GIFTYY_THEME.colors.error : GIFTYY_THEME.colors.gray400}
						/>
					</Animated.View>
				</Pressable>
			</View>

			{/* Product Info */}
			<View style={styles.infoContainer}>
				{product.vendorName && (
					<Text style={styles.vendorName} numberOfLines={1}>
						{product.vendorName}
					</Text>
				)}
				<Text style={styles.productName} numberOfLines={2}>
					{product.name}
				</Text>
				{product.rating && product.reviewCount && product.reviewCount > 0 && (
					<View style={styles.ratingContainer}>
						<IconSymbol name="star.fill" size={10} color="#fbbf24" />
						<Text style={styles.ratingText}>
							{product.rating.toFixed(1)} ({product.reviewCount})
						</Text>
					</View>
				)}
				<View style={styles.priceContainer}>
					<Text style={styles.price}>${discountedPrice.toFixed(2)}</Text>
					{product.originalPrice && product.originalPrice > discountedPrice && (
						<Text style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
					)}
				</View>
			</View>
		</AnimatedPressable>
	);
}

export function RecommendationsCarousel({
	title,
	subtitle,
	products,
	onProductPress,
}: RecommendationsCarouselProps) {
	const router = useRouter();

	if (!products || products.length === 0) {
		return null;
	}

	const handleProductPress = (productId: string) => {
		if (onProductPress) {
			onProductPress(productId);
		} else {
			router.push({
				pathname: '/(buyer)/(tabs)/product/[id]',
				params: { id: productId },
			});
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View>
					<Text style={styles.title}>{title}</Text>
					{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
				</View>
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.carouselContainer}
				decelerationRate="fast"
				snapToInterval={CARD_WIDTH + 16}
				snapToAlignment="start"
			>
				{products.map((product, index) => (
					<RecommendationCard
						key={product.id}
						product={product}
						index={index}
						onPress={() => handleProductPress(product.id)}
					/>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	header: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	carouselContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.md,
	},
	card: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
		marginRight: GIFTYY_THEME.spacing.md,
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
		top: 8,
		right: 8,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		justifyContent: 'center',
		alignItems: 'center',
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

