import { TourAnchor } from '@/components/tour/TourAnchor';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GlobalHeader() {
    const { top } = useSafeAreaInsets();
    const router = useRouter();
    const segments = useSegments();
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
    const isMemoriesPage = pathname.toLowerCase().includes('memory');
    const isConfirmationPage = pathname.toLowerCase().includes('confirmation');

    // Integrated search bar appears on Shop and Search pages
    const showSearchBar = isShopPage || isSearchPage;

    // Back button is visible whenever we can go back
    const isDealsPage = pathname === '/deals' || pathname.includes('/deals');
    const isOccasionsPage = pathname.includes('/occasions');
    const showBackButton = router.canGoBack() && (
        isShopPage ||
        isSearchPage ||
        isDealsPage ||
        isCartPage ||
        isMemoriesPage ||
        isOccasionsPage ||
        pathname.includes('/recipient') ||
        pathname.includes('/occasion/') ||
        pathname.includes('/settings') ||
        pathname.includes('/orders') ||
        pathname.includes('/wishlist') ||
        pathname.includes('/product/') ||
        pathname.includes('/vendor/') ||
        pathname.includes('/vendors') ||
        pathname.includes('/bundle') ||
        pathname.includes('/checkout/') ||
        pathname.includes('/notifications')
    );

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
        <View style={[styles.container, { paddingTop: top + 12 }]}>
            <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.05)', 'transparent']}
                style={[StyleSheet.absoluteFill, { height: top + 60 }]}
                pointerEvents="none"
            />
            <View style={[styles.leftSection, showSearchBar && { flex: 1, width: 'auto' }]}>
                {showBackButton && (
                    <TourAnchor step="home_burger_menu">
                        <Pressable
                            onPress={() => {
                                if (isConfirmationPage) {
                                    router.replace('/(buyer)/(tabs)');
                                } else if (params.returnTo) {
                                    // Respect external return path if provided (e.g. from shop to product)
                                    router.navigate(params.returnTo as any);
                                } else if (router.canGoBack()) {
                                    router.back();
                                } else if (isSearchPage) {
                                    // Specific fallback for search if stack is empty
                                    router.navigate('/(buyer)/(tabs)/shop');
                                } else {
                                    // Global fallback
                                    router.navigate('/(buyer)/(tabs)');
                                }
                            }}
                            style={({ pressed }) => [styles.backButton, pressed && styles.pressed, { marginRight: 10 }]}
                        >
                            <IconSymbol name="chevron.left" size={24} color={GIFTYY_THEME.colors.gray800} />
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
                                <IconSymbol name="magnifyingglass" size={20} color={GIFTYY_THEME.colors.gray600} />
                            </Pressable>

                            <View style={styles.searchDivider} />

                            <Pressable
                                style={styles.headerFilterButton}
                                onPress={handleFilterToggle}
                            >
                                <IconSymbol
                                    name={isFiltersOpen ? "xmark" : "slider.horizontal.3"}
                                    size={16}
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
                            <IconSymbol name="cart" size={24} color={GIFTYY_THEME.colors.gray800} />
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
                                <IconSymbol name="person.circle.fill" size={32} color={GIFTYY_THEME.colors.gray800} />
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
                <Animated.View style={[styles.menuContainer, { top: top + 40 }, menuStyle]}>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/notifications')}>
                        <View style={styles.menuIconContainer}>
                            <IconSymbol name="bell" size={20} color={GIFTYY_THEME.colors.gray700} />
                            {unreadCount > 0 && (
                                <View style={styles.menuBadge}>
                                    <Text style={styles.menuBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.menuText}>Notifications</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/settings/profile')}>
                        <IconSymbol name="person.circle" size={20} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Profile</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/orders')}>
                        <IconSymbol name="doc.plaintext" size={20} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Orders</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/wishlist')}>
                        <IconSymbol name="heart" size={20} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Wishlist</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => handleNavPress('/(buyer)/settings')}>
                        <IconSymbol name="gearshape.fill" size={20} color={GIFTYY_THEME.colors.gray700} />
                        <Text style={styles.menuText}>Settings</Text>
                    </Pressable>
                    <Pressable style={[styles.menuItem, styles.menuItemBorder]} onPress={handleSignOut}>
                        <IconSymbol name="arrow.right.square.fill" size={20} color={GIFTYY_THEME.colors.error} />
                        <Text style={[styles.menuText, { color: GIFTYY_THEME.colors.error }]}>Sign Out</Text>
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
        paddingBottom: 12,
        backgroundColor: 'transparent',
        pointerEvents: 'box-none',
    },
    leftSection: {
        width: 100, // Increased to balance with right actions and prevent clipping
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    logoPlaceholder: {
        width: 44,
    },
    searchSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 240,
    },
    headerSearchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20, // Match back button (40/2)
        paddingLeft: 16,
        paddingRight: 4, // Tighter for icon button
        height: 40, // Match back button and pill
        borderWidth: 1,
        borderColor: '#f1f5f9',
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
    },
    searchSubmitButtonIconPlain: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 14,
        color: GIFTYY_THEME.colors.gray900,
        paddingVertical: 8,
    },
    searchDivider: {
        width: 1,
        height: 20,
        backgroundColor: GIFTYY_THEME.colors.gray300,
        marginHorizontal: 8,
    },
    headerCartButton: {
        width: 44,
        height: 44,
        borderRadius: 9999,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative', // for badge
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
    },
    headerFilterButton: {
        width: 32,
        height: 32,
        borderRadius: 9999,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative', // for badge
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: GIFTYY_THEME.colors.error,
        borderRadius: 9999,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    rightSection: {
        width: 100, // Mirror left section for perfect centering
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    actionsColumn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        borderRadius: 20, // Match back button and search box
        paddingHorizontal: 6,
        height: 40, // Match search box and back button
        ...GIFTYY_THEME.shadows.sm,
        elevation: 0,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    iconButton: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
    },
    pressed: {
        opacity: 0.7,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: GIFTYY_THEME.colors.error,
        borderRadius: 9999,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    profileImage: {
        width: 28, // Tighter fit for 40px box
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
    },
    menuContainer: {
        position: 'absolute',
        // top is handled dynamically
        right: 44, // Shifted more to the left to be closer to the profile icon but still clearing cart
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: 8,
        minWidth: 160,
        ...GIFTYY_THEME.shadows.lg,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        zIndex: 101,
        transformOrigin: 'top right', // Pop from top right
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        borderRadius: 8,
    },
    menuItemBorder: {
        borderTopWidth: 1,
        borderTopColor: GIFTYY_THEME.colors.gray100,
        marginTop: 4,
        paddingTop: 16,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray800,
    },
    menuIconContainer: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    menuBadge: {
        position: 'absolute',
        top: -6,
        right: -8,
        backgroundColor: GIFTYY_THEME.colors.error,
        borderRadius: 9999,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
        paddingHorizontal: 2,
    },
    menuBadgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    fullScreenOverlay: {
        position: 'absolute',
        top: -100, // Cover the top padding
        left: -100, // Cover horizontal padding
        width: SCREEN_WIDTH + 200,
        height: SCREEN_HEIGHT + 200,
        backgroundColor: 'transparent',
        zIndex: 100,
    },
});
