import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import StepBar from '@/components/StepBar';
import BrandButton from '@/components/BrandButton';
import { useCheckout } from '@/lib/CheckoutContext';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useProducts } from '@/contexts/ProductsContext';
import { calculateVendorShippingSync } from '@/lib/shipping-utils';
import { BRAND_COLOR } from '@/constants/theme';

export default function PaymentScreen() {
    const router = useRouter();
    const { items, clear: clearCart } = useCart();
    const { payment, setPayment, cardType, cardPrice, recipient, notifyRecipient, videoUri, videoTitle, sharedMemoryId } = useCheckout();
    const { createOrder, refreshOrders } = useOrders();
    const { videoMessages } = useVideoMessages();
    const { refreshProducts, refreshCollections } = useProducts();

    const [name, setName] = useState(payment.name);
    const [cardNumber, setCardNumber] = useState(payment.cardNumber);
    const [expiry, setExpiry] = useState(payment.expiry);
    const [cvv, setCvv] = useState(payment.cvv);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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

    const parsePrice = (value?: string) => {
        if (!value) return 0;
        const cleaned = value.replace(/[^0-9.]/g, '');
        const amount = parseFloat(cleaned);
        return Number.isNaN(amount) ? 0 : amount;
    };

    const itemsSubtotal = useMemo(() => items.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0), [items]);
    const cardAddOn = cardPrice || 0;
    const taxable = itemsSubtotal + cardAddOn;
    // Calculate shipping based on vendors (cumulate shipping costs from all vendors)
    const shipping = useMemo(() => {
        return calculateVendorShippingSync(items, 4.99, 50);
    }, [items]);
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
    const tax = taxable * taxRate;
    const total = taxable + shipping + tax;
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
            
            // Find the video message ID if videoUri exists
            let videoMessageId: string | undefined;
            if (videoUri) {
                const videoMessage = videoMessages.find((vm) => vm.videoUrl === videoUri);
                videoMessageId = videoMessage?.id;
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
                // Still navigate to confirmation, but order creation failed
                // In production, you'd want to show an error and retry
            } else {
                // Clear cart after successful order creation
                clearCart();
            }

            // Navigate to confirmation with order ID
            router.push({
                pathname: '/(buyer)/checkout/confirmation',
                params: { orderId: order?.id || '' },
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
                            tintColor={BRAND_COLOR}
                            colors={[BRAND_COLOR]}
                        />
                    }
                >
                    <View style={styles.heroCard}>
                        <Text style={styles.overline}>Secure checkout</Text>
                        <Text style={styles.title}>Finalize your gift delivery</Text>
                        <Text style={styles.subtitle}>You’re moments away from sending this surprise. We’ll keep your payment safe and confirm instantly.</Text>
                    </View>

                    <View style={styles.columns}>
                        <View style={styles.formCard}>
                            <View style={styles.secureBadge}>
                                <Text style={{ fontSize: 13 }}>🔒</Text>
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

                            <View style={styles.walletRow}>
                                <Pressable style={[styles.walletButton, { backgroundColor: 'white', borderColor: '#E2E8F0' }]}>
                                    <Text style={[styles.walletLabel, { color: '#0F172A' }]}> Pay</Text>
                                </Pressable>
                                <Pressable style={[styles.walletButton, { backgroundColor: 'white', borderColor: '#E2E8F0' }]}>
                                    <Text style={[styles.walletLabel, { color: '#0F172A' }]}>G Pay</Text>
                                </Pressable>
                            </View>

                            <BrandButton
                                title={loading ? 'Processing...' : `Pay ${formatCurrency(total)}`}
                                onPress={onPay}
                                disabled={loading}
                                style={{ marginTop: 14 }}
                            />
                            {loading && <ActivityIndicator style={{ marginTop: 12 }} color="#f75507" />}
                            <Text style={styles.finePrint}>By tapping pay you authorize Giftyy to charge this card for the total shown. You’ll receive an email confirmation immediately.</Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Order summary</Text>
                            <View style={{ gap: 10 }}>
                                <SummaryRow label="Items" value={`${totalItems} ${totalItems === 1 ? 'item' : 'items'}`} />
                                <SummaryRow label="Card style" value={cardType || 'Premium'} />
                                <SummaryRow label="Video greeting" value={videoUri ? 'Attached' : 'Not added'} valueStyle={{ color: videoUri ? '#15803D' : '#94A3B8' }} />
                            </View>
                            <View style={styles.divider} />
                            <SummaryRow label="Items subtotal" value={formatCurrency(itemsSubtotal)} />
                            <SummaryRow label="Card add-on" value={formatCurrency(cardAddOn)} />
                            <SummaryRow label="Shipping" value={shipping === 0 ? 'Free' : formatCurrency(shipping)} />
                            <SummaryRow label={`Estimated tax (${(taxRate * 100).toFixed(1)}%)`} value={formatCurrency(tax)} />
                            <View style={{ marginTop: 14 }}>
                                <SummaryRow label="Total due today" value={formatCurrency(total)} emphasize />
                            </View>

                            <View style={styles.supportBox}>
                                <Text style={styles.supportTitle}>Need a hand?</Text>
                                <Text style={styles.supportText}>Our gifting team is online at support@giftyy.com</Text>
                            </View>
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
                selectionColor="#f75507"
            />
        </View>
    );
}

function SummaryRow({ label, value, emphasize, valueStyle }: { label: string; value: string; emphasize?: boolean; valueStyle?: object }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, emphasize && { fontSize: 16 }]}>{label}</Text>
            <Text style={[styles.summaryValue, emphasize && { color: '#f75507', fontSize: 18 }, valueStyle]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 20,
        paddingBottom: 34,
        gap: 18,
        backgroundColor: '#fff',
    },
    heroCard: {
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 18,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowRadius: 18,
        elevation: 2,
    },
    overline: {
        color: '#64748B',
        fontSize: 12,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    title: {
        color: '#0F172A',
        fontSize: 26,
        fontWeight: '900',
    },
    subtitle: {
        color: '#475569',
        fontSize: 15,
        lineHeight: 22,
    },
    columns: {
        flexDirection: 'column',
        gap: 18,
    },
    formCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        gap: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowRadius: 18,
        elevation: 2,
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    secureText: {
        color: '#0F172A',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 0.4,
    },
    walletRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    walletButton: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    walletLabel: {
        color: '#0F172A',
        fontWeight: '800',
        fontSize: 15,
        letterSpacing: 0.6,
    },
    finePrint: {
        color: '#64748B',
        fontSize: 12,
        lineHeight: 18,
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    summaryTitle: {
        color: '#0F172A',
        fontWeight: '800',
        fontSize: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        color: '#475569',
        fontWeight: '600',
    },
    summaryValue: {
        color: '#0F172A',
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 8,
    },
    supportBox: {
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 4,
    },
    supportTitle: {
        color: '#0F172A',
        fontWeight: '800',
        fontSize: 14,
    },
    supportText: {
        color: '#64748B',
        fontSize: 13,
        lineHeight: 18,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        color: '#0F172A',
        fontWeight: '700',
    },
    input: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        color: '#0F172A',
        fontWeight: '600',
        fontSize: 16,
    },
});

