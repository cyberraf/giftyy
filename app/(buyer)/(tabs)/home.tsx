import { GiftCard } from '@/components/GiftCard';
import { GiftCollectionCard } from '@/components/GiftCollectionCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useNotifications } from '@/contexts/NotificationsContext';
import { productToSimpleProduct, useProducts } from '@/contexts/ProductsContext';
import { useRecipients, type Recipient } from '@/contexts/RecipientsContext';
import { getReadableTextColor, normalizeFavoriteColor, withAlpha } from '@/lib/color-utils';
import { type SimpleProduct } from '@/lib/gift-data';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#f75507';
const COMPANY_COLOR = BRAND;

function getRecipientCardColor(recipient: Recipient): string {
	const favorites = recipient.favoriteColors?.split(',').map((color) => normalizeFavoriteColor(color)).filter(Boolean) as string[] | undefined;
	if (favorites && favorites.length > 0) {
		const firstValid = favorites.find(Boolean);
		if (firstValid) {
			return firstValid;
		}
	}
	return COMPANY_COLOR;
}

function getRecommendedGiftsForRecipient(recipient: Recipient, allProducts: SimpleProduct[]) {
	const preferences = [
		recipient.hobbies?.toLowerCase() || '',
		recipient.sports?.toLowerCase() || '',
		recipient.favoriteColors?.toLowerCase() || '',
		recipient.stylePreferences?.toLowerCase() || '',
		recipient.giftTypePreference?.toLowerCase() || '',
		recipient.personalityLifestyle?.toLowerCase() || '',
		recipient.recentLifeEvents?.toLowerCase() || '',
	].join(' ');

	const keywords = {
		'spa': ['Spa Gift Basket', 'Scented Candle Set'],
		'cozy': ['Cozy Blanket', 'Scented Candle Set'],
		'tech': ['Portable Speaker', 'Memory Frame'],
		'photo': ['Memory Frame', 'Custom Photo Book'],
		'book': ['Custom Photo Book', 'Handmade Journal'],
		'tea': ['Tea Sampler', 'Scented Candle Set'],
		'chocolate': ['Chocolate Assortment'],
		'flower': ['Flower Bouquet'],
		'experience': ['Experience Voucher'],
		'gift box': ['Curated Gift Box'],
		'minimalist': ['Memory Frame', 'Custom Photo Book'],
		'modern': ['Portable Speaker', 'Memory Frame'],
		'vintage': ['Handmade Journal', 'Custom Photo Book'],
	};

	const matchedProducts: SimpleProduct[] = [];
	const seen = new Set<string>();

	for (const [key, productNames] of Object.entries(keywords)) {
		if (preferences.includes(key)) {
			for (const productName of productNames) {
				const product = allProducts.find((p) => p.name === productName);
				if (product && !seen.has(product.id)) {
					matchedProducts.push(product);
					seen.add(product.id);
				}
			}
		}
	}

	if (matchedProducts.length === 0) {
		return allProducts.slice(0, 4);
	}

	if (matchedProducts.length < 4) {
		const remaining = allProducts.filter((p) => !seen.has(p.id));
		matchedProducts.push(...remaining.slice(0, 4 - matchedProducts.length));
	}

	return matchedProducts.slice(0, 4);
}

export default function HomeScreen() {
	const { top, right, bottom } = useSafeAreaInsets();
	const topBarPadding = top + 6;
	const topBarVisibleHeight = 60; // bar content height excluding safe area
	const topBarTotalHeight = topBarPadding + topBarVisibleHeight;
	const listPaddingTop = topBarTotalHeight + 8;
	const { setVisible } = useBottomBarVisibility();
	const lastOffsetRef = React.useRef(0);
	const scrollingRef = React.useRef(false);
	const router = useRouter();
	const { unreadCount } = useNotifications();
	const { recipients } = useRecipients();
	const { products, collections, loading: productsLoading, refreshProducts, refreshCollections } = useProducts();
	const params = useLocalSearchParams<{ ai?: string; collection?: string; recipient?: string }>();
	const [selectedCollectionId, setSelectedCollectionId] = React.useState<string | null>(null);
	const [selectedRecipientId, setSelectedRecipientId] = React.useState<string | null>(null);
	const [refreshing, setRefreshing] = React.useState(false);

	const onRefresh = React.useCallback(async () => {
		console.log('[HomeScreen] Pull-to-refresh triggered');
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCollections()]);
			console.log('[HomeScreen] Refresh completed successfully');
		} catch (error) {
			console.error('[HomeScreen] Error refreshing data:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCollections]);
	
	// Get products on sale (with discount) in random order
	const dealsProducts = React.useMemo(() => {
		const onSale = products
			.filter(p => p.isActive && p.discountPercentage > 0)
			.map(productToSimpleProduct);
		
		// Randomize order using Fisher-Yates shuffle
		const shuffled = [...onSale];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		
		return shuffled;
	}, [products]);
	// Ensure bottom bar is always visible on Home (no hide-on-scroll)
	React.useEffect(() => { setVisible(true); }, [setVisible]);
	
	React.useEffect(() => {
		if (typeof params.collection === 'string' && params.collection) {
			setSelectedCollectionId(params.collection);
		} else {
			setSelectedCollectionId(null);
		}
	}, [params.collection]);
	
	React.useEffect(() => {
		if (typeof params.recipient === 'string' && params.recipient) {
			setSelectedRecipientId(params.recipient);
		} else {
			setSelectedRecipientId(null);
		}
	}, [params.recipient]);

	// Search state (client-side)
	const [query, setQuery] = React.useState('');
	const [showFilters, setShowFilters] = React.useState(false);
	const [notifCount, setNotifCount] = React.useState<number>(3);
	const [selectedCats, setSelectedCats] = React.useState<Set<string>>(new Set());
	const [minPrice, setMinPrice] = React.useState<string>('');
	const [maxPrice, setMaxPrice] = React.useState<string>('');

	const CATEGORIES = ['Birthday', 'Valentine', 'Father', 'Mother', 'Christmas', 'Recommended'] as const;
	type Category = typeof CATEGORIES[number];

	function parsePriceToNumber(price: string): number {
		const n = parseFloat(price.replace(/[^0-9.]/g, ''));
		return isNaN(n) ? 0 : n;
	}

	type Item = { id: string; name: string; price: string; image: string; category: Category; discount?: number; originalPrice?: string };
	
	// Convert products to SimpleProduct format and categorize them, then randomize order
	const ALL = React.useMemo<Item[]>(() => {
		if (products.length === 0) return [];
		
		const tag = (category: Category) => (p: SimpleProduct & { originalPrice?: string }) => ({ ...p, category });
		const simpleProducts = products.map((product) => {
			const simple = productToSimpleProduct(product);
			// Add original price if there's a discount
			if (product.discountPercentage > 0) {
				return {
					...simple,
					originalPrice: `$${product.price.toFixed(2)}`,
				};
			}
			return simple;
		});
		
		// Categorize products based on their tags
		const categorized: Item[] = [];
		simpleProducts.forEach((product) => {
			if (product.name.toLowerCase().includes('birthday') || product.id.includes('birthday')) {
				categorized.push(tag('Birthday')(product));
			} else if (product.name.toLowerCase().includes('valentine') || product.id.includes('valentine')) {
				categorized.push(tag('Valentine')(product));
			} else if (product.name.toLowerCase().includes('father') || product.id.includes('father')) {
				categorized.push(tag('Father')(product));
			} else if (product.name.toLowerCase().includes('mother') || product.id.includes('mother')) {
				categorized.push(tag('Mother')(product));
			} else if (product.name.toLowerCase().includes('christmas') || product.id.includes('christmas')) {
				categorized.push(tag('Christmas')(product));
			} else {
				categorized.push(tag('Recommended')(product));
			}
		});
		
		// Randomize order using Fisher-Yates shuffle
		const shuffled = [...categorized];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		
		return shuffled;
	}, [products]);
	
	const selectedCollection = React.useMemo(() => {
		if (!selectedCollectionId) return null;
		const collection = collections.find((c) => c.id === selectedCollectionId);
		if (!collection) return null;
		
		// Convert to GiftCollection format
		return {
			id: collection.id,
			title: collection.title,
			color: collection.color,
			category: collection.category,
			description: collection.description || '',
			products: collection.products.map(productToSimpleProduct),
		};
	}, [selectedCollectionId, collections]);

	const collectionProductIdentifiers = React.useMemo(() => {
		if (!selectedCollection) return { ids: new Set<string>(), names: new Set<string>() };
		const ids = new Set<string>();
		const names = new Set<string>();
		for (const p of selectedCollection.products) {
			ids.add(p.id);
			names.add(p.name.toLowerCase());
			// Also extract base ID if it's prefixed (format: prefix-index-baseId)
			const parts = p.id.split('-');
			if (parts.length > 2) {
				const baseId = parts.slice(2).join('-');
				ids.add(baseId);
			}
		}
		return { ids, names };
	}, [selectedCollection]);

	const selectedRecipient = React.useMemo(() => {
		if (!selectedRecipientId) return null;
		return recipients.find((r) => r.id === selectedRecipientId) || null;
	}, [selectedRecipientId, recipients]);

	const recipientProductIdentifiers = React.useMemo(() => {
		if (!selectedRecipient) return { ids: new Set<string>(), names: new Set<string>() };
		const recommendedGifts = getRecommendedGiftsForRecipient(selectedRecipient, ALL);
		const ids = new Set<string>();
		const names = new Set<string>();
		for (const p of recommendedGifts) {
			ids.add(p.id);
			names.add(p.name.toLowerCase());
		}
		return { ids, names };
	}, [selectedRecipient, ALL]);

    const results = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		const min = minPrice ? parseFloat(minPrice) : undefined;
		const max = maxPrice ? parseFloat(maxPrice) : undefined;
		const catsActive = selectedCats.size > 0;
		const collectionActive = selectedCollectionId !== null;
		const recipientActive = selectedRecipientId !== null;
        const seen = new Set<string>();
		return ALL.filter((p) => {
			if (!p?.name) return false;
			if (collectionActive) {
				const matchesId = collectionProductIdentifiers.ids.has(p.id);
				const matchesName = collectionProductIdentifiers.names.has(p.name.toLowerCase());
				if (!matchesId && !matchesName) return false;
			}
			if (recipientActive) {
				const matchesId = recipientProductIdentifiers.ids.has(p.id);
				const matchesName = recipientProductIdentifiers.names.has(p.name.toLowerCase());
				if (!matchesId && !matchesName) return false;
			}
			if (q && !p.name.toLowerCase().includes(q)) return false;
			if (catsActive && !selectedCats.has(p.category)) return false;
			const priceNum = parsePriceToNumber(p.price);
			if (min !== undefined && priceNum < min) return false;
			if (max !== undefined && priceNum > max) return false;
			if (seen.has(p.id)) return false;
			seen.add(p.id);
			return true;
		});
	}, [ALL, query, minPrice, maxPrice, selectedCats, selectedCollectionId, selectedRecipientId, collectionProductIdentifiers, recipientProductIdentifiers]);

	const filtersActive = selectedCats.size > 0 || !!minPrice || !!maxPrice || selectedCollectionId !== null || selectedRecipientId !== null;
	
	// Pagination state
	const ITEMS_PER_PAGE = 20;
	const [displayedItems, setDisplayedItems] = React.useState<typeof results>([]);
	const [currentPage, setCurrentPage] = React.useState(1);
	const [isLoadingMore, setIsLoadingMore] = React.useState(false);
	const [hasMore, setHasMore] = React.useState(true);

	// Reset pagination when filters/search change
	React.useEffect(() => {
		setCurrentPage(1);
		setDisplayedItems(results.slice(0, ITEMS_PER_PAGE));
		setHasMore(results.length > ITEMS_PER_PAGE);
	}, [results, query, minPrice, maxPrice, selectedCats.size, selectedCollectionId, selectedRecipientId]);

	// Load more items
	const loadMoreItems = React.useCallback(() => {
		if (isLoadingMore || !hasMore) return;
		
		setIsLoadingMore(true);
		// Simulate network delay for better UX
		setTimeout(() => {
			const nextPage = currentPage + 1;
			const startIndex = currentPage * ITEMS_PER_PAGE;
			const endIndex = startIndex + ITEMS_PER_PAGE;
			const newItems = results.slice(startIndex, endIndex);
			
			if (newItems.length > 0) {
				setDisplayedItems((prev) => [...prev, ...newItems]);
				setCurrentPage(nextPage);
				setHasMore(endIndex < results.length);
			} else {
				setHasMore(false);
			}
			setIsLoadingMore(false);
		}, 300);
	}, [currentPage, results, isLoadingMore, hasMore]);

	return (
		<View style={{ flex: 1, backgroundColor: '#fff' }}>
			{/* Sticky top bar */}
			<View style={[styles.topBar, { top: 0, paddingTop: topBarPadding, height: topBarTotalHeight, paddingRight: 16 + right }]}>
				{/* Combined search + filter pill */}
				<View style={[styles.searchBox, { flex: 1, paddingRight: 6 }]}>
					<IconSymbol size={18} name="magnifyingglass" color="#9ba1a6" />
					<TextInput
						placeholder="Search gifts"
						placeholderTextColor="#9ba1a6"
						value={query}
						onChangeText={setQuery}
						onSubmitEditing={() => {}}
						returnKeyType="search"
						style={styles.searchInput}
					/>
					<View style={{ width: 1, height: 22, backgroundColor: '#e5e7eb' }} />
					<Pressable onPress={() => setShowFilters(true)} hitSlop={10} style={{ paddingHorizontal: 6, height: 36, alignItems: 'center', justifyContent: 'center' }}>
						<IconSymbol size={18} name="slider.horizontal.3" color="#111" />
					</Pressable>
					{filtersActive && <View style={[styles.badgeDot, { backgroundColor: '#f75507', top: 8, right: 8 }]} />}
				</View>

				{/* Notifications */}
				<Pressable hitSlop={10} style={styles.searchIconBtn} onPress={() => router.push('/(buyer)/notifications')}>
					<IconSymbol size={18} name="bell" color="#111" />
					{unreadCount > 0 && (
						<View style={styles.badgeCount}>
							<Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
						</View>
					)}
				</Pressable>
			</View>

			<FlatList
                data={displayedItems}
				numColumns={2}
				keyExtractor={(i) => i.id}
				style={{ flex: 1 }}
				columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
				contentContainerStyle={{ 
					paddingTop: listPaddingTop, 
					paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24, 
					gap: 12
				}}
				scrollEventThrottle={16}
				onEndReached={loadMoreItems}
				onEndReachedThreshold={0.5}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={BRAND}
						colors={[BRAND]}
						progressViewOffset={listPaddingTop}
					/>
				}
				onScroll={(e) => {
					const y = e.nativeEvent.contentOffset.y;
					// Keep bottom bar sticky; do not toggle visibility based on scroll
					lastOffsetRef.current = y;
				}}
				showsVerticalScrollIndicator={false}
				scrollEnabled={true}
                ListHeaderComponent={
                    <View style={{ gap: 12 }}>
                        {/* Expandable filter bar */}
                        <View style={{ paddingHorizontal: 16 }}>
                            <View style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <IconSymbol size={18} name="slider.horizontal.3" color="#111" />
                                        <Text style={{ fontWeight: '800' }}>Filters</Text>
                                    </View>
                                    <Pressable onPress={() => setShowFilters(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ color: '#6b7280', fontWeight: '700' }}>{filtersActive ? 'Edit' : 'Add'}</Text>
                                        <IconSymbol size={18} name="chevron.right" color="#9ba1a6" />
                                    </Pressable>
                                </View>
                                {(filtersActive || query) && (
                                    <View style={{ marginTop: 10, gap: 8 }}>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {selectedRecipient && (
                                                <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: getRecipientCardColor(selectedRecipient) + '20', borderWidth: 1, borderColor: getRecipientCardColor(selectedRecipient) }}>
                                                    <Text style={{ color: getRecipientCardColor(selectedRecipient), fontWeight: '700' }}>{selectedRecipient.firstName}</Text>
                                                </View>
                                            )}
                                            {selectedCollection && (
                                                <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: selectedCollection.color + '20', borderWidth: 1, borderColor: selectedCollection.color }}>
                                                    <Text style={{ color: selectedCollection.color, fontWeight: '700' }}>{selectedCollection.title}</Text>
                                                </View>
                                            )}
                                            {query ? (
                                                <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' }}>
                                                    <Text style={{ fontWeight: '700', color: '#111' }}>"{query}"</Text>
                                                </View>
                                            ) : null}
                                            {selectedCats.size > 0 && Array.from(selectedCats).map((c) => (
                                                <View key={c} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFF0E8', borderWidth: 1, borderColor: '#f75507' }}>
                                                    <Text style={{ color: '#f75507', fontWeight: '700' }}>{c}</Text>
                                                </View>
                                            ))}
                                            {(minPrice || maxPrice) && (
                                                <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' }}>
                                                    <Text style={{ color: '#111', fontWeight: '700' }}>{`$${minPrice || '0'} - $${maxPrice || '∞'}`}</Text>
                                                </View>
                                            )}
                                            {(filtersActive || query) && (
                                                <Pressable onPress={() => { setSelectedCats(new Set()); setMinPrice(''); setMaxPrice(''); setQuery(''); setSelectedCollectionId(null); setSelectedRecipientId(null); router.setParams({ collection: undefined, recipient: undefined }); }} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' }}>
                                                    <Text style={{ fontWeight: '800' }}>Clear</Text>
                                                </Pressable>
                                            )}
                                        </View>
                                        <Text style={{ color: '#6b7280' }}>{results.length} item(s)</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* When no active search/filters, show promos & sections */}
						{!(query || filtersActive) && (
                            <View style={{ paddingHorizontal: 16, gap: 16 }}>
                                {/* Find gifts for everyone */}
                                <View style={styles.findGiftsSection}>
                                    <Text style={styles.mainSectionTitle}>Find gifts for everyone</Text>
                                    
                                    {/* Gifts by recipient */}
                                    {recipients.length > 0 && (
                                        <View style={styles.recipientSection}>
                                            <ScrollView 
                                                horizontal
                                                showsHorizontalScrollIndicator={false} 
                                                contentContainerStyle={styles.recipientScrollContent}
                                                style={styles.recipientScroll}
                                            >
                                                {recipients.map((recipient) => {
                                                    const allSimpleProducts = products.map(productToSimpleProduct);
                                                    const recommendedGifts = getRecommendedGiftsForRecipient(recipient, allSimpleProducts);
                                                    const cardColor = getRecipientCardColor(recipient);
                                                    return (
                                                        <View key={recipient.id} style={styles.recipientCardWrapper}>
                                                            <RecipientCard 
                                                                recipient={recipient}
                                                                recommendedGifts={recommendedGifts}
                                                                color={cardColor}
                                                                onPress={() => {
                                                                    router.push({
                                                                        pathname: '/(buyer)/(tabs)/home',
                                                                        params: { recipient: recipient.id },
                                                                    });
                                                                }}
                                                            />
                                                        </View>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {/* Shop holiday collections banner */}
                                    {/* Shop by collections */}
                                    <View style={styles.collectionsSection}>
                                        <View style={styles.collectionsHeader}>
                                            <Text style={styles.sectionTitle}>Shop collections</Text>
                                            <Pressable
                                                style={styles.collectionsSeeAll}
                                                onPress={() => router.push('/(buyer)/collections')}
                                            >
                                                <Text style={styles.collectionsSeeAllText}>See all</Text>
                                                <IconSymbol name="chevron.right" size={16} color="#1a5f3f" />
                                            </Pressable>
                                        </View>
                                        <ScrollView 
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.recipientScrollContent}
                                            style={styles.recipientScroll}
                                        >
                                            {collections.map((collection) => {
                                                const simpleProducts = collection.products.map(productToSimpleProduct);
                                                return (
                                                    <View key={collection.id} style={styles.recipientCardWrapper}>
                                                        <GiftCollectionCard 
                                                            title={collection.title}
                                                            description={collection.description || ''}
                                                            products={simpleProducts}
                                                            color={collection.color}
                                                            onPress={() => {
                                                                router.push({
                                                                    pathname: '/(buyer)/(tabs)/home',
                                                                    params: { collection: collection.id },
                                                                });
                                                            }}
                                                        />
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>

                                    {/* Recommended deals */}
                                    <View style={styles.dealsSection}>
                                        <Pressable style={styles.dealsHeader}>
                                            <Text style={styles.dealsHeaderText}>Deals for you</Text>
                                            <IconSymbol name="chevron.right" size={18} color="#111" />
                                        </Pressable>
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false} 
                                            contentContainerStyle={styles.dealsScrollContent}
                                        >
                                            {dealsProducts.map((item) => (
                                                <DealCard key={item.id} item={item} />
                                            ))}
                                        </ScrollView>
                                    </View>

                                </View>
                            </View>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    <View style={{ padding: 24, alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800' }}>No results</Text>
                        <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 6 }}>Try adjusting filters or search terms.</Text>
                    </View>
                }
				ListFooterComponent={
					isLoadingMore ? (
						<View style={{ paddingVertical: 20, alignItems: 'center' }}>
							<ActivityIndicator size="small" color={BRAND} />
							<Text style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>Loading more items...</Text>
						</View>
					) : hasMore && displayedItems.length > 0 ? (
						<View style={{ paddingVertical: 16, alignItems: 'center' }}>
							<Text style={{ color: '#6b7280', fontSize: 14 }}>Scroll to load more</Text>
						</View>
					) : displayedItems.length > 0 ? (
						<View style={{ paddingVertical: 16, alignItems: 'center' }}>
							<Text style={{ color: '#6b7280', fontSize: 14 }}>You've reached the end</Text>
						</View>
					) : null
				}
				renderItem={({ item }) => (
					<View style={{ flex: 1 }}>
						<GiftCard
							name={item.name}
							price={item.price}
							image={item.image}
							originalPrice={item.originalPrice}
							discount={item.discount}
							onPress={() =>
								router.push({
									pathname: '/(buyer)/(tabs)/product/[id]',
									params: { id: item.id, name: item.name, price: item.price, image: item.image },
								})
							}
						/>
					</View>
				)}
			/>

			{/* Filters modal */}
			<Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
				<Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setShowFilters(false)} />
				<View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
					<Text style={{ fontWeight: '900', fontSize: 18 }}>Filters</Text>
					<View style={{ height: 10 }} />

					<Text style={{ fontWeight: '800' }}>Categories</Text>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
						{CATEGORIES.map((c) => {
							const active = selectedCats.has(c);
							return (
								<Pressable
									key={c}
									onPress={() => {
										setSelectedCats((s) => {
											const next = new Set(Array.from(s));
											if (next.has(c)) next.delete(c);
											else next.add(c);
											return next;
										});
									}}
									style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: active ? '#f75507' : '#e5e7eb', backgroundColor: active ? '#FFF0E8' : 'white' }}
								>
									<Text style={{ fontWeight: '700', color: active ? '#f75507' : '#111' }}>{c}</Text>
								</Pressable>
							);
						})}
					</View>

					<View style={{ height: 14 }} />
					<Text style={{ fontWeight: '800' }}>Price range ($)</Text>
					<View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
						<View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, height: 42, justifyContent: 'center' }}>
							<TextInput keyboardType="numeric" placeholder="Min" value={minPrice} onChangeText={setMinPrice} />
						</View>
						<View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, height: 42, justifyContent: 'center' }}>
							<TextInput keyboardType="numeric" placeholder="Max" value={maxPrice} onChangeText={setMaxPrice} />
						</View>
					</View>

					<View style={{ height: 16 }} />
					<View style={{ flexDirection: 'row', gap: 10 }}>
						<Pressable onPress={() => setShowFilters(false)} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
							<Text style={{ fontWeight: '800' }}>Close</Text>
						</Pressable>
						<Pressable
							onPress={() => {
								setShowFilters(false);
							}}
							style={{ flex: 1, borderRadius: 12, backgroundColor: '#f75507', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}
						>
							<Text style={{ color: 'white', fontWeight: '800' }}>Apply</Text>
						</Pressable>
						<Pressable
							onPress={() => {
								setSelectedCats(new Set());
								setMinPrice('');
								setMaxPrice('');
							}}
							style={{ borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14 }}
						>
							<Text style={{ fontWeight: '800' }}>Clear</Text>
						</Pressable>
					</View>
				</View>
			</Modal>
		</View>
	);
}

function RecipientCard({ 
    recipient,
    recommendedGifts,
    color,
    onPress
}: { 
    recipient: Recipient;
    recommendedGifts: { id: string; name: string; price: string; image: string; discount?: number }[];
    color: string;
    onPress?: () => void;
}) {
    const router = useRouter();
    const textColor = getReadableTextColor(color);
    const patternColor = withAlpha(color.startsWith('#') ? color : COMPANY_COLOR, 0.2) ?? 'rgba(255, 255, 255, 0.18)';
    
    const handleProductPress = (item: { id: string; name: string; price: string; image: string }) => {
        router.push({ 
            pathname: '/(buyer)/(tabs)/product/[id]', 
            params: { id: item.id, name: item.name, price: item.price, image: item.image } 
        });
    };
    
    return (
        <Pressable style={[styles.recipientCard, { backgroundColor: color }]} onPress={onPress}>
            <View style={[styles.recipientCardPattern, { backgroundColor: patternColor }]} />
            <View style={styles.recipientCardHeader}>
                <Text style={[styles.recipientCardTitle, { color: textColor }]} numberOfLines={1}>{recipient.firstName}</Text>
            </View>
            <View style={styles.recipientGiftsGrid}>
                {recommendedGifts.map((item) => (
                    <Pressable
                        key={item.id}
                        style={styles.recipientGiftItem}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleProductPress(item);
                        }}
                    >
                        <Image source={{ uri: item.image }} style={styles.recipientGiftImage} resizeMode="cover" />
                    </Pressable>
                ))}
            </View>
        </Pressable>
    );
}

function DealCard({ item }: { item: { id: string; name: string; price: string; image: string; discount?: number } }) {
    const router = useRouter();
    return (
        <Pressable 
            style={styles.dealCard}
            onPress={() =>
                router.push({ 
                    pathname: '/(buyer)/(tabs)/product/[id]', 
                    params: { id: item.id, name: item.name, price: item.price, image: item.image } 
                })
            }
        >
            <Image source={{ uri: item.image }} style={styles.dealImage} resizeMode="cover" />
            {item.discount && (
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{item.discount}% off</Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
	topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee', zIndex: 10 },
	searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F4F5F6', borderRadius: 14, paddingHorizontal: 12, height: 42 },
	searchInput: { flex: 1, color: '#111' },
	searchIconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
	badgeDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
	badgeCount: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
	mainSectionTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 16 },
	sectionTitle: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 12 },
	sectionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, fontWeight: '500' },
	sectionHeader: { marginBottom: 16, gap: 4 },
	findGiftsSection: { gap: 20, marginTop: 8 },
	recipientSection: { gap: 12 },
	recipientScroll: { 
		marginLeft: -16,
	},
	recipientScrollContent: { 
		gap: 12, 
		paddingHorizontal: 16,
		paddingRight: 16,
	},
	recipientCardWrapper: {
		width: 320,
	},
	recipientCard: {
		width: 320,
		height: 360,
		borderRadius: 16,
		overflow: 'hidden',
		position: 'relative',
		padding: 16,
		justifyContent: 'space-between',
	},
	recipientCardPattern: {
		position: 'absolute',
		top: 0,
		right: 0,
		width: '60%',
		height: '60%',
		borderRadius: 16,
		transform: [{ rotate: '15deg' }],
	},
	recipientCardHeader: {
		zIndex: 1,
	},
	recipientCardTitle: {
		fontSize: 20,
		fontWeight: '800',
		textShadowColor: 'rgba(0,0,0,0.3)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	recipientGiftsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 12,
	},
	recipientGiftItem: {
		width: '47%',
		aspectRatio: 1,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: 'rgba(255, 255, 255, 0.95)',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	recipientGiftImage: {
		width: '100%',
		height: '100%',
	},
	collectionsSection: {
		gap: 12,
	},
	collectionsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 4,
	},
	collectionsSeeAll: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 6,
		borderRadius: 999,
	},
	collectionsSeeAllText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1a5f3f',
	},
	dealsSection: { gap: 12, marginTop: 8, marginBottom: 32 },
	dealsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 4,
	},
	dealsHeaderText: {
		fontSize: 16,
		fontWeight: '800',
		color: '#111',
	},
	dealsScrollContent: { gap: 12, paddingHorizontal: 16, paddingRight: 16 },
	dealCard: {
		width: 160,
		height: 200,
		borderRadius: 16,
		overflow: 'hidden',
		position: 'relative',
		backgroundColor: '#f9fafb',
	},
	dealImage: {
		width: '100%',
		height: '100%',
	},
	discountBadge: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#ef4444',
		paddingVertical: 6,
		paddingHorizontal: 10,
		alignItems: 'center',
	},
	discountText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '800',
	},
});
