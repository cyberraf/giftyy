import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarketplaceProductCard } from '../../../components/marketplace/MarketplaceProductCard';
import { IconSymbol } from '../../../components/ui/icon-symbol';
import { GIFTYY_THEME } from '../../../constants/giftyy-theme';
import { BRAND_COLOR, BRAND_FONT } from '../../../constants/theme';
import { useProducts } from '../../../contexts/ProductsContext';
import { useWishlist } from '../../../contexts/WishlistContext';
import { getVendorsInfo, type VendorInfo } from '../../../lib/vendor-utils';

export default function WishlistScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { wishlist } = useWishlist();
    const { getProductById } = useProducts();
    const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());

    const GRID_GAP = 12;
    const COLUMN_WIDTH = (Dimensions.get('window').width - 52) / 2; // (SCREEN_WIDTH - paddingHorizontal*2 - gap) / 2

    const items = useMemo(() => {
        return wishlist
            .map((entry) => {
                const product = getProductById(entry.productId);
                return product;
            })
            .filter(Boolean) as ReturnType<typeof getProductById>[];
    }, [wishlist, getProductById]);

    // Fetch vendor info for products
    useEffect(() => {
        const fetchVendors = async () => {
            const vendorIds = Array.from(new Set(items.filter(p => p?.vendorId).map(p => p!.vendorId!)));
            if (vendorIds.length > 0) {
                const vendors = await getVendorsInfo(vendorIds);
                const map = new Map<string, VendorInfo>();
                vendors.forEach(v => map.set(v.id, v));
                setVendorsMap(map);
            }
        };
        if (items.length > 0) {
            fetchVendors();
        }
    }, [items]);


    return (
        <View style={[styles.screen, { paddingTop: top + 72 }]}>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}>
                <Text style={styles.pageTitle}>Your Wishlist</Text>

                {items.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <View style={styles.emptyIcon}>
                            <IconSymbol name="heart.fill" size={40} color="#94a3b8" />
                        </View>
                        <Text style={styles.emptyTitle}>No favorites yet</Text>
                        <Text style={styles.emptySubtitle}>Save products you love and we’ll keep them here for easy gifting later.</Text>
                        <Pressable style={styles.primaryButton} onPress={() => router.push('/(buyer)/(tabs)/shop')}>
                            <Text style={styles.primaryButtonLabel}>Explore Gifts</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View>
                        <Text style={styles.subtitle}>{items.length} saved {items.length === 1 ? 'item' : 'items'}</Text>
                        <View style={styles.grid}>
                            {items.map((product, index) => {
                                if (!product) return null;
                                const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
                                const imageUrl = product.imageUrl ? (() => {
                                    try {
                                        const parsed = JSON.parse(product.imageUrl);
                                        return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
                                    } catch {
                                        return product.imageUrl;
                                    }
                                })() : undefined;

                                // Ensure 2-column layout logic if needed, or flex wrap
                                return (
                                    <View
                                        key={product.id}
                                        style={styles.gridItem}
                                    >
                                        <MarketplaceProductCard
                                            id={product.id}
                                            name={product.name || ''}
                                            price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
                                            originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
                                            discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
                                            imageUrl={imageUrl}
                                            vendorName={vendor?.storeName || undefined}
                                            width={COLUMN_WIDTH}
                                            onPress={() => router.push({
                                                pathname: '/(buyer)/(tabs)/product/[id]',
                                                params: { id: product.id },
                                            })}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const palette = {
    background: GIFTYY_THEME.colors.background,
    card: '#FFFFFF',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(0,0,0,0.02)',
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        paddingHorizontal: 20,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: palette.textSecondary,
        marginBottom: 24,
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 12,
    },
    loadingText: {
        marginTop: 16,
        color: palette.textSecondary,
        fontSize: 16,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 9999,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    emptySubtitle: {
        fontSize: 16,
        color: palette.textSecondary,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 24,
    },
    primaryButton: {
        marginTop: 12,
        backgroundColor: BRAND_COLOR,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 999,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    primaryButtonLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: '48%', // Approx 2 columns
        marginBottom: 12,
    }
});
