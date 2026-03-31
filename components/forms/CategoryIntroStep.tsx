/**
 * Category Intro Step
 * Full-screen intro with Giftyy avatar that introduces a preference category
 * before the user sees the actual form fields.
 * Used only in isSelf mode during the conversational preferences flow.
 */

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import {
    Image,
    ImageSourcePropType,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GIFTYY_AVATAR_DEFAULT = require('@/assets/images/giftyy.png');

/** Category-specific Giftyy avatars — falls back to default if image not found */
const CATEGORY_AVATARS: Record<string, ImageSourcePropType> = {
    basics: require('@/assets/images/giftyy-categories/giftyy-basics.png'),
    interests: require('@/assets/images/giftyy-categories/giftyy-interests.png'),
    style: require('@/assets/images/giftyy-categories/giftyy-style.png'),
    entertainment: require('@/assets/images/giftyy-categories/giftyy-entertainment.png'),
    food: require('@/assets/images/giftyy-categories/giftyy-food.png'),
    lifestyle: require('@/assets/images/giftyy-categories/giftyy-lifestyle.png'),
    gifts: require('@/assets/images/giftyy-categories/giftyy-gifts.png'),
    sizes: require('@/assets/images/giftyy-categories/giftyy-sizes.png'),
    life: require('@/assets/images/giftyy-categories/giftyy-life.png'),
    personality: require('@/assets/images/giftyy-categories/giftyy-personality.png'),
};

type CategoryIntroStepProps = {
    title: string;
    message: string;
    categoryEmoji?: string;
    /** Key into CATEGORY_AVATARS for a context-specific Giftyy illustration */
    categoryKey?: string;
    ctaLabel?: string;
    // Injected by wizard
    formData?: any;
    updateFormData?: (data: any) => void;
    onNext?: (data?: any) => void;
    onBack?: () => void;
    onSkip?: () => void;
    isFirstStep?: boolean;
    isLastStep?: boolean;
    shouldShow?: (data: any) => boolean;
    isSelf?: boolean;
    onSaveAndExit?: (data?: any) => void;
    label?: string;
};

export function CategoryIntroStep({
    title,
    message,
    categoryEmoji,
    categoryKey,
    ctaLabel = "Let's Go!",
    onNext,
    onBack,
    isFirstStep,
}: CategoryIntroStepProps) {
    const { bottom } = useSafeAreaInsets();
    const navBottomPadding = Math.max(bottom, Platform.OS === 'ios' ? 24 : 16) + 8;
    const avatarSource = (categoryKey && CATEGORY_AVATARS[categoryKey]) || GIFTYY_AVATAR_DEFAULT;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Giftyy Avatar */}
                <View style={styles.avatarGlow}>
                    <Image
                        source={avatarSource}
                        style={styles.avatar}
                        resizeMode="contain"
                    />
                </View>

                {/* Speech Bubble */}
                <View style={styles.bubble}>
                    <View style={styles.bubblePointer} />
                    {categoryEmoji && (
                        <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
                    )}
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                </View>

                {/* CTA Button */}
                <View style={{ width: '100%', paddingHorizontal: 32 }}>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => onNext?.()}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.ctaText}>{ctaLabel}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Back button */}
            {!isFirstStep && onBack && (
                <View style={[styles.backContainer, { paddingBottom: navBottomPadding }]}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    avatarGlow: {
        marginBottom: 8,
    },
    avatar: {
        width: 180,
        height: 180,
    },
    bubble: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        marginTop: 12,
        marginBottom: 32,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        alignItems: 'center',
    },
    bubblePointer: {
        position: 'absolute',
        top: -8,
        width: 16,
        height: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        borderBottomWidth: 0,
        borderRightWidth: 0,
        transform: [{ rotate: '45deg' }],
    },
    categoryEmoji: {
        fontSize: 36,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    message: {
        fontSize: 15,
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: 22,
    },
    ctaButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: GIFTYY_THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    backContainer: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    backButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    backText: {
        fontSize: 15,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray400,
    },
});
