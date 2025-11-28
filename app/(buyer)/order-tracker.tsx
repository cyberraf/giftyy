import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useOrders } from '@/contexts/OrdersContext';

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
    info: '#3B82F6',
};

type TrackingStatus = 'processing' | 'shipped' | 'in-transit' | 'out-for-delivery' | 'delivered' | 'cancelled';

type TrackingEvent = {
    id: string;
    status: TrackingStatus;
    title: string;
    description: string;
    timestamp: string;
    location?: string;
};

type Order = {
    id: string;
    code: string;
    status: TrackingStatus;
    recipient: string;
    items: string[];
    total: string;
    placedDate: string;
    estimatedDelivery: string;
    trackingNumber?: string;
    carrier?: string;
    events: TrackingEvent[];
};

function formatMoney(n: number | undefined | null): string {
    if (!n && n !== 0) return '$0.00';
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    } catch {
        return `$${n?.toFixed(2) ?? '0.00'}`;
    }
}

function mapOrderStatus(status: string): TrackingStatus {
    switch (status) {
        case 'processing':
        case 'confirmed':
            return 'processing';
        case 'shipped':
            return 'shipped';
        case 'out_for_delivery':
            return 'out-for-delivery';
        case 'delivered':
            return 'delivered';
        case 'cancelled':
            return 'cancelled';
        default:
            return 'processing';
    }
}

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bgColor: string }> = {
    processing: { label: 'Processing', color: palette.warning, bgColor: '#FEF3C7' },
    shipped: { label: 'Shipped', color: palette.info, bgColor: '#DBEAFE' },
    'in-transit': { label: 'In transit', color: palette.info, bgColor: '#DBEAFE' },
    'out-for-delivery': { label: 'Out for delivery', color: BRAND_COLOR, bgColor: palette.accentSoft },
    delivered: { label: 'Delivered', color: palette.success, bgColor: '#D1FAE5' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bgColor: '#FEE2E2' },
};

export default function OrderTrackerScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { orders, refreshOrders } = useOrders();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshOrders();
        } catch (error) {
            console.error('Error refreshing orders:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshOrders]);

    const mappedOrders: Order[] = useMemo(() => {
        return (orders || []).map((o) => ({
            id: o.id,
            code: o.orderCode,
            status: mapOrderStatus(o.status),
            recipient: [o.recipient.firstName, o.recipient.lastName].filter(Boolean).join(' '),
            items: o.items.map((i) => i.productName),
            total: formatMoney(o.totalAmount),
            placedDate: new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            estimatedDelivery: o.estimatedDeliveryDate
                ? new Date(o.estimatedDeliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : '',
            trackingNumber: o.trackingNumber,
            carrier: o.trackingNumber ? (o.paymentBrand ?? undefined) : undefined,
            events: [
                {
                    id: `e-${o.id}-placed`,
                    status: 'processing',
                    title: 'Order placed',
                    description: 'Your order has been received',
                    timestamp: new Date(o.createdAt).toLocaleString(),
                },
                ...(o.status === 'shipped' || o.status === 'out_for_delivery' || o.status === 'delivered'
                    ? [
                          {
                              id: `e-${o.id}-shipped`,
                              status: 'shipped' as TrackingStatus,
                              title: 'Order shipped',
                              description: 'Package has left our facility',
                              timestamp: new Date(o.updatedAt).toLocaleString(),
                          },
                      ]
                    : []),
                ...(o.status === 'out_for_delivery' || o.status === 'delivered'
                    ? [
                          {
                              id: `e-${o.id}-ofd`,
                              status: 'out-for-delivery' as TrackingStatus,
                              title: 'Out for delivery',
                              description: 'Your package is out for delivery',
                              timestamp: new Date(o.updatedAt).toLocaleString(),
                          },
                      ]
                    : []),
                ...(o.status === 'delivered'
                    ? [
                          {
                              id: `e-${o.id}-delivered`,
                              status: 'delivered' as TrackingStatus,
                              title: 'Delivered',
                              description: 'Package was delivered',
                              timestamp: new Date(o.deliveredAt || o.updatedAt).toLocaleString(),
                          },
                      ]
                    : []),
            ],
        }));
    }, [orders]);

    const filteredOrders = useMemo(() => {
        const source = mappedOrders;
        if (!searchQuery.trim()) return source;
        const query = searchQuery.toLowerCase();
        return source.filter(
            (order) =>
                order.code.toLowerCase().includes(query) ||
                order.recipient.toLowerCase().includes(query) ||
                (order.trackingNumber?.toLowerCase() || '').includes(query)
        );
    }, [searchQuery, mappedOrders]);

    const toggleOrder = (orderId: string) => {
        setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    };

    const getStatusConfig = (status: TrackingStatus) => STATUS_CONFIG[status];

    return (
        <View style={[styles.screen, { paddingTop: top + 8 }]}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20, flexGrow: 1 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={BRAND_COLOR}
                        colors={[BRAND_COLOR]}
                    />
                }
                scrollEnabled={true}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color={palette.textPrimary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Track Orders</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <IconSymbol name="magnifyingglass" size={20} color={palette.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by order code, recipient, or tracking number"
                        placeholderTextColor={palette.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <IconSymbol name="xmark.circle.fill" size={20} color={palette.textSecondary} />
                        </Pressable>
                    )}
                </View>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <IconSymbol name="doc.text.magnifyingglass" size={48} color={palette.textSecondary} />
                        <Text style={styles.emptyTitle}>No orders found</Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery ? 'Try a different search term' : 'You have no orders to track'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.ordersList}>
                        {filteredOrders.map((order) => {
                            const statusConfig = getStatusConfig(order.status);
                            const isExpanded = expandedOrderId === order.id;

                            return (
                                <View key={order.id} style={styles.orderCard}>
                                    {/* Order Header */}
                                    <Pressable onPress={() => toggleOrder(order.id)} style={styles.orderHeader}>
                                        <View style={styles.orderHeaderLeft}>
                                            <Text style={styles.orderCode}>{order.code}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                                                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                                    {statusConfig.label}
                                                </Text>
                                            </View>
                                        </View>
                                        <IconSymbol
                                            name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                            size={20}
                                            color={palette.textSecondary}
                                        />
                                    </Pressable>

                                    {/* Order Summary */}
                                    <View style={styles.orderSummary}>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Recipient</Text>
                                            <Text style={styles.summaryValue}>{order.recipient}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Placed</Text>
                                            <Text style={styles.summaryValue}>{order.placedDate}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Estimated delivery</Text>
                                            <Text style={[styles.summaryValue, { color: statusConfig.color }]}>
                                                {order.estimatedDelivery}
                                            </Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Total</Text>
                                            <Text style={[styles.summaryValue, { fontFamily: BRAND_FONT }]}>
                                                {order.total}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <View style={styles.expandedContent}>
                                            {/* Items */}
                                            <View style={styles.itemsSection}>
                                                <Text style={styles.sectionTitle}>Items</Text>
                                                {order.items.map((item, index) => (
                                                    <View key={index} style={styles.itemRow}>
                                                        <View style={styles.itemBullet} />
                                                        <Text style={styles.itemText}>{item}</Text>
                                                    </View>
                                                ))}
                                            </View>

                                            {/* Tracking Timeline */}
                                            <View style={styles.timelineSection}>
                                                <Text style={styles.sectionTitle}>Tracking timeline</Text>
                                                {order.trackingNumber && (
                                                    <View style={styles.trackingInfo}>
                                                        <Text style={styles.trackingLabel}>Tracking number</Text>
                                                        <View style={styles.trackingNumberRow}>
                                                            <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
                                                            <Pressable style={styles.copyButton}>
                                                                <IconSymbol name="doc.on.doc" size={16} color={BRAND_COLOR} />
                                                            </Pressable>
                                                        </View>
                                                        {order.carrier && (
                                                            <Text style={styles.carrierText}>Carrier: {order.carrier}</Text>
                                                        )}
                                                    </View>
                                                )}

                                                {/* Timeline */}
                                                <View style={styles.timeline}>
                                                    {order.events.map((event, index) => {
                                                        const isLast = index === order.events.length - 1;
                                                        const isActive = index === 0 || event.status === order.status;
                                                        const eventStatusConfig = getStatusConfig(event.status);

                                                        return (
                                                            <View key={event.id} style={styles.timelineItem}>
                                                                <View style={styles.timelineLeft}>
                                                                    <View
                                                                        style={[
                                                                            styles.timelineDot,
                                                                            {
                                                                                backgroundColor: isActive
                                                                                    ? eventStatusConfig.color
                                                                                    : palette.border,
                                                                                borderColor: isActive
                                                                                    ? eventStatusConfig.color
                                                                                    : palette.border,
                                                                            },
                                                                        ]}
                                                                    />
                                                                    {!isLast && (
                                                                        <View
                                                                            style={[
                                                                                styles.timelineLine,
                                                                                {
                                                                                    backgroundColor: isActive
                                                                                        ? eventStatusConfig.color
                                                                                        : palette.border,
                                                                                },
                                                                            ]}
                                                                        />
                                                                    )}
                                                                </View>
                                                                <View style={styles.timelineContent}>
                                                                    <Text
                                                                        style={[
                                                                            styles.timelineTitle,
                                                                            {
                                                                                color: isActive
                                                                                    ? palette.textPrimary
                                                                                    : palette.textSecondary,
                                                                                fontWeight: isActive ? '700' : '600',
                                                                            },
                                                                        ]}
                                                                    >
                                                                        {event.title}
                                                                    </Text>
                                                                    <Text style={styles.timelineDescription}>{event.description}</Text>
                                                                    <Text style={styles.timelineTimestamp}>{event.timestamp}</Text>
                                                                    {event.location && (
                                                                        <View style={styles.timelineLocation}>
                                                                            <IconSymbol
                                                                                name="location.fill"
                                                                                size={12}
                                                                                color={palette.textSecondary}
                                                                            />
                                                                            <Text style={styles.timelineLocationText}>{event.location}</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>

                                            {/* Actions */}
                                            <View style={styles.actionsSection}>
                                                <Pressable
                                                    style={styles.primaryButton}
                                                    onPress={() => router.push(`/(buyer)/orders/${order.id}`)}
                                                >
                                                    <Text style={styles.primaryButtonText}>View order details</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: palette.textPrimary,
        padding: 0,
    },
    clearButton: {
        padding: 4,
    },
    ordersList: {
        gap: 16,
    },
    orderCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    orderHeaderLeft: {
        flex: 1,
        gap: 10,
    },
    orderCode: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
    },
    orderSummary: {
        padding: 18,
        gap: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 14,
        color: palette.textSecondary,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 14,
        color: palette.textPrimary,
        fontWeight: '600',
    },
    expandedContent: {
        borderTopWidth: 1,
        borderTopColor: palette.border,
        padding: 18,
        gap: 24,
    },
    itemsSection: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
        marginBottom: 4,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    itemBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: palette.textSecondary,
    },
    itemText: {
        fontSize: 14,
        color: palette.textPrimary,
    },
    timelineSection: {
        gap: 16,
    },
    trackingInfo: {
        backgroundColor: palette.neutralSoft,
        borderRadius: 12,
        padding: 14,
        gap: 8,
    },
    trackingLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: palette.textSecondary,
    },
    trackingNumberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    trackingNumber: {
        fontSize: 15,
        fontFamily: 'monospace',
        fontWeight: '700',
        color: palette.textPrimary,
    },
    copyButton: {
        padding: 4,
    },
    carrierText: {
        fontSize: 12,
        color: palette.textSecondary,
    },
    timeline: {
        gap: 20,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 16,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 24,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
        minHeight: 40,
    },
    timelineContent: {
        flex: 1,
        gap: 4,
        paddingBottom: 4,
    },
    timelineTitle: {
        fontSize: 15,
    },
    timelineDescription: {
        fontSize: 13,
        color: palette.textSecondary,
    },
    timelineTimestamp: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 2,
    },
    timelineLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    timelineLocationText: {
        fontSize: 12,
        color: palette.textSecondary,
    },
    actionsSection: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: BRAND_COLOR,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: palette.card,
    },
    secondaryButtonText: {
        color: palette.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    emptySubtitle: {
        fontSize: 14,
        color: palette.textSecondary,
        textAlign: 'center',
    },
});
