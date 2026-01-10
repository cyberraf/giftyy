import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useProducts } from '@/contexts/ProductsContext';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs = ['Overview', 'Products', 'Settings'] as const;
type TabKey = (typeof tabs)[number];

const TAB_CONFIG: { key: TabKey; icon: IconSymbolName }[] = [
    { key: 'Overview', icon: 'rectangle.grid.2x2' },
    { key: 'Products', icon: 'bag.fill' },
    { key: 'Settings', icon: 'gearshape.fill' },
];

const palette = {
    background: '#fff',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accentSoft: '#FCEEE7',
    success: '#10B981',
};

export default function StoreProfileScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabKey>('Overview');
    const { products, collections, refreshProducts, refreshCollections } = useProducts();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                refreshProducts(),
                refreshCollections(),
            ]);
        } catch (error) {
            console.error('Error refreshing store data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshProducts, refreshCollections]);

    // Mock store data - in a real app, this would come from a store context/API
    const storeData = {
        name: 'Giftyy Store',
        description: 'Your one-stop shop for thoughtful gifts and memorable experiences.',
        logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=200&auto=format&fit=crop',
        rating: 4.9,
        reviewCount: 1247,
        totalProducts: products.length,
        totalCollections: collections.length,
        memberSince: '2023-01-15',
        location: 'San Francisco, CA',
        website: 'www.giftyy.com',
        email: 'hello@giftyy.com',
    };

    const displayInitials = useMemo(() => {
        return storeData.name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, [storeData.name]);

    return (
        <View style={[styles.screen, { paddingTop: top + 8 }]}>
            <ScrollView 
				contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={BRAND_COLOR}
						colors={[BRAND_COLOR]}
					/>
				}
			>
                <View style={styles.heroCard}>
                    <View style={styles.avatarBubble}>
                        {storeData.logo ? (
                            <Image source={{ uri: storeData.logo }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarInitials}>{displayInitials}</Text>
                        )}
                    </View>
                    <Text style={styles.heroHeading}>{storeData.name}</Text>
                    <Text style={styles.heroSubheading}>{storeData.description}</Text>
                    <View style={styles.ratingRow}>
                        <IconSymbol name="star.fill" size={16} color="#f59e0b" />
                        <Text style={styles.ratingText}>{storeData.rating}</Text>
                        <Text style={styles.reviewCount}>({storeData.reviewCount.toLocaleString()} reviews)</Text>
                    </View>
                </View>

                <View style={styles.tabBar}>
                    {TAB_CONFIG.map(({ key, icon }) => {
                        const active = key === activeTab;
                        return (
                            <Pressable
                                key={key}
                                style={[styles.tabPill, active && styles.tabPillActive]}
                                onPress={() => setActiveTab(key)}
                                accessibilityRole="button"
                                accessibilityLabel={key}
                                accessibilityState={active ? { selected: true } : {}}
                            >
                                <IconSymbol
                                    name={icon}
                                    size={22}
                                    color={active ? '#ffffff' : palette.textSecondary}
                                />
                                <Text style={styles.tabLabelHidden}>{key}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {activeTab === 'Overview' && <OverviewPanel storeData={storeData} />}
                {activeTab === 'Products' && <ProductsPanel products={products} collections={collections} />}
                {activeTab === 'Settings' && <SettingsPanel storeData={storeData} />}
            </ScrollView>
        </View>
    );
}

function OverviewPanel({ storeData }: { storeData: any }) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <View style={styles.sectionGap}>
            {/* Store Stats */}
            <View style={styles.statsRow}>
                <StatCard title="Products" value={storeData.totalProducts.toString()} trend="Active listings" />
                <StatCard title="Collections" value={storeData.totalCollections.toString()} trend="Curated sets" accent="alt" />
            </View>

            {/* Store Information */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Store information</Text>
                <InfoRow label="Location" value={storeData.location} icon="location.fill" />
                <InfoRow label="Website" value={storeData.website} icon="globe" />
                <InfoRow label="Email" value={storeData.email} icon="envelope.fill" />
                <InfoRow label="Member since" value={formatDate(storeData.memberSince)} icon="calendar" />
            </View>

            {/* Store Description */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>About us</Text>
                <Text style={styles.descriptionText}>
                    {storeData.description} We specialize in creating meaningful gift experiences that bring joy to your loved ones. 
                    Our curated collection features unique products perfect for every occasion.
                </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Store performance</Text>
                <View style={styles.performanceGrid}>
                    <PerformanceItem label="Orders fulfilled" value="1,247" />
                    <PerformanceItem label="Happy customers" value="98%" />
                    <PerformanceItem label="Response time" value="< 2hrs" />
                    <PerformanceItem label="Shipping" value="Worldwide" />
                </View>
            </View>
        </View>
    );
}

function ProductsPanel({ products, collections }: { products: any[]; collections: any[] }) {
    const router = useRouter();

    return (
        <View style={styles.sectionGap}>
            {/* Collections */}
            {collections.length > 0 && (
                <View style={styles.groupCard}>
                    <Text style={styles.groupTitle}>Collections ({collections.length})</Text>
                    <View style={styles.collectionsList}>
                        {collections.slice(0, 5).map((collection) => (
                            <Pressable
                                key={collection.id}
                                style={styles.collectionItem}
                                onPress={() => router.push(`/(buyer)/collections?collection=${collection.id}`)}
                            >
                                <View style={[styles.collectionColor, { backgroundColor: collection.color }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.collectionName}>{collection.title}</Text>
                                    <Text style={styles.collectionCount}>{collection.products?.length || 0} products</Text>
                                </View>
                                <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
                            </Pressable>
                        ))}
                    </View>
                </View>
            )}

            {/* Recent Products */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Products ({products.length})</Text>
                {products.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No products yet</Text>
                        <Text style={styles.emptyStateSubtitle}>Products will appear here once they're added to the store.</Text>
                    </View>
                ) : (
                    <View style={styles.productsList}>
                        {products.slice(0, 10).map((product) => (
                            <Pressable
                                key={product.id}
                                style={styles.productItem}
                                onPress={() => router.push(`/(buyer)/(tabs)/product/${product.id}`)}
                            >
                                {product.imageUrl && (
                                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.productName}>{product.name}</Text>
                                    <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                                </View>
                                <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

function SettingsPanel({ storeData }: { storeData: any }) {
    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Store settings</Text>
                <LinkRow label="Store information" icon="info.circle.fill" />
                <LinkRow label="Shipping & policies" icon="shippingbox.fill" />
                <LinkRow label="Payment methods" icon="creditcard.fill" />
                <LinkRow label="Notifications" icon="bell.fill" />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Account</Text>
                <LinkRow label="Store analytics" icon="chart.bar.fill" />
                <LinkRow label="Billing & subscription" icon="doc.text.fill" />
                <LinkRow label="Security" icon="lock.fill" />
            </View>
        </View>
    );
}

function StatCard({ title, value, trend, accent }: { title: string; value: string; trend: string; accent?: 'alt' }) {
    const isAlt = accent === 'alt';
    return (
        <View style={[styles.statCard, isAlt ? styles.statCardAlt : styles.statCardPrimary]}>
            <Text style={[styles.statValue, isAlt ? styles.statValueAlt : null]}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statTrend}>{trend}</Text>
        </View>
    );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: IconSymbolName }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
                <IconSymbol name={icon} size={18} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

function PerformanceItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{value}</Text>
            <Text style={styles.performanceLabel}>{label}</Text>
        </View>
    );
}

function LinkRow({ label, icon }: { label: string; icon: IconSymbolName }) {
    return (
        <Pressable style={styles.linkRow}>
            <View style={styles.linkIconContainer}>
                <IconSymbol name={icon} size={18} color={palette.textSecondary} />
            </View>
            <Text style={styles.linkLabel}>{label}</Text>
            <Text style={styles.linkChevron}>›</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
    },
    content: {
        padding: 20,
        gap: 18,
    },
    heroCard: {
        backgroundColor: palette.card,
        borderRadius: 24,
        padding: 22,
        gap: 12,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 3,
        alignItems: 'center',
    },
    avatarBubble: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: palette.border,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        fontSize: 28,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    heroHeading: {
        fontSize: 26,
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        textAlign: 'center',
    },
    heroSubheading: {
        color: palette.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    reviewCount: {
        fontSize: 14,
        color: palette.textSecondary,
    },
    tabBar: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    tabPill: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabPillActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 3,
    },
    tabLabelHidden: {
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        borderWidth: 0,
        overflow: 'hidden',
    },
    sectionGap: {
        gap: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        gap: 4,
    },
    statCardPrimary: {
        borderColor: BRAND_COLOR,
        backgroundColor: palette.accentSoft,
    },
    statCardAlt: {
        borderColor: '#C8BED4',
        backgroundColor: '#F4F0F8',
    },
    statValue: {
        fontSize: 28,
        fontFamily: BRAND_FONT,
        color: BRAND_COLOR,
    },
    statValueAlt: {
        color: '#6054B5',
    },
    statTitle: {
        color: palette.textSecondary,
        fontWeight: '700',
    },
    statTrend: {
        color: palette.textPrimary,
        fontSize: 12,
    },
    groupCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    groupTitle: {
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        fontSize: 18,
    },
    descriptionText: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    infoIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 12,
        color: palette.textSecondary,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        color: palette.textPrimary,
        fontWeight: '600',
        marginTop: 2,
    },
    performanceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
    },
    performanceItem: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        borderRadius: 12,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
    },
    performanceValue: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        color: BRAND_COLOR,
        fontWeight: '800',
    },
    performanceLabel: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    collectionsList: {
        gap: 10,
        marginTop: 4,
    },
    collectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
    },
    collectionColor: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    collectionName: {
        fontSize: 15,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    collectionCount: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 2,
    },
    productsList: {
        gap: 10,
        marginTop: 4,
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
    },
    productImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: palette.border,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    productPrice: {
        fontSize: 13,
        color: BRAND_COLOR,
        fontWeight: '700',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 6,
    },
    emptyStateTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 16,
        color: palette.textPrimary,
    },
    emptyStateSubtitle: {
        color: palette.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 12,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    linkIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: palette.cardAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        flex: 1,
        color: palette.textPrimary,
        fontWeight: '600',
        fontSize: 15,
    },
    linkChevron: {
        color: palette.textSecondary,
        fontWeight: '800',
        fontSize: 18,
    },
});

