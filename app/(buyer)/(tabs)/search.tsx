/**
 * Premium Search Results Page
 * Marketplace-quality search experience with Giftyy's emotional branding
 */

import { FilterBar } from '@/components/search/FilterBar';
import { FilterModal } from '@/components/search/FilterModal';
import { MarketplaceProductCard } from '@/components/marketplace/ProductCard';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { ShimmerLoader } from '@/components/search/ShimmerLoader';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { useProducts } from '@/contexts/ProductsContext';
import { getVendorsInfo } from '@/lib/vendor-utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding and gap

type FilterState = {
	categories: string[];
	priceRange: { min: number; max: number };
	sortBy: 'recommended' | 'popular' | 'price-low' | 'price-high' | 'newest' | 'rating';
};

export default function SearchResultsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ 
		q?: string;
		categories?: string;
		minPrice?: string;
		maxPrice?: string;
		sortBy?: string;
	}>();
	const { top, bottom } = useSafeAreaInsets();
	
	const { products, loading: productsLoading, refreshProducts } = useProducts();
	const { categories } = useCategories();
	
	const [searchQuery, setSearchQuery] = useState(params.q || '');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [showFilters, setShowFilters] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [vendorsMap, setVendorsMap] = useState<Map<string, any>>(new Map());
	
	// Initialize filters from URL params
	const [filters, setFilters] = useState<FilterState>(() => {
		const initialFilters: FilterState = {
			categories: params.categories ? params.categories.split(',') : [],
			priceRange: {
				min: params.minPrice ? parseInt(params.minPrice, 10) : 0,
				max: params.maxPrice ? parseInt(params.maxPrice, 10) : 1000,
			},
			sortBy: (params.sortBy as any) || 'recommended',
		};
		return initialFilters;
	});
	
	// Update filters when params change
	useEffect(() => {
		setFilters({
			categories: params.categories ? params.categories.split(',') : [],
			priceRange: {
				min: params.minPrice ? parseInt(params.minPrice, 10) : 0,
				max: params.maxPrice ? parseInt(params.maxPrice, 10) : 1000,
			},
			sortBy: (params.sortBy as any) || 'recommended',
		});
	}, [params.categories, params.minPrice, params.maxPrice, params.sortBy]);

	// Fetch vendor info
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

	// Filter and sort products
	const filteredAndSortedProducts = useMemo(() => {
		let filtered = products.filter(p => p.isActive);

		// Search query filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(p =>
				p.name.toLowerCase().includes(query) ||
				p.description?.toLowerCase().includes(query) ||
				p.tags.some(tag => tag.toLowerCase().includes(query)) ||
				p.vendorId && vendorsMap.get(p.vendorId)?.storeName?.toLowerCase().includes(query)
			);
		}

		// Category filter
		if (filters.categories.length > 0) {
			filtered = filtered.filter(p => 
				filters.categories.some(catId => p.categoryIds?.includes(catId))
			);
		}

		// Price range filter
		filtered = filtered.filter(p => {
			const price = p.discountPercentage > 0 
				? p.price * (1 - p.discountPercentage / 100)
				: p.price;
			return price >= filters.priceRange.min && price <= filters.priceRange.max;
		});


		// Sort
		const sorted = [...filtered].sort((a, b) => {
			switch (filters.sortBy) {
				case 'price-low':
					return (a.discountPercentage > 0 ? a.price * (1 - a.discountPercentage / 100) : a.price) -
						(b.discountPercentage > 0 ? b.price * (1 - b.discountPercentage / 100) : b.price);
				case 'price-high':
					return (b.discountPercentage > 0 ? b.price * (1 - b.discountPercentage / 100) : b.price) -
						(a.discountPercentage > 0 ? a.price * (1 - a.discountPercentage / 100) : a.price);
				case 'newest':
					return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
				case 'rating':
					// Placeholder - would need ratings data
					return 0;
				case 'popular':
					// Placeholder - would need popularity data
					return 0;
				default: // recommended
					return 0;
			}
		});

		return sorted;
	}, [products, searchQuery, filters, vendorsMap]);

	// Get applied filter chips
	const appliedFilterChips = useMemo(() => {
		const chips: Array<{ id: string; label: string; type: string }> = [];
		
		filters.categories.forEach(catId => {
			const cat = categories.find(c => c.id === catId);
			if (cat) chips.push({ id: catId, label: cat.name, type: 'category' });
		});
		
		if (filters.priceRange.min > 0 || filters.priceRange.max < 1000) {
			chips.push({ 
				id: 'price', 
				label: `$${filters.priceRange.min} - $${filters.priceRange.max}`, 
				type: 'price' 
			});
		}
		
		return chips;
	}, [filters, categories]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refreshProducts();
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts]);

	const handleRemoveFilter = useCallback((chipId: string, chipType: string) => {
		setFilters(prev => {
			if (chipType === 'category') {
				return { ...prev, categories: prev.categories.filter(id => id !== chipId) };
			}
			if (chipType === 'price') {
				return { ...prev, priceRange: { min: 0, max: 1000 } };
			}
			if (chipType === 'verified') {
				return { ...prev, verifiedVendorsOnly: false };
			}
			return prev;
		});
	}, []);

	const handleResetFilters = useCallback(() => {
		setFilters({
			categories: [],
			priceRange: { min: 0, max: 1000 },
			sortBy: 'recommended',
		});
	}, []);

	// Parse product images
	const parseProductImage = (product: any) => {
		if (!product.imageUrl) return undefined;
		try {
			const parsed = JSON.parse(product.imageUrl);
			return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
		} catch {
			return product.imageUrl;
		}
	};

	const renderProduct = ({ item, index }: { item: any; index: number }) => {
		const imageUrl = parseProductImage(item);
		const vendor = item.vendorId ? vendorsMap.get(item.vendorId) : undefined;
		const productPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace('$', '')) || 0;
		
		return (
			<Animated.View
				entering={FadeInDown.duration(400).delay(index * 50)}
				style={{ width: CARD_WIDTH }}
			>
				<MarketplaceProductCard
					id={item.id}
					name={item.name}
					price={productPrice}
					originalPrice={item.originalPrice}
					discountPercentage={item.discountPercentage || item.discount}
					image={imageUrl}
					vendorName={vendor?.storeName}
					onPress={() => router.push({ pathname: '/(buyer)/(tabs)/product/[id]', params: { id: item.id } })}
					width={CARD_WIDTH}
				/>
			</Animated.View>
		);
	};

	return (
		<View style={[styles.container, { paddingTop: top }]}>
			{/* Search Header */}
			<View style={styles.header}>
				<SearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					onFocus={() => setShowSuggestions(true)}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
					showSuggestions={showSuggestions}
					onSuggestionPress={(suggestion) => {
						setSearchQuery(suggestion);
						setShowSuggestions(false);
					}}
				/>
			</View>

			{/* Filter & Sort Bar */}
			<FilterBar
				sortBy={filters.sortBy}
				onSortChange={(sortBy) => setFilters(prev => ({ ...prev, sortBy }))}
				appliedFilters={appliedFilterChips}
				onRemoveFilter={handleRemoveFilter}
				onFilterPress={() => setShowFilters(true)}
			/>

			{/* Results Count */}
			<View style={styles.resultsHeader}>
				<Text style={styles.resultsText}>
					{filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'result' : 'results'}
					{(params.categories || params.minPrice || params.maxPrice) && ' (filtered)'}
				</Text>
			</View>

			{/* Product Grid */}
			{productsLoading && filteredAndSortedProducts.length === 0 ? (
				<View style={styles.loadingContainer}>
					{Array.from({ length: 6 }).map((_, i) => (
						<ShimmerLoader key={i} style={{ width: CARD_WIDTH }} />
					))}
				</View>
			) : filteredAndSortedProducts.length === 0 ? (
				<SearchEmptyState searchQuery={searchQuery} />
			) : (
				<FlatList
					data={filteredAndSortedProducts}
					renderItem={renderProduct}
					keyExtractor={(item) => item.id}
					numColumns={3}
					contentContainerStyle={[
						styles.gridContainer,
						{ paddingBottom: bottom + 100 }
					]}
					columnWrapperStyle={styles.row}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
							tintColor={GIFTYY_THEME.colors.primary}
							colors={[GIFTYY_THEME.colors.primary]}
						/>
					}
				/>
			)}

			{/* Filter Modal */}
			<FilterModal
				visible={showFilters}
				onClose={() => setShowFilters(false)}
				filters={filters}
				onFiltersChange={setFilters}
				onReset={handleResetFilters}
				categories={categories}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	header: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	resultsHeader: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	resultsText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
	},
	loadingContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.md,
	},
	gridContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingTop: GIFTYY_THEME.spacing.md,
	},
	row: {
		justifyContent: 'space-between',
		gap: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
});

