import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useOrders } from '@/contexts/OrdersContext';
import { useSharedMemories } from '@/contexts/SharedMemoriesContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { useCheckout } from '@/lib/CheckoutContext';
import { trackFunnel } from '@/lib/analytics';
import { MessageVideoViewer } from '@/app/(buyer)/(tabs)/memory';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

type MemoryVideoItem = {
    id: string;
    title: string;
    duration: string;
    date: string;
    videoUrl: string;
    direction: 'sent' | 'received';
    mediaType?: 'video' | 'photo';
    orderId?: string;
};

export default function ConfirmationScreen() {
    const { t } = useTranslation();
    const { bottom, top } = useSafeAreaInsets();
    const { recipient, cardType, videoUri, videoTitle, reset } = useCheckout();
    const router = useRouter();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const { getOrderById, refreshOrders } = useOrders();
    const { videoMessages, refreshVideoMessages } = useVideoMessages();
    const { sharedMemories, refreshSharedMemories } = useSharedMemories();

    const fadeIn = useRef(new Animated.Value(0)).current;
    const pop = useRef(new Animated.Value(0.92)).current;

    // Track purchase funnel completion
    useEffect(() => {
        if (orderId) {
            trackFunnel('purchase_complete', { order_id: orderId });
        }
    }, [orderId]);

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

    // Prevent back navigation — intercept the Android physical back button and
    // redirect to Shop instead of letting the user pop back into the checkout flow.
    useEffect(() => {
        const backAction = () => {
            handleGoToShop();
            return true; // handled — don't pop the stack
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, []);

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
            direction: video.direction as 'sent' | 'received',
            mediaType: 'video' as const,
            orderId: video.orderId,
        };
    }, [orderVideoMessage]);

    const hasVideo = Boolean(orderVideoMessage);

    // Get shared memory associated with this order
    const orderSharedMemory = useMemo(() => {
        if (!order?.sharedMemoryId) return null;
        return sharedMemories.find((sm) => sm.id === order.sharedMemoryId);
    }, [order, sharedMemories]);

    // Convert shared memory to MemoryVideoItem format
    const sharedMemoryItem: MemoryVideoItem | null = useMemo(() => {
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
            direction: 'sent' as const,
            mediaType: orderSharedMemory.mediaType as 'video' | 'photo',
        };
    }, [orderSharedMemory]);

    const hasSharedMemory = Boolean(orderSharedMemory);



    const orderStatus = order?.status || 'processing';
    const statusDisplay = useMemo(() => {
        switch (orderStatus) {
            case 'processing': return t('checkout.confirmation.statuses.processing');
            case 'confirmed': return t('checkout.confirmation.statuses.confirmed');
            case 'shipped': return t('checkout.confirmation.statuses.shipped');
            case 'out_for_delivery': return t('checkout.confirmation.statuses.out_for_delivery');
            case 'delivered': return t('checkout.confirmation.statuses.delivered', { date: order?.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : '' });
            case 'cancelled': return t('checkout.confirmation.statuses.cancelled');
            default: return t('checkout.confirmation.statuses.processing');
        }
    }, [orderStatus, order, t]);

    const handleGoHome = () => {
        reset();
        router.replace('/(buyer)/(tabs)');
    };

    const handleGoToShop = () => {
        reset();
        router.replace('/(buyer)/(tabs)/shop');
    };

    const handleSendAnother = () => {
        reset();
        router.replace('/(buyer)/(tabs)/shop');
    };

    const handleViewOrders = () => {
        reset();
        if (orderId) {
            router.replace({ pathname: '/(buyer)/orders/[id]', params: { id: orderId } });
        } else {
            router.replace('/(buyer)/orders/index');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Stack.Screen
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                }}
            />
            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: top + 72 }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={GIFTYY_THEME.colors.primary}
                        colors={[GIFTYY_THEME.colors.primary]}
                    />
                }
            >
                <LinearGradient colors={['#FFF7F3', '#FFFFFF']} style={styles.heroCard}>
                    <Animated.View style={[styles.logoContainer, { opacity: fadeIn, transform: [{ scale: pop }] }]}>
                        <Image
                            source={require('@/assets/images/giftyy.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>
                    <Animated.Text style={[styles.title, { opacity: fadeIn, transform: [{ scale: pop }] }]}>{t('checkout.confirmation.hero_title')}</Animated.Text>
                    <Text style={styles.subtitle}>
                        {t('checkout.confirmation.hero_subtitle', { name: fullName })}
                    </Text>
                </LinearGradient>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <IconSymbol name="list.bullet.clipboard" size={20} color={GIFTYY_THEME.colors.primary} />
                        <Text style={styles.summaryHeading}>{t('checkout.confirmation.delivery_details')}</Text>
                    </View>
                    <SummaryRow label={t('checkout.confirmation.order_number')} value={`#${orderCode}`} icon="cart.fill" />
                    <SummaryRow label={t('checkout.confirmation.recipient')} value={fullName} icon="person.fill" />
                    <SummaryRow label={t('checkout.confirmation.card_style')} value={order?.cardType || cardType || 'Premium'} icon="creditcard.fill" />
                    <SummaryRow label={t('checkout.confirmation.video_message')} value={hasVideo ? t('checkout.confirmation.attached') : t('checkout.confirmation.not_added')} valueStyle={{ color: hasVideo ? '#16a34a' : '#64748B' }} icon="video.fill" />
                    <SummaryRow label={t('checkout.confirmation.shared_memory')} value={hasSharedMemory ? (orderSharedMemory?.mediaType === 'photo' ? t('checkout.confirmation.photo_attached') : t('checkout.confirmation.video_attached')) : t('checkout.confirmation.not_added')} valueStyle={{ color: hasSharedMemory ? '#16a34a' : '#64748B' }} icon="photo.fill" />
                    <SummaryRow label={t('checkout.confirmation.estimated_arrival')} value={order?.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : t('checkout.confirmation.est_days')} icon="shippingbox.fill" />
                </View>

                {hasVideo && (
                    <Pressable style={styles.tertiaryButton} onPress={() => setVideoVisible(true)}>
                        <Text style={styles.tertiaryLabel}>{t('checkout.confirmation.watch_message')}</Text>
                    </Pressable>
                )}

                {hasSharedMemory && sharedMemoryItem && (
                    <Pressable style={styles.tertiaryButton} onPress={() => setSharedMemoryVisible(true)}>
                        <Text style={styles.tertiaryLabel}>
                            {sharedMemoryItem.mediaType === 'photo' ? t('checkout.confirmation.view_photo') : t('checkout.confirmation.watch_memory')}
                        </Text>
                    </Pressable>
                )}

                <View style={styles.orderDetailsCard}>
                    <Pressable style={styles.orderHeader} onPress={() => setShowOrderDetails((prev) => !prev)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <IconSymbol name="info.circle.fill" size={18} color={GIFTYY_THEME.colors.primary} />
                            <Text style={styles.orderHeaderLabel}>{t('checkout.confirmation.view_details')}</Text>
                        </View>
                        <IconSymbol
                            name={showOrderDetails ? "minus" : "plus"}
                            size={16}
                            color={GIFTYY_THEME.colors.primary}
                        />
                    </Pressable>
                    {showOrderDetails && (
                        <View style={styles.orderBody}>


                            <Text style={styles.orderBodyLabel}>{t('checkout.confirmation.status')}</Text>
                            <View style={styles.statusBadge}>
                                <View style={[styles.statusDot, { backgroundColor: orderStatus === 'delivered' ? '#16a34a' : GIFTYY_THEME.colors.primary }]} />
                                <Text style={styles.statusText}>{statusDisplay}</Text>
                            </View>

                            {order?.trackingNumber && (
                                <>
                                    <View style={styles.orderDivider} />
                                    <Text style={styles.orderBodyLabel}>{t('checkout.confirmation.tracking_number')}</Text>
                                    <Text style={styles.orderBodyValue}>{order.trackingNumber}</Text>
                                </>
                            )}

                            <View style={styles.orderDivider} />

                            <View style={styles.rowBetween}>
                                <Text style={styles.orderBodyLabel}>{t('checkout.confirmation.order_total')}</Text>
                                <Text style={styles.orderBodyValue}>
                                    {order?.totalAmount !== undefined
                                        ? `$${Number(order.totalAmount).toFixed(2)}`
                                        : '—'}
                                </Text>
                            </View>

                            {order?.shippingCost !== undefined && (
                                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                                    <Text style={[styles.muted, { fontSize: 13 }]}>{t('checkout.confirmation.shipping')}</Text>
                                    <Text style={[styles.bold, { fontSize: 13 }]}>
                                        {Number(order.shippingCost) === 0 ? t('checkout.common.free') : `$${Number(order.shippingCost).toFixed(2)}`}
                                    </Text>
                                </View>
                            )}

                            {order?.taxAmount !== undefined && (
                                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                                    <Text style={[styles.muted, { fontSize: 13 }]}>{t('checkout.confirmation.tax')}</Text>
                                    <Text style={[styles.bold, { fontSize: 13 }]}>${Number(order.taxAmount).toFixed(2)}</Text>
                                </View>
                            )}

                            {order?.items && order.items.length > 0 && (
                                <>
                                    <View style={styles.orderDivider} />
                                    <Text style={styles.orderBodyLabel}>{t('checkout.confirmation.items')}</Text>
                                    {order.items.map((it, idx) => (
                                        <View key={it.id || idx} style={styles.orderItemRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.orderItemName}>{it.productName || `Item ${idx + 1}`}</Text>
                                                <Text style={styles.orderItemQty}>{t('checkout.confirmation.qty', { count: it.quantity ?? 1 })}</Text>
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
                    <Pressable style={styles.secondaryButton} onPress={handleSendAnother}>
                        <Text style={styles.secondaryLabel}>{t('checkout.confirmation.actions.send_another')}</Text>
                    </Pressable>
                    <Pressable style={styles.ordersButton} onPress={handleViewOrders}>
                        <Text style={styles.ordersLabel}>{t('checkout.confirmation.actions.view_orders')}</Text>
                    </Pressable>
                </View>
                <View style={{ height: bottom + 120 }} />
            </ScrollView>

            {/* Floating Bottom CTA */}
            <View style={[styles.stickyBar, { bottom: bottom > 0 ? bottom + 8 : 24 }]}>
                <Pressable
                    style={{ width: '100%', backgroundColor: GIFTYY_THEME.colors.primary, paddingVertical: 14, borderRadius: 999, alignItems: 'center' }}
                    onPress={handleGoHome}
                >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{t('checkout.confirmation.actions.return_home')}</Text>
                </Pressable>
            </View>

            {/* Fullscreen Video Message Viewer */}
            {videoItem && (
                <MessageVideoViewer
                    visible={videoVisible}
                    initialIndex={0}
                    data={[videoItem]}
                    onClose={() => setVideoVisible(false)}
                />
            )}

            {/* Fullscreen Shared Memory Viewer */}
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

function SummaryRow({ label, value, valueStyle, icon }: { label: string; value: string; valueStyle?: object; icon: any }) {
    return (
        <View style={styles.summaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.summaryIconContainer}>
                    <IconSymbol name={icon} size={14} color="#6B7280" />
                </View>
                <Text style={styles.summaryLabel}>{label}</Text>
            </View>
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
        borderRadius: 24,
        padding: 24,
        gap: 12,
        shadowColor: GIFTYY_THEME.colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 4,
    },
    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#FFE8DC',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    logo: {
        width: 40,
        height: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#111827',
        marginTop: 8,
    },
    subtitle: {
        color: '#4B5563',
        fontSize: 16,
        lineHeight: 24,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    summaryHeading: {
        fontSize: 15,
        fontWeight: '900',
        color: '#111827',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLabel: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 14,
    },
    summaryValue: {
        color: '#111827',
        fontWeight: '700',
        fontSize: 14,
    },
    actions: {
        gap: 12,
    },
    secondaryButton: {
        paddingVertical: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#FFE8DC',
        alignItems: 'center',
        backgroundColor: '#FFF7F3',
    },
    secondaryLabel: {
        fontWeight: '800',
        color: GIFTYY_THEME.colors.primary,
        fontSize: 15,
    },
    ordersButton: {
        paddingVertical: 16,
        borderRadius: 999,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    ordersLabel: {
        fontWeight: '800',
        color: '#4B5563',
        fontSize: 15,
    },
    tertiaryButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tertiaryLabel: {
        color: '#374151',
        fontWeight: '800',
        fontSize: 14,
    },
    orderDetailsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'hidden',
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
    },
    orderHeaderLabel: {
        fontWeight: '800',
        color: '#111827',
        fontSize: 15,
    },
    orderBody: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 16,
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        alignSelf: 'flex-start',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
    orderBodyLabel: {
        fontWeight: '900',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: 1,
    },
    orderBodyValue: {
        color: '#111827',
        fontWeight: '800',
        fontSize: 14,
    },
    orderItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    orderItemName: {
        color: '#111827',
        fontWeight: '700',
        fontSize: 14,
    },
    orderItemQty: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    orderItemPrice: {
        color: '#111827',
        fontWeight: '800',
        fontSize: 14,
        marginLeft: 12,
    },
    orderDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },
    muted: {
        color: '#6B7280',
        fontWeight: '600',
    },
    bold: {
        color: '#111827',
        fontWeight: '800',
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stickyBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
});


