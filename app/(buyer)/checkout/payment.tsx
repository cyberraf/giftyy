import BrandButton from '@/components/BrandButton';
import StepBar from '@/components/StepBar';
import { EstimatedTotalsCard } from '@/components/checkout/EstimatedTotalsCard';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useProducts } from '@/contexts/ProductsContext';
import { supabase } from '@/lib/supabase';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useCheckout } from '@/lib/CheckoutContext';
import { calculateVendorShippingSync, calculateVendorShippingByZone } from '@/lib/shipping-utils';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function PaymentScreen() {
    const router = useRouter();
    const { items, clear: clearCart } = useCart();
    const { payment, setPayment, cardType, cardPrice, recipient, notifyRecipient, localVideoUri, videoTitle, videoDurationMs, setVideoUri, sharedMemoryId, reset: resetCheckout } = useCheckout();
    const { createOrder, refreshOrders } = useOrders();
    const { addVideoMessage } = useVideoMessages();
    const { refreshProducts, refreshCollections } = useProducts();
    const [vendorNames, setVendorNames] = useState<Map<string, string>>(new Map());

    const [name, setName] = useState(payment.name);
    const [cardNumber, setCardNumber] = useState(payment.cardNumber);
    const [expiry, setExpiry] = useState(payment.expiry);
    const [cvv, setCvv] = useState(payment.cvv);
    const [loading, setLoading] = useState(false);
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
                if (item.vendorId) {
                    const existingName = item.vendorName || item.storeName;
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

    const parsePrice = (value?: string) => {
        if (!value) return 0;
        const cleaned = value.replace(/[^0-9.]/g, '');
        const amount = parseFloat(cleaned);
        return Number.isNaN(amount) ? 0 : amount;
    };

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
                        const price = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
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
                        const price = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
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

    const handleCardNumber = (value: string) => {
        const digitsOnly = value.replace(/\D+/g, '').slice(0, 16);
        const spaced = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
        setCardNumber(spaced);
    };

    const handleExpiry = (value: string) => {
        const digits = value.replace(/\D+/g, '').slice(0, 4);
        if (digits.length <= 2) {
            setExpiry(digits);
        } else {
            setExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
        }
    };

    const handleCvv = (value: string) => {
        setCvv(value.replace(/\D+/g, '').slice(0, 4));
    };

    const onPay = async () => {
        setPayment({ name, cardNumber, expiry, cvv });
        setLoading(true);

        try {
            // Extract last 4 digits of card number
            const last4 = cardNumber.replace(/\s/g, '').slice(-4);
            
            // Upload video if localVideoUri exists (video was recorded but not yet uploaded)
            let videoMessageId: string | undefined;
            if (localVideoUri && videoTitle) {
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
            const primaryVendorId = vendorIds.length === 1 ? vendorIds[0] : null;

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
                undefined, // paymentBrand - can be detected from card number if needed
                videoMessageId,
                sharedMemoryId,
                primaryVendorId // Pass primary vendor ID if all items are from one vendor
            );

            if (error || !order) {
                console.error('Error creating order:', error);
                Alert.alert('Payment failed', 'We could not place your order. Please try again.');
                return;
            }

            // Clear cart and reset checkout context after successful order creation
            clearCart();
            resetCheckout();

            // Navigate to confirmation with order ID
            router.push({
                pathname: '/(buyer)/checkout/confirmation',
                params: { orderId: order.id },
            });
        } catch (err) {
            console.error('Unexpected error during payment:', err);
            // Still navigate to confirmation
            router.push('/(buyer)/checkout/confirmation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <StepBar current={6} total={7} label="Payment" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

                        <View style={styles.formCard}>
                            <View style={styles.secureBadge}>
                                <Text style={{ fontSize: GIFTYY_THEME.typography.sizes.sm }}>🔒</Text>
                                <Text style={styles.secureText}>SSL secured • PCI compliant</Text>
                            </View>
                            <InputField
                                label="Name on card"
                                placeholder="Taylor Jenkins"
                                value={name}
                                onChangeText={setName}
                                autoComplete="name"
                                returnKeyType="next"
                            />
                            <InputField
                                label="Card number"
                                placeholder="1234 5678 9012 3456"
                                keyboardType="number-pad"
                                value={cardNumber}
                                onChangeText={handleCardNumber}
                            />
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <InputField
                                    style={{ flex: 1 }}
                                    label="Expiry"
                                    placeholder="MM/YY"
                                    keyboardType="number-pad"
                                    value={expiry}
                                    onChangeText={handleExpiry}
                                />
                                <InputField
                                    style={{ flex: 1 }}
                                    label="CVV"
                                    placeholder="123"
                                    keyboardType="number-pad"
                                    secureTextEntry
                                    value={cvv}
                                    onChangeText={handleCvv}
                                />
                            </View>

                            <BrandButton
                                title={loading ? 'Processing...' : `Pay ${formatCurrency(total)}`}
                                onPress={onPay}
                                disabled={loading}
                                style={{ marginTop: GIFTYY_THEME.spacing.md }}
                            />
                            {loading && <ActivityIndicator style={{ marginTop: GIFTYY_THEME.spacing.md }} color={GIFTYY_THEME.colors.primary} />}
                            <Pressable 
                                style={{ marginTop: GIFTYY_THEME.spacing.md, alignSelf: 'center', paddingVertical: GIFTYY_THEME.spacing.md, paddingHorizontal: GIFTYY_THEME.spacing.xl }}
                                onPress={() => router.back()}
                            >
                                <Text style={{ color: GIFTYY_THEME.colors.gray500, fontWeight: GIFTYY_THEME.typography.weights.bold, fontSize: GIFTYY_THEME.typography.sizes.base }}>Back to memory</Text>
                            </Pressable>
                            <Text style={styles.finePrint}>By tapping pay you authorize Giftyy to charge this card for the total shown. You'll receive an email confirmation immediately.</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

type InputProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    style?: object;
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
});

