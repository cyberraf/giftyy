import { TourAnchor } from '@/components/tour/TourAnchor';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { scale, normalizeFont } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { smartBuyerBack } from '@/lib/utils/navigation';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GlobalHeader() {
    const { top } = useSafeAreaInsets();
    const router = useRouter();
    const params = useGlobalSearchParams<{
        q?: string;
        filtersOpen?: string;
        categories?: string;
        minPrice?: string;
        maxPrice?: string;
        sortBy?: string;
        returnTo?: string;
    }>();
    const pathname = usePathname();
    const { totalQuantity } = useCart();
    const { profile, signOut } = useAuth();
    const { isConnected } = useNetwork();
    const { unreadCount } = useNotifications();

    const [showMenu, setShowMenu] = useState(false);
    const menuScale = useSharedValue(0);
    const menuOpacity = useSharedValue(0);

    const handleToggleMenu = () => {
        if (showMenu) {
            menuScale.value = withTiming(0, { duration: 150 });
            menuOpacity.value = withTiming(0, { duration: 150 }, () => {
                runOnJS(setShowMenu)(false);
            });
        } else {
            setShowMenu(true);
            menuScale.value = withTiming(1, { duration: 150 });
            menuOpacity.value = withTiming(1, { duration: 150 });
        }
    };

    const handleNavPress = (path: string) => {
        handleToggleMenu();
        router.navigate(path as any);
    };

    const handleSignOut = async () => {
        handleToggleMenu();
        await signOut();
    };

    const menuStyle = useAnimatedStyle(() => ({
        transform: [{ scale: menuScale.value }, { translateY: (1 - menuScale.value) * -10 }],
        opacity: menuOpacity.value,
    }));

    // Visibility logic
    const isCartPage = pathname.toLowerCase().includes('cart');
    const isShopPage = pathname.toLowerCase().includes('shop');
    const isSearchPage = pathname.toLowerCase().includes('search');
    const isConfirmationPage = pathname.toLowerCase().includes('confirmation');
    const isProductPage = pathname.includes('/product/');
    const isVendorPage = pathname.includes('/vendor');
    const isBundlePage = pathname.includes('/bundle');
    const isDealsPage = pathname.includes('/deals');
    const isCheckoutPage = pathname.includes('checkout/');

    // Shopping context: fallback to shop instead of home when no history
    const isShoppingContext = isShopPage || isSearchPage || isCartPage
        || isProductPage || isVendorPage || isBundlePage || isDealsPage;

    // Integrated search bar appears on Shop and Search pages
    const showSearchBar = isShopPage || isSearchPage;

    // Home screen detection (index route for buyer tabs)
    const isHomePage = pathname === '/' || pathname === '/(buyer)' || pathname === '/(buyer)/(tabs)';

    // Show back button on any screen with navigation history,
    // except confirmation (user shouldn't go back to payment) and home screen
    const showBackButton = router.canGoBack() && !isConfirmationPage && !isHomePage;

    // Local state for the search input to ensure reactive typing
    const [searchInputValue, setSearchInputValue] = useState(params.q || '');

    // Sync input with params when params change (e.g. from shop to search)
    useEffect(() => {
        setSearchInputValue(params.q || '');
    }, [params.q]);

    const isFiltersOpen = params.filtersOpen === 'true';

    // Calculate active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (params.categories) count += params.categories.split(',').filter(c => c.trim().length > 0).length;
        if (params.minPrice && parseInt(params.minPrice) > 0) count += 1;
        if (params.maxPrice && parseInt(params.maxPrice) < 1000) count += 1;
        if (params.sortBy && params.sortBy !== 'recommended') count += 1;
        return count;
    }, [params.categories, params.minPrice, params.maxPrice, params.sortBy]);

    // Hide header entirely on checkout screens
    if (isCheckoutPage) return null;

    const handleSearchSubmit = () => {
        if (!searchInputValue.trim()) return;
        
        // Use navigate to prevent pushing search pages onto each other
        router.navigate({
            pathname: '/(buyer)/(tabs)/search',
            params: { 
                ...params, 
                q: searchInputValue.trim(), 
                // Preserve returnTo if it exists, otherwise use current pathname
                returnTo: params.returnTo || (isSearchPage ? undefined : pathname)
            }
        });
    };

    const handleFilterToggle = () => {
        if (isSearchPage) {
            // Toggle filtersOpen param on search page
            router.setParams({ filtersOpen: isFiltersOpen ? 'false' : 'true' });
        } else {
            // Navigate to search with filters open
            router.navigate({
                pathname: '/(buyer)/(tabs)/search',
                params: { 
                    ...params, 
                    filtersOpen: 'true', 
                    // Preserve returnTo if it exists, otherwise use current pathname
                    returnTo: params.returnTo || pathname 
                }
            });
        }
    };

    return (
        <View style={[styles.container, { paddingTop: top + GIFTYY_THEME.spacing.md }]}>
            <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.05)', 'transparent']}
                style={[StyleSheet.absoluteFill, { height: top + GIFTYY_THEME.layout.headerHeight }]}
                pointerEvents="none"
            />
            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <IconSymbol name="wifi.slash" size={scale(12)} color={GIFTYY_THEME.colors.white} />
                    <Text style={styles.offlineBannerText}>Offline</Text>
                </View>
            )}
            <View style={[styles.leftSection, showSearchBar && { flex: 1, width: 'auto' }]}>
                {showBackButton && (
                    <TourAnchor step="home_burger_menu">
                        <Pressable
                            onPress={() => {
                                smartBuyerBack(router, {
                                    returnTo: params.returnTo,
                                    preferShopFallback: isShoppingContext,
                                });
                            }}
                            style={({ pressed }) => [styles.backButton, pressed && styles.pressed, { marginRight: GIFTYY_THEME.spacing.sm }]}
                        >
                            <IconSymbol name="chevron.left" size={scale(24)} color={GIFTYY_THEME.colors.gray800} />
                        </Pressable>
                    </TourAnchor>
                )}

                {showSearchBar && (
                    <View style={styles.searchSection}>
                        <View style={styles.headerSearchBox}>
                            <TextInput
                                style={styles.searchPlaceholder}
                                placeholder="Search gifts..."
                                placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                value={searchInputValue}
                                onChangeText={setSearchInputValue}
                                onSubmitEditing={handleSearchSubmit}
                                returnKeyType="search"
                                autoCorrect={false}
                                autoCapitalize="none"
                            />

                            <Pressable
                                style={styles.searchSubmitButtonIconPlain}
                                onPress={handleSearchSubmit}
                            >
                                <IconSymbol name="magnifyingglass" size={scale(20)} color={GIFTYY_THEME.colors.gray600} />
                            </Pressable>

                            <View style={styles.searchDivider} />

                            <Pressable
                                style={styles.headerFilterButton}
                                onPress={handleFilterToggle}
                            >
                                <IconSymbol
                                    name={isFiltersOpen ? "xmark" : "slider.horizontal.3"}
                                    size={scale(16)}
                                    color={GIFTYY_THEME.colors.gray700}
                                />
                                {/* Badge logic */}
                                {!isFiltersOpen && (activeFiltersCount > 0 || params.q) && (
                                    <View style={[styles.filterBadge, { zIndex: 999 }]}>
                                        <Text style={styles.filterBadgeText}>{activeFiltersCount || '!'}</Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                    </View>
                )}

                {!showBackButton && !showSearchBar && (
                    <View style={styles.logoPlaceholder} />
                )}
            </View>

            {/* Right Section: Actions */}
            <View style={styles.rightSection}>
                <View style={styles.actionsColumn}>
                    {!isCartPage && (
                        <Pressable
                            onPress={() => router.push('/(buyer)/(tabs)/cart')}
                            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                        >
                            <IconSymbol name="cart" size={scale(24)} color={GIFTYY_THEME.colors.gray800} />
                            {totalQuantity > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{totalQuantity > 99 ? '99+' : totalQuantity}</Text>
                                </View>
                            )}
                        </Pressable>
                    )}

                    <TourAnchor step="global_profile">
                        <Pressable
                            onPress={handleToggleMenu}
                            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                        >
                            {profile?.profile_image_url ? (
                                <Image
                                    source={{ uri: profile.profile_image_url }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <IconSymbol name="person.circle.fill" size={scale(32)} color={GIFTYY_THEME.colors.gray800} />
                            )}
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                                </View>
                            )}
                        </Pressable>
                    </TourAnchor>
                </View>
            </View>

            {/* Click Outside Overlay */}
            {showMenu && (
                <Pressable
                    style={styles.fullScreenOverlay}
                    onPress={handleToggleMenu}
                />
            )}

            {/* Profile Dropdown Menu */}
            {showMenu && (
                <Animated.View style={[styles.menuContainer, { top: top + scale(40) }, menuStyle]}>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/notifications')}>
                        <View style={styles.menuIconContainer}>
                            <IconSymbol name="bell" size={scale(20)} color={GIFTYY_THEME.colors.gray700} />
                            {unreadCount > 0 && (
                                <View style={styles.menuBadge}>
                                    <Text style={styles.menuBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.menuText}>Notifications</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/settings/profile')}>
                        <IconSymbol name="person.circle" size={scale(20)} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Profile</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/orders')}>
                        <IconSymbol name="doc.plaintext" size={scale(20)} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Orders</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/(tabs)/recipients')}>
                        <IconSymbol name="person.2.fill" size={scale(20)} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Recipients</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/wishlist')}>
                        <IconSymbol name="heart" size={scale(20)} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Wishlist</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/settings')}>
                        <IconSymbol name="gearshape.fill" size={scale(20)} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Settings</Text>
                    </Pressable>
                    <Pressable style={[styles.menuItem, styles.menuItemBorder]} onPress={handleSignOut}>
                        <IconSymbol name="arrow.right.square.fill" size={scale(20)} color={GIFTYY_THEME.colors.error} />
                        <Text style={[styles.menuText, { color: GIFTYY_THEME.colors.error }]}>Sign Out</Text>
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    offlineBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: GIFTYY_THEME.colors.gray600,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(3),
        gap: scale(4),
        zIndex: 200,
    },
    offlineBannerText: {
        color: GIFTYY_THEME.colors.white,
        fontSize: normalizeFont(11),
        fontWeight: '600',
    },
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: GIFTYY_THEME.spacing.md,
        paddingBottom: GIFTYY_THEME.spacing.md,
        backgroundColor: 'transparent',
        pointerEvents: 'box-none',
    },
    leftSection: {
        width: scale(100), // Increased to balance with right actions and prevent clipping
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    logoPlaceholder: {
        width: scale(44),
    },
    searchSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: scale(240),
    },
    headerSearchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: GIFTYY_THEME.radius.xl, // Match back button (40/2)
        paddingLeft: GIFTYY_THEME.spacing.lg,
        paddingRight: GIFTYY_THEME.spacing.xs, // Tighter for icon button
        height: scale(40), // Match back button and pill
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
    },
    searchSubmitButtonIconPlain: {
        width: scale(36),
        height: scale(36),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: GIFTYY_THEME.spacing.xs,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: GIFTYY_THEME.typography.sizes.base,
        color: GIFTYY_THEME.colors.gray900,
        paddingVertical: GIFTYY_THEME.spacing.sm,
    },
    searchDivider: {
        width: 1,
        height: scale(20),
        backgroundColor: GIFTYY_THEME.colors.gray300,
        marginHorizontal: GIFTYY_THEME.spacing.sm,
    },
    headerCartButton: {
        width: scale(44),
        height: scale(44),
        borderRadius: GIFTYY_THEME.radius.full,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative', // for badge
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
    },
    headerFilterButton: {
        width: scale(32),
        height: scale(32),
        borderRadius: GIFTYY_THEME.radius.full,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative', // for badge
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
    },
    filterBadge: {
        position: 'absolute',
        top: scale(-4),
        right: scale(-4),
        backgroundColor: GIFTYY_THEME.colors.error,
        borderRadius: GIFTYY_THEME.radius.full,
        minWidth: scale(16),
        height: scale(16),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: normalizeFont(9),
        fontWeight: GIFTYY_THEME.typography.weights.bold,
    },
    rightSection: {
        width: scale(100), // Mirror left section for perfect centering
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backButton: {
        width: scale(40),
        height: scale(40),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: GIFTYY_THEME.radius.xl,
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    actionsColumn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        backgroundColor: '#fff',
        borderRadius: GIFTYY_THEME.radius.xl, // Match back button and search box
        paddingHorizontal: scale(6),
        height: scale(40), // Match search box and back button
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    iconButton: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: scale(36),
        height: scale(36),
    },
    pressed: {
        opacity: 0.7,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: GIFTYY_THEME.colors.error,
        borderRadius: GIFTYY_THEME.radius.full,
        width: scale(16),
        height: scale(16),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: GIFTYY_THEME.typography.sizes.xs,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
    },
    profileImage: {
        width: scale(28), // Tighter fit for 40px box
        height: scale(28),
        borderRadius: scale(14),
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
    },
    menuContainer: {
        position: 'absolute',
        // top is handled dynamically
        right: scale(44), // Shifted more to the left to be closer to the profile icon but still clearing cart
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: GIFTYY_THEME.radius.lg,
        padding: GIFTYY_THEME.spacing.sm,
        minWidth: scale(160),
        ...GIFTYY_THEME.shadows.lg,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        zIndex: 101,
        transformOrigin: 'top right', // Pop from top right
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: GIFTYY_THEME.spacing.md,
        paddingHorizontal: GIFTYY_THEME.spacing.lg,
        gap: GIFTYY_THEME.spacing.md,
        borderRadius: GIFTYY_THEME.radius.sm,
    },
    menuItemBorder: {
        borderTopWidth: 1,
        borderTopColor: GIFTYY_THEME.colors.gray100,
        marginTop: GIFTYY_THEME.spacing.xs,
        paddingTop: GIFTYY_THEME.spacing.lg,
    },
    menuText: {
        fontSize: normalizeFont(15),
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        color: GIFTYY_THEME.colors.gray800,
    },
    menuIconContainer: {
        width: scale(20),
        height: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    menuBadge: {
        position: 'absolute',
        top: scale(-6),
        right: scale(-8),
        backgroundColor: GIFTYY_THEME.colors.error,
        borderRadius: GIFTYY_THEME.radius.full,
        minWidth: scale(16),
        height: scale(16),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
        paddingHorizontal: scale(2),
    },
    menuBadgeText: {
        color: '#fff',
        fontSize: normalizeFont(8),
        fontWeight: GIFTYY_THEME.typography.weights.bold,
    },
    fullScreenOverlay: {
        position: 'absolute',
        top: scale(-100), // Cover the top padding
        left: scale(-100), // Cover horizontal padding
        width: SCREEN_WIDTH + scale(200),
        height: SCREEN_HEIGHT + scale(200),
        backgroundColor: 'transparent',
        zIndex: 100,
    },
});
