import { GiftCard } from '@/components/GiftCard';
import { GiftCollectionCard } from '@/components/GiftCollectionCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { useAISection } from '@/contexts/AISectionContext';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useNotifications } from '@/contexts/NotificationsContext';
import { productToSimpleProduct, useProducts } from '@/contexts/ProductsContext';
import { useRecipients, type Recipient } from '@/contexts/RecipientsContext';
import { getReadableTextColor, normalizeFavoriteColor, withAlpha } from '@/lib/color-utils';
import { FOR_HER, FOR_HIM, FOR_KIDS, FOR_TEENS, type SimpleProduct } from '@/lib/gift-data';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
	const { top, right } = useSafeAreaInsets();
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
	const { products, collections, loading: productsLoading } = useProducts();
	const params = useLocalSearchParams<{ ai?: string; collection?: string; recipient?: string }>();
	const { setAiSectionVisibleOnHome, setIsHomeMounted } = useAISection();
	const aiBottomRef = React.useRef(0);
	const [selectedCollectionId, setSelectedCollectionId] = React.useState<string | null>(null);
	const [selectedRecipientId, setSelectedRecipientId] = React.useState<string | null>(null);
	
	React.useEffect(() => { setIsHomeMounted(true); return () => setIsHomeMounted(false); }, [setIsHomeMounted]);
	React.useEffect(() => {
		if (typeof params.ai === 'string' && params.ai) {
			console.log('[Home Screen] ========================================');
			console.log('[Home Screen] Received AI parameter from URL:', params.ai);
			const parsed = parseAIPrompt(params.ai);
			console.log('[Home Screen] Parsed AI parameter:', JSON.stringify(parsed, null, 2));
			if (parsed.categories) {
				console.log('[Home Screen] Setting categories from URL param:', parsed.categories);
				setSelectedCats(new Set(parsed.categories));
			}
			if (parsed.min !== undefined) {
				console.log('[Home Screen] Setting min price from URL param:', parsed.min);
				setMinPrice(String(parsed.min));
			}
			if (parsed.max !== undefined) {
				console.log('[Home Screen] Setting max price from URL param:', parsed.max);
				setMaxPrice(String(parsed.max));
			}
			if (parsed.query) {
				console.log('[Home Screen] Setting query from URL param:', parsed.query);
				setQuery(parsed.query);
			}
			console.log('[Home Screen] URL parameter processing completed');
			console.log('[Home Screen] ========================================');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.ai]);
	
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

	type Item = { id: string; name: string; price: string; image: string; category: Category; discount?: number };
	
	// Convert products to SimpleProduct format and categorize them
	const ALL = React.useMemo<Item[]>(() => {
		if (products.length === 0) return [];
		
		const tag = (category: Category) => (p: SimpleProduct) => ({ ...p, category });
		const simpleProducts = products.map(productToSimpleProduct);
		
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
		
		return categorized;
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
		<View style={{ flex: 1 }}>
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
				columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
				contentContainerStyle={{ paddingTop: listPaddingTop, paddingBottom: BOTTOM_BAR_TOTAL_SPACE + 24, gap: 12 }}
				scrollEventThrottle={16}
				onEndReached={loadMoreItems}
				onEndReachedThreshold={0.5}
                onScroll={(e) => {
					const y = e.nativeEvent.contentOffset.y;
					const last = lastOffsetRef.current;
					const delta = y - last;
					// apply small threshold to reduce jitter
					if (Math.abs(delta) > 6) {
						setVisible(delta < 0);
						lastOffsetRef.current = y;
					}
					// AI section visibility: visible if not scrolled past its bottom
                    const aiBottom = aiBottomRef.current;
                    if (aiBottom > 0) {
                        const threshold = 12;
                        const visible = y < aiBottom - threshold;
                        setAiSectionVisibleOnHome(visible);
                    }
				}}
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
                                {/* Giftyy AI assistant */}
                                <View onLayout={(e) => { const l = e.nativeEvent.layout; aiBottomRef.current = l.y + l.height; setAiSectionVisibleOnHome(true); }}>
                                <GiftyyAI
                                    onSuggest={(ai, mentionedRecipients) => {
                                        console.log('[Home Screen] ========================================');
                                        console.log('[Home Screen] GiftyyAI onSuggest called with:', ai);
                                        
                                        // Parse the prompt with enhanced context extraction
                                        let parsed: ParsedPromptContext;
                                        
                                        // If recipients are mentioned, use their details for recommendations
                                        if (mentionedRecipients && mentionedRecipients.length > 0) {
                                            console.log('[Home Screen] Processing', mentionedRecipients.length, 'mentioned recipient(s)');
                                            
                                            // Use the first mentioned recipient's details to enhance the prompt
                                            const recipient = mentionedRecipients[0];
                                            const recipientContext = buildRecipientContext(recipient);
                                            console.log('[Home Screen] Recipient context:', recipientContext);
                                            
                                            // Enhance the prompt with recipient details
                                            const enhancedPrompt = `${ai}\n\nRecipient details: ${recipientContext}`;
                                            parsed = parseAIPrompt(enhancedPrompt, recipient);
                                            
                                            // Set recipient filter
                                            setSelectedRecipientId(recipient.id);
                                        } else {
                                            // No recipients mentioned, use regular parsing
                                            parsed = parseAIPrompt(ai);
                                        }
                                        
                                        console.log('[Home Screen] Parsed AI prompt with full context:', JSON.stringify(parsed, null, 2));
                                        console.log('[Home Screen] Context summary:', parsed.contextSummary || 'No summary');
                                        
                                        // Apply all parsed filters
                                        if (parsed.categories) {
                                            console.log('[Home Screen] Setting categories:', parsed.categories);
                                            setSelectedCats(new Set(parsed.categories));
                                        }
                                        if (parsed.min !== undefined) {
                                            console.log('[Home Screen] Setting min price:', parsed.min);
                                            setMinPrice(String(parsed.min));
                                        }
                                        if (parsed.max !== undefined) {
                                            console.log('[Home Screen] Setting max price:', parsed.max);
                                            setMaxPrice(String(parsed.max));
                                        }
                                        if (parsed.query) {
                                            console.log('[Home Screen] Setting search query:', parsed.query);
                                            setQuery(parsed.query);
                                        }
                                        
                                        // Store the full context for potential use in recommendations
                                        // The context summary can be used to enhance product matching
                                        if (parsed.contextSummary) {
                                            console.log('[Home Screen] Using context for enhanced recommendations:', parsed.contextSummary);
                                        }
                                        
                                        console.log('[Home Screen] Filters updated successfully');
                                        console.log('[Home Screen] ========================================');
                                    }}
                                />
								</View>

                                {/* Find gifts for everyone */}
                                <View style={styles.findGiftsSection}>
                                    <Text style={styles.mainSectionTitle}>Find gifts for everyone</Text>
                                    
                                    {/* Gifts by recipient */}
                                    {recipients.length > 0 && (
                                        <View style={styles.recipientSection}>
                                            <Pressable 
                                                style={styles.recipientHeader}
                                                onPress={() => router.push('/(buyer)/(tabs)/profile')}
                                            >
                                                <Text style={styles.recipientHeaderText}>Gifts by recipient</Text>
                                                <IconSymbol name="chevron.right" size={18} color="#1a5f3f" />
                                            </Pressable>
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
                                        <Text style={styles.sectionTitle}>Recommended deals for you</Text>
                                        <Pressable style={styles.dealsHeader}>
                                            <Text style={styles.dealsHeaderText}>Deals for you</Text>
                                            <IconSymbol name="chevron.right" size={18} color="#111" />
                                        </Pressable>
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false} 
                                            contentContainerStyle={styles.dealsScrollContent}
                                        >
                                            {[...FOR_HER, ...FOR_HIM, ...FOR_KIDS, ...FOR_TEENS].filter(item => item.discount).map((item) => (
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

function GiftyyAI({ onSuggest }: { onSuggest: (text: string, mentionedRecipients?: Recipient[]) => void }) {
    const { recipients } = useRecipients();
    const [text, setText] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [inputHeight, setInputHeight] = React.useState(40);
    const [showMentionDropdown, setShowMentionDropdown] = React.useState(false);
    const [mentionQuery, setMentionQuery] = React.useState('');
    const [mentionStartIndex, setMentionStartIndex] = React.useState(-1);
    const textInputRef = React.useRef<TextInput | null>(null);
    const suggestions = [
        'Birthday gift for mom under $50',
        'Romantic gift for girlfriend',
        'Techie gift for boyfriend $100',
        'Relaxing spa set for mother',
    ];
    const scrollRef = React.useRef<ScrollView | null>(null);
    const offsetsRef = React.useRef<number[]>([]);
    const [idx, setIdx] = React.useState(0);
    
    React.useEffect(() => {
        console.log('[GiftyyAI] Component mounted');
        return () => {
            console.log('[GiftyyAI] Component unmounted');
        };
    }, []);

    // Filter recipients for mention autocomplete
    const filteredRecipients = React.useMemo(() => {
        if (!mentionQuery) return recipients.slice(0, 5);
        const query = mentionQuery.toLowerCase();
        return recipients
            .filter(r => {
                const fullName = `${r.firstName} ${r.lastName || ''}`.toLowerCase().trim();
                return fullName.includes(query) || r.firstName.toLowerCase().includes(query);
            })
            .slice(0, 5);
    }, [recipients, mentionQuery]);

    // Handle text change and detect '@' mentions
    const handleTextChange = React.useCallback((newText: string) => {
        setText(newText);
        
        // Find the last '@' symbol
        const lastAtIndex = newText.lastIndexOf('@');
        const cursorPos = newText.length;
        
        if (lastAtIndex !== -1) {
            // Check if '@' is part of a mention (not already completed with a space or end of text)
            const afterAt = newText.substring(lastAtIndex + 1);
            const spaceIndex = afterAt.indexOf(' ');
            const newlineIndex = afterAt.indexOf('\n');
            
            if (spaceIndex === -1 && newlineIndex === -1) {
                // We're in a mention - extract the query
                const query = afterAt.toLowerCase();
                setMentionQuery(query);
                setMentionStartIndex(lastAtIndex);
                setShowMentionDropdown(true);
                console.log('[GiftyyAI] Mention detected, query:', query);
            } else {
                setShowMentionDropdown(false);
                setMentionQuery('');
            }
        } else {
            setShowMentionDropdown(false);
            setMentionQuery('');
        }
    }, []);

    // Handle recipient selection from mention dropdown
    const handleSelectRecipient = React.useCallback((recipient: Recipient) => {
        if (mentionStartIndex === -1) return;
        
        const beforeMention = text.substring(0, mentionStartIndex);
        const afterMention = text.substring(mentionStartIndex).replace(/@[^\s\n]*/, `@${recipient.firstName}${recipient.lastName ? ' ' + recipient.lastName : ''}`);
        const newText = beforeMention + afterMention + ' ';
        
        setText(newText);
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
        console.log('[GiftyyAI] Selected recipient:', recipient.firstName, recipient.lastName);
        
        // Focus back on input
        setTimeout(() => {
            textInputRef.current?.focus();
        }, 100);
    }, [text, mentionStartIndex]);

    // Extract mentioned recipients from text
    const extractMentionedRecipients = React.useCallback((text: string): Recipient[] => {
        const mentioned: Recipient[] = [];
        const mentionRegex = /@([^\s\n@]+(?:\s+[^\s\n@]+)?)/g;
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            const mentionName = match[1].trim();
            // Try to find recipient by first name or full name
            const recipient = recipients.find(r => {
                const fullName = `${r.firstName} ${r.lastName || ''}`.trim();
                return fullName.toLowerCase() === mentionName.toLowerCase() || 
                       r.firstName.toLowerCase() === mentionName.toLowerCase();
            });
            
            if (recipient && !mentioned.find(r => r.id === recipient.id)) {
                mentioned.push(recipient);
                console.log('[GiftyyAI] Found mentioned recipient:', recipient.firstName, recipient.lastName);
            }
        }
        
        return mentioned;
    }, [recipients]);
    
    React.useEffect(() => {
        const id = setInterval(() => {
            setIdx((i) => {
                const next = (i + 1) % suggestions.length;
                const off = offsetsRef.current[next] ?? 0;
                scrollRef.current?.scrollTo({ x: Math.max(0, off - 6), animated: true });
                return next;
            });
        }, 3000);
        return () => clearInterval(id);
    }, [suggestions.length]);
    return (
        <View style={styles.aiCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Image source={require('@/assets/images/logo.png')} style={{ width: 22, height: 22, borderRadius: 5 }} resizeMode="contain" />
                <Text style={{ fontWeight: '900' }}>Giftyy AI</Text>
            </View>
            <View style={{ height: 8 }} />
            <View style={{ position: 'relative' }}>
                <View style={styles.aiInput}>
                    <TextInput
                        ref={textInputRef}
                        value={text}
                        onChangeText={handleTextChange}
                        placeholder="Describe who you're gifting... (use @ to mention a recipient)"
                        placeholderTextColor="#9ba1a6"
                        multiline
                        onContentSizeChange={(e) => {
                            const h = e.nativeEvent.contentSize.height;
                            setInputHeight(Math.min(120, Math.max(40, Math.ceil(h))));
                        }}
                        style={{ flex: 1, color: '#111', height: inputHeight }}
                    />
                    <Pressable
                    onPress={() => {
                        if (!text.trim()) {
                            console.log('[GiftyyAI] Empty prompt, ignoring');
                            return;
                        }
                        console.log('[GiftyyAI] ========================================');
                        console.log('[GiftyyAI] User submitted prompt:', text.trim());
                        console.log('[GiftyyAI] Starting AI suggestion process...');
                        
                        // Extract mentioned recipients
                        const mentionedRecipients = extractMentionedRecipients(text.trim());
                        if (mentionedRecipients.length > 0) {
                            console.log('[GiftyyAI] Found', mentionedRecipients.length, 'mentioned recipient(s)');
                            mentionedRecipients.forEach((r, i) => {
                                console.log(`[GiftyyAI]   ${i + 1}. ${r.firstName} ${r.lastName || ''} (${r.relationship})`);
                            });
                        }
                        
                        setLoading(true);
                        setShowMentionDropdown(false);
                        setTimeout(() => {
                            console.log('[GiftyyAI] Calling onSuggest callback with:', text.trim());
                            onSuggest(text.trim(), mentionedRecipients);
                            setLoading(false);
                            console.log('[GiftyyAI] AI suggestion process completed');
                            console.log('[GiftyyAI] ========================================');
                        }, 600);
                    }}
                    style={[
                        styles.aiButton,
                        {
                            opacity: text.trim() ? 1 : 0.6,
                            backgroundColor: text.trim() ? BRAND : '#d1d5db',
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignSelf: 'flex-start',
                        },
                    ]}
                    disabled={!text.trim() || loading}
                >
                    {loading ? <ActivityIndicator color="white" size="small" /> : <IconSymbol size={18} name="magnifyingglass" color="white" />}
                </Pressable>
                </View>
                {showMentionDropdown && filteredRecipients.length > 0 && (
                    <View style={styles.mentionDropdown}>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {filteredRecipients.map((recipient) => (
                                <Pressable
                                    key={recipient.id}
                                    onPress={() => handleSelectRecipient(recipient)}
                                    style={styles.mentionItem}
                                >
                                    <Text style={styles.mentionItemName}>
                                        {recipient.firstName} {recipient.lastName || ''}
                                    </Text>
                                    {recipient.relationship && (
                                        <Text style={styles.mentionItemRelation}>{recipient.relationship}</Text>
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center', paddingRight: 6 }} style={{ marginTop: 8 }}>
                {suggestions.map((s, i) => (
                    <Pressable
                        key={s}
                        onPress={() => {
                            console.log('[GiftyyAI] User selected suggestion:', s);
                            setText(s);
                        }}
                        onLayout={(e) => {
                            const x = e.nativeEvent.layout.x;
                            offsetsRef.current[i] = x;
                        }}
                        style={styles.aiChip}
                    >
                        <Text style={{ color: '#111', fontWeight: '400', fontSize: 13 }}>{s}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

// Build a context string from recipient details for AI recommendations
function buildRecipientContext(recipient: Recipient): string {
    const parts: string[] = [];
    parts.push(`Name: ${recipient.firstName} ${recipient.lastName || ''}`.trim());
    if (recipient.relationship) parts.push(`Relationship: ${recipient.relationship}`);
    if (recipient.ageRange) parts.push(`Age: ${recipient.ageRange}`);
    if (recipient.hobbies) parts.push(`Hobbies: ${recipient.hobbies}`);
    if (recipient.sports) parts.push(`Sports: ${recipient.sports}`);
    if (recipient.favoriteColors) parts.push(`Favorite colors: ${recipient.favoriteColors}`);
    if (recipient.stylePreferences) parts.push(`Style: ${recipient.stylePreferences}`);
    if (recipient.personalityLifestyle) parts.push(`Personality: ${recipient.personalityLifestyle}`);
    if (recipient.giftTypePreference) parts.push(`Gift preference: ${recipient.giftTypePreference}`);
    if (recipient.recentLifeEvents) parts.push(`Recent events: ${recipient.recentLifeEvents}`);
    if (recipient.favoriteGenres) parts.push(`Favorite genres: ${recipient.favoriteGenres}`);
    if (recipient.favoriteArtists) parts.push(`Favorite artists: ${recipient.favoriteArtists}`);
    if (recipient.dietaryPreferences) parts.push(`Dietary: ${recipient.dietaryPreferences}`);
    if (recipient.allergies) parts.push(`Allergies: ${recipient.allergies}`);
    if (recipient.notes) parts.push(`Notes: ${recipient.notes}`);
    return parts.join(', ');
}

type ParsedPromptContext = {
    // Existing fields
    categories?: string[];
    min?: number;
    max?: number;
    query?: string;
    occasion?: string;
    relationship?: string;
    giftStyle?: string[];
    ageGroup?: string;
    gender?: string;
    interests?: string[];
    emotionalTone?: string;
    urgency?: string;
    giftType?: string[];
    specialRequirements?: string[];
    contextSummary?: string;
    
    // NEW: Enhanced fields
    location?: {
        country?: string;
        region?: string;
        city?: string;
        timezone?: string;
    };
    culture?: {
        primary?: string; // e.g., "Western", "Asian", "Middle Eastern", "Latin American", "African"
        secondary?: string[];
        religiousContext?: string; // e.g., "Christian", "Muslim", "Jewish", "Hindu", "Buddhist"
        culturalPreferences?: string[];
    };
    lifestyle?: {
        urban?: boolean;
        rural?: boolean;
        active?: boolean;
        homebody?: boolean;
        social?: boolean;
        introverted?: boolean;
        workLife?: string; // e.g., "corporate", "creative", "entrepreneur", "student", "retired"
        familyStatus?: string; // e.g., "single", "married", "parent", "empty-nester"
        livingSituation?: string; // e.g., "apartment", "house", "dorm"
    };
    preferences?: {
        likes: string[];
        dislikes: string[];
        avoid?: string[]; // Things to explicitly avoid
    };
    seasonalContext?: {
        season?: string; // "spring", "summer", "fall", "winter"
        holiday?: string;
        localEvents?: string[];
        weather?: string; // "hot", "cold", "mild"
    };
    socialContext?: {
        groupGift?: boolean;
        giftExchange?: boolean;
        corporateGift?: boolean;
        surprise?: boolean;
        publicGift?: boolean; // Will be opened in front of others
    };
    personality?: {
        traits?: string[]; // e.g., "introverted", "extroverted", "analytical", "creative"
        values?: string[]; // e.g., "sustainability", "luxury", "practicality"
    };
};

function parseAIPrompt(text: string, recipient?: Recipient): ParsedPromptContext {
    console.log('[parseAIPrompt] Parsing prompt:', text);
    if (recipient) {
        console.log('[parseAIPrompt] Using recipient context:', recipient.firstName, recipient.lastName);
    }
    const t = text.toLowerCase();
    const result: ParsedPromptContext = {};
    const cats: string[] = [];
    const interests: string[] = [];
    const giftStyles: string[] = [];
    const giftTypes: string[] = [];
    const specialReqs: string[] = [];
    const likes: string[] = [];
    const dislikes: string[] = [];
    const avoid: string[] = [];
    const personalityTraits: string[] = [];
    const values: string[] = [];
    
    // Extract location from recipient if available
    if (recipient) {
        if (recipient.country || recipient.city || recipient.state) {
            result.location = {
                country: recipient.country,
                region: recipient.state,
                city: recipient.city,
            };
        }
    }
    
    // Parse location from text
    const countryPatterns: Record<string, RegExp> = {
        'USA': /\busa|united states|america|us\b/,
        'UK': /\buk|united kingdom|britain|england|scotland|wales\b/,
        'Canada': /\bcanada|canadian\b/,
        'Australia': /\baustralia|australian\b/,
        'Japan': /\bjapan|japanese\b/,
        'China': /\bchina|chinese\b/,
        'India': /\bindia|indian\b/,
        'Germany': /\bgermany|german\b/,
        'France': /\bfrance|french\b/,
        'Italy': /\bitaly|italian\b/,
        'Spain': /\bspain|spanish\b/,
        'Mexico': /\bmexico|mexican\b/,
        'Brazil': /\bbrazil|brazilian\b/,
        'South Korea': /\bsouth korea|korean|korea\b/,
        'Middle East': /\bmiddle east|uae|dubai|saudi|qatar\b/,
    };
    
    if (!result.location) {
        result.location = {};
        for (const [country, pattern] of Object.entries(countryPatterns)) {
            if (pattern.test(t)) {
                result.location.country = country;
                break;
            }
        }
    }
    
    // Parse cultural context
    const culturalPatterns: Record<string, RegExp> = {
        'Western': /\bwestern|american|european|australian|canadian\b/,
        'Asian': /\basian|chinese|japanese|korean|vietnamese|thai|filipino\b/,
        'Middle Eastern': /\bmiddle eastern|arabic|muslim|islamic|persian|turkish\b/,
        'Latin American': /\blatin|hispanic|mexican|brazilian|argentinian|colombian\b/,
        'African': /\bafrican|nigerian|Togolese|Ghanaian|Congolese|Senegalese|south african|kenyan\b/,
        'Indian': /\bindian|hindu|sikh|bengali\b/,
        'Jewish': /\bjewish|jew|judaism|hebrew\b/,
        'Christian': /\bchristian|catholic|protestant|orthodox\b/,
    };
    
    result.culture = {};
    for (const [culture, pattern] of Object.entries(culturalPatterns)) {
        if (pattern.test(t)) {
            if (!result.culture.primary) {
                result.culture.primary = culture;
            } else if (!result.culture.secondary) {
                result.culture.secondary = [culture];
            } else {
                result.culture.secondary.push(culture);
            }
        }
    }
    
    // Parse religious context
    const religiousPatterns: Record<string, RegExp> = {
        'Christian': /\bchristian|catholic|protestant|orthodox|baptist|methodist\b/,
        'Muslim': /\bmuslim|islam|islamic|ramadan|eid\b/,
        'Jewish': /\bjewish|jew|judaism|hanukkah|passover\b/,
        'Hindu': /\bhindu|hinduism|diwali|puja\b/,
        'Buddhist': /\bbuddhist|buddhism|buddha\b/,
        'Sikh': /\bsikh|sikhism\b/,
    };
    
    for (const [religion, pattern] of Object.entries(religiousPatterns)) {
        if (pattern.test(t)) {
            result.culture!.religiousContext = religion;
            break;
        }
    }
    
    // If recipient is provided, use their relationship to infer category
    if (recipient) {
        const relationship = recipient.relationship?.toLowerCase() || '';
        if (relationship.includes('mother') || relationship.includes('mom') || relationship.includes('mum')) {
            cats.push('Mother');
            result.relationship = 'mother';
        } else if (relationship.includes('father') || relationship.includes('dad') || relationship.includes('papa')) {
            cats.push('Father');
            result.relationship = 'father';
        } else if (relationship.includes('girlfriend') || relationship.includes('boyfriend') || relationship.includes('partner') || relationship.includes('spouse')) {
            cats.push('Valentine');
            result.relationship = 'romantic';
        } else if (relationship.includes('friend')) {
            result.relationship = 'friend';
        } else if (relationship.includes('colleague') || relationship.includes('coworker') || relationship.includes('boss')) {
            result.relationship = 'professional';
        } else if (relationship.includes('sister') || relationship.includes('brother') || relationship.includes('sibling')) {
            result.relationship = 'sibling';
        } else if (relationship.includes('grandmother') || relationship.includes('grandfather') || relationship.includes('grandma') || relationship.includes('grandpa')) {
            result.relationship = 'grandparent';
        }
        
        // Extract lifestyle from recipient
        if (recipient.personalityLifestyle) {
            const lifestyle = recipient.personalityLifestyle.toLowerCase();
            result.lifestyle = {};
            if (lifestyle.includes('urban') || lifestyle.includes('city')) result.lifestyle.urban = true;
            if (lifestyle.includes('rural') || lifestyle.includes('country')) result.lifestyle.rural = true;
            if (lifestyle.includes('active') || lifestyle.includes('athletic')) result.lifestyle.active = true;
            if (lifestyle.includes('homebody') || lifestyle.includes('home')) result.lifestyle.homebody = true;
            if (lifestyle.includes('social') || lifestyle.includes('outgoing')) result.lifestyle.social = true;
            if (lifestyle.includes('introvert') || lifestyle.includes('quiet')) result.lifestyle.introverted = true;
        }
    }
    
    // Parse occasion types (enhanced)
    const occasionPatterns = {
        'birthday': /\bbirthday|bday|turning\s+\d+|born\s+on\b/,
        'anniversary': /\banniversary|years?\s+together|married\s+for\b/,
        'wedding': /\bwedding|getting\s+married|bridal|groom|bridesmaid|groomsman\b/,
        'graduation': /\bgraduation|graduating|graduated|degree|commencement\b/,
        'christmas': /\bchristmas|xmas|holiday|holidays\b/,
        'valentine': /\bvalentine|valentines|romantic|wife|husband|girlfriend|boyfriend|partner|spouse|fianc[ée]|significant\s+other|love\b/,
        'mothers-day': /\bmother'?s?\s+day|mom'?s?\s+day\b/,
        'fathers-day': /\bfather'?s?\s+day|dad'?s?\s+day\b/,
        'thank-you': /\bthank\s+you|thanks|appreciation|grateful\b/,
        'congratulations': /\bcongratulations|congrats|achievement|accomplishment|promotion|new job\b/,
        'get-well': /\bget\s+well|feel\s+better|recovery|sick|ill|hospital|surgery\b/,
        'new-baby': /\bnew\s+baby|baby\s+shower|newborn|expecting|pregnancy|pregnant\b/,
        'housewarming': /\bhousewarming|new\s+home|new\s+house|moving|relocating\b/,
        'retirement': /\bretirement|retiring|retired\b/,
        'engagement': /\bengagement|engaged|proposal\b/,
        'bridal-shower': /\bbridal\s+shower|bachelorette\b/,
        'baby-shower': /\bbaby\s+shower\b/,
        'easter': /\beaster\b/,
        'hanukkah': /\bhanukkah|chanukah\b/,
        'diwali': /\bdiwali|deepavali\b/,
        'ramadan': /\bramadan|iftar\b/,
        'chinese-new-year': /\bchinese\s+new\s+year|lunar\s+new\s+year\b/,
    };
    
    for (const [occasion, pattern] of Object.entries(occasionPatterns)) {
        if (pattern.test(t)) {
            result.occasion = occasion;
            if (occasion === 'birthday') cats.push('Birthday');
            if (occasion === 'valentine' || occasion === 'mothers-day' || occasion === 'fathers-day') {
                if (occasion === 'valentine' && !cats.includes('Valentine')) cats.push('Valentine');
                if (occasion === 'mothers-day' && !cats.includes('Mother')) cats.push('Mother');
                if (occasion === 'fathers-day' && !cats.includes('Father')) cats.push('Father');
            }
            if (occasion === 'christmas' && !cats.includes('Christmas')) cats.push('Christmas');
            break;
        }
    }
    
    // Parse relationship from text if not from recipient
    if (!result.relationship) {
        if (/\bmom|mother|mum|mommy\b/.test(t)) {
            result.relationship = 'mother';
            if (!cats.includes('Mother')) cats.push('Mother');
        } else if (/\bdad|father|papa|daddy\b/.test(t)) {
            result.relationship = 'father';
            if (!cats.includes('Father')) cats.push('Father');
        } else if (/\bgirlfriend|boyfriend|partner|spouse|husband|wife|fianc[ée]|significant\s+other\b/.test(t)) {
            result.relationship = 'romantic';
            if (!cats.includes('Valentine')) cats.push('Valentine');
        } else if (/\bfriend|buddy|pal\b/.test(t)) {
            result.relationship = 'friend';
        } else if (/\bcolleague|coworker|boss|manager|professional|client\b/.test(t)) {
            result.relationship = 'professional';
        } else if (/\bsister|brother|sibling\b/.test(t)) {
            result.relationship = 'sibling';
        } else if (/\bgrandmother|grandfather|grandma|grandpa|grandparent\b/.test(t)) {
            result.relationship = 'grandparent';
        } else if (/\bniece|nephew|aunt|uncle|cousin\b/.test(t)) {
            result.relationship = 'extended-family';
        }
    }
    
    // Parse lifestyle indicators
    if (!result.lifestyle) result.lifestyle = {};
    if (/\burban|city|metropolitan|downtown\b/.test(t)) result.lifestyle.urban = true;
    if (/\brural|country|suburban|small town\b/.test(t)) result.lifestyle.rural = true;
    if (/\bactive|athletic|fitness|sporty|outdoorsy\b/.test(t)) result.lifestyle.active = true;
    if (/\bhomebody|homebody|indoor|cozy|stay at home\b/.test(t)) result.lifestyle.homebody = true;
    if (/\bsocial|outgoing|extrovert|party|gathering\b/.test(t)) result.lifestyle.social = true;
    if (/\bintrovert|introverted|quiet|reserved|private\b/.test(t)) result.lifestyle.introverted = true;
    if (/\bcorporate|business|office|executive|professional\b/.test(t)) result.lifestyle.workLife = 'corporate';
    if (/\bcreative|artist|designer|writer|musician\b/.test(t)) result.lifestyle.workLife = 'creative';
    if (/\bentrepreneur|business owner|startup|founder\b/.test(t)) result.lifestyle.workLife = 'entrepreneur';
    if (/\bstudent|college|university|school\b/.test(t)) result.lifestyle.workLife = 'student';
    if (/\bretired|retirement\b/.test(t)) result.lifestyle.workLife = 'retired';
    if (/\bsingle|unmarried\b/.test(t)) result.lifestyle.familyStatus = 'single';
    if (/\bmarried|spouse|husband|wife\b/.test(t)) result.lifestyle.familyStatus = 'married';
    if (/\bparent|mom|dad|children|kids\b/.test(t)) result.lifestyle.familyStatus = 'parent';
    if (/\bapartment|condo|flat\b/.test(t)) result.lifestyle.livingSituation = 'apartment';
    if (/\bhouse|home|residence\b/.test(t)) result.lifestyle.livingSituation = 'house';
    if (/\bdorm|dormitory|college housing\b/.test(t)) result.lifestyle.livingSituation = 'dorm';
    
    // Parse gift style preferences
    if (/\bthoughtful|meaningful|sentimental|personal|heartfelt\b/.test(t)) giftStyles.push('thoughtful');
    if (/\bpractical|useful|functional|everyday\b/.test(t)) giftStyles.push('practical');
    if (/\bluxury|premium|high-end|expensive|fancy|designer\b/.test(t)) giftStyles.push('luxury');
    if (/\bfun|playful|humorous|funny|quirky|silly\b/.test(t)) giftStyles.push('fun');
    if (/\belegant|sophisticated|classy|refined|upscale\b/.test(t)) giftStyles.push('elegant');
    if (/\bunique|one-of-a-kind|unusual|rare|special|exclusive\b/.test(t)) giftStyles.push('unique');
    if (/\bsimple|minimal|minimalist|clean|understated\b/.test(t)) giftStyles.push('minimal');
    if (/\bcozy|comfortable|warm|snug|comfort\b/.test(t)) giftStyles.push('cozy');
    if (/\bmodern|contemporary|trendy|stylish|fashionable\b/.test(t)) giftStyles.push('modern');
    if (/\bvintage|retro|classic|traditional|timeless\b/.test(t)) giftStyles.push('vintage');
    if (/\bromantic|romantic|intimate|passionate\b/.test(t)) giftStyles.push('romantic');
    if (giftStyles.length > 0) result.giftStyle = giftStyles;
    
    // Parse age group (enhanced)
    if (/\bteen|teenager|13|14|15|16|17|18|19\b/.test(t)) result.ageGroup = 'teen';
    else if (/\bkid|child|children|toddler|baby|infant|5|6|7|8|9|10|11|12\b/.test(t)) result.ageGroup = 'child';
    else if (/\b20s|twenties|young\s+adult|college|university|early\s+twenties\b/.test(t)) result.ageGroup = 'young-adult';
    else if (/\b30s|thirties|middle-aged|30|31|32|33|34|35|36|37|38|39\b/.test(t)) result.ageGroup = 'adult';
    else if (/\b40s|50s|60s|forties|fifties|sixties|senior|elderly|retired\b/.test(t)) result.ageGroup = 'senior';
    
    // Parse gender hints (enhanced)
    if (/\bshe|her|girl|woman|female|ladies|daughter|wife|girlfriend|mom|mother\b/.test(t)) result.gender = 'female';
    else if (/\bhe|him|boy|man|male|gentlemen|son|husband|boyfriend|dad|father\b/.test(t)) result.gender = 'male';
    else if (/\bnon-binary|nonbinary|they|them|enby\b/.test(t)) result.gender = 'non-binary';
    
    // Parse specific interests (enhanced)
    const interestPatterns = {
        'reading': /\bread|book|novel|literature|author|bibliophile|bookworm\b/,
        'music': /\bmusic|song|album|artist|musician|guitar|piano|instrument|concert|vinyl\b/,
        'sports': /\bsport|athletic|fitness|gym|workout|running|basketball|football|soccer|tennis|golf|baseball\b/,
        'cooking': /\bcook|chef|kitchen|recipe|baking|culinary|foodie|gourmet\b/,
        'travel': /\btravel|trip|vacation|adventure|explore|wanderlust|backpacking|sightseeing\b/,
        'photography': /\bphoto|photography|camera|photographer|picture|dslr|film\b/,
        'art': /\bart|painting|drawing|artist|creative|craft|sculpture|gallery\b/,
        'tech': /\btech|technology|gadget|electronic|computer|gaming|gamer|programming|coding\b/,
        'fashion': /\bfashion|style|clothing|outfit|wardrobe|accessories|designer|couture\b/,
        'beauty': /\bbeauty|makeup|cosmetic|skincare|spa|salon|self-care|wellness\b/,
        'gardening': /\bgarden|plant|flower|gardening|green\s+thumb|horticulture\b/,
        'wine': /\bwine|vino|sommelier|wine\s+lover|oenophile|winery\b/,
        'coffee': /\bcoffee|espresso|barista|caffeine|latte|cappuccino|coffee\s+lover\b/,
        'tea': /\btea|chai|herbal\s+tea|tea\s+ceremony|matcha\b/,
        'outdoor': /\boutdoor|hiking|camping|nature|outdoors|backpacking|mountaineering\b/,
        'yoga': /\byoga|meditation|mindfulness|zen|pilates|wellness\b/,
        'pets': /\bpet|dog|cat|animal|puppy|kitten|dog\s+lover|cat\s+lover\b/,
        'gaming': /\bgaming|gamer|video\s+game|console|playstation|xbox|nintendo\b/,
        'movies': /\bmovie|film|cinema|netflix|streaming|director|actor\b/,
        'dancing': /\bdance|dancing|ballroom|salsa|ballet|dancer\b/,
        'fishing': /\bfishing|angler|fisherman|fly\s+fishing\b/,
        'cycling': /\bcycling|bike|bicycle|cyclist|mountain\s+bike\b/,
    };
    
    for (const [interest, pattern] of Object.entries(interestPatterns)) {
        if (pattern.test(t)) {
            interests.push(interest);
        }
    }
    if (interests.length > 0) result.interests = interests;
    
    // Parse likes and dislikes
    const likePattern = /\blikes?|loves?|enjoys?|interested\s+in|into|passionate\s+about\b/;
    const dislikePattern = /\bdislikes?|hates?|doesn'?t\s+like|not\s+into|avoids?|allergic\s+to\b/;
    const avoidPattern = /\bavoid|don'?t\s+want|no\s+|not\s+|never\b/;
    
    // Extract explicit likes/dislikes from text
    const sentences = text.split(/[.!?]/);
    for (const sentence of sentences) {
        const s = sentence.toLowerCase();
        if (likePattern.test(s)) {
            // Extract what they like
            const match = s.match(/(?:likes?|loves?|enjoys?|interested\s+in|into|passionate\s+about)\s+([^,\.!?]+)/);
            if (match) likes.push(match[1].trim());
        }
        if (dislikePattern.test(s) || avoidPattern.test(s)) {
            // Extract what they dislike
            const match = s.match(/(?:dislikes?|hates?|doesn'?t\s+like|not\s+into|avoids?|allergic\s+to|don'?t\s+want|no|not|never)\s+([^,\.!?]+)/);
            if (match) {
                const item = match[1].trim();
                if (s.includes('allergic')) {
                    avoid.push(item);
                } else {
                    dislikes.push(item);
                }
            }
        }
    }
    
    if (likes.length > 0 || dislikes.length > 0 || avoid.length > 0) {
        result.preferences = {
            likes: likes.length > 0 ? likes : [],
            dislikes: dislikes.length > 0 ? dislikes : [],
            avoid: avoid.length > 0 ? avoid : undefined,
        };
    }
    
    // Parse personality traits
    if (/\bintrovert|introverted|quiet|reserved|shy\b/.test(t)) personalityTraits.push('introverted');
    if (/\bextrovert|extroverted|outgoing|social|talkative\b/.test(t)) personalityTraits.push('extroverted');
    if (/\banalytical|logical|rational|thinker\b/.test(t)) personalityTraits.push('analytical');
    if (/\bcreative|artistic|imaginative|innovative\b/.test(t)) personalityTraits.push('creative');
    if (/\badventurous|daring|bold|risk-taker\b/.test(t)) personalityTraits.push('adventurous');
    if (/\bconservative|traditional|conventional\b/.test(t)) personalityTraits.push('conservative');
    if (/\boptimistic|positive|cheerful\b/.test(t)) personalityTraits.push('optimistic');
    if (/\borganized|neat|tidy|structured\b/.test(t)) personalityTraits.push('organized');
    
    // Parse values
    if (/\bsustainable|eco-friendly|environmental|green|organic\b/.test(t)) values.push('sustainability');
    if (/\bluxury|premium|high-end|exclusive\b/.test(t)) values.push('luxury');
    if (/\bpractical|functional|useful|pragmatic\b/.test(t)) values.push('practicality');
    if (/\bethical|fair\s+trade|social\s+responsibility\b/.test(t)) values.push('ethics');
    if (/\blocal|support\s+local|small\s+business\b/.test(t)) values.push('local');
    
    if (personalityTraits.length > 0 || values.length > 0) {
        result.personality = {
            traits: personalityTraits.length > 0 ? personalityTraits : undefined,
            values: values.length > 0 ? values : undefined,
        };
    }
    
    // Parse emotional tone
    if (/\bromantic|love|passionate|intimate\b/.test(t)) result.emotionalTone = 'romantic';
    else if (/\bfriendly|casual|fun|lighthearted\b/.test(t)) result.emotionalTone = 'friendly';
    else if (/\bprofessional|formal|business|corporate\b/.test(t)) result.emotionalTone = 'professional';
    else if (/\bfamily|familial|warm|loving\b/.test(t)) result.emotionalTone = 'familial';
    else if (/\bappreciative|grateful|thankful\b/.test(t)) result.emotionalTone = 'appreciative';
    else if (/\bapologetic|sorry|make\s+up\b/.test(t)) result.emotionalTone = 'apologetic';
    
    // Parse urgency
    if (/\burgent|asap|soon|quickly|fast|rushed|last\s+minute|today|tomorrow\b/.test(t)) result.urgency = 'urgent';
    else if (/\bupcoming|coming\s+up|next\s+week|next\s+month|in\s+a\s+week\b/.test(t)) result.urgency = 'upcoming';
    
    // Parse gift type preferences
    if (/\bexperience|ticket|event|activity|adventure|trip|concert|show\b/.test(t)) giftTypes.push('experience');
    if (/\bphysical|tangible|item|product|object\b/.test(t)) giftTypes.push('physical');
    if (/\bdigital|online|subscription|service|app|software\b/.test(t)) giftTypes.push('digital');
    if (/\bgift\s+card|voucher|certificate|store\s+credit\b/.test(t)) giftTypes.push('gift-card');
    if (/\bhandmade|crafted|artisan|custom|personalized|bespoke\b/.test(t)) giftTypes.push('handmade');
    if (giftTypes.length > 0) result.giftType = giftTypes;
    
    // Parse special requirements
    if (/\ballerg|allergic|sensitive|intolerance\b/.test(t)) specialReqs.push('allergies');
    if (/\bvegan|vegetarian|dietary|diet|gluten|dairy\s+free|kosher|halal\b/.test(t)) specialReqs.push('dietary');
    if (/\borganic|natural|eco-friendly|sustainable|green|biodegradable\b/.test(t)) specialReqs.push('eco-friendly');
    if (/\bpet\s+free|no\s+pets|hypoallergenic\b/.test(t)) specialReqs.push('hypoallergenic');
    if (specialReqs.length > 0) result.specialRequirements = specialReqs;
    
    // Parse seasonal context
    const currentMonth = new Date().getMonth() + 1;
    const seasonMap: Record<number, string> = {
        12: 'winter', 1: 'winter', 2: 'winter',
        3: 'spring', 4: 'spring', 5: 'spring',
        6: 'summer', 7: 'summer', 8: 'summer',
        9: 'fall', 10: 'fall', 11: 'fall',
    };
    
    result.seasonalContext = {
        season: seasonMap[currentMonth],
    };
    
    if (/\bspring|summer|fall|autumn|winter\b/.test(t)) {
        const seasonMatch = t.match(/\b(spring|summer|fall|autumn|winter)\b/);
        if (seasonMatch) result.seasonalContext.season = seasonMatch[1];
    }
    
    if (/\bhot|warm|sunny|tropical\b/.test(t)) result.seasonalContext.weather = 'hot';
    if (/\bcold|freezing|snow|winter\b/.test(t)) result.seasonalContext.weather = 'cold';
    if (/\bmild|moderate|pleasant\b/.test(t)) result.seasonalContext.weather = 'mild';
    
    // Parse social context
    result.socialContext = {};
    if (/\bgroup\s+gift|multiple\s+people|we\s+all|everyone\b/.test(t)) result.socialContext.groupGift = true;
    if (/\bgift\s+exchange|white\s+elephant|secret\s+santa|yankee\s+swap\b/.test(t)) result.socialContext.giftExchange = true;
    if (/\bcorporate|company|business|office|colleague|boss\b/.test(t)) result.socialContext.corporateGift = true;
    if (/\bsurprise|surprised|unexpected\b/.test(t)) result.socialContext.surprise = true;
    if (/\bpublic|in\s+front\s+of|opening|ceremony\b/.test(t)) result.socialContext.publicGift = true;
    
    // Budget parsing
    let min: number | undefined;
    let max: number | undefined;
    const dollars = Array.from(t.matchAll(/\$?\s?(\d{1,4})(?:\s?-\s?\$?(\d{1,4}))?/g));
    if (dollars.length > 0) {
        const m = dollars[0];
        const a = Number(m[1]);
        const b = m[2] ? Number(m[2]) : undefined;
        if (b !== undefined) { min = Math.min(a, b); max = Math.max(a, b); }
        else { max = a; }
    }
    if (/\bunder\s*\$?(\d{1,4})/.test(t)) {
        const n = Number(RegExp.$1); max = n;
    }
    if (/\bover\s*\$?(\d{1,4})/.test(t)) {
        const n = Number(RegExp.$1); min = n;
    }
    if (/\bbudget|affordable|cheap|inexpensive|economical|low\s+price\b/.test(t) && !max) {
        max = 50; // Default budget-friendly
    }
    if (/\bexpensive|splurge|luxury|premium|high-end|no\s+budget\b/.test(t) && !min) {
        min = 100; // Default luxury threshold
    }
    result.min = min;
    result.max = max;
    
    // Enhanced keyword matching for query
    const keyMap: Record<string, string[]> = {
        'candle': ['candle', 'scented', 'aroma', 'fragrance'],
        'spa': ['spa', 'relaxation', 'self-care', 'bath', 'wellness'],
        'tech': ['tech', 'gadget', 'electronic', 'device', 'smart'],
        'jewelry': ['jewelry', 'jewellery', 'necklace', 'bracelet', 'ring', 'earring'],
        'chocolate': ['chocolate', 'sweets', 'candy', 'treat'],
        'flowers': ['flower', 'bouquet', 'floral', 'plant'],
        'cozy': ['cozy', 'comfortable', 'warm', 'soft', 'blanket'],
        'mug': ['mug', 'cup', 'coffee', 'tea'],
        'book': ['book', 'reading', 'novel', 'literature'],
        'wallet': ['wallet', 'purse', 'cardholder'],
        'speaker': ['speaker', 'audio', 'sound', 'music'],
        'perfume': ['perfume', 'cologne', 'fragrance', 'scent'],
        'watch': ['watch', 'timepiece', 'clock'],
        'bag': ['bag', 'handbag', 'purse', 'tote', 'backpack'],
    };
    
    let q: string | undefined;
    for (const [keyword, patterns] of Object.entries(keyMap)) {
        if (patterns.some(pattern => new RegExp(`\\b${pattern}\\b`).test(t))) {
            q = keyword;
            break;
        }
    }
    
    // If recipient is provided, use their preferences to infer query
    if (recipient && !q) {
        const preferences = [
            recipient.hobbies?.toLowerCase() || '',
            recipient.sports?.toLowerCase() || '',
            recipient.stylePreferences?.toLowerCase() || '',
            recipient.giftTypePreference?.toLowerCase() || '',
            recipient.personalityLifestyle?.toLowerCase() || '',
        ].join(' ');
        
        for (const [keyword, patterns] of Object.entries(keyMap)) {
            if (patterns.some(pattern => preferences.includes(pattern))) {
                q = keyword;
                console.log('[parseAIPrompt] Inferred query from recipient preferences:', q);
                break;
            }
        }
    }
    result.query = q;
    
    // Build comprehensive context summary
    const contextParts: string[] = [];
    if (result.occasion) contextParts.push(`Occasion: ${result.occasion}`);
    if (result.relationship) contextParts.push(`Relationship: ${result.relationship}`);
    if (result.ageGroup) contextParts.push(`Age: ${result.ageGroup}`);
    if (result.gender) contextParts.push(`Gender: ${result.gender}`);
    if (result.location?.country) contextParts.push(`Location: ${result.location.country}${result.location.city ? `, ${result.location.city}` : ''}`);
    if (result.culture?.primary) contextParts.push(`Culture: ${result.culture.primary}${result.culture.religiousContext ? ` (${result.culture.religiousContext})` : ''}`);
    if (result.lifestyle?.workLife) contextParts.push(`Work: ${result.lifestyle.workLife}`);
    if (result.lifestyle?.familyStatus) contextParts.push(`Family: ${result.lifestyle.familyStatus}`);
    if (result.giftStyle && result.giftStyle.length > 0) contextParts.push(`Style: ${result.giftStyle.join(', ')}`);
    if (result.interests && result.interests.length > 0) contextParts.push(`Interests: ${result.interests.join(', ')}`);
    if (result.preferences?.likes && result.preferences.likes.length > 0) contextParts.push(`Likes: ${result.preferences.likes.join(', ')}`);
    if (result.preferences?.dislikes && result.preferences.dislikes.length > 0) contextParts.push(`Dislikes: ${result.preferences.dislikes.join(', ')}`);
    if (result.preferences?.avoid && result.preferences.avoid.length > 0) contextParts.push(`Avoid: ${result.preferences.avoid.join(', ')}`);
    if (result.personality?.traits && result.personality.traits.length > 0) contextParts.push(`Personality: ${result.personality.traits.join(', ')}`);
    if (result.personality?.values && result.personality.values.length > 0) contextParts.push(`Values: ${result.personality.values.join(', ')}`);
    if (result.emotionalTone) contextParts.push(`Tone: ${result.emotionalTone}`);
    if (result.giftType && result.giftType.length > 0) contextParts.push(`Gift type: ${result.giftType.join(', ')}`);
    if (result.specialRequirements && result.specialRequirements.length > 0) contextParts.push(`Requirements: ${result.specialRequirements.join(', ')}`);
    if (result.seasonalContext?.season) contextParts.push(`Season: ${result.seasonalContext.season}`);
    if (result.socialContext?.groupGift) contextParts.push(`Group gift`);
    if (result.socialContext?.corporateGift) contextParts.push(`Corporate gift`);
    if (min || max) contextParts.push(`Budget: ${min ? `$${min}` : ''}${min && max ? '-' : ''}${max ? `$${max}` : ''}`);
    
    result.contextSummary = contextParts.join('; ');
    
    // Set categories
    if (cats.length > 0) result.categories = cats;
    
    console.log('[parseAIPrompt] Detected categories:', cats);
    console.log('[parseAIPrompt] Full parsed context:', JSON.stringify(result, null, 2));
    
    return result;
}

const styles = StyleSheet.create({
	topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee', zIndex: 10 },
	searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F4F5F6', borderRadius: 14, paddingHorizontal: 12, height: 42 },
	searchInput: { flex: 1, color: '#111' },
	searchIconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
	badgeDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
	badgeCount: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
	aiCard: { backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, position: 'relative' },
	aiInput: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F9FAFB', position: 'relative' },
	aiButton: { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
    aiChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#F4F5F6', borderWidth: 1, borderColor: '#e5e7eb' },
	mentionDropdown: { position: 'absolute', top: 50, left: 0, right: 0, marginTop: 4, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, zIndex: 1000, maxHeight: 200 },
	mentionItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
	mentionItemName: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
	mentionItemRelation: { fontSize: 13, color: '#6b7280' },
	mainSectionTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 16 },
	sectionTitle: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 12 },
	sectionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, fontWeight: '500' },
	sectionHeader: { marginBottom: 16, gap: 4 },
	findGiftsSection: { gap: 20, marginTop: 8 },
	recipientSection: { gap: 12 },
	recipientHeader: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		justifyContent: 'space-between',
		backgroundColor: '#1a5f3f',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		marginHorizontal: 16,
	},
	recipientHeaderText: { fontSize: 16, fontWeight: '800', color: '#fff' },
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
	dealsSection: { gap: 12, marginTop: 8 },
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
