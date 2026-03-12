import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_FONT } from '@/constants/theme';
import { scale, verticalScale } from '@/utils/responsive';
import React from 'react';
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
    const progressColor = getProgressColor(percentage);

    return (
        <View style={styles.container}>
            {/* Minimalist Summary Header */}
            <View style={styles.summaryCard}>
                <View style={styles.headerRow}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Complete Your Setup</Text>
                        <Text style={styles.percentageText}>
                            {Math.round(percentage)}% complete
                        </Text>
                    </View>
                    <View style={[styles.miniBadge, { backgroundColor: progressColor + '20' }]}>
                        <IconSymbol
                            name={percentage === 100 ? "checkmark.circle.fill" : "sparkles"}
                            size={14}
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
                snapToInterval={scale(180) + 10}
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
                                size={14}
                                color={step.completed ? "#22C55E" : GIFTYY_THEME.colors.gray400}
                            />
                        </View>
                        <View style={styles.stepTextContainer}>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    step.completed && styles.stepLabelCompleted
                                ]}
                                numberOfLines={2}
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
        borderRadius: 20,
        padding: 16,
        ...GIFTYY_THEME.shadows.md,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        marginBottom: verticalScale(14),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2F2318',
        fontFamily: BRAND_FONT,
        marginBottom: 2,
    },
    percentageText: {
        fontSize: 12,
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray500,
        opacity: 0.8,
    },
    miniBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressLineContainer: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressLine: {
        height: '100%',
        borderRadius: 2,
    },
    carouselWrapper: {
        marginHorizontal: scale(-20),
    },
    carouselContainer: {
        paddingHorizontal: scale(20),
        gap: 10,
        paddingBottom: verticalScale(10),
    },
    stepCard: {
        width: scale(180),
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
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
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    stepTextContainer: {
        flex: 1,
    },
    stepLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        lineHeight: 16,
    },
    stepLabelCompleted: {
        color: '#94A3B8',
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
});
