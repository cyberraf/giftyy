import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const palette = {
    background: '#fff',
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

type BuyerPlan = {
    id: string;
    name: string;
    description: string | null;
    monthly_price: number;
    yearly_price: number;
    features: Record<string, any> | null;
    sort_order: number | null;
};

type Assignment = {
    id: string;
    plan_id: string;
    status: 'active' | 'cancelled' | 'expired';
    billing_period: 'monthly' | 'yearly';
    started_at: string | null;
    ends_at: string | null;
    buyer_plans?: BuyerPlan;
};

function formatCurrency(n: number | null | undefined): string {
    if (n === null || n === undefined) return '$0';
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
    } catch {
        return `$${Number(n).toFixed(2)}`;
    }
}

export default function SubscriptionScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();

    const [plans, setPlans] = useState<BuyerPlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [plansError, setPlansError] = useState<string | null>(null);

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loadingAssignment, setLoadingAssignment] = useState(true);

    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isChangingPlan, setIsChangingPlan] = useState(false);
    const [assigningDefault, setAssigningDefault] = useState(false);

    // Brand-styled confirmation modal
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');

    useEffect(() => {
        let active = true;
        const fetchPlans = async () => {
            setLoadingPlans(true);
            setPlansError(null);
            const { data, error } = await supabase
                .from('buyer_plans')
                .select('id,name,description,monthly_price,yearly_price,features,sort_order')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (!active) return;
            if (error) {
                setPlansError(error.message || 'Unable to load plans');
                setPlans([]);
            } else {
                setPlans((data || []) as BuyerPlan[]);
            }
            setLoadingPlans(false);
        };
        fetchPlans();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!user) return;
        let active = true;
        const fetchAssignment = async () => {
            setLoadingAssignment(true);
            const { data, error } = await supabase
                .from('buyer_plan_assignments')
                .select('id,plan_id,status,billing_period,started_at,ends_at,buyer_plans ( id,name,description,monthly_price,yearly_price,features )')
                .eq('buyer_id', user.id)
                .in('status', ['active'])
                .maybeSingle();
            if (!active) return;
            if (error && error.code !== 'PGRST116') {
                console.warn('Failed to load current assignment:', error);
            }
            setAssignment((data as unknown as Assignment) || null);
            setLoadingAssignment(false);
        };
        fetchAssignment();
        return () => { active = false; };
    }, [user?.id]);

    // Ensure a default "Free" plan if user has no active assignment
    useEffect(() => {
        const ensureDefaultPlan = async () => {
            if (!user || loadingPlans || loadingAssignment || assignment || assigningDefault) return;
            // Find a free plan: monthly_price === 0, otherwise name 'Free', otherwise first plan
            const free = plans.find((p) => (p.monthly_price ?? 0) === 0) || plans.find((p) => p.name.toLowerCase().includes('free')) || plans[0];
            if (!free) return;
            try {
                setAssigningDefault(true);
                // Double-check directly in DB to avoid race conditions
                const { data: existing } = await supabase
                    .from('buyer_plan_assignments')
                    .select('id,plan_id,status,billing_period,started_at,ends_at,buyer_plans ( id,name,description,monthly_price,yearly_price,features )')
                    .eq('buyer_id', user.id)
                    .eq('status', 'active')
                    .maybeSingle();
                if (existing) {
                    setAssignment(existing as unknown as Assignment);
                    return;
                }
                const { error } = await supabase
                    .from('buyer_plan_assignments')
                    .insert({
                        buyer_id: user.id,
                        plan_id: free.id,
                        status: 'active',
                        billing_period: 'monthly',
                    } as any);
                if (!error) {
                    // Refresh assignment
                    const { data } = await supabase
                        .from('buyer_plan_assignments')
                        .select('id,plan_id,status,billing_period,started_at,ends_at,buyer_plans ( id,name,description,monthly_price,yearly_price,features )')
                        .eq('buyer_id', user.id)
                        .in('status', ['active'])
                        .maybeSingle();
                    setAssignment((data as unknown as Assignment) || null);
                } else {
                    // Ignore duplicate active assignment errors from race conditions
                    if (error.code !== '23505') {
                        console.warn('Failed to set default free plan:', error);
                    } else {
                        const { data } = await supabase
                            .from('buyer_plan_assignments')
                            .select('id,plan_id,status,billing_period,started_at,ends_at,buyer_plans ( id,name,description,monthly_price,yearly_price,features )')
                            .eq('buyer_id', user.id)
                            .in('status', ['active'])
                            .maybeSingle();
                        setAssignment((data as unknown as Assignment) || null);
                    }
                }
            } finally {
                setAssigningDefault(false);
            }
        };
        ensureDefaultPlan();
    }, [user?.id, plans, assignment, loadingPlans, loadingAssignment, assigningDefault]);

    const handleChangePlan = async (planId: string) => {
        if (!user) {
            Alert.alert('Sign in required', 'Please sign in to change your plan.');
            return;
        }
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        if (assignment?.plan_id === planId && assignment.status === 'active') {
            Alert.alert('Already subscribed', 'You are already on this plan.');
            return;
        }

        setSelectedPlan(planId);
        setIsChangingPlan(true);
        try {
            // Cancel existing active assignments
            if (assignment?.status === 'active') {
                const { error: cancelError } = await supabase
                    .from('buyer_plan_assignments')
                    .update({ status: 'cancelled' })
                    .eq('buyer_id', user.id)
                    .eq('status', 'active');
                if (cancelError) {
                    Alert.alert('Error', cancelError.message || 'Unable to update current subscription. Please try again.');
                    return;
                }
            }
            // Subscribe to the new plan (default monthly)
            const { error: insertError } = await supabase
                .from('buyer_plan_assignments')
                .insert({
                    buyer_id: user.id,
                    plan_id: planId,
                    status: 'active',
                    billing_period: 'monthly',
                } as any);
            if (insertError) {
                Alert.alert('Error', insertError.message || 'Unable to change plan');
            } else {
                setConfirmTitle('Success');
                setConfirmMessage(`You are now on the ${plan.name} plan.`);
                setConfirmVisible(true);
                // Refresh current assignment
                const { data } = await supabase
                    .from('buyer_plan_assignments')
                    .select('id,plan_id,status,billing_period,started_at,ends_at,buyer_plans ( id,name,description,monthly_price,yearly_price,features )')
                    .eq('buyer_id', user.id)
                    .in('status', ['active'])
                    .maybeSingle();
                setAssignment((data as unknown as Assignment) || null);
            }
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Unable to change plan');
        } finally {
            setIsChangingPlan(false);
            setSelectedPlan(null);
        }
    };

    const handleCancelSubscription = () => {
        if (!user) {
            Alert.alert('Sign in required', 'Please sign in to manage your subscription.');
            return;
        }
        Alert.alert(
            'Cancel subscription',
            'Are you sure you want to cancel your subscription? You will be moved to the Free plan.',
            [
                { text: 'Keep subscription', style: 'cancel' },
                {
                    text: 'Cancel subscription',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsChangingPlan(true);
                            // 1) Cancel any current active assignment
                            const { error: cancelError } = await supabase
                                .from('buyer_plan_assignments')
                                .update({ status: 'cancelled' })
                                .eq('buyer_id', user.id)
                                .eq('status', 'active');
                            if (cancelError) {
                                Alert.alert('Error', cancelError.message || 'Unable to cancel subscription. Please try again.');
                                return;
                            }

                            // 2) Find Free plan (monthly_price == 0 or named Free)
                            let free = plans.find((p) => (p.monthly_price ?? 0) === 0 || p.name.toLowerCase().includes('free'));
                            if (!free) {
                                const { data: planData, error: planErr } = await supabase
                                    .from('buyer_plans')
                                    .select('id,name,description,monthly_price,yearly_price,features,sort_order')
                                    .eq('is_active', true)
                                    .order('sort_order', { ascending: true });
                                if (!planErr && planData) {
                                    const list = (planData as BuyerPlan[]) || [];
                                    free = list.find((p) => (p.monthly_price ?? 0) === 0 || p.name.toLowerCase().includes('free')) || list[0];
                                }
                            }
                            if (!free) {
                                Alert.alert('Error', 'No Free plan configured. Please contact support.');
                                return;
                            }

                            // 3) Activate Free plan
                            const { error: insertError } = await supabase
                                .from('buyer_plan_assignments')
                                .insert({
                                    buyer_id: user.id,
                                    plan_id: free.id,
                                    status: 'active',
                                    billing_period: 'monthly',
                                } as any);
                            if (insertError) {
                                Alert.alert('Error', insertError.message || 'Unable to activate Free plan.');
                                return;
                            }

                            // 4) Refresh assignment
                            const { data } = await supabase
                                .from('buyer_plan_assignments')
                                .select('id,plan_id,status,billing_period,started_at,ends_at,buyer_plans ( id,name,description,monthly_price,yearly_price,features )')
                                .eq('buyer_id', user.id)
                                .in('status', ['active'])
                                .maybeSingle();
                            setAssignment((data as unknown as Assignment) || null);

                            // 5) Show success modal
                            setConfirmTitle('Subscription cancelled');
                            setConfirmMessage('You are now on the Free plan.');
                            setConfirmVisible(true);
                        } catch (err: any) {
                            Alert.alert('Error', err?.message || 'Unable to cancel subscription.');
                        } finally {
                            setIsChangingPlan(false);
                        }
                    },
                },
            ]
        );
    };

    const handleToggleAutoRenew = () => {
        Alert.alert('Coming soon', 'Auto-renew management is coming soon.');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status: Assignment['status'] | 'trial') => {
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

    const currentPlanName = assignment?.buyer_plans?.name || 'Free';
    const currentAmountMonthly = formatCurrency(assignment?.buyer_plans?.monthly_price || 0);
    const nextBillingDate = assignment?.ends_at ? assignment.ends_at : '';

    const formattedPlans = useMemo(() => plans, [plans]);

    // Build a comprehensive, user-friendly capability list from the JSON features
    const toTitle = (s: string) => s.replace(/[_\-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    const stringify = (v: unknown) => {
        if (v === true) return 'Enabled';
        if (v === false) return '';
        if (typeof v === 'string') return toTitle(v);
        if (typeof v === 'number') return String(v);
        return '';
    };
    const buildCapabilities = (feats: Record<string, any> | null | undefined): string[] => {
        if (!feats) return [];
        const lines: string[] = [];
        if (feats.aiRecommendations && (feats.aiRecommendations.enabled ?? true)) {
            const val = stringify(feats.aiRecommendations.type) || 'Enabled';
            lines.push(`AI recommendations: ${val}`);
        }
        if (feats.giftWrapping && (feats.giftWrapping.enabled ?? true)) {
            const qty = feats.giftWrapping.quantity ?? 0;
            const type = stringify(feats.giftWrapping.type) || 'Available';
            lines.push(`Gift wrapping: ${type}${qty ? ` (${qty}/mo)` : ''}`);
        }
        if (feats.giftyyCards && (feats.giftyyCards.enabled ?? true)) {
            const qty = feats.giftyyCards.quantity ?? 0;
            const type = stringify(feats.giftyyCards.type) || 'Available';
            lines.push(`Giftyy Cards: ${type}${qty ? ` (${qty}/mo)` : ''}`);
        }
        if (feats.shipping && (feats.shipping.enabled ?? true)) {
            const val = stringify(feats.shipping.type) || 'Available';
            if (val) lines.push(`Shipping: ${val}`);
        }
        if (feats.earlyAccess === true) {
            lines.push('Early access to features');
        }
        if (feats.vipCollections === true) {
            lines.push('VIP collections');
        }
        if (feats.personalAssistant === true) {
            lines.push('Personal gift assistant');
        }
        // Include any other keys not covered above
        Object.entries(feats).forEach(([key, val]) => {
            if (['aiRecommendations', 'giftWrapping', 'giftyyCards', 'shipping', 'earlyAccess', 'vipCollections', 'personalAssistant'].includes(key)) return;
            if (val && typeof val === 'object') {
                Object.entries(val).forEach(([k, v]) => {
                    const txt = stringify(v);
                    if (txt) lines.push(`${toTitle(key)} ${toTitle(k)}: ${txt}`);
                });
            } else {
                const txt = stringify(val);
                if (txt) lines.push(`${toTitle(key)}: ${txt}`);
            }
        });
        return lines;
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

                {/* Current Subscription Card (from buyer_plan_assignments) */}
                <View style={styles.currentCard}>
                    <View style={styles.currentCardHeader}>
                        <View>
                            <Text style={styles.currentPlanName}>{currentPlanName}</Text>
                            <View style={styles.statusBadge}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor(assignment?.status || 'active') }]} />
                                <Text style={[styles.statusText, { color: getStatusColor(assignment?.status || 'active') }]}>
                                    {(assignment?.status || 'active').charAt(0).toUpperCase() + (assignment?.status || 'active').slice(1)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceAmount}>{currentAmountMonthly}</Text>
                            <Text style={styles.pricePeriod}>/month</Text>
                        </View>
                    </View>

                    <View style={styles.billingInfo}>
                        <View style={styles.billingRow}>
                            <Text style={styles.billingLabel}>Next billing date</Text>
                            <Text style={styles.billingValue}>{nextBillingDate ? formatDate(nextBillingDate) : '—'}</Text>
                        </View>
                        <View style={styles.billingRow}>
                            <Text style={styles.billingLabel}>Auto-renew</Text>
                            <Pressable onPress={handleToggleAutoRenew} style={styles.toggleButton}>
                                <Text style={[styles.toggleText, { color: palette.textSecondary }]}>
                                    Manage
                                </Text>
                                <IconSymbol name="chevron.right" size={16} color={palette.textSecondary} />
                            </Pressable>
                        </View>
                    </View>

                    {assignment?.status === 'active' && (
                        <Pressable onPress={handleCancelSubscription} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel subscription</Text>
                        </Pressable>
                    )}
                </View>

                {/* Available Plans (from buyer_plans) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Available plans</Text>
                    <Text style={styles.sectionSubtitle}>Choose the plan that works best for you</Text>

                    {loadingPlans ? (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={BRAND_COLOR} />
                            <Text style={{ color: palette.textSecondary, marginTop: 8 }}>Loading plans…</Text>
                        </View>
                    ) : plansError ? (
                        <Text style={{ color: palette.danger }}>{plansError}</Text>
                    ) : formattedPlans.length === 0 ? (
                        <Text style={{ color: palette.textSecondary }}>No plans available right now.</Text>
                    ) : null}
                </View>

                {/* Premium and Luxury rows */}
                <View style={styles.section}>
                    {(() => {
                        const premium = formattedPlans.filter(p => /^premium/i.test(p.name));
                        const luxury = formattedPlans.filter(p => /^luxury/i.test(p.name));
                        const freePlan = formattedPlans.find(p => (p.monthly_price ?? 0) === 0 || p.name.toLowerCase().includes('free'));
                        const renderRow = (title: string, data: BuyerPlan[]) => {
                            if (data.length === 0) return null;
                            return (
                                <View style={styles.rowSection} key={title}>
                                    <Text style={styles.rowTitle}>{title}</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
                                        {data.map((plan) => {
                                            const isCurrentPlan = assignment?.plan_id === plan.id && assignment?.status === 'active';
                                            const features = buildCapabilities(plan.features) || [plan.description || 'See details'];
                                            return (
                                                <View key={plan.id} style={[styles.planCardCompact, isCurrentPlan && styles.planCardCurrent]}>
                                                    {isCurrentPlan && (
                                                        <View style={[styles.currentBadge, { top: -8 }]}>
                                                            <Text style={styles.currentBadgeText}>Current plan</Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.planHeader}>
                                                        <Text style={styles.planName}>{plan.name}</Text>
                                                    </View>
                                                    <View style={styles.planPriceTag}>
                                                        <Text style={styles.planPriceAmount}>{formatCurrency(plan.monthly_price)}</Text>
                                                        <Text style={styles.planPricePeriod}>/month</Text>
                                                    </View>
                                                    <View style={styles.capabilities}>
                                                        {features.map((feature, idx) => (
                                                            <View key={idx} style={styles.featureRow}>
                                                                <IconSymbol name="checkmark.circle.fill" size={16} color={palette.success} />
                                                                <Text style={styles.featureText}>{feature}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    {isCurrentPlan ? (
                                                        <View style={[styles.planButton, styles.planButtonDisabled, { marginTop: 12 }]} pointerEvents="none">
                                                            <Text style={[styles.planButtonText, styles.planButtonDisabledText]}>Current plan</Text>
                                                        </View>
                                                    ) : (
                                                        <Pressable
                                                            onPress={() => handleChangePlan(plan.id)}
                                                            style={[styles.planButton, styles.planButtonPrimary, { marginTop: 12 }]}
                                                            disabled={isChangingPlan}
                                                        >
                                                            <Text style={[styles.planButtonText, styles.planButtonTextPrimary]}>
                                                                Select {plan.name}
                                                            </Text>
                                                        </Pressable>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            );
                        };
                        return (
                            <>
                                {renderRow('Premium plans', premium)}
                                {renderRow('Luxury plans', luxury)}

                                {/* Free plan quick action */}
                                {freePlan && !(assignment?.plan_id === freePlan.id && assignment?.status === 'active') && (
                                    <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
                                        <Pressable
                                            onPress={() => handleChangePlan(freePlan.id)}
                                            style={[styles.planButton, styles.planButtonPrimary]}
                                            disabled={isChangingPlan}
                                        >
                                            <Text style={[styles.planButtonText, styles.planButtonTextPrimary]}>Switch to Free</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </>
                        );
                    })()}
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

            {/* Brand-styled confirmation modal */}
            <Modal
                transparent
                visible={confirmVisible}
                animationType="fade"
                onRequestClose={() => setConfirmVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <IconSymbol name="checkmark.seal.fill" size={28} color={BRAND_COLOR} />
                        <Text style={styles.modalTitle}>{confirmTitle}</Text>
                        <Text style={styles.modalMessage}>{confirmMessage}</Text>
                        <Pressable style={styles.modalButtonPrimary} onPress={() => setConfirmVisible(false)}>
                            <Text style={styles.modalButtonPrimaryText}>OK</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
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
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    planPrice: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    planPriceTag: {
        position: 'absolute',
        top: 12,
        right: 16,
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    planPriceAmount: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: palette.textPrimary,
    },
    planPricePeriod: {
        fontSize: 11,
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
    capabilities: {
        gap: 8,
        marginTop: 6,
    },
    // Horizontal rows
    rowSection: {
        gap: 10,
    },
    rowTitle: {
        fontSize: 18,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
        marginBottom: 4,
    },
    rowScroll: {
        gap: 12,
        paddingRight: 8,
    },
    planCardCompact: {
        width: 260,
        backgroundColor: palette.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: palette.border,
        marginRight: 12,
        minHeight: 340,
        position: 'relative',
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
    planButtonBusy: {
        opacity: 0.85,
    },
    planButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    planButtonTextPrimary: {
        color: '#FFFFFF',
    },
    planButtonDisabled: {
        backgroundColor: palette.neutralSoft,
        borderColor: palette.border,
    },
    planButtonDisabledText: {
        color: palette.textSecondary,
        fontWeight: '700',
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: palette.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 20,
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 6,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: palette.textPrimary,
    },
    modalMessage: {
        fontSize: 15,
        color: palette.textSecondary,
        textAlign: 'center',
        marginBottom: 4,
    },
    modalButtonPrimary: {
        marginTop: 4,
        backgroundColor: BRAND_COLOR,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    modalButtonPrimaryText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
});
