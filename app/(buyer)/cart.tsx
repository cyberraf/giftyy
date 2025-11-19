import BrandButton from '@/components/BrandButton';
import { BRAND_COLOR } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

function parsePriceToNumber(price: string): number {
    const n = parseFloat(price.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
}

export default function CartScreen() {
    const { items, removeItem, updateQuantity, clear, totalQuantity } = useCart();
    const subtotal = items.reduce((sum, it) => sum + parsePriceToNumber(it.price) * it.quantity, 0);
    const { top, bottom } = useSafeAreaInsets();
    const paddingTop = top + 6;
    const stickyBarHeight = 84 + bottom;
    const router = useRouter();

    // Simple promo + tax calculation
    const [promoInput, setPromoInput] = useState('');
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const discount = useMemo(() => (appliedCode === 'GIFTS10' ? subtotal * 0.1 : 0), [appliedCode, subtotal]);
    const TAX_RATE = 0.08;
    const shipping = 0;
    const taxable = Math.max(0, subtotal - discount);
    const estimatedTax = taxable * TAX_RATE;
    const orderTotal = taxable + estimatedTax + shipping;

    return (
		<View style={[styles.container, { paddingTop }]}>
            {items.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <View style={styles.emptyIconCircle}>
                        <IconSymbol name="gift.fill" size={28} color={BRAND_COLOR} />
                    </View>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>Discover great gifts and add them to your cart.</Text>
                    <View style={{ width: '100%', marginTop: 6 }}>
                        <BrandButton title="Find gifts" onPress={() => router.push('/(buyer)/(tabs)/home')} />
                    </View>
                    <View style={styles.chipsRow}>
                        <Pressable onPress={() => router.push('/(buyer)/(tabs)/home')} style={styles.chip}><Text style={styles.chipText}>Birthday</Text></Pressable>
                        <Pressable onPress={() => router.push('/(buyer)/(tabs)/home')} style={styles.chip}><Text style={styles.chipText}>Anniversary</Text></Pressable>
                        <Pressable onPress={() => router.push('/(buyer)/(tabs)/home')} style={styles.chip}><Text style={styles.chipText}>Valentine's</Text></Pressable>
                    </View>
                </View>
            ) : (
                <>
                    <FlatList
                        data={items}
                        keyExtractor={(i) => i.id}
                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                        ListHeaderComponent={<View />}
                        contentContainerStyle={{ paddingVertical: 12, paddingBottom: stickyBarHeight + 12 }}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <Pressable
                                        onPress={() =>
                                            router.push({
                                                pathname: '/(buyer)/(tabs)/product/[id]',
                                                params: { id: item.id, name: item.name, price: item.price, image: item.image || '' },
                                            })
                                        }
                                        style={{ borderRadius: 10, overflow: 'hidden' }}
                                    >
                                        {item.image ? (
                                            <Image source={{ uri: item.image }} style={{ width: 96, height: 96, backgroundColor: '#eee' }} />
                                        ) : (
                                            <View style={{ width: 96, height: 96, backgroundColor: '#eee' }} />
                                        )}
                                    </Pressable>
                                    <View style={{ flex: 1 }}>
                                        <Text numberOfLines={2} style={{ fontWeight: '800' }}>{item.name}</Text>
                                        {item.selectedOptions && (
                                            <Text style={{ color: '#6b7280' }} numberOfLines={1}>{Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' • ')}</Text>
                                        )}
                                        <Text style={{ marginTop: 6, fontWeight: '900', color: '#16a34a' }}>{item.price}</Text>
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'center' }}>
                                            <View style={styles.qtyWrap}>
                                                <Pressable onPress={() => updateQuantity(item.id, item.quantity - 1)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>–</Text></Pressable>
                                                <Text style={styles.qtyValue}>{item.quantity}</Text>
                                                <Pressable onPress={() => updateQuantity(item.id, item.quantity + 1)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                                            </View>
                                            <Pressable onPress={() => removeItem(item.id)}><Text style={{ color: '#ef4444', fontWeight: '800' }}>Remove</Text></Pressable>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                        ListFooterComponent={
                            <View style={{ gap: 12 }}>
                                <View style={styles.summaryCard}>
                                    <Text style={{ fontWeight: '900', fontSize: 16 }}>Order summary</Text>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Items ({totalQuantity})</Text>
                                        <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                                    </View>
                                    {discount > 0 && (
                                        <View style={styles.summaryRow}>
                                            <Text style={[styles.summaryLabel, { color: '#059669' }]}>Discount (GIFTS10)</Text>
                                            <Text style={[styles.summaryValue, { color: '#059669' }]}>–${discount.toFixed(2)}</Text>
                                        </View>
                                    )}
                                    <View style={styles.promoRow}>
                                        <TextInput
                                            value={promoInput}
                                            onChangeText={setPromoInput}
                                            placeholder="Promo code"
                                            placeholderTextColor="#9ba1a6"
                                            style={styles.promoInput}
                                        />
                                        <Pressable
                                            onPress={() => setAppliedCode(promoInput.trim().toUpperCase() || null)}
                                            style={[styles.applyBtn, { backgroundColor: '#111827' }]}>
                                            <Text style={{ color: 'white', fontWeight: '800' }}>Apply</Text>
                                        </Pressable>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Shipping</Text>
                                        <Text style={styles.summaryValue}>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Estimated tax</Text>
                                        <Text style={styles.summaryValue}>${estimatedTax.toFixed(2)}</Text>
                                    </View>
                                    <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                        <Text style={{ fontWeight: '900' }}>Order total</Text>
                                        <Text style={{ fontWeight: '900', fontSize: 18 }}>${orderTotal.toFixed(2)}</Text>
                                    </View>
                                    <Text style={{ color: '#9ba1a6', marginTop: 4 }}>Tax is estimated. Final amount is calculated at checkout.</Text>
                                    <View style={{ height: 10 }} />
                                    <BrandButton
                                        title="Proceed to checkout"
                                        onPress={() => router.push('/(buyer)/checkout/design')}
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: '#6b7280' }}>{totalQuantity} item(s)</Text>
                                    <Pressable onPress={clear} style={styles.clearBtn}><Text style={{ color: 'white', fontWeight: '800' }}>Clear cart</Text></Pressable>
                                </View>
                            </View>
                        }
                    />
                    <View style={[styles.stickyBar, { paddingBottom: bottom + 12 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#6b7280', fontWeight: '700' }}>Order total</Text>
                            <Text style={{ fontSize: 20, fontWeight: '900' }}>${orderTotal.toFixed(2)}</Text>
                        </View>
                        <BrandButton
                            title={`Checkout (${totalQuantity})`}
                            onPress={() => router.push('/(buyer)/checkout/design')}
                            style={{ flex: 1 }}
                        />
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: '#F9FAFB',
	},
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF2EA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    emptySubtitle: {
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 24,
        marginBottom: 2,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 6,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    chipText: {
        fontWeight: '700',
        color: '#6b7280',
    },
	title: {
		fontSize: 20,
		fontWeight: '700',
	},
	subtitle: {
		marginTop: 6,
		color: '#666',
	},
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white' },
    removeBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
    clearBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
    subtotal: { fontSize: 22, fontWeight: '900' },
    freeRow: { backgroundColor: '#F0FFF4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DCFCE7', flexDirection: 'row', flexWrap: 'wrap' },
    checkoutBtn: { backgroundColor: BRAND_COLOR, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
    checkoutText: { fontWeight: '900', color: 'white' },
    card: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#eee', padding: 12 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ddd' },
    qtyWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#FACC15', borderRadius: 999, paddingHorizontal: 10, height: 36 },
    qtyBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    qtyBtnText: { fontSize: 16, fontWeight: '900' },
    qtyValue: { marginHorizontal: 8, width: 20, textAlign: 'center', fontWeight: '800' },
    actionPill: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
    actionPillText: { fontWeight: '700' },
    shareBtn: { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#eee', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
    stickyBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 0,
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 10,
        paddingHorizontal: 14,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#eee',
        padding: 12,
        gap: 6,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryLabel: { color: '#6b7280', fontWeight: '700' },
    summaryValue: { fontWeight: '800' },
    promoRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    promoInput: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        backgroundColor: 'white',
    },
    applyBtn: {
        height: 44,
        paddingHorizontal: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});


