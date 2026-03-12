import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface PremiumToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    duration?: number;
    onHide?: () => void;
}

export default function PremiumToast({
    visible,
    message,
    type = 'info',
    duration = 3000,
    onHide
}: PremiumToastProps) {
    const { bottom } = useSafeAreaInsets();
    const [active, setActive] = useState(false);
    const translateY = React.useRef(new Animated.Value(100)).current;
    const opacity = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setActive(true);
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 120,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                hide();
            }, duration);

            return () => clearTimeout(timer);
        } else if (active) {
            hide();
        }
    }, [visible]);

    const hide = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setActive(false);
            if (onHide) onHide();
        });
    };

    if (!active && !visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark.circle.fill';
            case 'error': return 'xmark.circle.fill';
            case 'warning': return 'questionmark.circle.fill';
            default: return 'info.circle';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success': return '#10B981';
            case 'error': return '#EF4444';
            case 'warning': return '#F59E0B';
            default: return GIFTYY_THEME.colors.primary;
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return 'rgba(236, 253, 245, 0.8)';
            case 'error': return 'rgba(254, 242, 242, 0.8)';
            case 'warning': return 'rgba(255, 251, 235, 0.8)';
            default: return 'rgba(255, 255, 255, 0.8)';
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    bottom: bottom + 100, // Above bottom bar
                    transform: [{ translateY }],
                    opacity
                }
            ]}
        >
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
                <View style={[styles.inner, { backgroundColor: getBackgroundColor() }]}>
                    <View style={[styles.accent, { backgroundColor: getIconColor() }]} />
                    <IconSymbol name={getIcon()} size={20} color={getIconColor()} />
                    <Text style={styles.text} numberOfLines={2}>{message}</Text>
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 9999,
    },
    blurContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        ...GIFTYY_THEME.shadows.lg,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    accent: {
        position: 'absolute',
        left: 0,
        top: 10,
        bottom: 10,
        width: 4,
        borderRadius: 2,
    },
    text: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        lineHeight: 18,
    },
});
