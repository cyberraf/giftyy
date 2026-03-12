import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type NoticeType = 'warning' | 'error' | 'info' | 'success';

interface PremiumNoticeProps {
    message: string;
    title?: string;
    type?: NoticeType;
    style?: any;
}

export default function PremiumNotice({
    message,
    title,
    type = 'warning',
    style
}: PremiumNoticeProps) {
    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark.circle.fill';
            case 'error': return 'xmark.circle.fill';
            case 'info': return 'info.circle';
            default: return 'questionmark.circle.fill';
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return {
                bg: 'rgba(236, 253, 245, 0.7)',
                border: '#D1FAE5',
                text: '#065F46',
                icon: '#10B981'
            };
            case 'error': return {
                bg: 'rgba(254, 242, 242, 0.7)',
                border: '#FEE2E2',
                text: '#991B1B',
                icon: '#EF4444'
            };
            case 'info': return {
                bg: 'rgba(239, 246, 255, 0.7)',
                border: '#DBEAFE',
                text: '#1E40AF',
                icon: '#3B82F6'
            };
            default: return {
                bg: 'rgba(255, 251, 235, 0.7)',
                border: '#FEF3C7',
                text: '#92400E',
                icon: '#F59E0B'
            };
        }
    };

    const colors = getColors();

    return (
        <View style={[styles.outer, { borderColor: colors.border }, style]}>
            <BlurView intensity={20} tint="light" style={styles.blur}>
                <View style={[styles.inner, { backgroundColor: colors.bg }]}>
                    <View style={styles.iconContainer}>
                        <IconSymbol name={getIcon()} size={16} color={colors.icon} />
                    </View>
                    <View style={styles.content}>
                        {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
                        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
                    </View>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    blur: {
        width: '100%',
    },
    inner: {
        flexDirection: 'row',
        padding: 12,
        gap: 10,
        alignItems: 'center',
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 2,
    },
    message: {
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
    },
});
