/**
 * Wishlists Page
 * Clean, modern, premium wishlist screen
 */

import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Components
import { MarketplaceProductCard } from '@/components/marketplace/MarketplaceProductCard';
import { WishlistActionSheet } from '@/components/wishlist/WishlistActionSheet';
import { RecommendationCarousel } from '@/components/wishlist/RecommendationCarousel';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Contexts & Utils
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { scale, normalizeFont } from '@/utils/responsive';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';
import type { Product } from '@/contexts/ProductsContext';

const SCREEN_WIDTH = GIFTYY_THEME.layout.screenWidth;
const CARD_GAP = scale(10);
const HORIZONTAL_PADDING = GIFTYY_THEME.spacing.xl;
const GRID_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

type SortOption = 'newest' | 'price-low' | 'price-high';

export default function WishlistScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const pathname = usePathname();
	const { setVisible } = useBottomBarVisibility();

	// Contexts
	const { wishlist, removeFromWishlist, toggleWishlist } = useWishlist();
	const { products, getProductById, loading: productsLoading } = useProducts();
	const { addItem } = useCart();

	// State
	const [refreshing, setRefreshing] = useState(false);
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [sortOption, setSortOption] = useState<SortOption>('newest');
	const [showActionSheet, setShowActionSheet] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

	// Ensure bottom bar is visible
	useEffect(() => {
		setVisible(true);
	}, [setVisible]);

	// Get wishlist products
	const wishlistProducts = useMemo(() => {
		return wishlist
			.map(item => {
				const product = getProductById(item.productId);
				if (!product || !product.isActive) return null;

				const imageUrl = product.imageUrl ? (() => {
					try {
						const parsed = JSON.parse(product.imageUrl);
						return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
					} catch {
						return product.imageUrl;
					}
				})() : undefined;

				const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;

				return {
					...product,
					addedAt: item.addedAt,
					imageUrl,
					vendorName: vendor?.storeName,
					vendorInfo: vendor,
				};
			})
			.filter((p): p is Product & { addedAt: string; imageUrl?: string; vendorName?: string; vendorInfo?: VendorInfo } => p !== null);
	}, [wishlist, products, vendorsMap, getProductById]);

	// Fetch vendor info
	useEffect(() => {
		const fetchVendors = async () => {
			const vendorIds = Array.from(
				new Set(wishlistProducts.map(p => p.vendorId).filter(Boolean) as string[])
			);
			if (vendorIds.length > 0) {
				const vendors = await getVendorsInfo(vendorIds);
				setVendorsMap(vendors);
			}
		};

		if (wishlistProducts.length > 0) {
			fetchVendors();
		}
	}, [wishlistProducts]);

	// Sort wishlist products
	const sortedProducts = useMemo(() => {
		const sorted = [...wishlistProducts];

		sorted.sort((a, b) => {
			switch (sortOption) {
				case 'newest':
					return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
				case 'price-low': {
					const priceA = a.discountPercentage > 0 ? a.price * (1 - a.discountPercentage / 100) : a.price;
					const priceB = b.discountPercentage > 0 ? b.price * (1 - b.discountPercentage / 100) : b.price;
					return priceA - priceB;
				}
				case 'price-high': {
					const priceA = a.discountPercentage > 0 ? a.price * (1 - a.discountPercentage / 100) : a.price;
					const priceB = b.discountPercentage > 0 ? b.price * (1 - b.discountPercentage / 100) : b.price;
					return priceB - priceA;
				}
				default:
					return 0;
			}
		});

		return sorted;
	}, [wishlistProducts, sortOption]);

	// Get recommendations
	const recommendations = useMemo(() => {
		const wishlistIds = new Set(wishlist.map(item => item.productId));
		const wishlistCategoryIds = new Set<string>();
		const wishlistSubcategories = new Set<string>();

		wishlistProducts.forEach(product => {
			if (product.categoryIds) {
				product.categoryIds.forEach(catId => wishlistCategoryIds.add(catId));
			}
			if (product.subcategories) {
				product.subcategories.forEach(sub => wishlistSubcategories.add(sub.toLowerCase()));
			}
		});

		if (wishlistCategoryIds.size === 0 && wishlistSubcategories.size === 0) {
			return [];
		}

		return products
			.filter(p => {
				if (!p.isActive || wishlistIds.has(p.id)) return false;
				if (p.categoryIds && p.categoryIds.some(catId => wishlistCategoryIds.has(catId))) return true;
				if (p.subcategories && p.subcategories.some(sub => wishlistSubcategories.has(sub.toLowerCase()))) return true;
				return false;
			})
			.slice(0, 10);
	}, [products, wishlist, wishlistProducts]);

	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		setTimeout(() => setRefreshing(false), 500);
	}, []);

	// Handle add to cart
	const handleAddToCart = useCallback((product: Product) => {
		const imageUrl = product.imageUrl ? (() => {
			try {
				const parsed = JSON.parse(product.imageUrl);
				return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
			} catch {
				return product.imageUrl;
			}
		})() : undefined;

		addItem({
			id: product.id,
			name: product.name,
			price: product.discountPercentage > 0
				? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
				: product.price.toFixed(2),
			image: imageUrl,
			vendorId: product.vendorId,
		});
	}, [addItem]);

	// Handle action sheet
	const handleLongPress = useCallback((product: Product) => {
		setSelectedProduct(product);
		setShowActionSheet(true);
	}, []);

	const handleAction = useCallback((action: 'cart' | 'share' | 'remove') => {
		if (!selectedProduct) return;

		switch (action) {
			case 'cart':
				handleAddToCart(selectedProduct);
				break;
			case 'remove':
				removeFromWishlist(selectedProduct.id);
				break;
			case 'share':
				break;
		}

		setShowActionSheet(false);
		setSelectedProduct(null);
	}, [selectedProduct, handleAddToCart, removeFromWishlist]);

	const isEmpty = sortedProducts.length === 0 && !productsLoading;

	return (
		<GestureHandlerRootView style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingTop: top + scale(60), paddingBottom: bottom + scale(40) },
				]}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={GIFTYY_THEME.colors.primary}
						colors={[GIFTYY_THEME.colors.primary]}
					/>
				}
			>
				{/* Header */}
				<Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
					<Text style={styles.headerTitle}>Wishlist</Text>
					{sortedProducts.length > 0 && (
						<Text style={styles.itemCount}>
							{sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'}
						</Text>
					)}
				</Animated.View>

				{isEmpty ? (
					/* Empty State */
					<Animated.View entering={FadeIn.duration(600).delay(200)} style={styles.emptyContainer}>
						<View style={styles.emptyIconWrapper}>
							<IconSymbol name="heart" size={scale(48)} color={GIFTYY_THEME.colors.primary} />
						</View>
						<Text style={styles.emptyTitle}>Nothing saved yet</Text>
						<Text style={styles.emptySubtitle}>
							Tap the heart on any gift to save it here for later.
						</Text>
						<Pressable
							onPress={() => router.push('/(buyer)/(tabs)/shop')}
							style={({ pressed }) => [styles.exploreButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
						>
							<Text style={styles.exploreButtonText}>Browse Gifts</Text>
							<IconSymbol name="arrow.right" size={scale(16)} color="#fff" />
						</Pressable>
					</Animated.View>
				) : (
					<>
						{/* Sort chips */}
						<Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.sortRow}>
							{(['newest', 'price-low', 'price-high'] as SortOption[]).map((option) => {
								const isActive = sortOption === option;
								const label = option === 'newest' ? 'Recent' : option === 'price-low' ? 'Low to High' : 'High to Low';
								return (
									<Pressable
										key={option}
										onPress={() => setSortOption(option)}
										style={[styles.sortChip, isActive && styles.sortChipActive]}
									>
										<Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
											{label}
										</Text>
									</Pressable>
								);
							})}
						</Animated.View>

						{/* Product Grid */}
						<View style={styles.grid}>
							{sortedProducts.map((product, index) => {
								const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
								const imageUrl = product.imageUrl ? (() => {
									try {
										const parsed = JSON.parse(product.imageUrl);
										return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
									} catch {
										return product.imageUrl;
									}
								})() : undefined;

								const isLeftColumn = index % 2 === 0;

								return (
									<Animated.View
										key={product.id}
										entering={FadeInUp.duration(350).delay(150 + index * 60)}
										style={[
											styles.gridItem,
											{ marginRight: isLeftColumn ? CARD_GAP : 0 },
										]}
									>
										<MarketplaceProductCard
											id={product.id}
											name={product.name || ''}
											price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
											originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
											discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
											image={imageUrl}
											vendorName={vendor?.storeName || undefined}
											onPress={() => router.push({
												pathname: '/(buyer)/(tabs)/product/[id]',
												params: { id: product.id, returnTo: pathname },
											} as any)}
										/>
									</Animated.View>
								);
							})}
						</View>

						{/* Recommendations */}
						{recommendations.length > 0 && (
							<Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.recsSection}>
								<RecommendationCarousel
									products={recommendations}
									onProductPress={(id) => router.push({
										pathname: '/(buyer)/(tabs)/product/[id]',
										params: { id, returnTo: pathname },
									} as any)}
									onAddToCart={(product) => handleAddToCart(product)}
									onAddToWishlist={(productId) => toggleWishlist(productId)}
								/>
							</Animated.View>
						)}
					</>
				)}
			</ScrollView>

			{/* Action Sheet */}
			<WishlistActionSheet
				visible={showActionSheet}
				onClose={() => {
					setShowActionSheet(false);
					setSelectedProduct(null);
				}}
				onAction={handleAction}
				productName={selectedProduct?.name}
			/>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.cream,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: HORIZONTAL_PADDING,
	},

	// Header
	header: {
		marginBottom: GIFTYY_THEME.spacing['2xl'],
	},
	headerTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['4xl'],
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		letterSpacing: -0.5,
	},
	itemCount: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray500,
		marginTop: GIFTYY_THEME.spacing.xs,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},

	// Sort
	sortRow: {
		flexDirection: 'row',
		gap: GIFTYY_THEME.spacing.sm,
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	sortChip: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	sortChipActive: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	sortChipText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray500,
	},
	sortChipTextActive: {
		color: '#fff',
	},

	// Grid
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	gridItem: {
		width: CARD_WIDTH,
		marginBottom: CARD_GAP,
	},

	// Recommendations
	recsSection: {
		marginTop: GIFTYY_THEME.spacing['2xl'],
	},

	// Empty state
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: scale(80),
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	emptyIconWrapper: {
		width: scale(96),
		height: scale(96),
		borderRadius: scale(48),
		backgroundColor: GIFTYY_THEME.colors.peach + '30',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: GIFTYY_THEME.spacing['2xl'],
	},
	emptyTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	emptySubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray400,
		textAlign: 'center',
		lineHeight: normalizeFont(22),
		marginBottom: GIFTYY_THEME.spacing['3xl'],
		maxWidth: scale(260),
	},
	exploreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingHorizontal: GIFTYY_THEME.spacing['3xl'],
		paddingVertical: GIFTYY_THEME.spacing.lg,
		borderRadius: GIFTYY_THEME.radius.full,
	},
	exploreButtonText: {
		color: '#fff',
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
});
