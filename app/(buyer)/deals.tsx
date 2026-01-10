/**
 * Deals & Specials Page
 * Showcases limited-time offers, vendor promotions, trending gift deals, and seasonal discounts
 * Designed to feel energetic, visually colorful, and irresistible
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
	View
} from 'react-native';
import Animated, {
	FadeInDown,
	FadeInUp,
	useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import { DealCategoryTabs } from '@/components/deals/DealCategoryTabs';
import { MarketplaceProductCard } from '@/components/marketplace/ProductCard';
import { LightningDealCard } from '@/components/deals/LightningDealCard';
import { VendorPromotionCard } from '@/components/deals/VendorPromotionCard';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Contexts & Utils
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import type { Product } from '@/contexts/ProductsContext';
import { useProducts } from '@/contexts/ProductsContext';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 3-column grid card width (matches styles.scrollContent padding + the 12px inter-card spacing used in the grid)
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - (GIFTYY_THEME.spacing.lg * 2) - (GRID_GAP * 2)) / 3;

type DealCategory = 'flash' | 'top-picks' | 'seasonal' | 'vendor-specials' | 'under-20' | 'last-chance';
type SortOption = 'discount-high' | 'discount-low' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc';

type FilterState = {
	minPrice: number | null;
	maxPrice: number | null;
	minDiscount: number | null;
	maxDiscount: number | null;
	sortBy: SortOption;
};

export default function DealsScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { setVisible } = useBottomBarVisibility();
	
	// Contexts
	const { products, loading, refreshProducts } = useProducts();
	
	// State
	const [refreshing, setRefreshing] = useState(false);
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [activeCategory, setActiveCategory] = useState<DealCategory>('flash');
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState<FilterState>({
		minPrice: null,
		maxPrice: null,
		minDiscount: null,
		maxDiscount: null,
		sortBy: 'discount-high',
	});
	
	// Ensure bottom bar is visible
	useEffect(() => {
		setVisible(true);
	}, [setVisible]);
	
	// Fetch vendor info for products
	useEffect(() => {
		const fetchVendors = async () => {
			const vendorIds = Array.from(
				new Set(products.filter(p => p.vendorId && p.isActive && p.discountPercentage > 0).map(p => p.vendorId!))
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
	
	// Get all products with discounts
	const dealsProducts = useMemo(() => {
		return products
			.filter(p => p.isActive && p.discountPercentage > 0)
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
					vendorInfo: vendor,
					imageUrl,
				};
			});
	}, [products, vendorsMap]);
	
	// Filter deals by category and additional filters
	const filteredDeals = useMemo(() => {
		let filtered = [...dealsProducts];
		
		// Apply category filter
		switch (activeCategory) {
			case 'flash':
				// Highest discounts
				filtered = filtered.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));
				break;
			case 'top-picks':
				// Best selling or high-rated deals (keep all for now)
				break;
			case 'seasonal':
				// Seasonal/occasion-based products
				filtered = filtered.filter(p => 
					p.tags?.some(tag => ['birthday', 'valentine', 'christmas', 'mother', 'father', 'holiday', 'anniversary'].includes(tag.toLowerCase())) ||
					p.occasionTags?.some(tag => ['birthday', 'valentine', 'christmas', 'mother', 'father'].includes(tag.toLowerCase()))
				);
				break;
			case 'vendor-specials':
				// Products with vendor info
				filtered = filtered.filter(p => p.vendorInfo);
				break;
			case 'under-20':
				// Products under $20 after discount
				filtered = filtered.filter(p => {
					const price = p.price || 0;
					const discount = (p.discountPercentage || 0) / 100;
					return (price * (1 - discount)) < 20;
				});
				break;
			case 'last-chance':
				// Products with high discount (50%+)
				filtered = filtered.filter(p => (p.discountPercentage || 0) >= 50);
				break;
		}
		
		// Apply price filters
		if (filters.minPrice !== null) {
			filtered = filtered.filter(p => {
				const price = p.price || 0;
				const discount = (p.discountPercentage || 0) / 100;
				const finalPrice = price * (1 - discount);
				return finalPrice >= filters.minPrice!;
			});
		}
		
		if (filters.maxPrice !== null) {
			filtered = filtered.filter(p => {
				const price = p.price || 0;
				const discount = (p.discountPercentage || 0) / 100;
				const finalPrice = price * (1 - discount);
				return finalPrice <= filters.maxPrice!;
			});
		}
		
		// Apply discount filters
		if (filters.minDiscount !== null) {
			filtered = filtered.filter(p => (p.discountPercentage || 0) >= filters.minDiscount!);
		}
		
		if (filters.maxDiscount !== null) {
			filtered = filtered.filter(p => (p.discountPercentage || 0) <= filters.maxDiscount!);
		}
		
		// Apply sorting
		switch (filters.sortBy) {
			case 'discount-high':
				filtered.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));
				break;
			case 'discount-low':
				filtered.sort((a, b) => (a.discountPercentage || 0) - (b.discountPercentage || 0));
				break;
			case 'price-low':
				filtered.sort((a, b) => {
					const priceA = (a.price || 0) * (1 - (a.discountPercentage || 0) / 100);
					const priceB = (b.price || 0) * (1 - (b.discountPercentage || 0) / 100);
					return priceA - priceB;
				});
				break;
			case 'price-high':
				filtered.sort((a, b) => {
					const priceA = (a.price || 0) * (1 - (a.discountPercentage || 0) / 100);
					const priceB = (b.price || 0) * (1 - (b.discountPercentage || 0) / 100);
					return priceB - priceA;
				});
				break;
			case 'name-asc':
				filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
				break;
			case 'name-desc':
				filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
				break;
		}
		
		return filtered;
	}, [dealsProducts, activeCategory, filters]);
	
	// Get flash deals (top 6 highest discounts)
	const flashDeals = useMemo(() => {
		return dealsProducts
			.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0))
			.slice(0, 6);
	}, [dealsProducts]);
	
	// Get lightning deals (flash deals with simulated stock)
	const lightningDeals = useMemo(() => {
		return flashDeals.slice(0, 3).map((deal, index) => ({
			...deal,
			stockClaimed: Math.floor(Math.random() * 60) + 20, // 20-80% claimed
			totalStock: 100,
		}));
	}, [flashDeals]);
	
	// Get vendor promotions (unique vendors)
	const vendorPromotions = useMemo(() => {
		const vendorMap = new Map<string, Product[]>();
		dealsProducts.forEach(product => {
			if (product.vendorId && product.vendorInfo) {
				if (!vendorMap.has(product.vendorId)) {
					vendorMap.set(product.vendorId, []);
				}
				vendorMap.get(product.vendorId)!.push(product);
			}
		});
		
		return Array.from(vendorMap.entries())
			.filter(([_, products]) => products.length > 0)
			.slice(0, 4)
			.map(([vendorId, vendorProducts]) => ({
				vendor: vendorsMap.get(vendorId),
				products: vendorProducts,
				discount: Math.max(...vendorProducts.map(p => p.discountPercentage || 0)),
			}))
			.filter(item => item.vendor);
	}, [dealsProducts, vendorsMap]);
	
	// Check if filters are active (beyond default state)
	const hasActiveFilters = useMemo(() => {
		return filters.minPrice !== null || 
		       filters.maxPrice !== null || 
		       filters.minDiscount !== null || 
		       filters.sortBy !== 'discount-high';
	}, [filters]);
	
	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refreshProducts();
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts]);
	
	const headerPaddingTop = top + 6;
	
	return (
		<View style={styles.container}>
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
							<Text style={styles.headerTitle}>Deals & Specials 🎉</Text>
							<Text style={styles.headerSubtitle}>
								Save big on trending gifts and limited-time offers
							</Text>
						</View>
					</View>
					<Pressable 
						onPress={() => setShowFilters(true)}
						style={styles.filterButton}
					>
						<IconSymbol name="slider.horizontal.3" size={22} color={GIFTYY_THEME.colors.gray700} />
						{(filters.minPrice !== null || filters.maxPrice !== null || filters.minDiscount !== null || filters.sortBy !== 'discount-high') && (
							<View style={styles.filterBadge}>
								<Text style={styles.filterBadgeText}>
									{[filters.minPrice !== null || filters.maxPrice !== null, filters.minDiscount !== null, filters.sortBy !== 'discount-high'].filter(Boolean).length}
								</Text>
							</View>
						)}
					</Pressable>
				</View>
			</Animated.View>
			{/* Main Content */}
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
				{loading && products.length === 0 ? (
					<View style={styles.loadingContainer}>
						<Text style={styles.loadingText}>Loading amazing deals...</Text>
					</View>
				) : dealsProducts.length === 0 ? (
					<View style={styles.emptyState}>
						<IconSymbol name="sparkles" size={64} color={GIFTYY_THEME.colors.gray300} />
						<Text style={styles.emptyTitle}>No deals right now...</Text>
						<Text style={styles.emptySubtitle}>
							but more are coming soon! 🎁
						</Text>
						<Pressable
							style={styles.emptyCta}
							onPress={() => router.push('/(buyer)/(tabs)/home')}
						>
							<Text style={styles.emptyCtaText}>Explore All Gifts</Text>
						</Pressable>
					</View>
				) : (
					<>
						{/* Deal Category Tabs */}
						<DealCategoryTabs
							activeCategory={activeCategory}
							onCategoryChange={setActiveCategory}
						/>
						
						{/* Show other sections only when no filters are active */}
						{!hasActiveFilters && (
							<>
								{/* Lightning Deals Section */}
								{lightningDeals.length > 0 && (
							<Animated.View entering={FadeInUp.duration(400).delay(200)}>
								<View style={styles.sectionHeader}>
									<IconSymbol name="bolt.fill" size={20} color={GIFTYY_THEME.colors.error} />
									<Text style={styles.sectionTitle}>Lightning Deals ⚡</Text>
								</View>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.lightningDealsContainer}
								>
									{lightningDeals.map((deal, index) => (
										<LightningDealCard
											key={deal.id}
											product={deal}
											stockClaimed={deal.stockClaimed || 0}
											totalStock={deal.totalStock || 100}
											onPress={() => router.push({
												pathname: '/(buyer)/(tabs)/product/[id]',
												params: { id: deal.id },
											})}
										/>
									))}
								</ScrollView>
							</Animated.View>
						)}
						
						{/* Vendor Promotions */}
						{vendorPromotions.length > 0 && (
							<Animated.View entering={FadeInUp.duration(400).delay(300)}>
								<View style={styles.sectionHeader}>
									<IconSymbol name="storefront.fill" size={20} color={GIFTYY_THEME.colors.primary} />
									<Text style={styles.sectionTitle}>Vendor Specials</Text>
								</View>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.vendorPromotionsContainer}
								>
									{vendorPromotions.map((promo, index) => (
										<VendorPromotionCard
											key={promo.vendor?.id || index}
											vendor={promo.vendor!}
											discount={promo.discount}
											productCount={promo.products.length}
											onPress={() => router.push({
												pathname: '/(buyer)/vendor/[id]',
												params: { id: promo.vendor!.id },
											})}
										/>
									))}
								</ScrollView>
							</Animated.View>
						)}
						
						{/* Trending Right Now Grid (3 columns) */}
						{filteredDeals.length > 0 && (
							<Animated.View entering={FadeInUp.duration(400).delay(400)}>
								<View style={styles.sectionHeader}>
									<IconSymbol name="flame.fill" size={20} color={GIFTYY_THEME.colors.error} />
									<Text style={styles.sectionTitle}>Trending Right Now</Text>
								</View>
								<View style={styles.dealsGrid}>
									{filteredDeals.slice(0, 12).map((product, index) => {
										const isLastInRow = (index + 1) % 3 === 0;
										return (
											<Animated.View
												key={`${product.id}-trending`}
												entering={FadeInUp.duration(400).delay(500 + index * 40)}
												style={{
													marginRight: isLastInRow ? 0 : 12,
													marginBottom: 12,
												}}
											>
												<MarketplaceProductCard
													id={product.id}
													name={product.name}
													price={product.price}
													originalPrice={product.originalPrice}
													discountPercentage={product.discountPercentage}
													image={(() => {
														try {
															const parsed = JSON.parse(product.imageUrl || '');
															return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
														} catch {
															return product.imageUrl;
														}
													})()}
													vendorName={product.vendorId ? vendorsMap.get(product.vendorId)?.storeName : undefined}
													onPress={() =>
														router.push({
															pathname: '/(buyer)/(tabs)/product/[id]',
															params: { id: product.id },
														})
													}
													width={CARD_WIDTH}
												/>
											</Animated.View>
										);
									})}
								</View>
							</Animated.View>
						)}
						</>
						)}
						
						{/* Main Deals Grid */}
						{filteredDeals.length > 0 ? (
							<Animated.View entering={FadeInUp.duration(400).delay(hasActiveFilters ? 100 : 500)}>
								<View style={styles.sectionHeader}>
									<View style={styles.sectionTitleContainer}>
										<IconSymbol name="tag.fill" size={20} color={GIFTYY_THEME.colors.primary} />
										<Text style={styles.sectionTitle}>
											{hasActiveFilters 
												? 'Filtered Deals' 
												: activeCategory === 'flash' ? 'All Flash Deals' :
												 activeCategory === 'top-picks' ? 'Top Picks for You' :
												 activeCategory === 'seasonal' ? 'Seasonal Gifts' :
												 activeCategory === 'vendor-specials' ? 'Vendor Specials' :
												 activeCategory === 'under-20' ? 'Deals Under $20' :
												 'Last Chance Deals'}
										</Text>
									</View>
									<Text style={styles.dealsCount}>{filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'}</Text>
								</View>
								<View style={styles.dealsGrid}>
									{filteredDeals.map((product, index) => {
										const isLastInRow = (index + 1) % 3 === 0;
										return (
											<Animated.View
												key={product.id}
												entering={FadeInUp.duration(400).delay(600 + index * 50)}
												style={{ 
													marginRight: isLastInRow ? 0 : 12, 
													marginBottom: 12 
												}}
											>
												<MarketplaceProductCard
													id={product.id}
													name={product.name}
													price={product.price}
													originalPrice={product.originalPrice}
													discountPercentage={product.discountPercentage}
													image={(() => {
														try {
															const parsed = JSON.parse(product.imageUrl || '');
															return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
														} catch {
															return product.imageUrl;
														}
													})()}
													vendorName={product.vendorId ? vendorsMap.get(product.vendorId)?.storeName : undefined}
													onPress={() => router.push({
														pathname: '/(buyer)/(tabs)/product/[id]',
														params: { id: product.id },
													})}
													width={CARD_WIDTH}
												/>
											</Animated.View>
										);
									})}
								</View>
							</Animated.View>
						) : (
							<View style={styles.emptyState}>
								<IconSymbol name="magnifyingglass" size={64} color={GIFTYY_THEME.colors.gray300} />
								<Text style={styles.emptyTitle}>No deals found</Text>
								<Text style={styles.emptySubtitle}>
									Try adjusting your filters to see more results
								</Text>
								<Pressable
									style={styles.emptyCta}
									onPress={() => {
										setFilters({
											minPrice: null,
											maxPrice: null,
											minDiscount: null,
											maxDiscount: null,
											sortBy: 'discount-high',
										});
									}}
								>
									<Text style={styles.emptyCtaText}>Reset Filters</Text>
								</Pressable>
							</View>
						)}
					</>
				)}
			</ScrollView>
			
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
							<Text style={styles.modalTitle}>Filter Deals</Text>
							<Pressable onPress={() => setShowFilters(false)}>
								<IconSymbol name="xmark.circle.fill" size={24} color={GIFTYY_THEME.colors.gray500} />
							</Pressable>
						</View>
						<ScrollView style={styles.modalBody}>
							{/* Sort Options */}
							<View style={styles.filterSection}>
								<Text style={styles.filterSectionTitle}>Sort By</Text>
								<View style={styles.filterOptions}>
									{[
										{ id: 'discount-high', label: 'Highest Discount' },
										{ id: 'discount-low', label: 'Lowest Discount' },
										{ id: 'price-low', label: 'Price: Low to High' },
										{ id: 'price-high', label: 'Price: High to Low' },
										{ id: 'name-asc', label: 'Name: A to Z' },
										{ id: 'name-desc', label: 'Name: Z to A' },
									].map((option) => (
										<Pressable
											key={option.id}
											style={[
												styles.filterChip,
												filters.sortBy === option.id && styles.filterChipActive,
											]}
											onPress={() => setFilters({ ...filters, sortBy: option.id as SortOption })}
										>
											<Text
												style={[
													styles.filterChipText,
													filters.sortBy === option.id && styles.filterChipTextActive,
												]}
											>
												{option.label}
											</Text>
										</Pressable>
									))}
								</View>
							</View>
							
							{/* Price Range */}
							<View style={styles.filterSection}>
								<Text style={styles.filterSectionTitle}>Price Range</Text>
								<View style={styles.priceRangeContainer}>
									<View style={styles.priceInputContainer}>
										<Text style={styles.priceLabel}>Min</Text>
										<View style={styles.priceInput}>
											<Text style={styles.priceSymbol}>$</Text>
											<Text style={styles.priceValue}>
												{filters.minPrice !== null ? filters.minPrice.toFixed(0) : '0'}
											</Text>
										</View>
									</View>
									<View style={styles.priceInputContainer}>
										<Text style={styles.priceLabel}>Max</Text>
										<View style={styles.priceInput}>
											<Text style={styles.priceSymbol}>$</Text>
											<Text style={styles.priceValue}>
												{filters.maxPrice !== null ? filters.maxPrice.toFixed(0) : 'Any'}
											</Text>
										</View>
									</View>
								</View>
								<View style={styles.pricePresets}>
									{[
										{ label: 'Under $20', min: null, max: 20 },
										{ label: '$20 - $50', min: 20, max: 50 },
										{ label: '$50 - $100', min: 50, max: 100 },
										{ label: 'Over $100', min: 100, max: null },
									].map((preset) => {
										const isActive = filters.minPrice === preset.min && filters.maxPrice === preset.max;
										return (
											<Pressable
												key={preset.label}
												style={[
													styles.filterChip,
													isActive && styles.filterChipActive,
												]}
												onPress={() =>
													setFilters({
														...filters,
														minPrice: preset.min,
														maxPrice: preset.max,
													})
												}
											>
												<Text
													style={[
														styles.filterChipText,
														isActive && styles.filterChipTextActive,
													]}
												>
													{preset.label}
												</Text>
											</Pressable>
										);
									})}
								</View>
							</View>
							
							{/* Discount Range */}
							<View style={styles.filterSection}>
								<Text style={styles.filterSectionTitle}>Discount Percentage</Text>
								<View style={styles.filterOptions}>
									{[
										{ label: '10%+', min: 10, max: null },
										{ label: '20%+', min: 20, max: null },
										{ label: '30%+', min: 30, max: null },
										{ label: '50%+', min: 50, max: null },
									].map((option) => {
										const isActive = filters.minDiscount === option.min;
										return (
											<Pressable
												key={option.label}
												style={[
													styles.filterChip,
													isActive && styles.filterChipActive,
												]}
												onPress={() =>
													setFilters({
														...filters,
														minDiscount: isActive ? null : option.min,
													})
												}
											>
												<Text
													style={[
														styles.filterChipText,
														isActive && styles.filterChipTextActive,
													]}
												>
													{option.label}
												</Text>
											</Pressable>
										);
									})}
								</View>
							</View>
							
							{/* Reset Button */}
							<Pressable
								style={styles.resetButton}
								onPress={() =>
									setFilters({
										minPrice: null,
										maxPrice: null,
										minDiscount: null,
										maxDiscount: null,
										sortBy: 'discount-high',
									})
								}
							>
								<Text style={styles.resetButtonText}>Reset All Filters</Text>
							</Pressable>
						</ScrollView>
						
						<View style={styles.modalFooter}>
							<Pressable
								style={styles.modalButtonPrimary}
								onPress={() => setShowFilters(false)}
							>
								<Text style={styles.modalButtonPrimaryText}>Apply Filters</Text>
							</Pressable>
						</View>
					</Animated.View>
				</Pressable>
			</Modal>
		</View>
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
		position: 'relative',
	},
	filterBadge: {
		position: 'absolute',
		top: -2,
		right: -2,
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
	filterBadgeText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingTop: 110,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.md,
		marginTop: GIFTYY_THEME.spacing.xl,
	},
	sectionTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	sectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginLeft: 8,
	},
	dealsCount: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray500,
	},
	lightningDealsContainer: {
		paddingVertical: GIFTYY_THEME.spacing.sm,
	},
	vendorPromotionsContainer: {
		paddingVertical: GIFTYY_THEME.spacing.sm,
	},
	dealsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: GIFTYY_THEME.spacing.sm,
	},
	loadingContainer: {
		paddingVertical: 60,
		alignItems: 'center',
	},
	loadingText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray500,
	},
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 80,
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	emptyTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
		marginTop: 16,
		marginBottom: 8,
	},
	emptySubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
		marginBottom: 24,
	},
	emptyCta: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: GIFTYY_THEME.radius.full,
		...GIFTYY_THEME.shadows.md,
	},
	emptyCtaText: {
		color: '#fff',
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
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
	filterSection: {
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	filterSectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	filterOptions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	filterChip: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		marginBottom: 8,
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
	priceRangeContainer: {
		flexDirection: 'row',
		gap: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	priceInputContainer: {
		flex: 1,
	},
	priceLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray600,
		marginBottom: 6,
	},
	priceInput: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: GIFTYY_THEME.radius.md,
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	priceSymbol: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
		marginRight: 4,
	},
	priceValue: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		flex: 1,
	},
	pricePresets: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	resetButton: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray300,
		alignItems: 'center',
		marginTop: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	resetButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
	},
	modalFooter: {
		flexDirection: 'row',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
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
});
