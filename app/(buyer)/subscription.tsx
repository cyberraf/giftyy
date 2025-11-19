import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';

const palette = {
    background: '#F5F4F2',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accentSoft: '#FCEEE7',
    neutralSoft: '#ECE7E2',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
};

type SubscriptionPlan = {
    id: string;
    name: string;
    price: string;
    period: string;
    features: string[];
    popular?: boolean;
};

type SubscriptionStatus = {
    plan: string;
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    nextBillingDate: string;
    amount: string;
    autoRenew: boolean;
};

const PLANS: SubscriptionPlan[] = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: 'forever',
        features: [
            'Up to 5 memory videos',
            'Basic video storage',
            'Standard quality',
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '$9.99',
        period: 'month',
        popular: true,
        features: [
            'Unlimited memory videos',
            'HD video quality',
            'Priority support',
            'Advanced video editing',
            'Cloud backup',
        ],
    },
    {
        id: 'vault',
        name: 'Memory Vault',
        price: '$19.99',
        period: 'month',
        features: [
            'Everything in Premium',
            '4K video quality',
            'Unlimited storage',
            'Family sharing (up to 5 members)',
            'Custom video themes',
            'Early access to features',
        ],
    },
];

const CURRENT_SUBSCRIPTION: SubscriptionStatus = {
    plan: 'Premium',
    status: 'active',
    nextBillingDate: '2024-02-15',
    amount: '$9.99',
    autoRenew: true,
};

export default function SubscriptionScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isChangingPlan, setIsChangingPlan] = useState(false);

    const handleChangePlan = (planId: string) => {
        if (planId === CURRENT_SUBSCRIPTION.plan.toLowerCase()) {
            Alert.alert('Already subscribed', 'You are already on this plan.');
            return;
        }
        setSelectedPlan(planId);
        setIsChangingPlan(true);
        Alert.alert(
            'Change subscription',
            `Are you sure you want to change to the ${PLANS.find(p => p.id === planId)?.name} plan?`,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => setIsChangingPlan(false) },
                {
                    text: 'Confirm',
                    onPress: () => {
                        // Handle plan change
                        Alert.alert('Success', 'Your subscription plan has been updated.');
                        setIsChangingPlan(false);
                        setSelectedPlan(null);
                    },
                },
            ]
        );
    };

    const handleCancelSubscription = () => {
        Alert.alert(
            'Cancel subscription',
            'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.',
            [
                { text: 'Keep subscription', style: 'cancel' },
                {
                    text: 'Cancel subscription',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Subscription cancelled', 'Your subscription will remain active until the end of your billing period.');
                    },
                },
            ]
        );
    };

    const handleToggleAutoRenew = () => {
        Alert.alert(
            CURRENT_SUBSCRIPTION.autoRenew ? 'Disable auto-renew' : 'Enable auto-renew',
            CURRENT_SUBSCRIPTION.autoRenew
                ? 'Your subscription will not automatically renew. You will lose access at the end of your billing period.'
                : 'Your subscription will automatically renew each billing period.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        Alert.alert('Updated', `Auto-renew has been ${CURRENT_SUBSCRIPTION.autoRenew ? 'disabled' : 'enabled'}.`);
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status: SubscriptionStatus['status']) => {
        switch (status) {
            case 'active':
                return palette.success;
            case 'trial':
                return palette.warning;
            case 'cancelled':
            case 'expired':
                return palette.danger;
            default:
                return palette.textSecondary;
        }
    };

    return (
        <View style={[styles.screen, { paddingTop: top + 8 }]}>
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color={palette.textPrimary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Subscription</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Current Subscription Card */}
                <View style={styles.currentCard}>
                    <View style={styles.currentCardHeader}>
                        <View>
                            <Text style={styles.currentPlanName}>{CURRENT_SUBSCRIPTION.plan}</Text>
                            <View style={styles.statusBadge}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor(CURRENT_SUBSCRIPTION.status) }]} />
                                <Text style={[styles.statusText, { color: getStatusColor(CURRENT_SUBSCRIPTION.status) }]}>
                                    {CURRENT_SUBSCRIPTION.status.charAt(0).toUpperCase() + CURRENT_SUBSCRIPTION.status.slice(1)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceAmount}>{CURRENT_SUBSCRIPTION.amount}</Text>
                            <Text style={styles.pricePeriod}>/month</Text>
                        </View>
                    </View>

                    <View style={styles.billingInfo}>
                        <View style={styles.billingRow}>
                            <Text style={styles.billingLabel}>Next billing date</Text>
                            <Text style={styles.billingValue}>{formatDate(CURRENT_SUBSCRIPTION.nextBillingDate)}</Text>
                        </View>
                        <View style={styles.billingRow}>
                            <Text style={styles.billingLabel}>Auto-renew</Text>
                            <Pressable onPress={handleToggleAutoRenew} style={styles.toggleButton}>
                                <Text style={[styles.toggleText, { color: CURRENT_SUBSCRIPTION.autoRenew ? palette.success : palette.textSecondary }]}>
                                    {CURRENT_SUBSCRIPTION.autoRenew ? 'On' : 'Off'}
                                </Text>
                                <IconSymbol name="chevron.right" size={16} color={palette.textSecondary} />
                            </Pressable>
                        </View>
                    </View>

                    {CURRENT_SUBSCRIPTION.status === 'active' && (
                        <Pressable onPress={handleCancelSubscription} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel subscription</Text>
                        </Pressable>
                    )}
                </View>

                {/* Available Plans */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Available plans</Text>
                    <Text style={styles.sectionSubtitle}>Choose the plan that works best for you</Text>

                    {PLANS.map((plan) => {
                        const isCurrentPlan = plan.name === CURRENT_SUBSCRIPTION.plan;
                        const isPopular = plan.popular;

                        return (
                            <View key={plan.id} style={[styles.planCard, isCurrentPlan && styles.planCardCurrent, isPopular && styles.planCardPopular]}>
                                {isPopular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularBadgeText}>Most popular</Text>
                                    </View>
                                )}
                                {isCurrentPlan && (
                                    <View style={styles.currentBadge}>
                                        <Text style={styles.currentBadgeText}>Current plan</Text>
                                    </View>
                                )}

                                <View style={styles.planHeader}>
                                    <Text style={styles.planName}>{plan.name}</Text>
                                    <View style={styles.planPrice}>
                                        <Text style={styles.planPriceAmount}>{plan.price}</Text>
                                        <Text style={styles.planPricePeriod}>/{plan.period}</Text>
                                    </View>
                                </View>

                                <View style={styles.planFeatures}>
                                    {plan.features.map((feature, index) => (
                                        <View key={index} style={styles.featureRow}>
                                            <IconSymbol name="checkmark.circle.fill" size={18} color={palette.success} />
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                {!isCurrentPlan && (
                                    <Pressable
                                        onPress={() => handleChangePlan(plan.id)}
                                        style={[styles.planButton, isPopular && styles.planButtonPrimary]}
                                        disabled={isChangingPlan}
                                    >
                                        <Text style={[styles.planButtonText, isPopular && styles.planButtonTextPrimary]}>
                                            {plan.id === 'free' ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Billing History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Billing history</Text>
                    <View style={styles.billingHistoryCard}>
                        <View style={styles.billingHistoryRow}>
                            <View>
                                <Text style={styles.billingHistoryDate}>January 15, 2024</Text>
                                <Text style={styles.billingHistoryDescription}>Premium subscription</Text>
                            </View>
                            <Text style={styles.billingHistoryAmount}>$9.99</Text>
                        </View>
                        <View style={styles.billingHistoryRow}>
                            <View>
                                <Text style={styles.billingHistoryDate}>December 15, 2023</Text>
                                <Text style={styles.billingHistoryDescription}>Premium subscription</Text>
                            </View>
                            <Text style={styles.billingHistoryAmount}>$9.99</Text>
                        </View>
                        <Pressable style={styles.viewAllButton}>
                            <Text style={styles.viewAllButtonText}>View all billing history</Text>
                            <IconSymbol name="chevron.right" size={16} color={palette.textSecondary} />
                        </Pressable>
                    </View>
                </View>

                {/* Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment method</Text>
                    <View style={styles.paymentCard}>
                        <View style={styles.paymentRow}>
                            <IconSymbol name="creditcard.fill" size={24} color={palette.textPrimary} />
                            <View style={styles.paymentInfo}>
                                <Text style={styles.paymentMethod}>•••• •••• •••• 4242</Text>
                                <Text style={styles.paymentExpiry}>Expires 12/25</Text>
                            </View>
                            <Pressable>
                                <Text style={styles.editPaymentText}>Edit</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    currentCard: {
        backgroundColor: palette.card,
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 3,
        gap: 18,
    },
    currentCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    currentPlanName: {
        fontSize: 24,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    priceBadge: {
        alignItems: 'flex-end',
    },
    priceAmount: {
        fontSize: 28,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: palette.textPrimary,
    },
    pricePeriod: {
        fontSize: 14,
        color: palette.textSecondary,
        marginTop: 2,
    },
    billingInfo: {
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: palette.border,
    },
    billingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    billingLabel: {
        fontSize: 15,
        color: palette.textSecondary,
    },
    billingValue: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    toggleText: {
        fontSize: 15,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: palette.border,
        paddingTop: 16,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.danger,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: palette.textSecondary,
        marginTop: -4,
    },
    planCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: palette.border,
        gap: 16,
        position: 'relative',
    },
    planCardCurrent: {
        borderColor: palette.success,
        backgroundColor: palette.accentSoft,
    },
    planCardPopular: {
        borderColor: BRAND_COLOR,
    },
    popularBadge: {
        position: 'absolute',
        top: -10,
        right: 20,
        backgroundColor: BRAND_COLOR,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    currentBadge: {
        position: 'absolute',
        top: -10,
        right: 20,
        backgroundColor: palette.success,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    currentBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 8,
    },
    planName: {
        fontSize: 22,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    planPrice: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    planPriceAmount: {
        fontSize: 24,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: palette.textPrimary,
    },
    planPricePeriod: {
        fontSize: 14,
        color: palette.textSecondary,
        marginLeft: 2,
    },
    planFeatures: {
        gap: 10,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    featureText: {
        flex: 1,
        fontSize: 15,
        color: palette.textPrimary,
        lineHeight: 22,
    },
    planButton: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: palette.border,
        backgroundColor: palette.card,
        alignItems: 'center',
    },
    planButtonPrimary: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
    },
    planButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    planButtonTextPrimary: {
        color: '#FFFFFF',
    },
    billingHistoryCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 16,
    },
    billingHistoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    billingHistoryDate: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
        marginBottom: 4,
    },
    billingHistoryDescription: {
        fontSize: 14,
        color: palette.textSecondary,
    },
    billingHistoryAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingTop: 4,
    },
    viewAllButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textSecondary,
    },
    paymentCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    paymentInfo: {
        flex: 1,
        gap: 4,
    },
    paymentMethod: {
        fontSize: 16,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    paymentExpiry: {
        fontSize: 14,
        color: palette.textSecondary,
    },
    editPaymentText: {
        fontSize: 15,
        fontWeight: '600',
        color: BRAND_COLOR,
    },
});
