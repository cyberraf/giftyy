/**
 * Bundle Detail Page - Redesigned
 * Displays all products in a specific bundle with 3-column grid layout
 */

import { MarketplaceProductCard } from '@/components/marketplace/ProductCard';
import { SearchBar } from '@/components/search/SearchBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useProducts, type Product } from '@/contexts/ProductsContext';
import { getVendorsInfo } from '@/lib/vendor-utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VendorInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 12; // Gap between items
const PADDING = 16; // Horizontal padding
const CARD_WIDTH = (SCREEN_WIDTH - (PADDING * 2) - (GAP * 2)) / 3; // 3 columns

export default function BundleDetailScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const bundleId = params.id;
	const { top, bottom } = useSafeAreaInsets();
	
	const { collections, products, loading, refreshCollections, refreshProducts, getProductById } = useProducts();
	const [refreshing, setRefreshing] = useState(false);
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [productsLoading, setProductsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const ITEMS_PER_PAGE = 18;
	const flatListRef = useRef<FlatList>(null);
	
	// Find bundle
	const bundle = useMemo(() => {
		if (!bundleId) return undefined;
		return collections.find(b => b.id === bundleId);
	}, [collections, bundleId]);
	
	// Get bundle products - use actual Product objects from context (matching home page)
	const allBundleProducts = useMemo(() => {
		if (!bundle || !bundle.products) return [];
		
		// Get actual Product objects from context using product IDs from bundle
		return bundle.products
			.filter(p => p && p.id) // Filter out invalid products
			.map(bundleProduct => getProductById(bundleProduct.id))
			.filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined);
	}, [bundle, getProductById]);
	
	// Filter products based on search query
	const bundleProducts = useMemo(() => {
		if (!searchQuery.trim()) {
			return allBundleProducts;
		}
		
		const query = searchQuery.toLowerCase();
		return allBundleProducts.filter(product => {
			try {
				const name = (product.name || '').toLowerCase();
				const description = (product.description || '').toLowerCase();
				const tagsArray = Array.isArray(product.tags) ? product.tags : [];
				const tags = tagsArray.join(' ').toLowerCase();
				// Get vendor name from vendorsMap
				const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
				const vendorName = (vendor?.storeName || '').toLowerCase();
				
				return name.includes(query) ||
					description.includes(query) ||
					tags.includes(query) ||
					vendorName.includes(query);
			} catch (error) {
				console.error('[BundleDetail] Error filtering product:', error, product);
				return false;
			}
		});
	}, [allBundleProducts, searchQuery, vendorsMap]);
	
	// Calculate pagination
	const totalPages = useMemo(() => {
		return Math.ceil(bundleProducts.length / ITEMS_PER_PAGE);
	}, [bundleProducts.length]);
	
	// Get paginated products
	const paginatedProducts = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;
		return bundleProducts.slice(startIndex, endIndex);
	}, [bundleProducts, currentPage]);
	
	// Reset to page 1 when search query changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery]);
	
	// Scroll to top when page changes
	useEffect(() => {
		if (flatListRef.current && currentPage > 1) {
			flatListRef.current.scrollToOffset({ offset: 0, animated: true });
		}
	}, [currentPage]);
	
	// Fetch vendor info for products
	useEffect(() => {
		const fetchVendors = async () => {
			if (allBundleProducts.length === 0) return;
			
			setProductsLoading(true);
			try {
				const vendorIds = Array.from(
					new Set(allBundleProducts.filter(p => p.vendorId).map(p => p.vendorId!))
				);
				
				if (vendorIds.length > 0) {
					const vendors = await getVendorsInfo(vendorIds);
					setVendorsMap(vendors);
				}
			} catch (error) {
				console.error('[BundleDetail] Error fetching vendors:', error);
			} finally {
				setProductsLoading(false);
			}
		};
		
		fetchVendors();
	}, [allBundleProducts]);
	
	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCollections()]);
		} catch (error) {
			console.error('[BundleDetail] Error refreshing:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCollections]);
	
	// Get header image from first product or bundle (use all products, not filtered)
	const headerImage = useMemo(() => {
		if (allBundleProducts.length > 0 && allBundleProducts[0].image) {
			return allBundleProducts[0].image;
		}
		return null;
	}, [allBundleProducts]);
	
	// Loading state
	if (loading && !bundle) {
		return (
			<View style={[styles.container, styles.centerContent, { paddingTop: top + 100 }]}>
				<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
				<Text style={styles.loadingText}>Loading bundle...</Text>
			</View>
		);
	}
	
	// Error state - bundle not found
	if (!bundle) {
		return (
			<View style={[styles.container, styles.centerContent, { paddingTop: top + 100 }]}>
				<Pressable onPress={() => router.back()} style={[styles.backButton, { top: top + 12 }]}>
					<IconSymbol name="chevron.left" size={22} color={GIFTYY_THEME.colors.gray900} />
				</Pressable>
				<IconSymbol name="exclamationmark.triangle" size={48} color={GIFTYY_THEME.colors.error} />
				<Text style={styles.errorText}>Bundle not found</Text>
				<Text style={styles.errorSubtext}>The bundle you're looking for doesn't exist or has been removed.</Text>
			</View>
		);
	}
	
	return (
		<View style={styles.container}>
			{/* Header with gradient */}
			<LinearGradient
				colors={[
					bundle.color || GIFTYY_THEME.colors.primary,
					(bundle.color || GIFTYY_THEME.colors.primary) + 'CC',
					(bundle.color || GIFTYY_THEME.colors.primary) + '99',
				]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.header, { paddingTop: top + 12 }]}
			>
				<Pressable onPress={() => router.back()} style={styles.backButtonHeader} hitSlop={12}>
					<IconSymbol name="chevron.left" size={22} color={GIFTYY_THEME.colors.white} />
				</Pressable>
				
				<View style={styles.headerContent}>
					{headerImage && (
						<Animated.View entering={FadeInRight.duration(400)} style={styles.headerImageContainer}>
							<Image source={{ uri: headerImage }} style={styles.headerImage} resizeMode="cover" />
						</Animated.View>
					)}
					
					<Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.headerTextContainer}>
						<Text style={styles.bundleTitle}>{bundle.title}</Text>
						{bundle.description && (
							<Text style={styles.bundleDescription} numberOfLines={2}>
								{bundle.description}
							</Text>
						)}
						<View style={styles.bundleMeta}>
							<View style={styles.metaItem}>
								<IconSymbol name="square.grid.3x3" size={16} color={GIFTYY_THEME.colors.white} />
								<Text style={styles.bundleMetaText}>
									{searchQuery.trim() 
										? `${bundleProducts.length} of ${allBundleProducts.length}`
										: `${allBundleProducts.length} ${allBundleProducts.length === 1 ? 'product' : 'products'}`
									}
								</Text>
							</View>
							{bundle.category && (
								<View style={styles.metaItem}>
									<IconSymbol name="tag.fill" size={14} color={GIFTYY_THEME.colors.white} />
									<Text style={styles.bundleMetaText}>{bundle.category}</Text>
								</View>
							)}
						</View>
					</Animated.View>
				</View>
			</LinearGradient>
			
			{/* Search Bar */}
			<Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.searchContainer}>
				<SearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					onFocus={() => setShowSearchSuggestions(true)}
					onBlur={() => setShowSearchSuggestions(false)}
					showSuggestions={showSearchSuggestions}
					onSuggestionPress={(suggestion) => {
						setSearchQuery(suggestion);
						setShowSearchSuggestions(false);
					}}
				/>
			</Animated.View>
			
			{/* Products Grid */}
			{allBundleProducts.length === 0 ? (
				<View style={[styles.emptyContainer, { paddingTop: top + 250, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE }]}>
					<Animated.View entering={FadeInUp.duration(400)}>
						<IconSymbol name="gift" size={64} color={GIFTYY_THEME.colors.gray300} />
						<Text style={styles.emptyTitle}>No products yet</Text>
						<Text style={styles.emptyText}>
							This bundle doesn't have any products yet. Check back soon!
						</Text>
					</Animated.View>
				</View>
			) : (
				<FlatList
					ref={flatListRef}
					data={paginatedProducts}
					renderItem={({ item, index }) => {
						const vendor = item.vendorId ? vendorsMap.get(item.vendorId) : undefined;
						const imageUrl = item.imageUrl ? (() => {
							try {
								const parsed = JSON.parse(item.imageUrl);
								return Array.isArray(parsed) ? parsed[0] : item.imageUrl;
							} catch {
								return item.imageUrl;
							}
						})() : undefined;
						
						return (
							<Animated.View
								entering={FadeInDown.duration(300).delay(index * 50)}
								style={[styles.productItem, { width: CARD_WIDTH }]}
							>
								<MarketplaceProductCard
									id={item.id}
									name={item.name || ''}
									price={typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0}
									originalPrice={item.originalPrice !== undefined && item.originalPrice > item.price ? item.originalPrice : (typeof item.discountPercentage === 'number' && item.discountPercentage > 0 && typeof item.price === 'number' && !isNaN(item.price) ? item.price / (1 - item.discountPercentage / 100) : undefined)}
									discountPercentage={typeof item.discountPercentage === 'number' && !isNaN(item.discountPercentage) ? item.discountPercentage : undefined}
									image={imageUrl}
									vendorName={vendor?.storeName || undefined}
									onPress={() => router.push({
										pathname: '/(buyer)/(tabs)/product/[id]',
										params: { id: item.id },
									})}
								/>
							</Animated.View>
						);
					}}
					keyExtractor={(item) => item.id}
					numColumns={3}
					contentContainerStyle={[
						styles.productsGrid,
						{ paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24 },
					]}
					columnWrapperStyle={styles.columnWrapper}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={GIFTYY_THEME.colors.primary}
							colors={[GIFTYY_THEME.colors.primary]}
						/>
					}
					ListHeaderComponent={
						<Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sectionHeader}>
							<View style={styles.sectionHeaderRow}>
								<View style={styles.sectionHeaderLeft}>
									<Text style={styles.sectionTitle}>Bundle Products</Text>
									<Text style={styles.sectionSubtitle}>
										{searchQuery.trim() 
											? `${bundleProducts.length} result${bundleProducts.length === 1 ? '' : 's'} found`
											: `${bundleProducts.length} carefully curated ${bundleProducts.length === 1 ? 'gift' : 'gifts'} for you`
										}
										{totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
									</Text>
								</View>
								{searchQuery.trim() && (
									<Pressable
										onPress={() => setSearchQuery('')}
										style={styles.clearSearchButton}
									>
										<IconSymbol name="xmark.circle.fill" size={20} color={GIFTYY_THEME.colors.gray500} />
									</Pressable>
								)}
							</View>
						</Animated.View>
					}
					ListEmptyComponent={
						searchQuery.trim() ? (
							<View style={[styles.emptyContainer, { paddingTop: 50, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE }]}>
								<IconSymbol name="magnifyingglass" size={48} color={GIFTYY_THEME.colors.gray300} />
								<Text style={styles.emptyTitle}>No products found</Text>
								<Text style={styles.emptyText}>
									No products match "{searchQuery}". Try a different search term.
								</Text>
								<Pressable
									onPress={() => setSearchQuery('')}
									style={styles.clearSearchButtonLarge}
								>
									<Text style={styles.clearSearchButtonText}>Clear search</Text>
								</Pressable>
							</View>
						) : null
					}
					ListFooterComponent={
						<View>
							{productsLoading && (
								<View style={styles.footerLoader}>
									<ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
								</View>
							)}
							{/* Pagination Controls */}
							{totalPages > 1 && (
								<View style={styles.paginationContainer}>
									<Pressable
										onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										style={[
											styles.paginationButton,
											currentPage === 1 && styles.paginationButtonDisabled
										]}
									>
										<IconSymbol 
											name="chevron.left" 
											size={18} 
											color={currentPage === 1 ? GIFTYY_THEME.colors.gray400 : GIFTYY_THEME.colors.gray900} 
										/>
										<Text style={[
											styles.paginationButtonText,
											currentPage === 1 && styles.paginationButtonTextDisabled
										]}>
											Previous
										</Text>
									</Pressable>
									
									<View style={styles.paginationPageInfo}>
										<Text style={styles.paginationPageText}>
											Page {currentPage} of {totalPages}
										</Text>
										<Text style={styles.paginationCountText}>
											Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, bundleProducts.length)} of {bundleProducts.length}
										</Text>
									</View>
									
									<Pressable
										onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages}
										style={[
											styles.paginationButton,
											currentPage === totalPages && styles.paginationButtonDisabled
										]}
									>
										<Text style={[
											styles.paginationButtonText,
											currentPage === totalPages && styles.paginationButtonTextDisabled
										]}>
											Next
										</Text>
										<IconSymbol 
											name="chevron.right" 
											size={18} 
											color={currentPage === totalPages ? GIFTYY_THEME.colors.gray400 : GIFTYY_THEME.colors.gray900} 
										/>
									</Pressable>
								</View>
							)}
						</View>
					}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	centerContent: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	loadingText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		marginTop: GIFTYY_THEME.spacing.md,
		textAlign: 'center',
	},
	errorText: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.error,
		textAlign: 'center',
		marginTop: GIFTYY_THEME.spacing.md,
	},
	errorSubtext: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		marginTop: GIFTYY_THEME.spacing.sm,
	},
	backButton: {
		position: 'absolute',
		left: 16,
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.white,
		...GIFTYY_THEME.shadows.md,
		zIndex: 10,
	},
	header: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.xl,
		minHeight: 220,
	},
	backButtonHeader: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: GIFTYY_THEME.spacing.md,
	},
	headerImageContainer: {
		width: 100,
		height: 100,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
	},
	headerImage: {
		width: '100%',
		height: '100%',
	},
	headerTextContainer: {
		flex: 1,
	},
	bundleTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['3xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	bundleDescription: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: 'rgba(255, 255, 255, 0.95)',
		marginBottom: GIFTYY_THEME.spacing.md,
		lineHeight: 20,
	},
	bundleMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
		flexWrap: 'wrap',
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.xs,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 12,
	},
	bundleMetaText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.white,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	searchContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		zIndex: 9999,
		elevation: 9999,
		overflow: 'visible',
	},
	productsGrid: {
		paddingHorizontal: PADDING,
		paddingTop: GIFTYY_THEME.spacing.lg,
	},
	columnWrapper: {
		justifyContent: 'flex-start',
		gap: GAP,
	},
	productItem: {
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	sectionHeader: {
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	sectionHeaderLeft: {
		flex: 1,
	},
	sectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	sectionSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
	},
	clearSearchButton: {
		padding: GIFTYY_THEME.spacing.xs,
		marginLeft: GIFTYY_THEME.spacing.md,
	},
	clearSearchButtonLarge: {
		marginTop: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: GIFTYY_THEME.radius.md,
	},
	clearSearchButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	emptyTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginTop: GIFTYY_THEME.spacing.md,
		textAlign: 'center',
	},
	emptyText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		marginTop: GIFTYY_THEME.spacing.sm,
		textAlign: 'center',
		lineHeight: 22,
	},
	footerLoader: {
		paddingVertical: GIFTYY_THEME.spacing.md,
		alignItems: 'center',
	},
	paginationContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	paginationButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.xs,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	paginationButtonDisabled: {
		opacity: 0.5,
	},
	paginationButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
	},
	paginationButtonTextDisabled: {
		color: GIFTYY_THEME.colors.gray400,
	},
	paginationPageInfo: {
		alignItems: 'center',
		flex: 1,
	},
	paginationPageText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	paginationCountText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
	},
});
