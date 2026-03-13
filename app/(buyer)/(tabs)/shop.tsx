/**
 * Giftyy Premium Marketplace Home Screen
 * Modern marketplace design with animations, hero section, categories, product grids, and vendor spotlight
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Dimensions,
	Image,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import Animated, {
	FadeInRight,
	FadeInUp
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import { AnimatedSectionHeader } from '@/components/marketplace/AnimatedSectionHeader';
import { MarketplaceProductCard } from '@/components/marketplace/ProductCard';
import { PromotionalBanner } from '@/components/marketplace/PromotionalBanner';
import { ProductGridShimmer } from '@/components/marketplace/ShimmerLoader';
import { VendorCard } from '@/components/marketplace/VendorCard';
import { FilterModal } from '@/components/search/FilterModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TourAnchor } from '@/components/tour/TourAnchor';

// Contexts & Utils
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useCategories } from '@/contexts/CategoriesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { productToSimpleProduct, useProducts, type Product } from '@/contexts/ProductsContext';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEALS_ROW_CARD_WIDTH = SCREEN_WIDTH * 0.44;
const ALL_PRODUCTS_PER_PAGE = 18;

// Constants

// Category definitions
const CATEGORIES = [
	{ id: 'birthday', name: 'Birthday', icon: 'gift.fill' },
	{ id: 'valentine', name: 'Valentine', icon: 'heart.fill' },
	{ id: 'mother', name: 'Mother', icon: 'heart.circle.fill' },
	{ id: 'father', name: 'Father', icon: 'person.fill' },
	{ id: 'christmas', name: 'Christmas', icon: 'tree.fill' },
	{ id: 'couples', name: 'Couples', icon: 'heart.2.fill' },
	{ id: 'kids', name: 'Kids', icon: 'face.smiling.fill' },
	{ id: 'luxury', name: 'Luxury', icon: 'star.fill' },
	{ id: 'handmade', name: 'Handmade', icon: 'paintbrush.fill' },
];

export default function MarketplaceHomeScreen() {
	const { top, right, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ collection?: string; category?: string }>();
	const pathname = usePathname();
	const { setVisible } = useBottomBarVisibility();

	// Contexts
	const { products, collections, loading, refreshProducts, refreshCollections } = useProducts();
	const { unreadCount } = useNotifications();
	const { categories } = useCategories();

	// Filter collections to only show bundles with products
	const bundlesWithProducts = useMemo(() => {
		return collections.filter(collection => collection.products && collection.products.length > 0);
	}, [collections]);

	// State
	const [refreshing, setRefreshing] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(params.category || null);
	const [searchQuery, setSearchQuery] = useState('');
	const [showFilters, setShowFilters] = useState(false);
	const [cartRequiredDialog, setCartRequiredDialog] = useState<null | { title: string; message: string }>(null);
	const [allProductsPage, setAllProductsPage] = useState(1);
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [filters, setFilters] = useState<{
		categories: string[];
		priceRange: { min: number; max: number };
		vendors: string[];
		verifiedVendorsOnly: boolean;
		minRating: number;
		sortBy: any;
	}>({
		categories: [],
		priceRange: { min: 0, max: 1000 },
		vendors: [],
		verifiedVendorsOnly: false,
		minRating: 0,
		sortBy: 'recommended',
	});

	// Ensure bottom bar is visible
	useEffect(() => {
		setVisible(true);
	}, [setVisible]);

	// Update selected category when category param changes
	useEffect(() => {
		if (params.category) {
			setSelectedCategory(params.category);
			// Clear database category filters when category chip is selected via param
			setFilters(prev => ({
				...prev,
				categories: [],
			}));
		}
	}, [params.category]);

	// Reset All Products pagination when filters/search change
	useEffect(() => {
		setAllProductsPage(1);
	}, [searchQuery, selectedCategory, filters]);

	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCollections()]);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCollections]);

	// Fetch vendor info for products
	useEffect(() => {
		const fetchVendors = async () => {
			const vendorIds = Array.from(
				new Set(products.filter(p => p.vendorId).map(p => p.vendorId!))
			);
			if (vendorIds.length > 0) {
				const vendors = await getVendorsInfo(vendorIds);
				setVendorsMap(vendors);
			}
		};

		if (products.length > 0) {
			fetchVendors();
		}
	}, [products]);

	// Filter products
	const filteredProducts = useMemo(() => {
		let filtered = products.filter(p => p.isActive);

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(p =>
				p.name.toLowerCase().includes(query) ||
				p.description?.toLowerCase().includes(query) ||
				p.tags.some(tag => tag.toLowerCase().includes(query))
			);
		}

		// Filter by categories from filter modal (database category IDs)
		if (filters.categories.length > 0) {
			filtered = filtered.filter(p =>
				filters.categories.some(catId => p.categoryIds?.includes(catId))
			);
		}

		// Filter by selected category chip (hardcoded category IDs - semantic filtering)
		// This uses semantic matching (tags, occasionTags, etc.) and should NOT conflict with database categories
		if (selectedCategory && filters.categories.length === 0) {
			filtered = filtered.filter(p => {
				if (selectedCategory === 'deals') {
					return p.discountPercentage > 0;
				}

				// Map category IDs to product attributes
				const categoryMap: Record<string, (p: Product) => boolean> = {
					'birthday': (p) =>
						p.occasionTags?.includes('birthday') ||
						p.tags.some(tag => tag.toLowerCase().includes('birthday')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('birthday')),
					'valentine': (p) =>
						p.occasionTags?.includes('valentine') ||
						p.tags.some(tag => tag.toLowerCase().includes('valentine')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('valentine')),
					'mother': (p) =>
						p.targetAudience?.includes('for-her') ||
						p.relationshipTags?.includes('family') ||
						p.tags.some(tag => tag.toLowerCase().includes('mother') || tag.toLowerCase().includes('mom')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('mother')),
					'father': (p) =>
						p.targetAudience?.includes('for-him') ||
						p.relationshipTags?.includes('family') ||
						p.tags.some(tag => tag.toLowerCase().includes('father') || tag.toLowerCase().includes('dad')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('father')),
					'christmas': (p) =>
						p.occasionTags?.includes('christmas') ||
						p.tags.some(tag => tag.toLowerCase().includes('christmas') || tag.toLowerCase().includes('holiday')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('christmas')),
					'couples': (p) =>
						p.relationshipTags?.includes('romantic') ||
						p.giftStyleTags?.includes('romantic') ||
						p.tags.some(tag => tag.toLowerCase().includes('couple') || tag.toLowerCase().includes('romantic')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('couple')),
					'kids': (p) =>
						p.ageGroupTags?.some(age => age.includes('child') || age.includes('kid')) ||
						p.targetAudience?.includes('for-kids') ||
						p.tags.some(tag => tag.toLowerCase().includes('kid') || tag.toLowerCase().includes('child')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('kid') || catId.toLowerCase().includes('child')),
					'luxury': (p) =>
						p.giftStyleTags?.includes('luxury') ||
						p.priceRange === 'luxury' ||
						p.tags.some(tag => tag.toLowerCase().includes('luxury') || tag.toLowerCase().includes('premium')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('luxury')),
					'handmade': (p) =>
						p.tags.some(tag => tag.toLowerCase().includes('handmade') || tag.toLowerCase().includes('artisan') || tag.toLowerCase().includes('craft')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('handmade')),
				};

				const filterFn = categoryMap[selectedCategory];
				return filterFn ? filterFn(p) : false;
			});
		}

		// Filter by price range
		filtered = filtered.filter(p => {
			const price = p.discountPercentage > 0
				? p.price * (1 - p.discountPercentage / 100)
				: p.price;
			return price >= filters.priceRange.min && price <= filters.priceRange.max;
		});

		return filtered;
	}, [products, searchQuery, selectedCategory, filters]);

	const allProductsTotalPages = useMemo(() => {
		return Math.max(1, Math.ceil(filteredProducts.length / ALL_PRODUCTS_PER_PAGE));
	}, [filteredProducts.length]);

	useEffect(() => {
		// Clamp page if product count changes (e.g., filters applied)
		setAllProductsPage(prev => Math.min(prev, allProductsTotalPages));
	}, [allProductsTotalPages]);

	const allProductsPageItems = useMemo(() => {
		const start = (allProductsPage - 1) * ALL_PRODUCTS_PER_PAGE;
		return filteredProducts.slice(start, start + ALL_PRODUCTS_PER_PAGE);
	}, [filteredProducts, allProductsPage]);

	// Get featured products (with discounts)
	const saleProducts = useMemo(() => {
		const isOnSale = (p: Product) => {
			const discount = typeof p.discountPercentage === 'number' ? p.discountPercentage : Number(p.discountPercentage ?? 0);
			const hasDiscount = !Number.isNaN(discount) && discount > 0;
			const hasOriginalPrice =
				typeof (p as any).originalPrice === 'number' &&
				typeof p.price === 'number' &&
				(p as any).originalPrice > p.price;
			return hasDiscount || hasOriginalPrice;
		};

		return products
			.filter(p => p.isActive)
			.filter(isOnSale)
			.sort((a, b) => {
				const da = typeof a.discountPercentage === 'number' ? a.discountPercentage : Number(a.discountPercentage ?? 0);
				const db = typeof b.discountPercentage === 'number' ? b.discountPercentage : Number(b.discountPercentage ?? 0);
				return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
			})
			.slice(0, 12)
			.map(p => {
				const vendor = p.vendorId ? vendorsMap.get(p.vendorId) : undefined;
				const imageUrl = p.imageUrl ? (() => {
					try {
						const parsed = JSON.parse(p.imageUrl);
						return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
					} catch {
						return p.imageUrl;
					}
				})() : undefined;

				return {
					...p,
					vendorName: vendor?.storeName,
					imageUrl,
				};
			});
	}, [products, vendorsMap]);


	// Get vendors with their products
	const featuredVendors = useMemo(() => {
		const vendorProductsMap = new Map<string, Product[]>();

		filteredProducts.forEach(product => {
			if (product.vendorId) {
				if (!vendorProductsMap.has(product.vendorId)) {
					vendorProductsMap.set(product.vendorId, []);
				}
				vendorProductsMap.get(product.vendorId)!.push(product);
			}
		});

		return Array.from(vendorProductsMap.entries())
			.slice(0, 5)
			.map(([vendorId, vendorProducts]) => {
				const vendor = vendorsMap.get(vendorId);
				return {
					vendor: vendor || { id: vendorId, storeName: undefined, profileImageUrl: undefined },
					products: vendorProducts.slice(0, 3).map(p => ({
						id: p.id,
						name: p.name,
						price: p.discountPercentage > 0
							? p.price * (1 - p.discountPercentage / 100)
							: p.price,
						image: p.imageUrl ? (() => {
							try {
								const parsed = JSON.parse(p.imageUrl);
								return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
							} catch {
								return p.imageUrl;
							}
						})() : undefined,
					})),
				};
			})
			.filter(v => v.vendor.storeName); // Only show vendors with names
	}, [filteredProducts, vendorsMap]);

	// User guide banners removed

	const headerPaddingTop = top + 6;
	// Calculate responsive header height: safe area top + padding + search box height + bottom padding
	const headerHeight = headerPaddingTop + 44 + 12; // 44 = searchBox height, 12 = paddingBottom

	return (
		<View style={styles.container}>

			{/* Main Content */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingTop: top + 64,
						paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24
					},
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
				{loading && products.length === 0 ? (
					<>
						<ProductGridShimmer count={9} />
					</>
				) : selectedCategory ? (
					<>
						{/* Category Filter Active - Show Only Filtered Products */}
						<View style={styles.categoryHeader}>
							<Pressable
								style={styles.clearFilterButton}
								onPress={() => setSelectedCategory(null)}
							>
								<IconSymbol name="xmark.circle.fill" size={20} color={GIFTYY_THEME.colors.gray600} />
							</Pressable>
							<Text style={styles.categoryHeaderTitle}>
								{CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Category'}
							</Text>
							<Text style={styles.categoryHeaderSubtitle}>
								{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
							</Text>
						</View>

						{filteredProducts.length > 0 ? (
							<View style={styles.dealsGrid}>
								{filteredProducts.map((product, index) => {
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
									// Use 3-column width from theme
									const threeColumnWidth = GIFTYY_THEME.layout.cardWidth3Col;

									return (
										<Animated.View
											key={product.id}
											entering={FadeInUp.duration(400).delay(100 + index * 30)}
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
												width={threeColumnWidth}
												onPress={() => router.push({
													pathname: '/(buyer)/(tabs)/product/[id]',
													params: { id: product.id, returnTo: pathname },
												})}
											/>
										</Animated.View>
									);
								})}
							</View>
						) : (
							<View style={styles.emptyState}>
								<IconSymbol name="square.grid.2x2" size={64} color={GIFTYY_THEME.colors.gray300} />
								<Text style={styles.emptyStateTitle}>No products found</Text>
								<Text style={styles.emptyStateSubtitle}>
									Try selecting a different category
								</Text>
								<Pressable
									style={styles.clearFilterButtonLarge}
									onPress={() => setSelectedCategory(null)}
								>
									<Text style={styles.clearFilterButtonText}>Clear filter</Text>
								</Pressable>
							</View>
						)}
					</>
				) : (
					<>
						{/* Hero Banner removed */}

						{/* Deals Section */}
						{saleProducts.length > 0 && (
							<>
								<TourAnchor step="shop_intro">
									<AnimatedSectionHeader
										title="Deals for You"
										subtitle="Limited time offers"
										icon="tag.fill"
										actionText="See All"
										onActionPress={() => router.push('/(buyer)/deals')}
									/>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.dealsRowContainer}
										nestedScrollEnabled={true}
										scrollEventThrottle={16}
										decelerationRate="fast"
									>
										{saleProducts.slice(0, 12).map((product, index) => (
											<Animated.View
												key={product.id}
												entering={FadeInRight.duration(350).delay(150 + index * 60)}
												style={{ marginRight: index === Math.min(11, saleProducts.length - 1) ? 0 : 12 }}
											>
												<MarketplaceProductCard
													id={product.id}
													name={product.name || ''}
													price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
													originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
													discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
													image={product.imageUrl}
													vendorName={product.vendorName || undefined}
													onPress={() => router.push({
														pathname: '/(buyer)/(tabs)/product/[id]',
														params: { id: product.id, returnTo: pathname },
													})}
													width={DEALS_ROW_CARD_WIDTH}
												/>
											</Animated.View>
										))}
									</ScrollView>
								</TourAnchor>
							</>
						)}

						{/* Vendor Spotlight */}
						{featuredVendors.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="Featured Vendors"
									subtitle="Shop from trusted sellers"
									icon="storefront.fill"
									actionText="See All"
									onActionPress={() => router.push('/(buyer)/vendors')}
								/>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.vendorsContainer}
									nestedScrollEnabled={true}
									scrollEventThrottle={16}
								>
									{featuredVendors.map((item, index) => (
										<Animated.View
											key={item.vendor.id}
											entering={FadeInRight.duration(400).delay(250 + index * 100)}
											style={{ marginRight: 16 }}
										>
											<VendorCard
												id={item.vendor.id}
												name={item.vendor.storeName || 'Vendor'}
												profileImageUrl={item.vendor.profileImageUrl}
												featuredProducts={item.products}
												onPress={() => router.push({
													pathname: '/(buyer)/vendor/[id]',
													params: { id: item.vendor.id, returnTo: pathname },
												})}
											/>
										</Animated.View>
									))}
								</ScrollView>
							</>
						)}


						{/* Giftyy Bundles */}
						{bundlesWithProducts.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="Giftyy Bundles"
									subtitle="Curated gift sets"
									icon="rectangle.grid.2x2"
									actionText="See All"
									onActionPress={() => router.push('/(buyer)/bundles')}
								/>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.collectionsContainer}
									nestedScrollEnabled={true}
									scrollEventThrottle={16}
								>
									{bundlesWithProducts.slice(0, 5).map((collection, index) => {
										const collectionProducts = collection.products.map(productToSimpleProduct);
										const firstProductImage = collectionProducts[0]?.image ? (() => {
											try {
												const parsed = JSON.parse(collectionProducts[0].image);
												return Array.isArray(parsed) ? parsed[0] : collectionProducts[0].image;
											} catch {
												return collectionProducts[0].image;
											}
										})() : undefined;

										return (
											<Animated.View
												key={collection.id}
												entering={FadeInRight.duration(400).delay(350 + index * 100)}
												style={{ marginRight: 16 }}
											>
												<Pressable
													style={[styles.collectionCard, { backgroundColor: collection.color }]}
													onPress={() => router.push({
														pathname: '/(buyer)/bundle/[id]',
														params: { id: collection.id },
													})}
												>
													<LinearGradient
														colors={[collection.color, collection.color + 'DD']}
														style={styles.collectionGradient}
													>
														{firstProductImage && (
															<Image
																source={{ uri: firstProductImage }}
																style={styles.collectionImage}
																resizeMode="cover"
															/>
														)}
														<View style={styles.collectionContent}>
															<Text style={styles.collectionTitle}>{collection.title}</Text>
															{collection.description && (
																<Text style={styles.collectionDescription} numberOfLines={2}>
																	{collection.description}
																</Text>
															)}
															<Text style={styles.collectionProductCount}>
																{collectionProducts.length} products
															</Text>
														</View>
													</LinearGradient>
												</Pressable>
											</Animated.View>
										);
									})}
								</ScrollView>
							</>
						)}

						{/* All Products Grid */}
						{filteredProducts.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="All Products"
									subtitle={`${filteredProducts.length} items available • Page ${allProductsPage} of ${allProductsTotalPages}`}
									icon="square.grid.3x3"
								/>
								<View style={styles.allProductsGrid}>
									{allProductsPageItems.map((product, index) => {
										const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
										const imageUrl = product.imageUrl ? (() => {
											try {
												const parsed = JSON.parse(product.imageUrl);
												return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
											} catch {
												return product.imageUrl;
											}
										})() : undefined;

										// True 3-column grid width with consistent gaps
										const gridGap = 10;
										const gridPadding = GIFTYY_THEME.spacing.lg;
										const threeColumnWidth = (SCREEN_WIDTH - gridPadding * 2 - gridGap * 2) / 3;

										return (
											<Animated.View
												key={product.id}
												entering={FadeInUp.duration(400).delay(400 + index * 30)}
												style={{ width: threeColumnWidth, marginBottom: gridGap }}
											>
												<MarketplaceProductCard
													id={product.id}
													name={product.name || ''}
													price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
													originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
													discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
													image={imageUrl}
													vendorName={vendor?.storeName || undefined}
													width={threeColumnWidth}
													onPress={() => router.push({
														pathname: '/(buyer)/(tabs)/product/[id]',
														params: { id: product.id, returnTo: pathname },
													})}
												/>
											</Animated.View>
										);
									})}
								</View>
								{allProductsTotalPages > 1 && (
									<View style={styles.paginationContainer}>
										<Pressable
											onPress={() => setAllProductsPage(p => Math.max(1, p - 1))}
											disabled={allProductsPage <= 1}
											style={[
												styles.paginationButton,
												allProductsPage <= 1 && styles.paginationButtonDisabled,
											]}
										>
											<Text style={styles.paginationButtonText}>Prev</Text>
										</Pressable>

										<Text style={styles.paginationText}>
											{allProductsPage} / {allProductsTotalPages}
										</Text>

										<Pressable
											onPress={() => setAllProductsPage(p => Math.min(allProductsTotalPages, p + 1))}
											disabled={allProductsPage >= allProductsTotalPages}
											style={[
												styles.paginationButton,
												allProductsPage >= allProductsTotalPages && styles.paginationButtonDisabled,
											]}
										>
											<Text style={styles.paginationButtonText}>Next</Text>
										</Pressable>
									</View>
								)}
							</>
						)}
					</>
				)}
			</ScrollView>

			{/* Filters Modal */}
			<FilterModal
				visible={showFilters}
				onClose={() => setShowFilters(false)}
				filters={filters}
				onFiltersChange={(newFilters) => {
					// Clear category chip selection when database categories are selected
					if (newFilters.categories.length > 0) {
						setSelectedCategory(null);
					}

					setFilters(newFilters);
					// Navigate to search page with filters applied
					const hasActiveFilters = newFilters.categories.length > 0 ||
						newFilters.priceRange.min > 0 ||
						newFilters.priceRange.max < 1000;

					if (hasActiveFilters) {
						// Encode filters as URL parameters
						const params: Record<string, string> = {};
						if (newFilters.categories.length > 0) {
							params.categories = newFilters.categories.join(',');
						}
						if (newFilters.priceRange.min > 0) {
							params.minPrice = newFilters.priceRange.min.toString();
						}
						if (newFilters.priceRange.max < 1000) {
							params.maxPrice = newFilters.priceRange.max.toString();
						}
						if (newFilters.sortBy !== 'recommended') {
							params.sortBy = newFilters.sortBy;
						}

						setShowFilters(false);
						router.push({
							pathname: '/(buyer)/(tabs)/search',
							params,
						});
					} else {
						setShowFilters(false);
					}
				}}
				onReset={() => {
					setFilters({
						categories: [],
						priceRange: { min: 0, max: 1000 },
						vendors: [],
						verifiedVendorsOnly: false,
						minRating: 0,
						sortBy: 'recommended',
					});
					setSelectedCategory(null);
				}}
				categories={categories}
			/>

			{/* Cart required dialog (for card/video features) */}
			<Modal
				transparent
				visible={!!cartRequiredDialog}
				animationType="fade"
				onRequestClose={() => setCartRequiredDialog(null)}
			>
				<Pressable style={styles.dialogOverlay} onPress={() => setCartRequiredDialog(null)}>
					<Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
						<View style={styles.dialogIconCircle}>
							<IconSymbol name="cart.fill" size={22} color="#ffffff" />
						</View>
						<Text style={styles.dialogTitle}>{cartRequiredDialog?.title || ''}</Text>
						<Text style={styles.dialogMessage}>{cartRequiredDialog?.message || ''}</Text>

						<View style={styles.dialogActions}>
							<Pressable
								style={styles.dialogSecondaryButton}
								onPress={() => {
									setCartRequiredDialog(null);
									router.push('/(buyer)/(tabs)/cart');
								}}
								accessibilityRole="button"
								accessibilityLabel="Go to cart"
							>
								<Text style={styles.dialogSecondaryText}>Go to cart</Text>
							</Pressable>
							<Pressable
								style={styles.dialogPrimaryButton}
								onPress={() => setCartRequiredDialog(null)}
								accessibilityRole="button"
								accessibilityLabel="Browse gifts"
							>
								<Text style={styles.dialogPrimaryText}>Browse gifts</Text>
							</Pressable>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

			{/* Gift suggestion explanation removed for a cleaner personalized section */}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'transparent',
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
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	searchBox: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: GIFTYY_THEME.radius.md,
		paddingHorizontal: 14,
		height: 44,
		marginRight: 8,
		...GIFTYY_THEME.shadows.sm,
	},
	searchInput: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray900,
	},
	filterButton: {
		width: 44,
		height: 44,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
	},
	notificationButton: {
		width: 44,
		height: 44,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		position: 'relative',
		...GIFTYY_THEME.shadows.sm,
	},
	notificationBadge: {
		position: 'absolute',
		top: 6,
		right: 6,
		minWidth: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: GIFTYY_THEME.colors.error,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.white,
	},
	notificationBadgeText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		// paddingTop is now calculated dynamically in contentContainerStyle based on header height
	},
	categoriesContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	productsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	dealsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		justifyContent: 'flex-start',
	},
	allProductsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		justifyContent: 'space-between',
	},
	dealsRowContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	paginationContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingTop: GIFTYY_THEME.spacing.sm,
		paddingBottom: GIFTYY_THEME.spacing.xl,
	},
	paginationButton: {
		minWidth: 86,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		alignItems: 'center',
		justifyContent: 'center',
	},
	paginationButtonDisabled: {
		opacity: 0.5,
	},
	paginationButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray800,
	},
	dialogOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		justifyContent: 'center',
		paddingHorizontal: 22,
	},
	dialogCard: {
		backgroundColor: '#ffffff',
		borderRadius: 22,
		padding: 18,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.06)',
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		elevation: 6,
		alignItems: 'center',
	},
	dialogIconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	dialogTitle: {
		fontSize: 18,
		fontWeight: '900',
		color: GIFTYY_THEME.colors.gray900,
		textAlign: 'center',
	},
	dialogMessage: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
	},
	dialogActions: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 16,
		width: '100%',
	},
	dialogSecondaryButton: {
		flex: 1,
		borderRadius: 999,
		paddingVertical: 12,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(17,24,39,0.14)',
		backgroundColor: '#ffffff',
	},
	dialogSecondaryText: {
		color: GIFTYY_THEME.colors.gray900,
		fontWeight: '800',
	},
	dialogPrimaryButton: {
		flex: 1,
		borderRadius: 999,
		paddingVertical: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	dialogPrimaryText: {
		color: '#ffffff',
		fontWeight: '900',
	},
	paginationText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray600,
	},
	vendorsContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	collectionsContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	collectionCard: {
		width: SCREEN_WIDTH * 0.75,
		height: 200,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
	},
	collectionGradient: {
		flex: 1,
		padding: GIFTYY_THEME.spacing.xl,
		justifyContent: 'flex-end',
		position: 'relative',
	},
	collectionImage: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		opacity: 0.3,
	},
	collectionContent: {
		zIndex: 1,
	},
	collectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
		marginBottom: 6,
		textShadowColor: 'rgba(0, 0, 0, 0.3)',
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 4,
	},
	collectionDescription: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.white,
		opacity: 0.9,
		marginBottom: 4,
	},
	collectionProductCount: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.white,
		opacity: 0.8,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
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
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	modalCloseButton: {
		padding: GIFTYY_THEME.spacing.xs,
	},
	modalExplanation: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.normal,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: 24,
		textAlign: 'center',
	},
	modalBody: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.xl,
	},
	filterSectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	filterChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	filterChip: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	filterChipActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	filterChipText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
	},
	filterChipTextActive: {
		color: GIFTYY_THEME.colors.primary,
	},
	modalFooter: {
		flexDirection: 'row',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	modalButtonSecondary: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: GIFTYY_THEME.radius.md,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray300,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalButtonSecondaryText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
	},
	modalButtonPrimary: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	modalButtonPrimaryText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
	categoryHeader: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	clearFilterButton: {
		width: 40,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	categoryHeaderTitle: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	categoryHeaderSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: GIFTYY_THEME.spacing['5xl'],
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	emptyStateTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginTop: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	emptyStateSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	clearFilterButtonLarge: {
		paddingVertical: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.primary,
		...GIFTYY_THEME.shadows.md,
	},
	clearFilterButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
});

