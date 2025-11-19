import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GiftCollectionCard } from '@/components/GiftCollectionCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { useProducts, productToSimpleProduct, type CollectionCategory } from '@/contexts/ProductsContext';
import { type GiftCollection } from '@/lib/gift-data';

const ALL_KEY = 'all';

type FilterKey = typeof ALL_KEY | CollectionCategory;

// Collection category metadata
const COLLECTION_CATEGORY_METADATA = [
	{ key: 'celebrations' as CollectionCategory, label: 'Celebrations', description: 'Birthdays, anniversaries, and special moments' },
	{ key: 'family' as CollectionCategory, label: 'Family', description: 'Gifts for family members' },
	{ key: 'life-events' as CollectionCategory, label: 'Life Events', description: 'Milestones and achievements' },
	{ key: 'seasonal-faith' as CollectionCategory, label: 'Seasonal & Faith', description: 'Holiday and religious celebrations' },
	{ key: 'interests' as CollectionCategory, label: 'Interests & Hobbies', description: 'Gifts based on passions and hobbies' },
];

export default function CollectionsScreen() {
	const router = useRouter();
	const { top, bottom } = useSafeAreaInsets();
	const { collections, loading } = useProducts();
	const [activeFilter, setActiveFilter] = useState<FilterKey>(ALL_KEY);

	// Convert collections to GiftCollection format
	const giftCollections = useMemo<GiftCollection[]>(() => {
		return collections.map((collection) => ({
			id: collection.id,
			title: collection.title,
			color: collection.color,
			category: collection.category,
			description: collection.description || '',
			products: collection.products.map(productToSimpleProduct),
		}));
	}, [collections]);

	const groupedCollections = useMemo(() => {
		const grouped = COLLECTION_CATEGORY_METADATA.reduce<Record<CollectionCategory, GiftCollection[]>>((acc, meta) => {
			acc[meta.key] = giftCollections.filter((collection) => collection.category === meta.key);
			return acc;
		}, {} as Record<CollectionCategory, GiftCollection[]>);
		return grouped;
	}, [giftCollections]);

	const visibleCategories = useMemo(() => {
		if (activeFilter === ALL_KEY) {
			return COLLECTION_CATEGORY_METADATA;
		}
		return COLLECTION_CATEGORY_METADATA.filter((meta) => meta.key === activeFilter);
	}, [activeFilter]);

	if (loading) {
		return (
			<View style={[styles.screen, { paddingTop: top + 12, justifyContent: 'center', alignItems: 'center' }]}>
				<View style={styles.header}>
					<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
						<IconSymbol name="chevron.left" size={22} color="#1f1f1f" />
					</Pressable>
					<Text style={styles.headerTitle}>Gift collections</Text>
					<View style={{ width: 40 }} />
				</View>
				<Text style={{ color: '#5b5149', marginTop: 40 }}>Loading collections...</Text>
			</View>
		);
	}

	return (
		<View style={[styles.screen, { paddingTop: top + 12 }]}> 
			<View style={styles.header}>
				<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
					<IconSymbol name="chevron.left" size={22} color="#1f1f1f" />
				</Pressable>
				<Text style={styles.headerTitle}>Gift collections</Text>
				<View style={{ width: 40 }} />
			</View>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
			>
				<Text style={styles.subtitle}>Discover curated sets tailored to every celebration, relationship, and life moment.</Text>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.chipRow}
					style={styles.chipRowContainer}
				>
					{[{ key: ALL_KEY, label: 'All' }, ...COLLECTION_CATEGORY_METADATA].map((meta) => {
						const isActive = activeFilter === meta.key;
						return (
							<Pressable
								key={meta.key}
								style={[styles.filterChip, isActive && styles.filterChipActive]}
								onPress={() => setActiveFilter(meta.key as FilterKey)}
							>
								<Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
									{meta.label ?? meta.label}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>

				{visibleCategories.map((meta) => {
					const collections = groupedCollections[meta.key] ?? [];
					if (collections.length === 0) {
						return null;
					}
					return (
						<View key={meta.key} style={styles.section}>
							<View style={styles.sectionHeader}>
								<Text style={styles.sectionTitle}>{meta.label}</Text>
								<Text style={styles.sectionDescription}>{meta.description}</Text>
							</View>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.sectionScrollContent}
								style={styles.sectionScroll}
							>
								{collections.map((collection) => (
									<View key={collection.id} style={styles.sectionCardWrapper}>
										<GiftCollectionCard
											title={collection.title}
											description={collection.description}
											color={collection.color}
											products={collection.products}
											onPress={() => {
												router.push({
													pathname: '/(buyer)/(tabs)/home',
													params: { collection: collection.id },
												});
											}}
										/>
									</View>
								))}
							</ScrollView>
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#F5F4F2',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 12,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E4E1DC',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#1f1f1f',
	},
	content: {
		paddingHorizontal: 16,
		gap: 24,
	},
	subtitle: {
		fontSize: 15,
		color: '#5b5149',
		lineHeight: 22,
	},
	chipRowContainer: {
		marginHorizontal: -16,
	},
	chipRow: {
		paddingHorizontal: 16,
		gap: 10,
	},
	filterChip: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#D7D2CB',
		paddingHorizontal: 14,
		paddingVertical: 8,
		backgroundColor: '#FFFFFF',
	},
	filterChipActive: {
		backgroundColor: '#1a5f3f',
		borderColor: '#1a5f3f',
	},
	filterChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#5b5149',
	},
	filterChipTextActive: {
		color: '#FFFFFF',
	},
	section: {
		gap: 16,
	},
	sectionHeader: {
		gap: 6,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#1f1f1f',
	},
	sectionDescription: {
		fontSize: 14,
		color: '#665C53',
		lineHeight: 20,
	},
	sectionScroll: {
		marginHorizontal: -16,
	},
	sectionScrollContent: {
		paddingHorizontal: 16,
		gap: 14,
	},
	sectionCardWrapper: {
		width: 320,
	},
	ctaCard: {
		backgroundColor: '#1a5f3f',
		borderRadius: 20,
		padding: 20,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		shadowColor: '#1a5f3f',
		shadowOpacity: 0.2,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 6,
	},
	ctaTitle: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '800',
	},
	ctaSubtitle: {
		color: 'rgba(255,255,255,0.8)',
		fontSize: 14,
		lineHeight: 20,
		marginTop: 4,
	},
	ctaButton: {
		backgroundColor: '#FFFFFF',
		borderRadius: 999,
		paddingHorizontal: 18,
		paddingVertical: 10,
	},
	ctaButtonText: {
		color: '#1a5f3f',
		fontWeight: '700',
		fontSize: 14,
	},
});

