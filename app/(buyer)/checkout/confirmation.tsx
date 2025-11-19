import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StepBar from '@/components/StepBar';
import { useCheckout } from '@/lib/CheckoutContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BrandButton from '@/components/BrandButton';
import { MessageVideoViewer, type MemoryVideoItem } from '@/app/(buyer)/(tabs)/memory';
import { useOrders } from '@/contexts/OrdersContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';

export default function ConfirmationScreen() {
    const { recipient, cardType, videoUri, videoTitle, reset } = useCheckout();
    const router = useRouter();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const { getOrderById } = useOrders();
    const { videoMessages } = useVideoMessages();

    const fadeIn = useRef(new Animated.Value(0)).current;
    const pop = useRef(new Animated.Value(0.92)).current;

    const [videoVisible, setVideoVisible] = useState(false);
    const [showOrderDetails, setShowOrderDetails] = useState(false);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]).start();
    }, [fadeIn, pop]);

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
        };
    }, [orderVideoMessage]);
    
    const hasVideo = Boolean(orderVideoMessage);
    
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
        router.replace('/(buyer)/checkout/design');
    };

    const handleViewOrders = () => {
        reset();
        router.replace('/(buyer)/(tabs)/profile?tab=Orders');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <StepBar current={6} total={6} label="Confirmation" />
            <ScrollView contentContainerStyle={styles.content}>
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
                    <SummaryRow label="Estimated arrival" value={order?.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : '2 – 5 business days'} />
                </View>

                {hasVideo && (
                    <Pressable style={styles.tertiaryButton} onPress={() => setVideoVisible(true)}>
                        <Text style={styles.tertiaryLabel}>Watch recorded message</Text>
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

                <View style={styles.helpBox}>
                    <Text style={styles.helpTitle}>Need anything else?</Text>
                    <Text style={styles.helpBody}>Our gifting experts can make edits or answer questions at <Text style={{ fontWeight: '700' }}>support@giftyy.com</Text>.</Text>
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
        padding: 20,
        paddingBottom: 32,
        gap: 20,
    },
    heroCard: {
        borderRadius: 24,
        padding: 20,
        gap: 10,
        shadowColor: '#F97316',
        shadowOpacity: 0.08,
        shadowRadius: 20,
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
        fontSize: 28,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0F172A',
    },
    subtitle: {
        color: '#475569',
        fontSize: 15,
        lineHeight: 22,
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    summaryHeading: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
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
        fontWeight: '700',
    },
    actions: {
        gap: 12,
    },
    secondaryButton: {
        paddingVertical: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#CBD5F5',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    secondaryLabel: {
        fontWeight: '800',
        color: '#1D4ED8',
    },
    ordersButton: {
        paddingVertical: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    ordersLabel: {
        fontWeight: '800',
        color: '#0F172A',
    },
    tertiaryButton: {
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    tertiaryLabel: {
        color: '#0369A1',
        fontWeight: '800',
    },
    orderDetailsCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    orderHeaderLabel: {
        fontWeight: '800',
        color: '#0F172A',
    },
    orderHeaderChevron: {
        fontSize: 20,
        fontWeight: '800',
        color: '#2563EB',
    },
    orderBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 10,
    },
    orderBodyLabel: {
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        fontSize: 12,
        letterSpacing: 0.6,
    },
    orderBodyValue: {
        color: '#0F172A',
        fontWeight: '600',
        lineHeight: 20,
    },
    orderDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 6,
    },
    helpBox: {
        backgroundColor: '#EEF2FF',
        borderRadius: 16,
        padding: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    helpTitle: {
        color: '#1D4ED8',
        fontWeight: '800',
        fontSize: 14,
    },
    helpBody: {
        color: '#475569',
        lineHeight: 20,
        fontSize: 13,
    },
});


