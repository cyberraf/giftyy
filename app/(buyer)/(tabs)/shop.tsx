/**
 * Giftyy Premium Marketplace Home Screen
 * Modern marketplace design with animations, hero section, categories, product grids, and vendor spotlight
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	Modal,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View
} from 'react-native';
import Animated, {
	FadeInRight,
	FadeInUp
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation, Trans } from 'react-i18next';

// Components
import { AnimatedSectionHeader } from '@/components/marketplace/AnimatedSectionHeader';
import { MarketplaceProductCard } from '@/components/marketplace/MarketplaceProductCard';
import { PromotionalBanner } from '@/components/marketplace/PromotionalBanner';
import { ProductGridShimmer } from '@/components/marketplace/ShimmerLoader';
import { VendorCard } from '@/components/marketplace/VendorCard';
import { FilterModal } from '@/components/search/FilterModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TourAnchor } from '@/components/tour/TourAnchor';

// Contexts & Utils
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { hapticLight } from '@/lib/utils/haptics';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useCategories } from '@/contexts/CategoriesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { productToSimpleProduct, useProducts, type Product } from '@/contexts/ProductsContext';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEALS_ROW_CARD_WIDTH = SCREEN_WIDTH * 0.44;
const ALL_PRODUCTS_PER_PAGE = 64;

// Constants

// Category definitions
const CATEGORIES = [
	{ id: 'birthday', nameKey: 'shop.category_labels.birthday', icon: 'gift.fill' },
	{ id: 'valentine', nameKey: 'shop.category_labels.valentine', icon: 'heart.fill' },
	{ id: 'mother', nameKey: 'shop.category_labels.mother', icon: 'heart.circle.fill' },
	{ id: 'father', nameKey: 'shop.category_labels.father', icon: 'person.fill' },
	{ id: 'christmas', nameKey: 'shop.category_labels.christmas', icon: 'tree.fill' },
	{ id: 'couples', nameKey: 'shop.category_labels.couples', icon: 'heart.2.fill' },
	{ id: 'kids', nameKey: 'shop.category_labels.kids', icon: 'face.smiling.fill' },
	{ id: 'luxury', nameKey: 'shop.category_labels.luxury', icon: 'star.fill' },
	{ id: 'handmade', nameKey: 'shop.category_labels.handmade', icon: 'paintbrush.fill' },
];

export default function MarketplaceHomeScreen() {
	const { top, right, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ collection?: string; category?: string }>();
	const pathname = usePathname();
	const { setVisible } = useBottomBarVisibility();
	const { t } = useTranslation();

	// Contexts
	const { products, collections, loading, hasMore, refreshProducts, loadMoreProducts, refreshCollections } = useProducts();
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
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [shopPage, setShopPage] = useState(1);
	const [innerVisibleCount, setInnerVisibleCount] = useState(30);
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

	const scrollRef = useRef<FlatList>(null);
	useScrollToTop(scrollRef);

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

	// Reset inner pagination when filters/search change
	useEffect(() => {
		setShopPage(1);
		setInnerVisibleCount(30);
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
		let filtered = products.filter(p => p.isActive && p.stockQuantity > 0);

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

	// items for the current page (max 60)
	const itemsForCurrentPage = useMemo(() => {
		const start = (shopPage - 1) * 60;
		const end = shopPage * 60;
		return filteredProducts.slice(start, end);
	}, [filteredProducts, shopPage]);

	// items currently visible in the grid (30-60, incrementing by 6)
	const allProductsPageItems = useMemo(() => {
		return itemsForCurrentPage.slice(0, innerVisibleCount);
	}, [itemsForCurrentPage, innerVisibleCount]);

	const allProductsSubtitle = t('shop.pagination.status', { page: shopPage, visible: allProductsPageItems.length, total: itemsForCurrentPage.length });

	const handleNextPage = useCallback(async () => {
		if (loading) return;

		const nextPage = shopPage + 1;
		// If we need more products from context to satisfy the next page
		if (filteredProducts.length < nextPage * 60 && hasMore) {
			await loadMoreProducts();
		}
		hapticLight();
		setShopPage(nextPage);
		setInnerVisibleCount(30);
		scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
	}, [shopPage, filteredProducts.length, hasMore, loadMoreProducts, loading]);

	const handlePrevPage = useCallback(() => {
		if (shopPage > 1) {
			hapticLight();
			setShopPage(prev => prev - 1);
			setInnerVisibleCount(60); // Show full page when going back
			scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
		}
	}, [shopPage]);

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
				return {
					...p,
					vendorName: vendor?.storeName,
					imageUrl: p.imageUrl,
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

	const renderHeader = () => (
		<View>
			{loading && products.length === 0 ? (
				<ProductGridShimmer count={9} />
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
							{selectedCategory === 'deals' ? t('shop.category_labels.deals') : t(CATEGORIES.find(c => c.id === selectedCategory)?.nameKey || 'shop.category_labels.category_fallback', { defaultValue: 'Category' })}
						</Text>
						<Text style={styles.categoryHeaderSubtitle}>
							{filteredProducts.length} {filteredProducts.length === 1 ? t('shop.unit.product') : t('shop.unit.products')}
						</Text>
					</View>

					{filteredProducts.length === 0 && (
						<View style={styles.emptyState}>
							<IconSymbol name="square.grid.2x2" size={64} color={GIFTYY_THEME.colors.gray300} />
							<Text style={styles.emptyStateTitle}>{t('shop.empty.title')}</Text>
							<Text style={styles.emptyStateSubtitle}>
								{t('shop.empty.subtitle')}
							</Text>
							<Pressable
								style={styles.clearFilterButtonLarge}
								onPress={() => setSelectedCategory(null)}
							>
								<Text style={styles.clearFilterButtonText}>{t('shop.empty.clear_filter')}</Text>
							</Pressable>
						</View>
					)}
				</>
			) : (
				<>
					{/* Deals Section */}
					{saleProducts.length > 0 && (
						<>
							<TourAnchor step="shop_intro">
								<AnimatedSectionHeader
									title={t('shop.sections.deals_title')}
									subtitle={t('shop.sections.deals_subtitle')}
									icon="tag.fill"
									actionText={t('home.recipients.see_all')}
									onActionPress={() => router.push('/(buyer)/deals')}
								/>
								<FlatList
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.dealsRowContainer}
									data={saleProducts.slice(0, 12)}
									keyExtractor={(item) => `sale-${item.id}`}
									renderItem={({ item, index }) => (
										<View
											style={{ marginRight: index === Math.min(11, saleProducts.length - 1) ? 0 : 12 }}
										>
											<MarketplaceProductCard
												id={item.id}
												name={item.name || ''}
												price={typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0}
												originalPrice={item.originalPrice !== undefined && item.originalPrice > item.price ? item.originalPrice : (typeof item.discountPercentage === 'number' && item.discountPercentage > 0 && typeof item.price === 'number' && !isNaN(item.price) ? item.price / (1 - item.discountPercentage / 100) : undefined)}
												discountPercentage={typeof item.discountPercentage === 'number' && !isNaN(item.discountPercentage) ? item.discountPercentage : undefined}
												imageUrl={item.imageUrl}
												vendorName={item.vendorName || undefined}
												onPress={() => router.push({
													pathname: '/(buyer)/(tabs)/product/[id]',
													params: { id: item.id, returnTo: pathname },
												})}
												width={DEALS_ROW_CARD_WIDTH}
											/>
										</View>
									)}
								/>
							</TourAnchor>
						</>
					)}

					{/* Vendor Spotlight */}
					{featuredVendors.length > 0 && (
						<>
							<AnimatedSectionHeader
								title={t('shop.sections.vendors_title')}
								subtitle={t('shop.sections.vendors_subtitle')}
								icon="storefront.fill"
								actionText={t('home.recipients.see_all')}
								onActionPress={() => router.push('/(buyer)/vendors')}
							/>
							<FlatList
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.vendorsContainer}
								data={featuredVendors}
								keyExtractor={(item) => `vendor-${item.vendor.id}`}
								renderItem={({ item, index }) => (
									<View
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
									</View>
								)}
							/>
						</>
					)}

					{/* Giftyy Bundles */}
					{bundlesWithProducts.length > 0 && (
						<>
							<AnimatedSectionHeader
								title={t('shop.sections.bundles_title')}
								subtitle={t('shop.sections.bundles_subtitle')}
								icon="rectangle.grid.2x2"
								actionText={t('home.recipients.see_all')}
								onActionPress={() => router.push('/(buyer)/bundles')}
							/>
							<FlatList
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.collectionsContainer}
								data={bundlesWithProducts.slice(0, 5)}
								keyExtractor={(item) => `bundle-${item.id}`}
								renderItem={({ item, index }) => {
									const collectionProducts = item.products.map(productToSimpleProduct);
									const firstProductImage = collectionProducts[0]?.image ? (() => {
										try {
											const parsed = JSON.parse(collectionProducts[0].image);
											return Array.isArray(parsed) ? parsed[0] : collectionProducts[0].image;
										} catch {
											return collectionProducts[0].image;
										}
									})() : undefined;

									const bundleColor = item.color || '#f75507'; // Fallback to primary color
									return (
										<View
											style={{ marginRight: 16 }}
										>
											<Pressable
												style={[styles.collectionCard, { backgroundColor: bundleColor }]}
												onPress={() => router.push({
													pathname: '/(buyer)/bundle/[id]',
													params: { id: item.id },
												})}
											>
												<LinearGradient
													colors={[bundleColor, bundleColor + 'DD']}
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
														<Text style={styles.collectionTitle}>{item.title}</Text>
														{item.description && (
															<Text style={styles.collectionDescription} numberOfLines={2}>
																{item.description}
															</Text>
														)}
														<Text style={styles.collectionProductCount}>
															{collectionProducts.length} {collectionProducts.length === 1 ? t('shop.unit.product') : t('shop.unit.products')}
														</Text>
													</View>
												</LinearGradient>
											</Pressable>
										</View>
									);
								}}
							/>
						</>
					)}

					{/* All Products Grid Title */}
					{filteredProducts.length > 0 && (
						<AnimatedSectionHeader
							title={t('shop.sections.all_products')}
							subtitle={allProductsSubtitle}
							icon="square.grid.3x3"
						/>
					)}
				</>
			)}
		</View>
	);

	const renderItem = ({ item, index }: { item: Product, index: number }) => {
		const vendor = item.vendorId ? vendorsMap.get(item.vendorId) : undefined;
		const imageUrl = item.imageUrl;

		// True 3-column grid width with consistent gaps
		const gridGap = 10;
		const gridPadding = GIFTYY_THEME.spacing.lg;
		const threeColumnWidth = (SCREEN_WIDTH - gridPadding * 2 - gridGap * 2) / 3;

		return (
			<View
				style={{ width: threeColumnWidth, marginBottom: gridGap }}
			>
				<MarketplaceProductCard
					id={item.id}
					name={item.name || ''}
					price={typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0}
					originalPrice={item.originalPrice !== undefined && item.originalPrice > item.price ? item.originalPrice : (typeof item.discountPercentage === 'number' && item.discountPercentage > 0 && typeof item.price === 'number' && !isNaN(item.price) ? item.price / (1 - item.discountPercentage / 100) : undefined)}
					discountPercentage={typeof item.discountPercentage === 'number' && !isNaN(item.discountPercentage) ? item.discountPercentage : undefined}
					imageUrl={imageUrl}
					vendorName={vendor?.storeName || undefined}
					width={threeColumnWidth}
					onPress={() => router.push({
						pathname: '/(buyer)/(tabs)/product/[id]',
						params: { id: item.id, returnTo: pathname },
					})}
				/>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<FlatList
				ref={scrollRef}
				data={allProductsPageItems}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				ListHeaderComponent={renderHeader}
				numColumns={3}
				columnWrapperStyle={styles.columnWrapper}
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingTop: top + 72,
						paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24
					},
				]}
				onEndReached={() => {
					if (innerVisibleCount < itemsForCurrentPage.length && innerVisibleCount < 60) {
						// Load next 2 rows (6 items)
						setInnerVisibleCount(prev => Math.min(60, prev + 6));
					}
				}}
				onEndReachedThreshold={0.5}
				showsVerticalScrollIndicator={false}
				maxToRenderPerBatch={12}
				windowSize={7}
				removeClippedSubviews={true}
				initialNumToRender={9}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={GIFTYY_THEME.colors.primary}
						colors={[GIFTYY_THEME.colors.primary]}
					/>
				}
				ListFooterComponent={() => {
					const isPageComplete = innerVisibleCount >= itemsForCurrentPage.length || innerVisibleCount >= 60;
					const hasNextPage = (shopPage * 60 < filteredProducts.length) || hasMore;

					return (
						<View style={styles.footerContainer}>
							{loading && (
								<View style={{ paddingVertical: 20 }}>
									<ActivityIndicator color={GIFTYY_THEME.colors.primary} />
								</View>
							)}

							{!loading && isPageComplete && (
								<View style={styles.paginationControls}>
									<Pressable
										style={[styles.paginationButton, shopPage === 1 && styles.paginationButtonDisabled]}
										onPress={handlePrevPage}
										disabled={shopPage === 1}
									>
										<IconSymbol name="chevron.left" size={20} color={shopPage === 1 ? GIFTYY_THEME.colors.gray400 : GIFTYY_THEME.colors.gray800} />
										<Text style={[styles.paginationButtonText, shopPage === 1 && { color: GIFTYY_THEME.colors.gray400 }]}>{t('shop.pagination.previous')}</Text>
									</Pressable>

									<Text style={styles.paginationPageIndicator}>Page {shopPage} of {Math.max(shopPage, Math.ceil(filteredProducts.length / 60))}</Text>

									<Pressable
										style={[styles.paginationButton, !hasNextPage && styles.paginationButtonDisabled]}
										onPress={handleNextPage}
										disabled={!hasNextPage}
									>
										<Text style={[styles.paginationButtonText, !hasNextPage && { color: GIFTYY_THEME.colors.gray400 }]}>{t('shop.pagination.next')}</Text>
										<IconSymbol name="chevron.right" size={20} color={!hasNextPage ? GIFTYY_THEME.colors.gray400 : GIFTYY_THEME.colors.gray800} />
									</Pressable>
								</View>
							)}
						</View>
					);
				}}
			/>

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
								accessibilityLabel={t('shop.cart_dialog.go_to_cart')}
							>
								<Text style={styles.dialogSecondaryText}>{t('shop.cart_dialog.go_to_cart')}</Text>
							</Pressable>
							<Pressable
								style={styles.dialogPrimaryButton}
								onPress={() => setCartRequiredDialog(null)}
								accessibilityRole="button"
								accessibilityLabel={t('shop.cart_dialog.browse_gifts')}
							>
								<Text style={styles.dialogPrimaryText}>{t('shop.cart_dialog.browse_gifts')}</Text>
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
	footerContainer: {
		paddingVertical: 32,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		alignItems: 'center',
	},
	paginationControls: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		paddingTop: 10,
	},
	paginationPageIndicator: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	paginationButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
	},
	paginationButtonDisabled: {
		opacity: 0.5,
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	paginationButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray800,
		marginHorizontal: 4,
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
	columnWrapper: {
		justifyContent: 'flex-start',
		gap: 10,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
});

