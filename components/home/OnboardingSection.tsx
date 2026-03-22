import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_FONT } from '@/constants/theme';
import { normalizeFont, scale, verticalScale } from '@/utils/responsive';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type OnboardingStep = {
    id: string;
    label: string;
    completed: boolean;
    onPress: () => void;
};

interface OnboardingSectionProps {
    percentage: number;
    steps: OnboardingStep[];
}

const getProgressColor = (percentage: number) => {
    if (percentage <= 25) return '#EF4444'; // Red
    if (percentage < 75) return '#F97316';  // Orange
    if (percentage < 100) return '#F59E0B'; // Yellow/Amber
    return '#10B981'; // Green
};

export const OnboardingSection: React.FC<OnboardingSectionProps> = ({ percentage, steps }) => {
    const { t } = useTranslation();
    const progressColor = getProgressColor(percentage);

    return (
        <View style={styles.container}>
            {/* Minimalist Summary Header */}
            <View style={styles.summaryCard}>
                <View style={styles.headerRow}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{t('onboarding_ui.title')}</Text>
                        <Text style={styles.percentageText}>
                            {t('onboarding_ui.percentage', { count: Math.round(percentage) })}
                        </Text>
                    </View>
                    <View style={[styles.miniBadge, { backgroundColor: progressColor + '20' }]}>
                        <IconSymbol
                            name={percentage === 100 ? "checkmark.circle.fill" : "sparkles"}
                            size={scale(14)}
                            color={progressColor}
                        />
                    </View>
                </View>

                {/* Sleek Progress Line */}
                <View style={styles.progressLineContainer}>
                    <View style={[styles.progressLine, { width: `${percentage}%`, backgroundColor: progressColor }]} />
                </View>
            </View>

            {/* Redesigned Step Carousel */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
                decelerationRate="fast"
                style={styles.carouselWrapper}
            >
                {steps.map((step) => (
                    <Pressable
                        key={step.id}
                        onPress={step.onPress}
                        style={({ pressed }) => [
                            styles.stepCard,
                            step.completed && styles.stepCardCompleted,
                            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                        ]}
                    >
                        <View style={[
                            styles.statusIcon,
                            step.completed && { backgroundColor: '#22C55E30' }
                        ]}>
                            <IconSymbol
                                name={step.completed ? "checkmark" : "arrow.right.circle"}
                                size={scale(14)}
                                color={step.completed ? "#22C55E" : GIFTYY_THEME.colors.gray400}
                            />
                        </View>
                        <View style={styles.stepTextContainer}>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    step.completed && styles.stepLabelCompleted
                                ]}
                                numberOfLines={1}
                            >
                                {step.label}
                            </Text>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    summaryCard: {
        backgroundColor: '#FFF',
        borderRadius: GIFTYY_THEME.radius.xl,
        padding: GIFTYY_THEME.spacing.lg,
        ...GIFTYY_THEME.shadows.md,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        marginBottom: verticalScale(14),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: GIFTYY_THEME.spacing.md,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        color: '#2F2318',
        fontFamily: BRAND_FONT,
        marginBottom: scale(2),
    },
    percentageText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        color: GIFTYY_THEME.colors.gray500,
        opacity: 0.8,
    },
    miniBadge: {
        width: scale(28),
        height: scale(28),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressLineContainer: {
        height: scale(4),
        backgroundColor: '#F3F4F6',
        borderRadius: scale(2),
        overflow: 'hidden',
    },
    progressLine: {
        height: '100%',
        borderRadius: scale(2),
    },
    carouselWrapper: {
        marginHorizontal: scale(-20),
    },
    carouselContainer: {
        paddingHorizontal: scale(20),
        gap: GIFTYY_THEME.spacing.sm,
        paddingBottom: verticalScale(10),
    },
    stepCard: {
        minWidth: scale(180),
        backgroundColor: '#FFF',
        borderRadius: GIFTYY_THEME.radius.lg,
        paddingVertical: GIFTYY_THEME.spacing.md,
        paddingHorizontal: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...GIFTYY_THEME.shadows.sm,
    },
    stepCardCompleted: {
        backgroundColor: '#FBFDFF',
        borderColor: '#E2E8F0',
    },
    statusIcon: {
        width: scale(30),
        height: scale(30),
        borderRadius: scale(15),
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: GIFTYY_THEME.spacing.sm,
    },
    stepTextContainer: {
        flexShrink: 0,
    },
    stepLabel: {
        fontSize: normalizeFont(13),
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        color: '#475569',
        lineHeight: normalizeFont(16),
    },
    stepLabelCompleted: {
        color: '#94A3B8',
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
});
