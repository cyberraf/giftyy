import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable } from 'react-native';
import StepBar from '@/components/StepBar';
import { useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import BrandButton from '@/components/BrandButton';

function priceToNumber(p: string) { const n = parseFloat(p.replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }

export default function CheckoutCart() {
    const { items } = useCart();
    const subtotal = items.reduce((s, it) => s + priceToNumber(it.price) * it.quantity, 0);
    const router = useRouter();
    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <StepBar current={1} total={6} label="Cart" />
            <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 22, fontWeight: '900' }}>Subtotal ${subtotal.toFixed(2)}</Text>
                <FlatList
                    style={{ marginTop: 12 }}
                    data={items}
                    keyExtractor={(i) => i.id}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            {item.image ? (<Image source={{ uri: item.image }} style={styles.thumb} />) : (<View style={[styles.thumb, { backgroundColor: '#eee' }]} />)}
                            <View style={{ flex: 1 }}>
                                <Text numberOfLines={2} style={{ fontWeight: '800' }}>{item.name}</Text>
                                <Text style={{ marginTop: 4, fontWeight: '900' }}>{item.price}  × {item.quantity}</Text>
                            </View>
                        </View>
                    )}
                />
                <View style={{ height: 12 }} />
                <BrandButton title="Enter recipient details" onPress={() => router.push('/(buyer)/checkout/recipient')} />
                <Pressable style={{ marginTop: 10, alignSelf: 'center' }} onPress={() => router.back()}>
                    <Text style={{ color: '#2563eb', fontWeight: '700' }}>Back to cart</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 10, alignItems: 'center' },
    thumb: { width: 72, height: 72, borderRadius: 8 },
});


