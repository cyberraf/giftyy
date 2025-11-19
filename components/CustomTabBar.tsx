import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCart } from '@/contexts/CartContext';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';

const BRAND = '#f75507';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { totalQuantity } = useCart();
    const { visible } = useBottomBarVisibility();
    const allowed = new Set(['home', 'cart', 'memory', 'store-profile', 'profile']);
    
    if (!visible) {
        return null;
    }
    
    return (
        <View
            style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: 18,
                height: 68,
                backgroundColor: 'white',
                borderRadius: 26,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 14,
                elevation: 8,
                flexDirection: 'row',
                paddingHorizontal: 8,
                paddingVertical: 8,
            }}
        >
            {state.routes.filter((r) => allowed.has(r.name)).map((route, index) => {
				const { options } = descriptors[route.key];
				// Compare keys to avoid index mismatches after filtering routes
				const isFocused = state.routes[state.index]?.key === route.key;

				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					});
					if (!isFocused && !event.defaultPrevented) {
						navigation.navigate(route.name);
					}
				};

				let iconName: string = 'circle';
				if (route.name === 'home') iconName = 'house.fill';
				if (route.name === 'cart') iconName = 'cart.fill';
				if (route.name === 'memory') iconName = 'camera.fill';
				if (route.name === 'store-profile') iconName = 'storefront.fill';
				if (route.name === 'profile') iconName = 'person.fill';

				return (
					<Pressable
						key={route.key}
						onPress={onPress}
						style={{ flex: 1, alignItems: 'center' }}
						accessibilityRole="button"
						accessibilityState={isFocused ? { selected: true } : {}}
					>
                        <View
							style={{
                                height: 44,
                                width: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 16,
                                backgroundColor: isFocused ? '#FFF5F0' : 'transparent',
							}}
						>
                            <View style={{ position: 'relative' }}>
                                <IconSymbol size={22} name={iconName} color={isFocused ? BRAND : '#9ba1a6'} />
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
                            <Text style={{ marginTop: 2, fontSize: 12, color: isFocused ? BRAND : '#6b7280', fontWeight: isFocused ? '700' : '600' }}>
								{options.title ?? route.name}
							</Text>
						</View>
					</Pressable>
				);
			})}
        </View>
	);
}


