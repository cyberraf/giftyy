import StepBar from '@/components/StepBar';
import { EstimatedTotalsCard } from '@/components/checkout/EstimatedTotalsCard';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useCheckout } from '@/lib/CheckoutContext';
import { calculateVendorShippingByZone } from '@/lib/shipping-utils';
import { SafeCardField, useSafeStripe } from '@/lib/stripe-safe';
import { supabase } from '@/lib/supabase';
import { parsePrice } from '@/lib/utils/currency';
import { safeGoBack } from '@/lib/utils/navigation';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function PaymentScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { bottom } = useSafeAreaInsets();
    const { items, clear: clearCart } = useCart();
    const { payment, setPayment, cardType, cardPrice, recipient, notifyRecipient, localVideoUri, videoTitle, videoDurationMs, setVideoUri, sharedMemoryId, reset: resetCheckout } = useCheckout();
    const { createOrder, refreshOrders } = useOrders();
    const { addVideoMessage } = useVideoMessages();
    const { refreshProducts, refreshCollections } = useProducts();
    const [vendorNames, setVendorNames] = useState<Map<string, string>>(new Map());

    const [name, setName] = useState(payment.name || '');
    const [cardDetails, setCardDetails] = useState<any>(null);
    const { user } = useAuth();
    const { alert } = useAlert();
    const { confirmPayment } = useSafeStripe();
    const [loading, setLoading] = useState(false);
    // Tracks which checkout step is currently running so we can show a progress overlay.
    // null = idle; stages run in order (payment → video → order → finalizing).
    type CheckoutStage = 'processing_payment' | 'uploading_video' | 'creating_order' | 'finalizing';
    const [stage, setStage] = useState<CheckoutStage | null>(null);
    const hasVideo = !!(localVideoUri && videoTitle);
    const [refreshing, setRefreshing] = useState(false);
    const [shippingBreakdown, setShippingBreakdown] = useState<{ total: number; breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number }> }>({ total: 0, breakdown: [] });
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshProducts(), refreshCollections(), refreshOrders()]);
        } catch (error) {
            console.error('Error refreshing payment data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshProducts, refreshCollections, refreshOrders]);

    // Fetch vendor names to display in breakdown
    useEffect(() => {
        const loadVendorNames = async () => {
            const ids = Array.from(new Set(items.map(i => i.vendorId).filter(Boolean) as string[]));
            const names = new Map<string, string>();

            // Seed with names available on cart items
            items.forEach(item => {
                const anyItem = item as any;
                if (item.vendorId) {
                    const existingName = anyItem.vendorName || anyItem.storeName;
                    if (existingName) {
                        names.set(item.vendorId, existingName);
                    }
                }
            });

            const missingIds = ids.filter(id => !names.has(id));
            if (missingIds.length === 0) {
                setVendorNames(names);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, store_name')
                    .in('id', missingIds);

                if (error) {
                    console.error('[Payment] Error fetching vendor names:', error);
                } else {
                    data?.forEach(row => {
                        if (row.id) {
                            const storeName = row.store_name?.trim();
                            if (storeName) names.set(row.id, storeName);
                        }
                    });
                }
            } catch (err) {
                console.error('[Payment] Unexpected error fetching vendor names:', err);
            }

            setVendorNames(names);
        };

        loadVendorNames();
    }, [items]);


    const itemsSubtotal = useMemo(() => items.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0), [items]);
    const cardAddOn = cardPrice || 0;
    const taxRate = useMemo(() => {
        const code = (recipient?.state || '').toUpperCase();
        switch (code) {
            case 'CA': return 0.085;
            case 'NY': return 0.088;
            case 'TX': return 0.0825;
            case 'FL': return 0.07;
            case 'WA': return 0.092;
            default: return 0.08;
        }
    }, [recipient?.state]);

    // Calculate shipping based on zones when recipient location is available (same as recipient screen)
    useEffect(() => {
        const calculateShipping = async () => {
            const stateCode = recipient?.state;
            const country = recipient?.country || 'United States';

            if (!stateCode || !country || items.length === 0) {
                // Use default calculation if location not available
                const DEFAULT_SHIPPING = 4.99;
                const FREE_SHIPPING_THRESHOLD = 50;

                const itemsByVendor = new Map<string, typeof items>();
                items.forEach(item => {
                    const vendorId = item.vendorId || 'default';
                    if (!itemsByVendor.has(vendorId)) {
                        itemsByVendor.set(vendorId, []);
                    }
                    itemsByVendor.get(vendorId)!.push(item);
                });

                const breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number }> = [];
                let totalShipping = 0;

                itemsByVendor.forEach((vendorItems, vendorId) => {
                    const vendorSubtotal = vendorItems.reduce((sum, item) => {
                        const price = parsePrice(item.price);
                        return sum + price * item.quantity;
                    }, 0);

                    const itemCount = vendorItems.reduce((sum, item) => sum + item.quantity, 0);
                    const shipping = vendorSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING;
                    totalShipping += shipping;

                    let vendorName = 'Giftyy Store';
                    if (vendorId !== 'default') {
                        const fetchedName = vendorNames.get(vendorId);
                        vendorName = fetchedName || `Vendor ${vendorId.slice(0, 8)}`;
                    }

                    breakdown.push({
                        vendorId,
                        vendorName,
                        subtotal: vendorSubtotal,
                        shipping,
                        itemCount,
                    });
                });

                setShippingBreakdown({ breakdown, total: totalShipping });
                return;
            }

            setIsCalculatingShipping(true);
            try {
                const result = await calculateVendorShippingByZone(
                    items,
                    stateCode,
                    country
                );
                setShippingBreakdown(result);
            } catch (error) {
                console.error('[PaymentScreen] Error calculating shipping:', error);
                // Fallback to default calculation
                const DEFAULT_SHIPPING = 4.99;
                const FREE_SHIPPING_THRESHOLD = 50;

                const itemsByVendor = new Map<string, typeof items>();
                items.forEach(item => {
                    const vendorId = item.vendorId || 'default';
                    if (!itemsByVendor.has(vendorId)) {
                        itemsByVendor.set(vendorId, []);
                    }
                    itemsByVendor.get(vendorId)!.push(item);
                });

                const breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number }> = [];
                let totalShipping = 0;

                itemsByVendor.forEach((vendorItems, vendorId) => {
                    const vendorSubtotal = vendorItems.reduce((sum, item) => {
                        const price = parsePrice(item.price);
                        return sum + price * item.quantity;
                    }, 0);

                    const itemCount = vendorItems.reduce((sum, item) => sum + item.quantity, 0);
                    const shipping = vendorSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING;
                    totalShipping += shipping;

                    let vendorName = 'Giftyy Store';
                    if (vendorId !== 'default') {
                        const fetchedName = vendorNames.get(vendorId);
                        vendorName = fetchedName || `Vendor ${vendorId.slice(0, 8)}`;
                    }

                    breakdown.push({
                        vendorId,
                        vendorName,
                        subtotal: vendorSubtotal,
                        shipping,
                        itemCount,
                    });
                });

                setShippingBreakdown({ breakdown, total: totalShipping });
            } finally {
                setIsCalculatingShipping(false);
            }
        };

        calculateShipping();
    }, [items, recipient?.state, recipient?.country, vendorNames]);

    const shipping = shippingBreakdown.total;

    const taxBreakdown = useMemo(() => {
        const itemsTax = itemsSubtotal * taxRate;
        const cardTax = cardAddOn * taxRate;
        const totalTax = itemsTax + cardTax;
        return { items: itemsTax, card: cardTax, total: totalTax };
    }, [itemsSubtotal, cardAddOn, taxRate]);

    const tax = taxBreakdown.total;
    const total = itemsSubtotal + cardAddOn + shipping + tax;
    const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    const onPay = async () => {
        if (!cardDetails?.complete) {
            alert(t('checkout.payment.alerts.incomplete_card'), t('checkout.payment.alerts.complete_details'));
            return;
        }

        setPayment({ name, cardNumber: '', expiry: '', cvv: '' });
        setLoading(true);
        setStage('processing_payment');

        try {
            // Extract last 4 digits of card number from Stripe listener
            const last4 = cardDetails?.last4 || '****';
            const paymentBrand = cardDetails?.brand || 'Stripe';

            const amountInCents = Math.round(total * 100);
            if (amountInCents < 50) {
                alert(t('checkout.payment.alerts.payment_error'), t('checkout.payment.alerts.min_amount'));
                setLoading(false);
                return;
            }

            // 1. Fetch Payment Intent from Edge Function
            // Prioritize sender (user) email for receipt, fallback to recipient or guest
            const senderEmail = user?.email || recipient.email || 'guest@giftyy.app';

            const { data, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    amount: amountInCents,
                    customerEmail: senderEmail
                }
            });

            if (intentError || !data?.paymentIntent) {
                console.error('[Payment] Edge Function Error:', intentError || data);
                alert(t('checkout.payment.alerts.init_failed'), t('checkout.payment.alerts.init_failed_msg'));
                setLoading(false);
                return;
            }

            // 2. Confirm Payment via Stripe UI Component
            const { error: stripeError, paymentIntent } = await confirmPayment(data.paymentIntent, {
                paymentMethodType: 'Card',
                paymentMethodData: {
                    billingDetails: { name }
                }
            });

            if (stripeError) {
                console.error('[Payment] Stripe confirmation error:', stripeError);
                alert(t('checkout.payment.alerts.payment_failed'), stripeError.message || t('checkout.payment.alerts.payment_failed_msg'));
                setLoading(false);
                return;
            }

            // Upload video if localVideoUri exists (video was recorded but not yet uploaded)
            let videoMessageId: string | undefined;
            if (localVideoUri && videoTitle) {
                setStage('uploading_video');
                try {
                    // Get file size
                    let fileSizeBytes: number | undefined;
                    try {
                        const fileUri = localVideoUri.startsWith('file://') ? localVideoUri : `file://${localVideoUri}`;
                        const fileInfo = await FileSystem.getInfoAsync(fileUri);
                        if (fileInfo.exists && 'size' in fileInfo) {
                            fileSizeBytes = fileInfo.size;
                        }
                    } catch (err) {
                        console.warn('Could not get file size:', err);
                    }

                    // Convert duration from milliseconds to seconds
                    const durationSeconds = videoDurationMs && videoDurationMs > 0
                        ? Math.round(videoDurationMs / 1000)
                        : undefined;

                    // Upload video to Supabase Storage
                    const { videoMessage, error: uploadError } = await addVideoMessage(
                        localVideoUri,
                        videoTitle.trim(),
                        'sent', // Videos recorded by user are 'sent'
                        undefined, // orderId - will be updated after order creation
                        durationSeconds,
                        fileSizeBytes,
                    );

                    if (uploadError || !videoMessage) {
                        console.error('Error uploading video:', uploadError);
                        // Continue without video if upload fails
                        // In production, you might want to show an error and retry
                    } else {
                        videoMessageId = videoMessage.id;
                        // Store the uploaded video URL in checkout context
                        setVideoUri(videoMessage.videoUrl);
                    }
                } catch (err) {
                    console.error('Unexpected error uploading video:', err);
                    // Continue without video if upload fails
                }
            }

            // Determine primary vendor ID if all items are from the same vendor
            const vendorIds = Array.from(new Set(items.map(item => item.vendorId).filter(Boolean) as string[]));
            const primaryVendorId = vendorIds.length === 1 ? vendorIds[0] : undefined;

            setStage('creating_order');
            // Create the order
            const { order, error } = await createOrder(
                items,
                recipient,
                cardType || 'Premium',
                cardPrice,
                notifyRecipient, // Use the value from checkout context
                itemsSubtotal,
                shipping,
                tax,
                total,
                last4,
                paymentBrand, // Passing the detected brand
                videoMessageId,
                sharedMemoryId,
                primaryVendorId // Pass primary vendor ID if all items are from one vendor
            );

            if (error || !order) {
                console.error('Error creating order:', error);
                alert(t('checkout.payment.alerts.payment_failed'), t('checkout.payment.alerts.order_failed'));
                return;
            }

            setStage('finalizing');
            // Clear cart and reset checkout context after successful order creation
            clearCart();
            resetCheckout();

            // Navigate to confirmation with order ID
            router.replace({
                pathname: '/(buyer)/checkout/confirmation',
                params: { orderId: order.id },
            });
        } catch (err) {
            console.error('Unexpected error during payment:', err);
            alert(t('checkout.payment.alerts.payment_failed'), t('checkout.payment.alerts.payment_failed_msg'));
        } finally {
            setLoading(false);
            setStage(null);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <StepBar current={6} total={7} label={t('checkout.payment.step_label')} />
            <View style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={GIFTYY_THEME.colors.primary}
                            colors={[GIFTYY_THEME.colors.primary]}
                        />
                    }
                >
                    <View style={styles.columns}>
                        <EstimatedTotalsCard
                            itemsSubtotal={itemsSubtotal}
                            cardAddOn={cardAddOn}
                            shippingBreakdown={shippingBreakdown}
                            taxBreakdown={taxBreakdown}
                            total={total}
                            taxRate={taxRate}
                            formatCurrency={formatCurrency}
                            isCalculatingShipping={isCalculatingShipping}
                        />

                         <View
                            style={[styles.formCard, loading && { opacity: 0.7 }]}
                            pointerEvents={loading ? 'none' : 'auto'}
                        >
                            <View style={styles.secureBadge}>
                                <Text style={{ fontSize: GIFTYY_THEME.typography.sizes.sm }}>🔒</Text>
                                <Text style={styles.secureText}>{t('checkout.payment.secure_badge')}</Text>
                            </View>
                            <InputField
                                label={t('checkout.payment.name_on_card')}
                                placeholder={t('checkout.payment.name_placeholder')}
                                value={name}
                                onChangeText={setName}
                                autoComplete="name"
                                editable={!loading}
                            />
 
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('checkout.payment.card_details')}</Text>
                                <SafeCardField
                                    postalCodeEnabled={false}
                                    onCardChange={(details: any) => setCardDetails(details)}
                                    disabled={loading}
                                    style={styles.cardField}
                                    cardStyle={{
                                        backgroundColor: '#FFFFFF',
                                        textColor: '#000000',
                                        placeholderColor: '#9CA3AF',
                                        fontSize: 16,
                                    }}
                                 />
                            </View>
 
                            <Text style={styles.finePrint}>{t('checkout.payment.fine_print')}</Text>
                        </View>
                        <View style={{ height: bottom + 120 }} />
                    </View>
                </ScrollView>

                {/* Floating Bottom CTA */}
                <View style={[styles.stickyBar, { bottom: bottom > 0 ? bottom + 8 : 24 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Pressable
                            style={{ paddingVertical: 12, paddingRight: 16, opacity: loading ? 0.5 : 1 }}
                            onPress={() => safeGoBack(router, '/(buyer)/checkout/cart')}
                            disabled={loading}
                        >
                            <Text style={{ color: '#64748b', fontWeight: '800', fontSize: 13 }}>{t('checkout.common.back')}</Text>
                        </Pressable>
                        <Pressable
                            style={{ flex: 1, backgroundColor: GIFTYY_THEME.colors.primary, paddingVertical: 14, borderRadius: 999, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
                            onPress={onPay}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                             ) : (
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                                    Checkout
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
            <CheckoutProgressOverlay stage={stage} hasVideo={hasVideo} />
        </View>
    );
}

// Visual checklist shown while onPay is running. The active step has a spinner,
// completed steps have a checkmark, pending steps are dimmed. Steps that don't
// apply (e.g. video upload when there's no video) are hidden.
function CheckoutProgressOverlay({ stage, hasVideo }: { stage: null | 'processing_payment' | 'uploading_video' | 'creating_order' | 'finalizing'; hasVideo: boolean }) {
    const visible = stage !== null;
    const order: Array<'processing_payment' | 'uploading_video' | 'creating_order' | 'finalizing'> = hasVideo
        ? ['processing_payment', 'uploading_video', 'creating_order', 'finalizing']
        : ['processing_payment', 'creating_order', 'finalizing'];
    const currentIdx = stage ? order.indexOf(stage) : -1;
    const labels: Record<'processing_payment' | 'uploading_video' | 'creating_order' | 'finalizing', string> = {
        processing_payment: 'Processing payment',
        uploading_video: 'Uploading video message',
        creating_order: 'Creating your order',
        finalizing: 'Finalizing',
    };
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={progressStyles.backdrop}>
                <View style={progressStyles.card}>
                    <Text style={progressStyles.title}>Placing your order</Text>
                    <Text style={progressStyles.subtitle}>Please don't close the app.</Text>
                    <View style={progressStyles.steps}>
                        {order.map((step, idx) => {
                            const isDone = idx < currentIdx;
                            const isActive = idx === currentIdx;
                            return (
                                <View key={step} style={progressStyles.stepRow}>
                                    <View style={[progressStyles.indicator, isDone && progressStyles.indicatorDone]}>
                                        {isActive ? (
                                            <ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
                                        ) : isDone ? (
                                            <Text style={progressStyles.check}>✓</Text>
                                        ) : null}
                                    </View>
                                    <Text style={[
                                        progressStyles.stepLabel,
                                        isActive && progressStyles.stepLabelActive,
                                        !isActive && !isDone && progressStyles.stepLabelPending,
                                    ]}>
                                        {labels[step]}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const progressStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: '#64748b',
    },
    steps: {
        marginTop: 20,
        gap: 14,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicator: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    indicatorDone: {
        borderColor: GIFTYY_THEME.colors.primary,
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    check: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        flexShrink: 1,
    },
    stepLabelActive: {
        color: GIFTYY_THEME.colors.primary,
    },
    stepLabelPending: {
        color: '#94a3b8',
        fontWeight: '600',
    },
});

type InputProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    style?: any;
} & React.ComponentProps<typeof TextInput>;

function InputField({ label, style, ...props }: InputProps) {
    return (
        <View style={[styles.inputGroup, style]}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                {...props}
                style={styles.input}
                placeholderTextColor="rgba(148,163,184,0.7)"
                selectionColor={GIFTYY_THEME.colors.primary}
            />
        </View>
    );
}

function SummaryRow({ label, value, emphasize, valueStyle }: { label: string; value: string; emphasize?: boolean; valueStyle?: object }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, emphasize && { fontSize: GIFTYY_THEME.typography.sizes.md }]}>{label}</Text>
            <Text style={[styles.summaryValue, emphasize && { color: GIFTYY_THEME.colors.primary, fontSize: GIFTYY_THEME.typography.sizes.lg }, valueStyle]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: GIFTYY_THEME.spacing.xl,
        paddingBottom: 140,
        gap: GIFTYY_THEME.spacing.lg,
        backgroundColor: GIFTYY_THEME.colors.background,
    },
    columns: {
        flexDirection: 'column',
        gap: GIFTYY_THEME.spacing.lg,
    },
    formCard: {
        backgroundColor: GIFTYY_THEME.colors.white,
        borderRadius: GIFTYY_THEME.radius.xl,
        padding: GIFTYY_THEME.spacing.xl,
        gap: GIFTYY_THEME.spacing.md,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        ...GIFTYY_THEME.shadows.sm,
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: GIFTYY_THEME.spacing.sm,
        alignSelf: 'flex-start',
        paddingHorizontal: GIFTYY_THEME.spacing.md,
        paddingVertical: 6,
        borderRadius: GIFTYY_THEME.radius.full,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    secureText: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        letterSpacing: 0.4,
    },
    finePrint: {
        color: GIFTYY_THEME.colors.gray500,
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        lineHeight: 18,
    },
    summaryCard: {
        backgroundColor: GIFTYY_THEME.colors.white,
        borderRadius: GIFTYY_THEME.radius.xl,
        padding: GIFTYY_THEME.spacing.xl,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        gap: GIFTYY_THEME.spacing.md,
        ...GIFTYY_THEME.shadows.sm,
    },
    summaryTitle: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        fontSize: GIFTYY_THEME.typography.sizes.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryRowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        color: GIFTYY_THEME.colors.gray600,
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
    },
    summaryValue: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
    },
    divider: {
        height: 1,
        backgroundColor: GIFTYY_THEME.colors.gray200,
        marginVertical: GIFTYY_THEME.spacing.sm,
    },
    supportBox: {
        marginTop: GIFTYY_THEME.spacing.md,
        padding: GIFTYY_THEME.spacing.md,
        borderRadius: GIFTYY_THEME.radius.lg,
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        gap: GIFTYY_THEME.spacing.xs,
    },
    supportTitle: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        fontSize: GIFTYY_THEME.typography.sizes.base,
    },
    supportText: {
        color: GIFTYY_THEME.colors.gray500,
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        lineHeight: 18,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
    },
    input: {
        borderRadius: GIFTYY_THEME.radius.lg,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        backgroundColor: GIFTYY_THEME.colors.white,
        paddingHorizontal: GIFTYY_THEME.spacing.md,
        paddingVertical: Platform.OS === 'ios' ? GIFTYY_THEME.spacing.md : GIFTYY_THEME.spacing.sm,
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        fontSize: GIFTYY_THEME.typography.sizes.md,
    },
    cardField: {
        width: '100%',
        height: 54, // Match typical input height
        borderRadius: GIFTYY_THEME.radius.lg,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        backgroundColor: GIFTYY_THEME.colors.white,
    },
    stickyBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
    },
});

