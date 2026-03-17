/**
 * Vendors List Screen
 * Display all vendors in a grid layout
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useProducts } from '@/contexts/ProductsContext';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type VendorWithProducts = {
	vendor: VendorInfo;
	products: Array<{
		id: string;
		name: string;
		price: number;
		discountPercentage: number;
		imageUrl?: string;
	}>;
};

export default function VendorsScreen() {
	const router = useRouter();
	const { top, bottom } = useSafeAreaInsets();
	const { products, refreshProducts } = useProducts();
	const [vendors, setVendors] = useState<VendorWithProducts[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Fetch all vendors
	const fetchVendors = useCallback(async () => {
		try {
			setLoading(true);
			
			// Get all vendor IDs from products
			const vendorIds = Array.from(
				new Set(products.filter(p => p.vendorId && p.isActive).map(p => p.vendorId!))
			);

			if (vendorIds.length === 0) {
				setVendors([]);
				setLoading(false);
				return;
			}

			// Fetch vendor info
			const vendorsMap = await getVendorsInfo(vendorIds);

			// Group products by vendor and create vendor cards
			const vendorsWithProducts: VendorWithProducts[] = Array.from(vendorsMap.values())
				.map((vendor) => {
					const vendorProducts = products
						.filter(p => p.vendorId === vendor.id && p.isActive)
						.slice(0, 3) // Show up to 3 featured products
						.map((p) => {
							const imageUrl = p.imageUrl ? (() => {
								try {
									const parsed = JSON.parse(p.imageUrl);
									return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
								} catch {
									return p.imageUrl;
								}
							})() : undefined;

							return {
								id: p.id,
								name: p.name,
								price: p.price,
								discountPercentage: p.discountPercentage,
								imageUrl,
							};
						});

					return {
						vendor,
						products: vendorProducts,
					};
				})
				.filter(item => item.products.length > 0) // Only show vendors with products
				.sort((a, b) => b.products.length - a.products.length); // Sort by product count

			setVendors(vendorsWithProducts);
		} catch (error) {
			console.error('[Vendors] Error fetching vendors:', error);
		} finally {
			setLoading(false);
		}
	}, [products]);

	useEffect(() => {
		fetchVendors();
	}, [fetchVendors]);

	const filteredVendors = useMemo(() => {
		if (!searchQuery.trim()) return vendors;
		const query = searchQuery.toLowerCase();
		return vendors.filter(item => 
			item.vendor.storeName?.toLowerCase().includes(query)
		);
	}, [vendors, searchQuery]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refreshProducts();
			await fetchVendors();
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, fetchVendors]);

	const renderVendor = useCallback(({ item, index }: { item: VendorWithProducts; index: number }) => {
		const productCount = products.filter(p => p.vendorId === item.vendor.id && p.isActive).length;
		
		return (
			<View
				style={styles.vendorCardWrapper}
			>
				<Pressable
					onPress={() => router.push(`/(buyer)/vendor/${item.vendor.id}`)}
					style={styles.vendorCard}
				>
					{/* Vendor Header */}
					<View style={styles.vendorHeader}>
						{item.vendor.profileImageUrl ? (
							<Image
								source={{ uri: item.vendor.profileImageUrl }}
								style={styles.vendorLogo}
								resizeMode="cover"
							/>
						) : (
							<View style={styles.vendorLogoPlaceholder}>
								<IconSymbol name="storefront.fill" size={24} color={GIFTYY_THEME.colors.primary} />
							</View>
						)}
						<View style={styles.vendorInfo}>
							<Text style={styles.vendorName} numberOfLines={1}>
								{item.vendor.storeName || 'Vendor'}
							</Text>
							<Text style={styles.vendorStats}>
								{productCount} {productCount === 1 ? 'product' : 'products'}
							</Text>
						</View>
					</View>

					{/* Featured Products Preview */}
					{item.products.length > 0 && (
						<View style={styles.productsPreview}>
							{item.products.slice(0, 3).map((product, idx) => (
								<View key={product.id} style={styles.productThumbnail}>
									{product.imageUrl ? (
										<Image
											source={{ uri: product.imageUrl }}
											style={styles.productImage}
											resizeMode="cover"
										/>
									) : (
										<View style={styles.productPlaceholder}>
											<IconSymbol name="photo" size={16} color={GIFTYY_THEME.colors.gray300} />
										</View>
									)}
									{product.discountPercentage > 0 && (
										<View style={styles.discountBadge}>
											<Text style={styles.discountText}>{product.discountPercentage}%</Text>
										</View>
									)}
								</View>
							))}
						</View>
					)}

					{/* View Store Button */}
					<View style={styles.viewStoreButton}>
						<Text style={styles.viewStoreText}>View Store</Text>
						<IconSymbol name="chevron.right" size={16} color={GIFTYY_THEME.colors.primary} />
					</View>
				</Pressable>
			</View>
		);
	}, [router, products]);

	if (loading) {
		return (
			<View style={[styles.container, { paddingTop: top + 60, paddingBottom: bottom }]}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.loadingText}>Loading vendors...</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{vendors.length === 0 && !loading ? (
				<View style={[styles.emptyContainer, { paddingTop: top + 80, paddingBottom: bottom }]}>
					<IconSymbol name="storefront.fill" size={64} color={GIFTYY_THEME.colors.gray300} />
					<Text style={styles.emptyTitle}>No vendors found</Text>
					<Text style={styles.emptyText}>There are no vendors available at the moment.</Text>
				</View>
			) : (
				<FlatList
					data={filteredVendors}
					renderItem={renderVendor}
					keyExtractor={(item) => item.vendor.id}
					numColumns={2}
					ListHeaderComponent={(
						<View style={{ marginBottom: 16 }}>
							<View style={styles.searchContainer}>
								<IconSymbol name="magnifyingglass" size={20} color={GIFTYY_THEME.colors.gray400} />
								<TextInput
									style={styles.searchInput}
									placeholder="Search vendors..."
									placeholderTextColor={GIFTYY_THEME.colors.gray400}
									value={searchQuery}
									onChangeText={setSearchQuery}
									autoCorrect={false}
								/>
								{searchQuery.length > 0 && (
									<Pressable onPress={() => setSearchQuery('')}>
										<IconSymbol name="xmark.circle.fill" size={18} color={GIFTYY_THEME.colors.gray400} />
									</Pressable>
								)}
							</View>
							<Text style={styles.listTitle}>All Vendors ({filteredVendors.length})</Text>
						</View>
					)}
					contentContainerStyle={[
						styles.listContent,
						{ paddingTop: top + 72, paddingBottom: bottom + 20 },
					]}
					columnWrapperStyle={styles.row}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={GIFTYY_THEME.colors.primary}
							colors={[GIFTYY_THEME.colors.primary]}
						/>
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
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	searchInput: {
		flex: 1,
		marginLeft: 8,
		fontSize: 16,
		color: GIFTYY_THEME.colors.gray900,
		padding: 0,
	},
	listTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 4,
	},
	listContent: {
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingTop: GIFTYY_THEME.spacing.md,
	},
	row: {
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	vendorCardWrapper: {
		width: (width - GIFTYY_THEME.spacing.md * 3) / 2,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
	},
	loadingText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		gap: GIFTYY_THEME.spacing.md,
	},
	emptyTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginTop: GIFTYY_THEME.spacing.md,
	},
	emptyText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
	},
	vendorCard: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.lg,
		padding: GIFTYY_THEME.spacing.md,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.md,
	},
	vendorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	vendorLogo: {
		width: 56,
		height: 56,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '20',
	},
	vendorLogoPlaceholder: {
		width: 56,
		height: 56,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '20',
		alignItems: 'center',
		justifyContent: 'center',
	},
	vendorInfo: {
		flex: 1,
		marginLeft: GIFTYY_THEME.spacing.sm,
	},
	vendorName: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 2,
	},
	vendorStats: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	productsPreview: {
		flexDirection: 'row',
		gap: GIFTYY_THEME.spacing.xs,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	productThumbnail: {
		flex: 1,
		aspectRatio: 1,
		borderRadius: GIFTYY_THEME.radius.md,
		overflow: 'hidden',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		position: 'relative',
	},
	productImage: {
		width: '100%',
		height: '100%',
	},
	productPlaceholder: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	discountBadge: {
		position: 'absolute',
		top: 4,
		right: 4,
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingHorizontal: 4,
		paddingVertical: 2,
		borderRadius: 4,
	},
	discountText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 9,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	viewStoreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: GIFTYY_THEME.spacing.sm,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.cream,
		gap: GIFTYY_THEME.spacing.xs,
	},
	viewStoreText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.primary,
	},
});

