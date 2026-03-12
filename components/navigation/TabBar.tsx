import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useNotifications } from '@/contexts/NotificationsContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { bottom } = useSafeAreaInsets();
    const { unreadCount } = useNotifications();

    const getIconName = (routeName: string, isFocused: boolean): string => {
        switch (routeName) {
            case 'index':
                return isFocused ? 'house.fill' : 'house';
            case 'shop':
                return isFocused ? 'gift.fill' : 'gift';
            case 'recipients':
                return isFocused ? 'person.2.fill' : 'person.2';
            case 'cart':
                return isFocused ? 'cart.fill' : 'cart';
            case 'memory':
                return isFocused ? 'camera.fill' : 'camera';
            default:
                return 'circle';
        }
    };

    const getLabel = (routeName: string): string => {
        switch (routeName) {
            case 'index': return 'Home';
            case 'shop': return 'Shop';
            case 'recipients': return 'Circle';
            case 'cart': return 'Cart';
            case 'memory': return 'Memory';
            default: return routeName;
        }
    };

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: Math.max(bottom, 12) }]}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];

                // Hide search and product details from tabs
                if (route.name === 'search' || route.name === 'product/[id]') return null;

                const isFocused = state.index === index;

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

                // Check if options have tabBarTestID before accessing it safely, or cast to any
                const testID = (options as any).tabBarTestID;

                return (
                    <TouchableOpacity
                        key={index}
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={testID}
                        onPress={onPress}
                        style={styles.tabItem}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconContainer}>
                            <IconSymbol
                                name={getIconName(route.name, isFocused) as any}
                                size={24}
                                color={isFocused ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray400}
                                weight={isFocused ? 'bold' : 'regular'}
                            />
                            {route.name === 'cart' && unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
                            )}
                        </View>
                        <Text
                            style={[
                                styles.tabLabel,
                                { color: isFocused ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray500 }
                            ]}
                        >
                            {getLabel(route.name)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: GIFTYY_THEME.colors.gray100,
        paddingTop: 12,
        ...GIFTYY_THEME.shadows.md,
        elevation: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        position: 'relative',
        marginBottom: 4,
    },
    tabLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Medium',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: GIFTYY_THEME.colors.error,
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontFamily: 'Outfit-Bold',
        lineHeight: 11,
    }
});
