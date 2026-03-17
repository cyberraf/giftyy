import { RecipientFormModal } from '@/components/recipients/RecipientFormModal';
import StepBar from '@/components/StepBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import PremiumNotice from '@/components/ui/PremiumNotice';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAlert } from '@/contexts/AlertContext';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { useCheckout } from '@/lib/CheckoutContext';
import { calculateVendorShippingByZone } from '@/lib/shipping-utils';
import { supabase } from '@/lib/supabase';
import { parsePrice } from '@/lib/utils/currency';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function RecipientScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { recipient, setRecipient, notifyRecipient, setNotifyRecipient, cardPrice } = useCheckout();
    const { items } = useCart();
    const { recipients, refreshRecipients } = useRecipients();
    const { alert } = useAlert();
    const { refreshProducts, refreshCollections } = useProducts();
    const { bottom } = useSafeAreaInsets();
    const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
    const [countryModalOpen, setCountryModalOpen] = useState(false);
    const [stateModalOpen, setStateModalOpen] = useState(false);
    const [vendorNames, setVendorNames] = useState<Map<string, string>>(new Map());
    const [refreshing, setRefreshing] = useState(false);
    const [shippingBreakdown, setShippingBreakdown] = useState<{
        total: number;
        hasShippingError: boolean;
        breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number; doesNotShip?: boolean }>
    }>({ total: 0, hasShippingError: false, breakdown: [] });
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
    const [addRecipientVisible, setAddRecipientVisible] = useState(false);

    const selectedRecipient = useMemo(() => {
        return recipients.find(r => r.id === selectedRecipientId);
    }, [recipients, selectedRecipientId]);

    const isFreshRecipient = useMemo(() => {
        return !selectedRecipient;
    }, [selectedRecipient]);

    useEffect(() => {
        // Ensure the toggle is on by default for new recipient flows.
        if (isFreshRecipient && !notifyRecipient) {
            setNotifyRecipient(true);
        }
    }, [isFreshRecipient, notifyRecipient, setNotifyRecipient]);

    const openAddRecipient = useCallback(() => {
        setAddRecipientVisible(true);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshProducts(), refreshCollections(), refreshRecipients()]);
            // Re-fetch vendor names after refresh
            const vendorIds = Array.from(new Set(items.map(item => item.vendorId).filter(Boolean) as string[]));
            if (vendorIds.length > 0) {
                console.log('[RecipientScreen] Refreshing vendor names for IDs:', vendorIds);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, store_name, role')
                    .in('id', vendorIds);
                if (error) {
                    console.error('[RecipientScreen] Error refreshing vendor names:', error);
                } else {
                    console.log('[RecipientScreen] Refreshed raw vendor data:', data);
                    const namesMap = new Map<string, string>();
                    data?.forEach((vendor: any) => {
                        if (vendor.id) {
                            // Use store_name if available and not empty, otherwise use a fallback
                                    const storeName = vendor.store_name?.trim();
                                    if (storeName) {
                                        namesMap.set(vendor.id, storeName);
                                    } else {
                                        // Still add to map with fallback so we know the vendor exists
                                        namesMap.set(vendor.id, t('app.vendor_fallback', { id: vendor.id.slice(0, 8) }));
                                    }
                        }
                    });
                    console.log('[RecipientScreen] Refreshed vendor names map:', Array.from(namesMap.entries()));
                    setVendorNames(namesMap);
                }
            }
        } catch (error) {
            console.error('Error refreshing recipient data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshProducts, refreshCollections, refreshRecipients, items]);


    const subtotal = useMemo(
        () => items.reduce((s, it) => s + parsePrice(it.price) * it.quantity, 0),
        [items]
    );

    // Fetch vendor store names
    useEffect(() => {
        const fetchVendorNames = async () => {
            const vendorIds = Array.from(new Set(items.map(item => item.vendorId).filter(Boolean) as string[]));
            if (vendorIds.length === 0) {
                setVendorNames(new Map());
                return;
            }

            console.log('[RecipientScreen] Fetching vendor names for IDs:', vendorIds);

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, store_name, role')
                    .in('id', vendorIds);

                if (error) {
                    console.error('[RecipientScreen] Error fetching vendor names:', error);
                    return;
                }

                console.log('[RecipientScreen] Raw vendor data from database:', data);

                const namesMap = new Map<string, string>();
                data?.forEach((vendor: any) => {
                    if (vendor.id) {
                        // Use store_name if available and not empty, otherwise use a fallback
                        const storeName = vendor.store_name?.trim();
                        if (storeName) {
                            namesMap.set(vendor.id, storeName);
                        } else {
                            // Still add to map with fallback so we know the vendor exists
                            namesMap.set(vendor.id, t('app.vendor_fallback', { id: vendor.id.slice(0, 8) }));
                        }
                    }
                });
                console.log('[RecipientScreen] Fetched vendor names map:', Array.from(namesMap.entries()));
                setVendorNames(namesMap);
            } catch (err) {
                console.error('[RecipientScreen] Error fetching vendor names:', err);
            }
        };

        fetchVendorNames();
    }, [items]);

    function getTaxRateFromState(code: string): number {
        const state = (code || '').toUpperCase();
        switch (state) {
            case 'CA': return 0.085;
            case 'NY': return 0.088;
            case 'TX': return 0.0825;
            case 'FL': return 0.07;
            case 'WA': return 0.092;
            default: return 0.08;
        }
    }

    // Calculate shipping based on zones when recipient location is available
    useEffect(() => {
        const calculateShipping = async () => {
            const stateCode = selectedRecipient?.state;
            const country = selectedRecipient?.country;

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

                const breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number; doesNotShip?: boolean }> = [];
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
                        doesNotShip: false
                    });
                });

                setShippingBreakdown({ breakdown, total: totalShipping, hasShippingError: false });
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
                console.error('[RecipientScreen] Error calculating shipping:', error);
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

                const breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number; doesNotShip?: boolean }> = [];
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
                        doesNotShip: false
                    });
                });

                setShippingBreakdown({ breakdown, total: totalShipping, hasShippingError: false });
            } finally {
                setIsCalculatingShipping(false);
            }
        };

        calculateShipping();
    }, [items, selectedRecipient, vendorNames]);

    const shipping = shippingBreakdown.total;
    const taxRate = useMemo(() => getTaxRateFromState(selectedRecipient?.state || ''), [selectedRecipient]);
    const cardAddOn = cardPrice || 0;
    const taxable = Math.max(0, subtotal + cardAddOn);

    const taxBreakdown = useMemo(() => {
        const itemsTax = subtotal * taxRate;
        const cardTax = cardAddOn * taxRate;
        return {
            items: itemsTax,
            card: cardTax,
            total: itemsTax + cardTax,
        };
    }, [subtotal, cardAddOn, taxRate]);

    const estimatedTax = taxBreakdown.total;
    const orderTotal = taxable + estimatedTax + shipping;

    const handleSelectRecipient = (recipientFromList: typeof recipients[0]) => {
        setSelectedRecipientId(recipientFromList.id);
    };

    const handleClearSelection = () => {
        setSelectedRecipientId(null);
    };

    const onNext = () => {
        if (!selectedRecipient) {
            alert(t('checkout.recipient.alerts.missing_info'), t('checkout.recipient.alerts.select_recipient'));
            return;
        }

        if (shippingBreakdown.hasShippingError) {
            alert(t('checkout.recipient.alerts.shipping_error'), t('checkout.recipient.alerts.shipping_error_message'));
            return;
        }

        // Notify recipient is always set to true based on user request
        setNotifyRecipient(true);

        setRecipient({
            firstName: selectedRecipient.firstName,
            lastName: selectedRecipient.lastName || '',
            street: selectedRecipient.address,
            apartment: selectedRecipient.apartment || '',
            city: selectedRecipient.city,
            state: selectedRecipient.state || '',
            country: selectedRecipient.country || 'United States',
            zip: selectedRecipient.zip,
            phone: selectedRecipient.phone || '',
            email: selectedRecipient.email || ''
        });
        router.push('/(buyer)/checkout/video');
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <StepBar current={2} total={7} label={t('checkout.recipient.step_label')} />
            <View style={{ flex: 1 }}>
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 + bottom + BOTTOM_BAR_TOTAL_SPACE }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={GIFTYY_THEME.colors.primary}
                            colors={[GIFTYY_THEME.colors.primary]}
                        />
                    }
                >
                    <View style={{ padding: 16, gap: 12 }}>
                        {/* Saved Recipients Section */}
                        {recipients.length > 0 ? (
                            <View style={styles.savedRecipientsSection}>
                                <View style={styles.savedRecipientsHeader}>
                                    <Text style={styles.sectionTitle}>{t('checkout.recipient.select_saved')}</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientsScroll}>
                                    {recipients.map((rec) => {
                                        const isSelected = selectedRecipientId === rec.id;
                                        return (
                                            <Pressable
                                                key={rec.id}
                                                style={[styles.recipientCard, isSelected && styles.recipientCardSelected]}
                                                onPress={() => handleSelectRecipient(rec)}
                                            >
                                                <View style={styles.recipientCardHeader}>
                                                    <View style={[styles.recipientCheckbox, isSelected && styles.recipientCheckboxSelected]}>
                                                        {isSelected && <IconSymbol name="checkmark" size={14} color="#FFFFFF" />}
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.recipientName} numberOfLines={1}>
                                                            {rec.firstName} {rec.lastName || ''}
                                                        </Text>
                                                        <Text style={styles.recipientRelationship} numberOfLines={1}>
                                                            {rec.relationship}
                                                        </Text>
                                                    </View>
                                                </View>
                                                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' }}>
                                                    <IconSymbol name="lock.fill" size={12} color="#6B7280" />
                                                    <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '600' }}>{t('checkout.recipient.address_hidden')}</Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                                 {selectedRecipientId && (
                                    <Pressable onPress={handleClearSelection} style={styles.clearSelectionButton}>
                                        <Text style={styles.clearSelectionText}>{t('checkout.recipient.clear_selection')}</Text>
                                    </Pressable>
                                )}
                             </View>
                        ) : (
                            <View style={styles.summaryCard}>
                                <Text style={styles.muted}>{t('checkout.recipient.no_saved')}</Text>
                            </View>
                        )}

                         {/* Removed manual address and notify configuration fields */}

                        <View style={styles.summaryCard}>
                            <Text style={{ fontWeight: '900', fontSize: 16 }}>{t('checkout.recipient.estimated_totals')}</Text>
                            <View style={styles.rowBetween}>
                                <Text style={styles.muted}>{t('checkout.recipient.items_subtotal')}</Text>
                                <Text style={styles.bold}>${subtotal.toFixed(2)}</Text>
                            </View>
                             {cardAddOn > 0 && (
                                <View style={styles.rowBetween}>
                                    <Text style={styles.muted}>{t('checkout.recipient.card_price')}</Text>
                                    <Text style={styles.bold}>${cardAddOn.toFixed(2)}</Text>
                                </View>
                            )}


                             {/* Detailed Shipping Breakdown */}
                            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                                <View style={[styles.rowBetween, { marginBottom: 6 }]}>
                                    <Text style={{ fontWeight: '800', fontSize: 14, color: '#374151' }}>{t('checkout.recipient.shipping_breakdown')}</Text>
                                    {isCalculatingShipping && (
                                        <Text style={{ fontSize: 12, color: '#6b7280' }}>{t('checkout.recipient.shipping_calculating')}</Text>
                                    )}
                                </View>
                                {shippingBreakdown.breakdown.map((vendor, idx) => {
                                    return (
                                        <View key={vendor.vendorId || idx}>
                                             <View style={[styles.rowBetween, { marginTop: 4 }]}>
                                                <Text style={[styles.muted, { fontSize: 13 }]}>
                                                    {vendor.vendorName} ({vendor.itemCount} {t('app.items', { count: vendor.itemCount })})
                                                </Text>
                                                <Text style={[styles.bold, { fontSize: 13, color: vendor.doesNotShip ? '#ef4444' : '#111827' }]}>
                                                    {vendor.doesNotShip ? t('checkout.recipient.shipping_not_supported') : (vendor.shipping === 0 ? t('checkout.common.free') : `$${vendor.shipping.toFixed(2)}`)}
                                                </Text>
                                            </View>
                                             {vendor.doesNotShip && (
                                                <PremiumNotice
                                                    message={t('checkout.recipient.alerts.vendor_not_ship', { location: selectedRecipient?.state || t('checkout.recipient.this_location') })}
                                                    type="error"
                                                    style={{ marginTop: 6 }}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                                 <View style={[styles.rowBetween, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                                    <Text style={styles.muted}>{t('checkout.recipient.total_shipping')}</Text>
                                    <Text style={styles.bold}>{shippingBreakdown.total === 0 ? t('checkout.common.free') : `$${shippingBreakdown.total.toFixed(2)}`}</Text>
                                </View>
                            </View>

                             {/* Detailed Tax Breakdown */}
                            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                                <Text style={{ fontWeight: '800', fontSize: 14, marginBottom: 6, color: '#374151' }}>
                                    {t('checkout.recipient.tax_breakdown', { percent: (taxRate * 100).toFixed(1) })}
                                </Text>
                                 <View style={[styles.rowBetween, { marginTop: 4 }]}>
                                    <Text style={[styles.muted, { fontSize: 13 }]}>{t('checkout.recipient.tax_items')}</Text>
                                    <Text style={[styles.bold, { fontSize: 13 }]}>${taxBreakdown.items.toFixed(2)}</Text>
                                </View>
                                 {cardAddOn > 0 && (
                                    <View style={[styles.rowBetween, { marginTop: 4 }]}>
                                        <Text style={[styles.muted, { fontSize: 13 }]}>{t('checkout.recipient.tax_card')}</Text>
                                        <Text style={[styles.bold, { fontSize: 13 }]}>${taxBreakdown.card.toFixed(2)}</Text>
                                    </View>
                                )}

                                 <View style={[styles.rowBetween, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                                    <Text style={styles.muted}>{t('checkout.recipient.total_tax')}</Text>
                                    <Text style={styles.bold}>${estimatedTax.toFixed(2)}</Text>
                                </View>
                            </View>

                             <View style={[styles.rowBetween, { marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#E5E7EB' }]}>
                                <Text style={{ fontWeight: '900' }}>{t('checkout.recipient.order_total')}</Text>
                                <Text style={{ fontWeight: '900', fontSize: 18 }}>${orderTotal.toFixed(2)}</Text>
                            </View>
                            <Text style={{ color: '#9ba1a6', marginTop: 4, fontSize: 12 }}>{t('checkout.recipient.disclaimer')}</Text>
                        </View>

                        <View style={{ height: bottom + 120 }} />
                    </View>
                </ScrollView>

                <View style={[styles.stickyBar, { bottom: bottom > 0 ? bottom + 8 : 24 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Pressable
                            style={{ paddingVertical: 12, paddingRight: 16 }}
                            onPress={() => router.back()}
                        >
                            <Text style={{ color: '#64748b', fontWeight: '800', fontSize: 13 }}>{t('checkout.common.back')}</Text>
                        </Pressable>
                        <Pressable
                            onPress={onNext}
                            disabled={!selectedRecipient || isCalculatingShipping || shippingBreakdown.hasShippingError}
                            style={{
                                flex: 1,
                                backgroundColor: (!selectedRecipient || isCalculatingShipping || shippingBreakdown.hasShippingError) ? '#cbd5e1' : GIFTYY_THEME.colors.primary,
                                paddingVertical: 14,
                                borderRadius: 999,
                                alignItems: 'center',
                                opacity: (!selectedRecipient || isCalculatingShipping || shippingBreakdown.hasShippingError) ? 0.8 : 1
                            }}
                        >
                             <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>
                                {isCalculatingShipping
                                    ? t('checkout.recipient.btn_verifying')
                                    : shippingBreakdown.hasShippingError
                                        ? t('checkout.recipient.btn_unavailable')
                                        : !selectedRecipient
                                            ? t('checkout.recipient.btn_select')
                                            : t('checkout.recipient.btn_next')}
                            </Text>
                        </Pressable>
                    </View>
                </View>

            </View>

            <RecipientFormModal
                visible={addRecipientVisible}
                mode="add"
                editingRecipient={null}
                onClose={() => setAddRecipientVisible(false)}
                onSaved={refreshRecipients}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    summaryCard: { marginTop: 6, backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderRadius: 14, padding: 12, gap: 6 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    muted: { color: '#6b7280', fontWeight: '700' },
    bold: { fontWeight: '800' },
    infoCard: { backgroundColor: '#FFF7F3', borderWidth: 1, borderColor: '#FFE8DC', borderRadius: 12, padding: 10 },
    infoIconCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE8DC', alignItems: 'center', justifyContent: 'center' },
    infoTitle: { fontWeight: '900', marginBottom: 2, color: '#111827' },
    infoText: { color: '#6b7280', lineHeight: 18 },
    savedRecipientsSection: { gap: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111', marginBottom: 4 },
    savedRecipientsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    savedRecipientsAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: '#FFF7F3',
        borderWidth: 1,
        borderColor: '#FFE8DC',
    },
    savedRecipientsAddText: { color: GIFTYY_THEME.colors.primary, fontWeight: '800' },
    recipientsScroll: { gap: 12, paddingRight: 16 },
    recipientCard: {
        width: 280,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        gap: 8,
    },
    recipientCardSelected: {
        borderColor: GIFTYY_THEME.colors.primary,
        backgroundColor: GIFTYY_THEME.colors.cream,
    },
    recipientCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    recipientCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    recipientCheckboxSelected: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        borderColor: GIFTYY_THEME.colors.primary,
    },
    recipientName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111',
    },
    recipientRelationship: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '600',
    },
    recipientAddress: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
        marginTop: 4,
    },
    recipientLocation: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    clearSelectionButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    clearSelectionText: {
        color: GIFTYY_THEME.colors.primary,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        fontSize: GIFTYY_THEME.typography.sizes.base,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 8,
    },
    addRecipientCTACard: {
        backgroundColor: '#FFF7F3',
        borderWidth: 1,
        borderColor: '#FFE8DC',
        borderRadius: 14,
        padding: 16,
        gap: 12,
    },
    addRecipientCTAHeader: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    addRecipientCTAIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFE8DC',
    },
    addRecipientCTATitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#111',
        marginBottom: 4,
    },
    addRecipientCTASubtitle: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    addRecipientCTAButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GIFTYY_THEME.colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 6,
    },
    addRecipientCTAButtonText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 15,
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


