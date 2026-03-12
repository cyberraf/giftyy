import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useOrders } from '@/contexts/OrdersContext';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrdersScreen() {
    const { top } = useSafeAreaInsets();
    const router = useRouter();
    const { orders, loading, refreshOrders } = useOrders();
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshOrders();
        setRefreshing(false);
    }, [refreshOrders]);

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'processing': return 'Processing';
            case 'confirmed': return 'Confirmed';
            case 'shipped': return 'Shipped';
            case 'out_for_delivery': return 'Out for delivery';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    const getEtaDisplay = (order: any) => {
        if (order.deliveredAt) {
            return `Delivered ${new Date(order.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (order.estimatedDeliveryDate) {
            return `Arrives ${new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (order.status === 'out_for_delivery') {
            return 'Arrives soon';
        }
        if (order.status === 'shipped') {
            return 'In transit';
        }
        if (order.status === 'processing' || order.status === 'confirmed') {
            return 'Label created';
        }
        return 'Processing';
    };

    return (
        <View style={[styles.screen, { paddingTop: top + 64 }]}>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_COLOR} />
                }
            >
                <Text style={styles.pageTitle}>Your Orders</Text>

                {loading && !refreshing && orders.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={BRAND_COLOR} />
                        <Text style={styles.loadingText}>Loading orders...</Text>
                    </View>
                ) : orders.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <View style={styles.emptyIcon}>
                            <IconSymbol name="bag" size={40} color="#94a3b8" />
                        </View>
                        <Text style={styles.emptyTitle}>No orders yet</Text>
                        <Text style={styles.emptySubtitle}>Start shopping to see your orders here!</Text>
                        <Pressable style={styles.primaryButton} onPress={() => router.push('/(buyer)/(tabs)/shop')}>
                            <Text style={styles.primaryButtonLabel}>Start Shopping</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {orders.map((order) => (
                            <OrderRow
                                key={order.id}
                                code={order.orderCode}
                                status={getStatusDisplay(order.status)}
                                eta={getEtaDisplay(order)}
                                href={`/(buyer)/orders/${order.id}`}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function OrderRow({ code, status, eta, href }: { code: string; status: string; eta: string; href: any }) {
    return (
        <Link href={href} asChild>
            <Pressable style={styles.orderRow}>
                <View>
                    <Text style={styles.orderCode}>#{code}</Text>
                    <Text style={styles.orderEta}>{eta}</Text>
                </View>
                <Text style={styles.orderStatus}>{status}</Text>
            </Pressable>
        </Link>
    );
}

const palette = {
    background: GIFTYY_THEME.colors.background,
    card: '#FFFFFF',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(0,0,0,0.02)',
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
        marginBottom: 24,
        marginTop: 8,
    },
    content: {
        padding: 20,
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 12,
    },
    loadingText: {
        color: palette.textSecondary,
        fontSize: 15,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: palette.textPrimary,
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 15,
        color: palette.textSecondary,
        textAlign: 'center',
        maxWidth: 260,
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 999,
    },
    primaryButtonLabel: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    list: {
        gap: 12,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        ...GIFTYY_THEME.shadows.md,
    },
    orderCode: {
        fontWeight: '800',
        color: palette.textPrimary,
        fontSize: 16,
        marginBottom: 4,
    },
    orderEta: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    orderStatus: {
        color: '#2F855A',
        fontWeight: '700',
        fontSize: 14,
    },
});
