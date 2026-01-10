/**
 * Wishlists Page
 * Personal gallery of saved gifts - warm, emotional, and expressive
 */

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Dimensions,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, {
	FadeInDown,
	FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Components
import { MarketplaceProductCard } from '@/components/marketplace/ProductCard';
import { EmptyWishlistState } from '@/components/wishlist/EmptyWishlistState';
import { WishlistActionSheet } from '@/components/wishlist/WishlistActionSheet';
import { RecommendationCarousel } from '@/components/wishlist/RecommendationCarousel';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Contexts & Utils
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';
import type { Product } from '@/contexts/ProductsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular';
type FilterState = {
	category?: string;
	priceRange?: { min: number; max: number };
	vendor?: string;
};

export default function WishlistScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { setVisible } = useBottomBarVisibility();
	
	// Contexts
	const { wishlist, removeFromWishlist } = useWishlist();
	const { products, getProductById, loading: productsLoading } = useProducts();
	const { addItem } = useCart();
	
	// State
	const [refreshing, setRefreshing] = useState(false);
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [sortOption, setSortOption] = useState<SortOption>('newest');
	const [showFilters, setShowFilters] = useState(false);
	const [showActionSheet, setShowActionSheet] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [filterState, setFilterState] = useState<FilterState>({});
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
				
				// Parse image URL
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
	
	// Sort and filter wishlist products
	const sortedAndFilteredProducts = useMemo(() => {
		let filtered = [...wishlistProducts];
		
		// Apply filters
		if (filterState.priceRange) {
			filtered = filtered.filter(p => {
				const price = p.discountPercentage > 0 
					? p.price * (1 - p.discountPercentage / 100)
					: p.price;
				return price >= filterState.priceRange!.min && price <= filterState.priceRange!.max;
			});
		}
		
		if (filterState.category) {
			filtered = filtered.filter(p => 
				p.tags?.some(tag => tag.toLowerCase().includes(filterState.category!.toLowerCase()))
			);
		}
		
		if (filterState.vendor) {
			filtered = filtered.filter(p => p.vendorId === filterState.vendor);
		}
		
		// Apply sorting
		filtered.sort((a, b) => {
			switch (sortOption) {
				case 'newest':
					return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
				case 'price-low':
					const priceA = a.discountPercentage > 0 ? a.price * (1 - a.discountPercentage / 100) : a.price;
					const priceB = b.discountPercentage > 0 ? b.price * (1 - b.discountPercentage / 100) : b.price;
					return priceA - priceB;
				case 'price-high':
					const priceAHigh = a.discountPercentage > 0 ? a.price * (1 - a.discountPercentage / 100) : a.price;
					const priceBHigh = b.discountPercentage > 0 ? b.price * (1 - b.discountPercentage / 100) : b.price;
					return priceBHigh - priceAHigh;
				case 'popular':
					// Sort by discount percentage (more discount = more popular)
					return (b.discountPercentage || 0) - (a.discountPercentage || 0);
				default:
					return 0;
			}
		});
		
		return filtered;
	}, [wishlistProducts, sortOption, filterState]);
	
	// Get recommendations (products with same categories/subcategories, not in wishlist)
	const recommendations = useMemo(() => {
		const wishlistIds = new Set(wishlist.map(item => item.productId));
		
		// Collect all categoryIds and subcategories from wishlist products
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
		
		// If no categories found in wishlist, return empty (can't make good recommendations)
		if (wishlistCategoryIds.size === 0 && wishlistSubcategories.size === 0) {
			return [];
		}
		
		// Filter products that share at least one category or subcategory
		const recommended = products
			.filter(p => {
				if (!p.isActive || wishlistIds.has(p.id)) return false;
				
				// Check if product shares any category
				if (p.categoryIds && p.categoryIds.some(catId => wishlistCategoryIds.has(catId))) {
					return true;
				}
				
				// Check if product shares any subcategory
				if (p.subcategories && p.subcategories.some(sub => 
					wishlistSubcategories.has(sub.toLowerCase())
				)) {
					return true;
				}
				
				return false;
			})
			.slice(0, 10);
		
		return recommended;
	}, [products, wishlist, wishlistProducts]);
	
	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		// Wishlist is stored locally, so just refresh products
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
				// TODO: Implement share functionality
				break;
		}
		
		setShowActionSheet(false);
		setSelectedProduct(null);
	}, [selectedProduct, handleAddToCart, removeFromWishlist]);
	
	const headerPaddingTop = top + 6;
	
	return (
		<GestureHandlerRootView style={styles.container}>
			{/* Header */}
			<Animated.View
				entering={FadeInDown.duration(300)}
				style={[
					styles.header,
					{
						paddingTop: headerPaddingTop,
					},
				]}
			>
				<View style={styles.headerContent}>
					<View style={styles.headerLeft}>
						<Pressable onPress={() => router.back()} style={styles.backButton}>
							<IconSymbol 
								name="chevron.left" 
								size={24} 
								color={GIFTYY_THEME.colors.gray700}
							/>
						</Pressable>
						<View style={styles.headerTextContainer}>
							<Text style={styles.headerTitle}>Wishlists 💛</Text>
							<Text style={styles.headerSubtitle}>
								Save your favorite gifts for later
							</Text>
						</View>
					</View>
					{(sortedAndFilteredProducts.length > 0 || Object.keys(filterState).length > 0) && (
						<Pressable 
							onPress={() => setShowFilters(true)}
							style={styles.filterButton}
						>
							<IconSymbol name="slider.horizontal.3" size={22} color={GIFTYY_THEME.colors.gray700} />
						</Pressable>
					)}
				</View>
			</Animated.View>
			
			{/* Main Content */}
			{sortedAndFilteredProducts.length === 0 && !productsLoading ? (
				<EmptyWishlistState 
					onExplore={() => router.push('/(buyer)/(tabs)/home')}
				/>
			) : (
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24 },
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
					{/* Sort Bar */}
					{sortedAndFilteredProducts.length > 0 && (
						<Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.sortBar}>
							<ScrollView 
								horizontal 
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.sortBarContent}
							>
								{(['newest', 'price-low', 'price-high', 'popular'] as SortOption[]).map((option) => (
									<Pressable
										key={option}
										onPress={() => setSortOption(option)}
										style={[
											styles.sortChip,
											sortOption === option && styles.sortChipActive,
										]}
									>
										<Text style={[
											styles.sortChipText,
											sortOption === option && styles.sortChipTextActive,
										]}>
											{option === 'newest' ? 'Newest' :
											 option === 'price-low' ? 'Price: Low to High' :
											 option === 'price-high' ? 'Price: High to Low' :
											 'Most Popular'}
										</Text>
									</Pressable>
								))}
							</ScrollView>
						</Animated.View>
					)}
					
					{/* Wishlist Grid */}
					{sortedAndFilteredProducts.length > 0 && (
						<Animated.View entering={FadeInUp.duration(400).delay(200)}>
							<View style={styles.wishlistGrid}>
								{sortedAndFilteredProducts.map((product, index) => {
									const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
									const imageUrl = product.imageUrl ? (() => {
										try {
											const parsed = JSON.parse(product.imageUrl);
											return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
										} catch {
											return product.imageUrl;
										}
									})() : undefined;
									
									// Ensure 3-column layout - remove marginRight from last item in each row
									const isLastInRow = (index + 1) % 3 === 0;
									
									return (
										<Animated.View
											key={product.id}
											entering={FadeInUp.duration(400).delay(300 + index * 50)}
											style={{ 
												marginRight: isLastInRow ? 0 : 10, 
												marginBottom: 10 
											}}
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
													params: { id: product.id },
												})}
											/>
										</Animated.View>
									);
								})}
							</View>
						</Animated.View>
					)}
					
					{/* Recommendations Section */}
					{recommendations.length > 0 && sortedAndFilteredProducts.length > 0 && (
						<Animated.View entering={FadeInUp.duration(400).delay(500)}>
							<RecommendationCarousel
								products={recommendations}
								onProductPress={(id) => router.push({
									pathname: '/(buyer)/(tabs)/product/[id]',
									params: { id },
								})}
								onAddToCart={(product) => handleAddToCart(product)}
								onAddToWishlist={(productId) => toggleWishlist(productId)}
							/>
						</Animated.View>
					)}
				</ScrollView>
			)}
			
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
			
			{/* Filters Modal */}
			<Modal
				visible={showFilters}
				animationType="slide"
				transparent
				onRequestClose={() => setShowFilters(false)}
			>
				<Pressable
					style={styles.modalOverlay}
					onPress={() => setShowFilters(false)}
				>
					<Animated.View
						entering={FadeInUp.duration(300)}
						style={styles.modalContent}
						onStartShouldSetResponder={() => true}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Filter Wishlist</Text>
							<Pressable onPress={() => setShowFilters(false)}>
								<IconSymbol name="xmark.circle.fill" size={24} color={GIFTYY_THEME.colors.gray500} />
							</Pressable>
						</View>
						<ScrollView style={styles.modalBody}>
							<Text style={styles.modalBodyText}>Filter options coming soon...</Text>
						</ScrollView>
					</Animated.View>
				</Pressable>
			</Modal>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.background,
	},
	header: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 20,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: 12,
		...GIFTYY_THEME.shadows.sm,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	backButton: {
		marginRight: 12,
		padding: 4,
	},
	headerTextContainer: {
		flex: 1,
	},
	headerTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 2,
	},
	headerSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	filterButton: {
		width: 40,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingTop: 110,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	sortBar: {
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	sortBarContent: {
		paddingRight: GIFTYY_THEME.spacing.lg,
	},
	sortChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		marginRight: 8,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	sortChipActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	sortChipText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray600,
	},
	sortChipTextActive: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	wishlistGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
		marginTop: GIFTYY_THEME.spacing.sm,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.overlay,
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopLeftRadius: GIFTYY_THEME.radius['2xl'],
		borderTopRightRadius: GIFTYY_THEME.radius['2xl'],
		maxHeight: '80%',
		paddingTop: GIFTYY_THEME.spacing.xl,
		...GIFTYY_THEME.shadows.xl,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	modalTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	modalBody: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.xl,
	},
	modalBodyText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray500,
	},
});

