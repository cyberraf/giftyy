import { MemoryVideoItem, MessageVideoViewer } from '../(tabs)/memory';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useOrders } from '@/contexts/OrdersContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const palette = {
  background: '#fff',
  card: '#FFFFFF',
  border: '#E6DED6',
  textPrimary: '#2F2318',
  textSecondary: '#766A61',
  accent: '#FCEEE7',
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getOrderById, loading } = useOrders();
  const { videoMessages } = useVideoMessages();
  const [viewerVisible, setViewerVisible] = useState(false);

  const order = id ? getOrderById(id) : null;
  const orderCode = order?.orderCode || (id ?? 'GIF-0000000').toUpperCase();

  // Find video message associated with this order
  const orderVideoMessage = order 
    ? videoMessages.find((vm) => vm.orderId === order.id)
    : null;

  // Create MemoryVideoItem from order video
  const videoItem: MemoryVideoItem | null = useMemo(() => {
    if (!orderVideoMessage) return null;
    
    const duration = orderVideoMessage.durationSeconds 
      ? `${Math.floor(orderVideoMessage.durationSeconds / 60)}:${String(orderVideoMessage.durationSeconds % 60).padStart(2, '0')}`
      : '00:00';
    
    return {
      id: orderVideoMessage.id,
      title: orderVideoMessage.title,
      duration,
      date: new Date(orderVideoMessage.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      videoUrl: orderVideoMessage.videoUrl,
      direction: orderVideoMessage.direction,
      orderId: orderVideoMessage.orderId, // Include orderId for QR code generation
    };
  }, [orderVideoMessage]);

  const handleOpenVideo = useCallback(() => {
    if (videoItem) {
      setViewerVisible(true);
    }
  }, [videoItem]);

  const handleCloseVideo = useCallback(() => {
    setViewerVisible(false);
  }, []);

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'processing': return 'Processing';
      case 'confirmed': return 'Confirmed';
      case 'shipped': return 'Shipped';
      case 'out_for_delivery': return 'Out for delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Processing';
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Order details', headerStyle: { backgroundColor: palette.background }, headerShadowVisible: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Order details', headerStyle: { backgroundColor: palette.background }, headerShadowVisible: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: palette.textSecondary, textAlign: 'center' }}>Order not found</Text>
        </View>
      </View>
    );
  }

  const shippingAddress = useMemo(() => {
    const rec = order.recipient;
    const line1 = rec.street || '—';
    const line2 = rec.apartment ? `${rec.apartment}, ` : '';
    const cityState = [rec.city, rec.state].filter(Boolean).join(', ');
    const countryZip = [rec.country, rec.zip].filter(Boolean).join(' ');
    return `${line1}\n${line2}${cityState}\n${countryZip}`.trim();
  }, [order.recipient]);

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const deliveryInfo = order.deliveredAt 
    ? `Delivered ${new Date(order.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : order.estimatedDeliveryDate
    ? `Arriving ${new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : order.status === 'out_for_delivery'
    ? 'Arriving soon'
    : 'Placed ' + orderDate;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Order details', headerStyle: { backgroundColor: palette.background }, headerShadowVisible: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.orderCode}>Order #{orderCode}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusLabel}>{getStatusDisplay(order.status)}</Text>
          </View>
          <Text style={styles.orderMeta}>{deliveryInfo}</Text>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
          {order.cardType && (
            <View style={styles.lineItem}>
              <View>
                <Text style={styles.itemName}>{order.cardType} Card</Text>
                <Text style={styles.itemMeta}>Card style</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(order.cardPrice)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.itemsSubtotal + order.cardPrice)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.shippingCost)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.taxAmount)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={[styles.summaryLabel, { fontFamily: BRAND_FONT }]}>Total charged</Text>
            <Text style={[styles.summaryValue, { fontFamily: BRAND_FONT }]}>{formatCurrency(order.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.sectionTitle}>Shipping details</Text>
          <Text style={styles.detailLabel}>Recipient</Text>
          <Text style={styles.detailValue}>{`${order.recipient.firstName} ${order.recipient.lastName || ''}`.trim()}</Text>
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={styles.detailValue}>{shippingAddress}</Text>
          {(order.recipient.email || order.recipient.phone) && (
            <>
              <Text style={styles.detailLabel}>Contact</Text>
              <Text style={styles.detailValue}>
                {[order.recipient.email, order.recipient.phone].filter(Boolean).join(' • ')}
              </Text>
            </>
          )}
        </View>

        {orderVideoMessage && (
          <View style={styles.groupCard}>
            <Text style={styles.sectionTitle}>Video message</Text>
            <Text style={styles.detailValue}>Recorded for "{orderVideoMessage.title}"</Text>
            <Pressable style={styles.secondaryButton} onPress={handleOpenVideo}>
              <Text style={styles.secondaryLabel}>View recording</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryLabel}>Contact support</Text>
        </Pressable>
      </ScrollView>

      {videoItem && (
        <MessageVideoViewer
          visible={viewerVisible}
          initialIndex={0}
          data={[videoItem]}
          onClose={handleCloseVideo}
        />
      )}
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
    gap: 18,
  },
  headerCard: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  orderCode: {
    fontFamily: BRAND_FONT,
    fontSize: 24,
    color: palette.textPrimary,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  statusLabel: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },
  orderMeta: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  groupCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: BRAND_FONT,
    color: palette.textPrimary,
    fontSize: 18,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230,222,214,0.55)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  itemName: {
    fontWeight: '700',
    color: palette.textPrimary,
  },
  itemMeta: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  itemPrice: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  detailLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    color: palette.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND_COLOR,
    backgroundColor: palette.accent,
  },
  secondaryLabel: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: BRAND_COLOR,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
