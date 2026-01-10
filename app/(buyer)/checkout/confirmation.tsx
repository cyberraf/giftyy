import { MessageVideoViewer, type MemoryVideoItem } from '../(tabs)/memory';
import BrandButton from '@/components/BrandButton';
import StepBar from '@/components/StepBar';
import { useOrders } from '@/contexts/OrdersContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useSharedMemories } from '@/contexts/SharedMemoriesContext';
import { useCheckout } from '@/lib/CheckoutContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';

export default function ConfirmationScreen() {
    const { recipient, cardType, videoUri, videoTitle, reset } = useCheckout();
    const router = useRouter();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const { getOrderById, refreshOrders } = useOrders();
    const { videoMessages, refreshVideoMessages } = useVideoMessages();
    const { sharedMemories, refreshSharedMemories } = useSharedMemories();

    const fadeIn = useRef(new Animated.Value(0)).current;
    const pop = useRef(new Animated.Value(0.92)).current;

    const [videoVisible, setVideoVisible] = useState(false);
    const [sharedMemoryVisible, setSharedMemoryVisible] = useState(false);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshOrders(), refreshVideoMessages(), refreshSharedMemories()]);
        } catch (error) {
            console.error('Error refreshing confirmation data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshOrders, refreshVideoMessages, refreshSharedMemories]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]).start();
    }, [fadeIn, pop]);

    // Refresh orders when orderId is provided to ensure we have the latest data
    useEffect(() => {
        if (orderId) {
            refreshOrders();
        }
    }, [orderId, refreshOrders]);

    // Get order from database if orderId is provided
    const order = orderId ? getOrderById(orderId) : null;
    
    const fullName = order 
        ? `${order.recipient.firstName} ${order.recipient.lastName || ''}`.trim() || 'Your recipient'
        : `${recipient.firstName} ${recipient.lastName}`.trim() || 'Your recipient';
    
    const orderCode = order?.orderCode || useMemo(() => `GIF-${Date.now().toString(36).toUpperCase().slice(-6)}`, []);
    
    // Find video message associated with this order
    const orderVideoMessage = order 
        ? videoMessages.find((vm) => vm.orderId === order.id)
        : videoMessages.find((vm) => vm.videoUrl === videoUri);

    // Create MemoryVideoItem from order video or checkout video
    const videoItem: MemoryVideoItem | null = useMemo(() => {
        const video = orderVideoMessage;
        if (!video) return null;
        
        const duration = video.durationSeconds 
            ? `${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, '0')}`
            : '00:00';
        
        return {
            id: video.id,
            title: video.title,
            duration,
            date: new Date(video.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            videoUrl: video.videoUrl,
            direction: video.direction,
            orderId: video.orderId, // Include orderId for QR code generation
        };
    }, [orderVideoMessage]);
    
    const hasVideo = Boolean(orderVideoMessage);
    
    // Get shared memory associated with this order
    const orderSharedMemory = useMemo(() => {
        if (!order?.sharedMemoryId) return null;
        return sharedMemories.find((sm) => sm.id === order.sharedMemoryId);
    }, [order, sharedMemories]);
    
    // Convert shared memory to MemoryVideoItem format
    const sharedMemoryItem: (MemoryVideoItem & { mediaType: 'video' | 'photo' }) | null = useMemo(() => {
        if (!orderSharedMemory) return null;
        
        const date = new Date(orderSharedMemory.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        return {
            id: orderSharedMemory.id,
            title: orderSharedMemory.title,
            duration: orderSharedMemory.mediaType === 'video' ? '00:00' : '',
            date: formattedDate,
            videoUrl: orderSharedMemory.fileUrl,
            direction: 'sent',
            mediaType: orderSharedMemory.mediaType,
        };
    }, [orderSharedMemory]);
    
    const hasSharedMemory = Boolean(orderSharedMemory);
    
    const shippingAddress = useMemo(() => {
        const rec = order?.recipient || recipient;
        const line1 = rec.street || '—';
        const line2 = rec.apartment ? `${rec.apartment}, ` : '';
        const cityState = [rec.city, rec.state].filter(Boolean).join(', ');
        const countryZip = [rec.country, rec.zip].filter(Boolean).join(' ');
        return `${line1}\n${line2}${cityState}\n${countryZip}`.trim();
    }, [order, recipient]);
    
    const orderStatus = order?.status || 'processing';
    const statusDisplay = useMemo(() => {
        switch (orderStatus) {
            case 'processing': return 'Processing • Label created';
            case 'confirmed': return 'Confirmed • Preparing shipment';
            case 'shipped': return 'Shipped • In transit';
            case 'out_for_delivery': return 'Out for delivery • Arriving soon';
            case 'delivered': return `Delivered • ${order?.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : ''}`;
            case 'cancelled': return 'Cancelled';
            default: return 'Processing';
        }
    }, [orderStatus, order]);

    const handleGoHome = () => {
        reset();
        router.replace('/(buyer)/(tabs)/home');
    };

    const handleSendAnother = () => {
        reset();
        router.replace('/(buyer)/(tabs)/home');
    };

    const handleViewOrders = () => {
        reset();
        router.replace('/(buyer)/(tabs)/profile?tab=Orders');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <StepBar current={7} total={7} label="Confirmation" />
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
                <LinearGradient colors={[ '#FDF6EC', '#FFFFFF' ]} style={styles.heroCard}>
                    <Animated.View style={[styles.badge, { opacity: fadeIn, transform: [{ scale: pop }] }]}> 
                        <Text style={styles.badgeEmoji}>🎉</Text>
                    </Animated.View>
                    <Animated.Text style={[styles.title, { opacity: fadeIn, transform: [{ scale: pop }] }]}>Gift on its way!</Animated.Text>
                    <Text style={styles.subtitle}>
                        We’ve queued up the surprise for {fullName}. A confirmation email is flying to your inbox with tracking updates.
                    </Text>
                </LinearGradient>

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryHeading}>Delivery details</Text>
                    <SummaryRow label="Order" value={`#${orderCode}`} />
                    <SummaryRow label="Recipient" value={fullName} />
                    <SummaryRow label="Card style" value={order?.cardType || cardType || 'Premium'} />
                    <SummaryRow label="Video message" value={hasVideo ? 'Attached successfully' : 'Not added'} valueStyle={{ color: hasVideo ? '#16a34a' : '#64748B' }} />
                    <SummaryRow label="Shared memory" value={hasSharedMemory ? (orderSharedMemory?.mediaType === 'photo' ? 'Photo attached' : 'Video attached') : 'Not added'} valueStyle={{ color: hasSharedMemory ? '#16a34a' : '#64748B' }} />
                    <SummaryRow label="Estimated arrival" value={order?.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : '2 – 5 business days'} />
                </View>

                {hasVideo && (
                    <Pressable style={styles.tertiaryButton} onPress={() => setVideoVisible(true)}>
                        <Text style={styles.tertiaryLabel}>Watch recorded message</Text>
                    </Pressable>
                )}

                {hasSharedMemory && sharedMemoryItem && (
                    <Pressable style={styles.tertiaryButton} onPress={() => setSharedMemoryVisible(true)}>
                        <Text style={styles.tertiaryLabel}>
                            {sharedMemoryItem.mediaType === 'photo' ? 'View shared photo' : 'Watch shared memory'}
                        </Text>
                    </Pressable>
                )}

                <View style={styles.orderDetailsCard}>
                    <Pressable style={styles.orderHeader} onPress={() => setShowOrderDetails((prev) => !prev)}>
                        <Text style={styles.orderHeaderLabel}>View order details</Text>
                        <Text style={styles.orderHeaderChevron}>{showOrderDetails ? '–' : '+'}</Text>
                    </Pressable>
                    {showOrderDetails && (
                        <View style={styles.orderBody}>
                            <Text style={styles.orderBodyLabel}>Shipping address</Text>
                            <Text style={styles.orderBodyValue}>{shippingAddress || 'Not provided'}</Text>
                            <View style={styles.orderDivider} />

                            <Text style={styles.orderBodyLabel}>Status</Text>
                            <Text style={styles.orderBodyValue}>{statusDisplay}</Text>
                            {order?.trackingNumber && (
                                <>
                                    <View style={styles.orderDivider} />
                                    <Text style={styles.orderBodyLabel}>Tracking Number</Text>
                                    <Text style={styles.orderBodyValue}>{order.trackingNumber}</Text>
                                </>
                            )}

                            <View style={styles.orderDivider} />
                            <Text style={styles.orderBodyLabel}>Order total</Text>
                            <Text style={styles.orderBodyValue}>
                                {order?.totalAmount !== undefined
                                    ? `$${Number(order.totalAmount).toFixed(2)}`
                                    : '—'}
                            </Text>

                            {order?.shippingCost !== undefined && (
                                <>
                                    <View style={styles.orderDivider} />
                                    <Text style={styles.orderBodyLabel}>Shipping</Text>
                                    <Text style={styles.orderBodyValue}>
                                        {Number(order.shippingCost) === 0 ? 'Free' : `$${Number(order.shippingCost).toFixed(2)}`}
                                    </Text>
                                </>
                            )}

                            {order?.taxAmount !== undefined && (
                                <>
                                    <View style={styles.orderDivider} />
                                    <Text style={styles.orderBodyLabel}>Tax</Text>
                                    <Text style={styles.orderBodyValue}>${Number(order.taxAmount).toFixed(2)}</Text>
                                </>
                            )}

                            {order?.items && order.items.length > 0 && (
                                <>
                                    <View style={styles.orderDivider} />
                                    <Text style={styles.orderBodyLabel}>Items</Text>
                                    {order.items.map((it, idx) => (
                                        <View key={it.id || idx} style={styles.orderItemRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.orderItemName}>{it.productName || `Item ${idx + 1}`}</Text>
                                                <Text style={styles.orderItemQty}>Qty: {it.quantity ?? 1}</Text>
                                            </View>
                                            <Text style={styles.orderItemPrice}>
                                                {it.unitPrice !== undefined ? `$${Number(it.unitPrice).toFixed(2)}` : '—'}
                                            </Text>
                                        </View>
                                    ))}
                                </>
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.actions}>
                    <BrandButton title="Return to home" onPress={handleGoHome} />
                    <Pressable style={styles.secondaryButton} onPress={handleSendAnother}>
                        <Text style={styles.secondaryLabel}>Send another gift</Text>
                    </Pressable>
                    <Pressable style={styles.ordersButton} onPress={handleViewOrders}>
                        <Text style={styles.ordersLabel}>View my orders</Text>
                    </Pressable>
                </View>

            </ScrollView>

            {videoItem && (
                <MessageVideoViewer
                    visible={videoVisible}
                    initialIndex={0}
                    data={[videoItem]}
                    onClose={() => setVideoVisible(false)}
                />
            )}

            {sharedMemoryItem && (
                <MessageVideoViewer
                    visible={sharedMemoryVisible}
                    initialIndex={0}
                    data={[sharedMemoryItem]}
                    onClose={() => setSharedMemoryVisible(false)}
                />
            )}
        </View>
    );
}

function SummaryRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: object }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: GIFTYY_THEME.spacing.xl,
        paddingBottom: 140,
        gap: GIFTYY_THEME.spacing.xl,
    },
    heroCard: {
        borderRadius: GIFTYY_THEME.radius['2xl'],
        padding: GIFTYY_THEME.spacing.xl,
        gap: GIFTYY_THEME.spacing.sm,
        shadowColor: GIFTYY_THEME.colors.primaryLight,
        shadowOpacity: 0.08,
        shadowRadius: GIFTYY_THEME.spacing.xl,
        elevation: 3,
    },
    badge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    badgeEmoji: {
        fontSize: GIFTYY_THEME.typography.sizes['3xl'],
    },
    title: {
        fontSize: GIFTYY_THEME.typography.sizes['3xl'],
        fontWeight: GIFTYY_THEME.typography.weights.black,
        color: GIFTYY_THEME.colors.gray900,
    },
    subtitle: {
        color: GIFTYY_THEME.colors.gray600,
        fontSize: GIFTYY_THEME.typography.sizes.base,
        lineHeight: 22,
    },
    summaryCard: {
        backgroundColor: GIFTYY_THEME.colors.white,
        borderRadius: GIFTYY_THEME.radius.xl,
        padding: GIFTYY_THEME.spacing.lg,
        gap: GIFTYY_THEME.spacing.md,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        ...GIFTYY_THEME.shadows.sm,
    },
    summaryHeading: {
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        color: GIFTYY_THEME.colors.gray900,
    },
    summaryRow: {
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
        fontWeight: GIFTYY_THEME.typography.weights.bold,
    },
    actions: {
        gap: GIFTYY_THEME.spacing.md,
    },
    secondaryButton: {
        paddingVertical: GIFTYY_THEME.spacing.md,
        borderRadius: GIFTYY_THEME.radius.full,
        borderWidth: 1,
        borderColor: '#CBD5F5', // Keep as is - brand-specific color
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.white,
    },
    secondaryLabel: {
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        color: '#1D4ED8', // Keep as is - brand-specific color
    },
    ordersButton: {
        paddingVertical: GIFTYY_THEME.spacing.md,
        borderRadius: GIFTYY_THEME.radius.full,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    ordersLabel: {
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        color: GIFTYY_THEME.colors.gray900,
    },
    tertiaryButton: {
        paddingVertical: GIFTYY_THEME.spacing.md,
        borderRadius: GIFTYY_THEME.radius.lg,
        alignItems: 'center',
        backgroundColor: '#E0F2FE', // Keep as is - specific accent color
        borderWidth: 1,
        borderColor: '#BAE6FD', // Keep as is - specific accent color
    },
    tertiaryLabel: {
        color: '#0369A1', // Keep as is - brand-specific color
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
    },
    orderDetailsCard: {
        backgroundColor: GIFTYY_THEME.colors.white,
        borderRadius: GIFTYY_THEME.radius.md,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray200,
        overflow: 'hidden',
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: GIFTYY_THEME.spacing.md,
        paddingVertical: GIFTYY_THEME.spacing.md,
    },
    orderHeaderLabel: {
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        color: GIFTYY_THEME.colors.gray900,
    },
    orderHeaderChevron: {
        fontSize: GIFTYY_THEME.typography.sizes.xl,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        color: GIFTYY_THEME.colors.info,
    },
    orderBody: {
        paddingHorizontal: GIFTYY_THEME.spacing.md,
        paddingBottom: GIFTYY_THEME.spacing.md,
        gap: GIFTYY_THEME.spacing.sm,
    },
    orderBodyLabel: {
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        color: GIFTYY_THEME.colors.gray600,
        textTransform: 'uppercase',
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        letterSpacing: 0.6,
    },
    orderBodyValue: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.semibold,
        lineHeight: 20,
    },
    orderItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    orderItemName: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        fontSize: GIFTYY_THEME.typography.sizes.base,
    },
    orderItemVendor: {
        color: GIFTYY_THEME.colors.gray500,
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        marginTop: GIFTYY_THEME.spacing.xs / 2,
    },
    orderItemQty: {
        color: GIFTYY_THEME.colors.gray600,
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        marginTop: GIFTYY_THEME.spacing.xs / 2,
    },
    orderItemPrice: {
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        fontSize: GIFTYY_THEME.typography.sizes.base,
        marginLeft: GIFTYY_THEME.spacing.sm,
    },
    orderDivider: {
        height: 1,
        backgroundColor: GIFTYY_THEME.colors.gray200,
        marginVertical: 6,
    },
});


