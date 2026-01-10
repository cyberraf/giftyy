/**
 * Giftyy Marketplace Home Screen (Redesigned)
 * Premium marketplace UI with modern patterns, animations, and emotional branding
 */

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useSharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { supabase } from '@/lib/supabase';
import { fetchVendorsWithProducts, type VendorWithProducts } from '@/lib/vendor-helpers';

// Components
import { AnimatedSectionHeader } from '@/components/marketplace/AnimatedSectionHeader';
import { CategoryChip } from '@/components/marketplace/CategoryChip';
import { MarketplaceProductCard } from '@/components/marketplace/MarketplaceProductCard';
import { PromotionalBanner } from '@/components/marketplace/PromotionalBanner';
import { ProductGridShimmer } from '@/components/marketplace/ShimmerLoader';
import { VendorCard } from '@/components/marketplace/VendorCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category definitions with icons
const CATEGORIES = [
	{ id: 'birthday', label: 'Birthday', icon: 'gift.fill', color: GIFTYY_THEME.colors.primary },
	{ id: 'valentine', label: 'Valentine', icon: 'heart.fill', color: '#ec4899' },
	{ id: 'anniversary', label: 'Anniversary', icon: 'sparkles', color: '#8b5cf6' },
	{ id: 'holiday', label: 'Holiday', icon: 'tree.fill', color: '#10b981' },
	{ id: 'wedding', label: 'Wedding', icon: 'diamond.fill', color: '#f59e0b' },
	{ id: 'thankyou', label: 'Thank You', icon: 'hands.sparkles.fill', color: '#06b6d4' },
	{ id: 'kids', label: 'Kids', icon: 'figure.child', color: '#f97316' },
	{ id: 'luxury', label: 'Luxury', icon: 'crown.fill', color: '#9333ea' },
] as const;

export default function MarketplaceHomeScreen() {
	const { top, right, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ collection?: string; recipient?: string }>();
	const { setVisible } = useBottomBarVisibility();
	const { unreadCount } = useNotifications();
	const { products, collections, loading: productsLoading, refreshProducts, refreshCollections } = useProducts();
	const { recipients } = useRecipients();
	
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [showFilters, setShowFilters] = useState(false);
	const [vendors, setVendors] = useState<VendorWithProducts[]>([]);
	const [vendorsLoading, setVendorsLoading] = useState(true);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	// Ensure bottom bar is visible
	useEffect(() => {
		setVisible(true);
	}, [setVisible]);

	// Fetch vendors
	useEffect(() => {
		const loadVendors = async () => {
			setVendorsLoading(true);
			const vendorsData = await fetchVendorsWithProducts(5);
			setVendors(vendorsData);
			setVendorsLoading(false);
		};
		loadVendors();
	}, []);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		try {
			await Promise.all([refreshProducts(), refreshCollections()]);
			const vendorsData = await fetchVendorsWithProducts(5);
			setVendors(vendorsData);
		} catch (error) {
			console.error('[MarketplaceHome] Refresh error:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCollections]);

	// Get personalized picks (products on sale, randomized)
	const personalizedPicks = useMemo(() => {
		const onSale = products
			.filter(p => p.isActive && p.discountPercentage > 0)
			.slice(0, 9);
		
		// Shuffle
		return [...onSale].sort(() => Math.random() - 0.5);
	}, [products]);

	// Get featured products (top products, randomized)
	const featuredProducts = useMemo(() => {
		const active = products
			.filter(p => p.isActive)
			.slice(0, 12);
		return [...active].sort(() => Math.random() - 0.5);
	}, [products]);

	// Filter products by category
	const filteredProducts = useMemo(() => {
		if (!selectedCategory) return featuredProducts;
		return featuredProducts.filter(product => 
			product.tags?.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ||
			product.name.toLowerCase().includes(selectedCategory.toLowerCase())
		);
	}, [featuredProducts, selectedCategory]);

	// Get vendor info helper
	const getVendorInfo = useCallback(async (vendorId: string) => {
		try {
			const { data } = await supabase
				.from('profiles')
				.select('store_name, profile_image_url')
				.eq('id', vendorId)
				.eq('role', 'vendor')
				.single();
			return data || null;
		} catch {
			return null;
		}
	}, []);

	const headerOpacity = useSharedValue(1);

	return (
		<View style={styles.container}>
			{/* Animated Header */}
			<Animated.View 
				style={[
					styles.header,
					{ paddingTop: top + 8, paddingRight: right + 16 }
				]}
			>
				{/* Search Bar */}
				<Pressable
					style={styles.searchContainer}
					onPress={() => router.push('/(buyer)/search')}
				>
					<IconSymbol name="magnifyingglass" size={18} color={GIFTYY_THEME.colors.textSecondary} />
					<TextInput
						placeholder="Search gifts, vendors, collections..."
						placeholderTextColor={GIFTYY_THEME.colors.textTertiary}
						style={styles.searchInput}
						value={searchQuery}
						onChangeText={setSearchQuery}
						editable={false}
					/>
					<View style={styles.searchDivider} />
					<Pressable
						onPress={() => setShowFilters(true)}
						hitSlop={8}
						style={styles.filterButton}
					>
						<IconSymbol name="slider.horizontal.3" size={18} color={GIFTYY_THEME.colors.text} />
					</Pressable>
				</Pressable>

				{/* Notifications */}
				<Pressable
					style={styles.notificationButton}
					onPress={() => router.push('/(buyer)/notifications')}
					hitSlop={8}
				>
					<IconSymbol name="bell" size={20} color={GIFTYY_THEME.colors.text} />
					{unreadCount > 0 && (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
						</View>
					)}
				</Pressable>
			</Animated.View>

			{/* Main Content */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24 }
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
				{/* Hero Banner */}
				<Animated.View entering={FadeIn.duration(400)}>
					<PromotionalBanner autoRotate={true} />
				</Animated.View>

				{/* Categories */}
				<Animated.View entering={FadeInDown.delay(100).duration(400)}>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.categoriesContainer}
					>
						{CATEGORIES.map((category, index) => (
							<Animated.View
								key={category.id}
								entering={FadeInDown.delay(100 + index * 50).duration(300)}
							>
								<CategoryChip
									icon={category.icon}
									label={category.label}
									active={selectedCategory === category.id}
									color={category.color}
									onPress={() => {
										setSelectedCategory(selectedCategory === category.id ? null : category.id);
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									}}
								/>
							</Animated.View>
						))}
					</ScrollView>
				</Animated.View>

				{/* Personalized Picks */}
				{personalizedPicks.length > 0 && (
					<Animated.View entering={FadeInDown.delay(200).duration(400)}>
						<AnimatedSectionHeader
							title="Personalized for You"
							subtitle="Curated picks based on your preferences"
							delay={200}
						/>
						{productsLoading ? (
							<ProductGridShimmer count={6} />
						) : (
							<View style={styles.productGrid}>
								{personalizedPicks.slice(0, 6).map((product, index) => {
									const vendorInfo = vendors.find(v => v.id === product.vendorId);
									const imageUrl = product.imageUrl ? (() => {
										try {
											const parsed = JSON.parse(product.imageUrl);
											return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
										} catch {
											return product.imageUrl;
										}
									})() : undefined;

									return (
										<Animated.View
											key={product.id}
											entering={FadeInDown.delay(300 + index * 50).duration(400)}
										>
											<MarketplaceProductCard
												id={product.id}
												name={product.name}
												price={product.price}
												originalPrice={product.discountPercentage > 0 ? product.price : undefined}
												discountPercentage={product.discountPercentage}
												imageUrl={imageUrl}
												vendorName={vendorInfo?.storeName}
												vendorId={product.vendorId}
												onPress={() => router.push({
													pathname: '/(buyer)/(tabs)/product/[id]',
													params: { id: product.id },
												})}
											/>
										</Animated.View>
									);
								})}
							</View>
						)}
					</Animated.View>
				)}

				{/* Vendor Spotlight */}
				{vendors.length > 0 && (
					<Animated.View entering={FadeInDown.delay(400).duration(400)}>
						<AnimatedSectionHeader
							title="Shop by Vendor"
							subtitle="Discover unique stores"
							delay={400}
						/>
						{vendorsLoading ? (
							<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} style={{ marginVertical: 24 }} />
						) : (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.vendorsContainer}
							>
								{vendors.map((vendor, index) => (
									<Animated.View
										key={vendor.id}
										entering={FadeInDown.delay(500 + index * 100).duration(400)}
									>
										<VendorCard
											id={vendor.id}
											storeName={vendor.storeName}
											profileImageUrl={vendor.profileImageUrl}
											featuredProducts={vendor.products.slice(0, 3).map(p => {
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
													imageUrl,
													price: p.price,
												};
											})}
											onPress={() => router.push({
												pathname: '/(buyer)/vendor/[id]',
												params: { id: vendor.id },
											})}
											onProductPress={(productId) => router.push({
												pathname: '/(buyer)/(tabs)/product/[id]',
												params: { id: productId },
											})}
										/>
									</Animated.View>
								))}
							</ScrollView>
						)}
					</Animated.View>
				)}

				{/* Featured Products Grid */}
				<Animated.View entering={FadeInDown.delay(600).duration(400)}>
					<AnimatedSectionHeader
						title={selectedCategory ? `${CATEGORIES.find(c => c.id === selectedCategory)?.label} Gifts` : "Trending Now"}
						subtitle={selectedCategory ? "Handpicked for you" : "Popular gifts everyone's loving"}
						delay={600}
					/>
					{productsLoading ? (
						<ProductGridShimmer count={9} />
					) : filteredProducts.length > 0 ? (
						<View style={styles.productGrid}>
							{filteredProducts.map((product, index) => {
								const vendorInfo = vendors.find(v => v.id === product.vendorId);
								const imageUrl = product.imageUrl ? (() => {
									try {
										const parsed = JSON.parse(product.imageUrl);
										return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
									} catch {
										return product.imageUrl;
									}
								})() : undefined;

								return (
									<Animated.View
										key={product.id}
										entering={FadeInDown.delay(700 + index * 50).duration(400)}
									>
										<MarketplaceProductCard
											id={product.id}
											name={product.name}
											price={product.price}
											originalPrice={product.discountPercentage > 0 ? product.price : undefined}
											discountPercentage={product.discountPercentage}
											imageUrl={imageUrl}
											vendorName={vendorInfo?.storeName}
											vendorId={product.vendorId}
											onPress={() => router.push({
												pathname: '/(buyer)/(tabs)/product/[id]',
												params: { id: product.id },
											})}
										/>
									</Animated.View>
								);
							})}
						</View>
					) : (
						<View style={styles.emptyState}>
							<IconSymbol name="gift" size={48} color={GIFTYY_THEME.colors.gray300} />
							<Text style={styles.emptyText}>No products found</Text>
							<Text style={styles.emptySubtext}>Try selecting a different category</Text>
						</View>
					)}
				</Animated.View>
			</ScrollView>

			{/* Filters Modal */}
			<Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
				<Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)}>
					<View style={[styles.modalContent, { paddingBottom: bottom + 20 }]}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Filters</Text>
							<Pressable onPress={() => setShowFilters(false)}>
								<IconSymbol name="xmark" size={24} color={GIFTYY_THEME.colors.text} />
							</Pressable>
						</View>
						<View style={styles.modalBody}>
							<Text style={styles.filterSectionTitle}>Categories</Text>
							<View style={styles.filterChips}>
								{CATEGORIES.map((category) => (
									<Pressable
										key={category.id}
										onPress={() => {
											setSelectedCategory(selectedCategory === category.id ? null : category.id);
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										}}
										style={[
											styles.filterChip,
											selectedCategory === category.id && styles.filterChipActive,
										]}
									>
										<Text
											style={[
												styles.filterChipText,
												selectedCategory === category.id && styles.filterChipTextActive,
											]}
										>
											{category.label}
										</Text>
									</Pressable>
								))}
							</View>
						</View>
					</View>
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
		zIndex: 100,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 16,
		paddingBottom: 12,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.borderLight,
		...GIFTYY_THEME.shadows.sm,
	},
	searchContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderRadius: 14,
		paddingHorizontal: 14,
		height: 44,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.borderLight,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: GIFTYY_THEME.colors.text,
		fontWeight: '500',
	},
	searchDivider: {
		width: 1,
		height: 20,
		backgroundColor: GIFTYY_THEME.colors.border,
	},
	filterButton: {
		padding: 4,
	},
	notificationButton: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	badge: {
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
		borderColor: '#FFFFFF',
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '800',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingTop: 80,
		gap: 24,
	},
	categoriesContainer: {
		paddingHorizontal: 16,
		gap: 12,
		paddingBottom: 8,
	},
	productGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		paddingHorizontal: 16,
	},
	vendorsContainer: {
		paddingHorizontal: 16,
		gap: 16,
		paddingBottom: 8,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
		gap: 12,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.text,
	},
	emptySubtext: {
		fontSize: 14,
		color: GIFTYY_THEME.colors.textSecondary,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingTop: 20,
		maxHeight: '80%',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.borderLight,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: '900',
		color: GIFTYY_THEME.colors.text,
	},
	modalBody: {
		padding: 20,
	},
	filterSectionTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.text,
		marginBottom: 16,
	},
	filterChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	filterChip: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.borderLight,
	},
	filterChipActive: {
		backgroundColor: GIFTYY_THEME.colors.primary + '15',
		borderColor: GIFTYY_THEME.colors.primary,
	},
	filterChipText: {
		fontSize: 14,
		fontWeight: '600',
		color: GIFTYY_THEME.colors.text,
	},
	filterChipTextActive: {
		color: GIFTYY_THEME.colors.primary,
	},
});

