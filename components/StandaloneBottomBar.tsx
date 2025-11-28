import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCart } from '@/contexts/CartContext';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_COLOR } from '@/constants/theme';

const BRAND = BRAND_COLOR;

const TAB_ROUTES = [
    { name: 'home', path: '/(buyer)/(tabs)/home', icon: 'house.fill', label: 'Home' },
    { name: 'cart', path: '/(buyer)/(tabs)/cart', icon: 'cart.fill', label: 'Cart' },
    { name: 'memory', path: '/(buyer)/(tabs)/memory', icon: 'camera.fill', label: 'Memories' },
    { name: 'profile', path: '/(buyer)/(tabs)/profile', icon: 'person.fill', label: 'Profile' },
];

export function StandaloneBottomBar() {
    const { totalQuantity } = useCart();
    const { visible } = useBottomBarVisibility();
    const router = useRouter();
    const pathname = usePathname();
	const { bottom } = useSafeAreaInsets();
	const bottomInset = Math.max(bottom, 0);
	const barHeight = 68 + bottomInset;

    // Hide on tab screens (they have their own CustomTabBar)
    const isTabScreen = pathname?.startsWith('/(buyer)/(tabs)/') && 
        (pathname === '/(buyer)/(tabs)/home' || 
         pathname === '/(buyer)/(tabs)/cart' || 
         pathname === '/(buyer)/(tabs)/memory' || 
         pathname === '/(buyer)/(tabs)/profile' ||
         pathname?.startsWith('/(buyer)/(tabs)/product/'));

    if (!visible || isTabScreen) {
        return null;
    }

    const isActive = (path: string) => {
        if (path === '/(buyer)/(tabs)/home') {
            return pathname === '/(buyer)/(tabs)/home' || pathname === '/';
        }
        return pathname?.startsWith(path);
    };

    return (
        <View
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
				bottom: 0,
				height: barHeight,
                backgroundColor: 'white',
                borderTopLeftRadius: 26,
                borderTopRightRadius: 26,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: -4 },
                elevation: 8,
                flexDirection: 'row',
                paddingHorizontal: 12,
				paddingTop: 8,
				paddingBottom: 8 + bottomInset,
            }}
        >
            {TAB_ROUTES.map((route) => {
                const active = isActive(route.path);

                return (
                    <Pressable
                        key={route.name}
                        onPress={() => router.push(route.path as any)}
                        style={{ flex: 1, alignItems: 'center' }}
                        accessibilityRole="button"
                        accessibilityState={active ? { selected: true } : {}}
                    >
                        <View
                            style={{
                                height: 44,
                                width: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 16,
                                backgroundColor: active ? 'rgba(247, 85, 7, 0.1)' : 'transparent',
                            }}
                        >
                            <View style={{ position: 'relative' }}>
                                <IconSymbol size={22} name={route.icon as any} color={active ? BRAND : '#9ba1a6'} />
                                {route.name === 'cart' && totalQuantity > 0 && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: -6,
                                            right: -12,
                                            minWidth: 18,
                                            height: 18,
                                            paddingHorizontal: 4,
                                            borderRadius: 9,
                                            backgroundColor: BRAND,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 2,
                                            borderColor: 'white',
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>
                                            {Math.min(99, totalQuantity)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={{ marginTop: 2, fontSize: 12, color: active ? BRAND : '#6b7280', fontWeight: active ? '700' : '600' }}>
                                {route.label}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

