/**
 * Giftyy Bundles Page - Redesigned
 * Emotional, visually rich, Pinterest + Etsy + Spotify playlists style
 * Warm, celebratory Giftyy branding
 */

import { useRouter } from 'expo-router';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
	Dimensions,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	RefreshControl,
} from 'react-native';
import Animated, {
	FadeInDown,
	FadeInRight,
	FadeInUp,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
	interpolate,
	Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { AnimatedSectionHeader } from '@/components/marketplace/AnimatedSectionHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useProducts, productToSimpleProduct, type CollectionCategory } from '@/contexts/ProductsContext';
import { type GiftCollection } from '@/lib/gift-data';
import { FeaturedCollectionBanner } from '@/components/collections/FeaturedCollectionBanner';
import { CollectionGridCard } from '@/components/collections/CollectionGridCard';
import { CollectionCarouselCard } from '@/components/collections/CollectionCarouselCard';
import { EmptyCollectionsState } from '@/components/collections/EmptyCollectionsState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALL_KEY = 'all';

type FilterKey = typeof ALL_KEY | CollectionCategory;

// Collection category metadata with emojis and enhanced descriptions
const COLLECTION_CATEGORY_METADATA = [
	{ 
		key: 'celebrations' as CollectionCategory, 
		label: 'Celebrations 🎉', 
		description: 'Birthdays, anniversaries, and special moments',
		emoji: '🎉',
	},
	{ 
		key: 'family' as CollectionCategory, 
		label: 'Family 💕', 
		description: 'Gifts for family members',
		emoji: '💕',
	},
	{ 
		key: 'life-events' as CollectionCategory, 
		label: 'Life Events 🌟', 
		description: 'Milestones and achievements',
		emoji: '🌟',
	},
	{ 
		key: 'seasonal-faith' as CollectionCategory, 
		label: 'Seasonal & Faith ✨', 
		description: 'Holiday and religious celebrations',
		emoji: '✨',
	},
	{ 
		key: 'interests' as CollectionCategory, 
		label: 'Interests & Hobbies 🎨', 
		description: 'Gifts based on passions and hobbies',
		emoji: '🎨',
	},
];

export default function BundlesScreen() {
	const router = useRouter();
	const { top, bottom } = useSafeAreaInsets();
	const { collections, loading, refreshProducts, refreshCollections } = useProducts();
	const [activeFilter, setActiveFilter] = useState<FilterKey>(ALL_KEY);
	const [refreshing, setRefreshing] = useState(false);
	const [showFilters, setShowFilters] = useState(false);

	// Background animation
	const sparkle1 = useSharedValue(0);
	const sparkle2 = useSharedValue(0);
	const sparkle3 = useSharedValue(0);

	useEffect(() => {
		sparkle1.value = withRepeat(
			withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		);
		sparkle2.value = withRepeat(
			withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		);
		sparkle3.value = withRepeat(
			withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		);
	}, []);

	const sparkle1Style = useAnimatedStyle(() => ({
		opacity: interpolate(sparkle1.value, [0, 1], [0.3, 0.7]),
		transform: [
			{ translateY: interpolate(sparkle1.value, [0, 1], [0, -10]) },
			{ translateX: interpolate(sparkle1.value, [0, 1], [0, 5]) },
		],
	}));

	const sparkle2Style = useAnimatedStyle(() => ({
		opacity: interpolate(sparkle2.value, [0, 1], [0.4, 0.8]),
		transform: [
			{ translateY: interpolate(sparkle2.value, [0, 1], [0, -8]) },
			{ translateX: interpolate(sparkle2.value, [0, 1], [0, -5]) },
		],
	}));

	const sparkle3Style = useAnimatedStyle(() => ({
		opacity: interpolate(sparkle3.value, [0, 1], [0.3, 0.6]),
		transform: [
			{ translateY: interpolate(sparkle3.value, [0, 1], [0, -12]) },
			{ translateX: interpolate(sparkle3.value, [0, 1], [0, 3]) },
		],
	}));

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCollections()]);
		} catch (error) {
			console.error('Error refreshing bundles:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCollections]);

	// Convert collections to GiftCollection format and filter out bundles without products
	const giftCollections = useMemo<GiftCollection[]>(() => {
		return collections
			.map((collection) => ({
				id: collection.id,
				title: collection.title,
				color: collection.color,
				category: collection.category,
				description: collection.description || '',
				products: collection.products.map(productToSimpleProduct),
			}))
			.filter((collection) => collection.products.length > 0); // Only show bundles with products
	}, [collections]);

	// Filter collections
	const filteredCollections = useMemo(() => {
		if (activeFilter === ALL_KEY) {
			return giftCollections;
		}
		return giftCollections.filter((collection) => collection.category === activeFilter);
	}, [giftCollections, activeFilter]);

	// Group collections by category
	const groupedCollections = useMemo(() => {
		const grouped = COLLECTION_CATEGORY_METADATA.reduce<Record<CollectionCategory, GiftCollection[]>>((acc, meta) => {
			acc[meta.key] = giftCollections.filter((collection) => collection.category === meta.key);
			return acc;
		}, {} as Record<CollectionCategory, GiftCollection[]>);
		return grouped;
	}, [giftCollections]);

	// Featured collection (first one, or most popular)
	const featuredCollection = useMemo(() => {
		if (filteredCollections.length === 0) return null;
		// Find a collection with most products as featured
		return filteredCollections.reduce((prev, curr) => 
			curr.products.length > prev.products.length ? curr : prev
		);
	}, [filteredCollections]);

	// Trending collections (top 5 with most products)
	const trendingCollections = useMemo(() => {
		return [...filteredCollections]
			.sort((a, b) => b.products.length - a.products.length) // Sort by product count (descending)
			.slice(0, 5); // Take top 5
	}, [filteredCollections]);

	// Grid collections (all except featured and trending)
	const gridCollections = useMemo(() => {
		const featuredId = featuredCollection?.id;
		const trendingIds = new Set(trendingCollections.map(c => c.id));
		return filteredCollections.filter(c => c.id !== featuredId && !trendingIds.has(c.id));
	}, [filteredCollections, featuredCollection, trendingCollections]);

	const handleResetFilters = () => {
		setActiveFilter(ALL_KEY);
		setShowFilters(false);
	};

	const handleCollectionPress = (collectionId: string) => {
		router.push({
			pathname: '/(buyer)/bundle/[id]',
			params: { id: collectionId },
		});
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<Animated.View
				entering={FadeInDown.duration(400)}
				style={[
					styles.header,
					{
						paddingTop: top + 12,
					},
				]}
			>
				<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
					<IconSymbol name="chevron.left" size={22} color={GIFTYY_THEME.colors.gray900} />
				</Pressable>
				<Text style={styles.headerTitle}>Giftyy Bundles 🎁</Text>
				<Pressable
					style={styles.filterButton}
					onPress={() => setShowFilters(true)}
				>
					<IconSymbol name="slider.horizontal.3" size={20} color={GIFTYY_THEME.colors.gray700} />
				</Pressable>
			</Animated.View>

			{/* Background decorative sparkles */}
			<View style={styles.backgroundContainer}>
				<Animated.View style={[styles.sparkle, { top: 150, left: 50 }, sparkle1Style]}>
					<IconSymbol name="sparkles" size={24} color={GIFTYY_THEME.colors.primary + '40'} />
				</Animated.View>
				<Animated.View style={[styles.sparkle, { top: 300, right: 80 }, sparkle2Style]}>
					<IconSymbol name="sparkles" size={20} color={GIFTYY_THEME.colors.peach + '50'} />
				</Animated.View>
				<Animated.View style={[styles.sparkle, { top: 500, left: 100 }, sparkle3Style]}>
					<IconSymbol name="sparkles" size={28} color={GIFTYY_THEME.colors.primaryLight + '40'} />
				</Animated.View>
			</View>

			{loading && giftCollections.length === 0 ? (
				<View style={[styles.loadingContainer, { paddingTop: top + 100 }]}>
					<Text style={styles.loadingText}>Loading bundles...</Text>
				</View>
			) : filteredCollections.length === 0 ? (
				<ScrollView
					contentContainerStyle={[styles.emptyContent, { paddingTop: top + 100, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE }]}
				>
					<EmptyCollectionsState onResetFilters={handleResetFilters} />
				</ScrollView>
			) : (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24 },
					]}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={GIFTYY_THEME.colors.primary}
							colors={[GIFTYY_THEME.colors.primary]}
						/>
					}
				>
					{/* Featured Collection Banner */}
					{featuredCollection && (
						<FeaturedCollectionBanner
							collection={featuredCollection}
							onPress={() => handleCollectionPress(featuredCollection.id)}
						/>
					)}

					{/* Trending Collections Carousel */}
					{trendingCollections.length > 0 && (
						<>
							<AnimatedSectionHeader
								title="Trending Right Now 🔥"
								icon="flame.fill"
								actionText="See All"
							/>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.trendingContainer}
							>
								{trendingCollections.map((collection, index) => (
									<CollectionCarouselCard
										key={collection.id}
										collection={collection}
										badge={index === 0 ? 'New' : index === 1 ? 'Popular' : undefined}
										onPress={() => handleCollectionPress(collection.id)}
										delay={index * 50}
									/>
								))}
							</ScrollView>
						</>
					)}

					{/* Category Sections (only show if all collections view) */}
					{activeFilter === ALL_KEY && Object.keys(groupedCollections).length > 0 && (
						<>
							{COLLECTION_CATEGORY_METADATA.map((meta) => {
								const categoryCollections = groupedCollections[meta.key] || [];
								if (categoryCollections.length === 0) return null;

								return (
									<View key={meta.key} style={styles.section}>
										<AnimatedSectionHeader
											title={meta.label}
											subtitle={meta.description}
											icon="square.grid.2x2"
										/>
										<ScrollView
											horizontal
											showsHorizontalScrollIndicator={false}
											contentContainerStyle={styles.horizontalContainer}
										>
											{categoryCollections.map((collection, index) => (
												<CollectionCarouselCard
													key={collection.id}
													collection={collection}
													onPress={() => handleCollectionPress(collection.id)}
													delay={index * 50}
												/>
											))}
										</ScrollView>
									</View>
								);
							})}
						</>
					)}

					{/* Collections Grid */}
					{gridCollections.length > 0 && (
						<>
							<AnimatedSectionHeader
								title={activeFilter === ALL_KEY ? 'All Bundles' : 'Filtered Bundles'}
								icon="square.grid.3x3"
							/>
							<View style={styles.grid}>
								{gridCollections.map((collection, index) => (
									<CollectionGridCard
										key={collection.id}
										collection={collection}
										onPress={() => handleCollectionPress(collection.id)}
										delay={index * 30}
									/>
								))}
							</View>
						</>
					)}
				</ScrollView>
			)}

			{/* Filter Modal */}
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
							<Text style={styles.modalTitle}>Filter Bundles</Text>
							<Pressable onPress={() => setShowFilters(false)}>
								<IconSymbol name="xmark.circle.fill" size={24} color={GIFTYY_THEME.colors.gray500} />
							</Pressable>
						</View>

						<ScrollView style={styles.modalBody}>
							<Text style={styles.filterSectionTitle}>Category</Text>
							<View style={styles.filterChips}>
								{[
									{ key: ALL_KEY, label: 'All' },
									...COLLECTION_CATEGORY_METADATA,
								].map((meta) => {
									const isActive = activeFilter === meta.key;
									return (
										<Pressable
											key={meta.key}
											style={[
												styles.filterChip,
												isActive && styles.filterChipActive,
											]}
											onPress={() => {
												setActiveFilter(meta.key as FilterKey);
												setShowFilters(false);
											}}
										>
											<Text
												style={[
													styles.filterChipText,
													isActive && styles.filterChipTextActive,
												]}
											>
												{'label' in meta ? meta.label : meta.label}
											</Text>
										</Pressable>
									);
								})}
							</View>
						</ScrollView>

						<View style={styles.modalFooter}>
							<Pressable
								style={styles.modalButtonSecondary}
								onPress={handleResetFilters}
							>
								<Text style={styles.modalButtonSecondaryText}>Reset</Text>
							</Pressable>
							<Pressable
								style={styles.modalButtonPrimary}
								onPress={() => setShowFilters(false)}
							>
								<Text style={styles.modalButtonPrimaryText}>Apply</Text>
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
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	backgroundContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		overflow: 'hidden',
	},
	sparkle: {
		position: 'absolute',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
		zIndex: 10,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	headerTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	filterButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
	},
	emptyContent: {
		flex: 1,
		justifyContent: 'center',
	},
	content: {
		paddingTop: GIFTYY_THEME.spacing.md,
	},
	trendingContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	section: {
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	horizontalContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.xl,
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
	filterSectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	filterChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: GIFTYY_THEME.spacing.md,
	},
	filterChip: {
		paddingVertical: GIFTYY_THEME.spacing.sm,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 2,
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
		gap: GIFTYY_THEME.spacing.md,
	},
	modalButtonSecondary: {
		flex: 1,
		paddingVertical: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.md,
		borderWidth: 2,
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
		paddingVertical: GIFTYY_THEME.spacing.md,
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

