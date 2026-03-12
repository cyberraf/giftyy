import BrandButton from '@/components/BrandButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAlert } from '@/contexts/AlertContext';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/contexts/ProductsContext';
import { parsePrice } from '@/lib/utils/currency';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
	FlatList,
	Image,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#f75507';
const PEACH = '#fff1ea';
const BLUSH = '#ffe8f1';
const SOFT = '#f9fafb';

const VIDEO_CARD_WIDTH = 80; // Small compact video cards


export default function CartScreen() {
	const { items, removeItem, updateQuantity, clear, totalQuantity } = useCart();
	const { refreshProducts, refreshCollections } = useProducts();
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const [refreshing, setRefreshing] = useState(false);

	const subtotal = useMemo(
		() => items.reduce((sum, it) => sum + parsePrice(it.price) * it.quantity, 0),
		[items]
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCollections()]);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCollections]);

	const deliveryFee = 0;
	const serviceFee = 0;
	const estimatedTax = 0;
	const total = subtotal + deliveryFee + serviceFee + estimatedTax;

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<View style={[styles.container, { paddingTop: top + 64 }]}>
				<Header />

				{items.length === 0 ? (
					<EmptyState onStart={() => router.push('/(buyer)/(tabs)/shop')} />
				) : (
					<>
						<FlatList
							data={items}
							keyExtractor={(item) => item.id}
							renderItem={({ item }) => (
								<CartItemCard
									item={item}
									onQtyChange={(q) => updateQuantity(item.id, q)}
									onRemove={() => removeItem(item.id)}
								/>
							)}
							ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
							contentContainerStyle={{ paddingBottom: bottom + 160, paddingTop: 12 }}
							refreshControl={
								<RefreshControl
									refreshing={refreshing}
									onRefresh={onRefresh}
									tintColor={PRIMARY}
									colors={[PRIMARY]}
								/>
							}
							ListFooterComponent={
								<View style={{ gap: 16, marginTop: 6 }}>
									<SummaryCard
										subtotal={subtotal}
										deliveryFee={deliveryFee}
										serviceFee={serviceFee}
										estimatedTax={estimatedTax}
										total={total}
										itemCount={totalQuantity}
										onCheckout={() => router.push('/(buyer)/checkout/recipient')}
									/>
									<ClearRow count={totalQuantity} onClear={clear} />
								</View>
							}
							ListEmptyComponent={<EmptyState onStart={() => router.push('/(buyer)/(tabs)/shop')} />}
						/>

						<CheckoutBar
							bottomInset={bottom}
							total={total}
							count={totalQuantity}
							onCheckout={() => router.push('/(buyer)/checkout/recipient')}
						/>
					</>
				)}
			</View>
		</GestureHandlerRootView>
	);
}

function Header() {
	return (
		<View style={styles.header}>
			<Text style={styles.headerTitle}>Your Cart</Text>
			<Text style={styles.headerSubtitle}>Make someone’s day unforgettable</Text>
		</View>
	);
}

function CartItemCard({
	item,
	onQtyChange,
	onRemove,
}: {
	item: any;
	onQtyChange: (qty: number) => void;
	onRemove: () => void;
}) {
	const { alert } = useAlert();
	const onQty = (delta: number) => {
		const newQty = item.quantity + delta;
		if (newQty <= 0) {
			alert(
				'Remove item',
				'Are you sure you want to remove this item from your cart?',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Remove', style: 'destructive', onPress: onRemove }
				]
			);
		} else {
			onQtyChange(newQty);
		}
	};

	return (
		<Animated.View entering={FadeInUp.duration(220)} layout={Layout.springify()} style={styles.card}>
			<View style={{ flexDirection: 'row', gap: 12 }}>
				<Pressable style={styles.imageWrap}>
					{item.image ? (
						<Image source={{ uri: item.image }} style={styles.image} />
					) : (
						<View style={[styles.image, { backgroundColor: SOFT }]} />
					)}
				</Pressable>
				<View style={{ flex: 1, gap: 6 }}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<Text numberOfLines={2} style={[styles.itemTitle, { flex: 1, paddingRight: 8 }]}>
							{item.name}
						</Text>
						<Pressable onPress={onRemove} hitSlop={10} style={{ padding: 4 }}>
							<IconSymbol name="trash" size={20} color="#94a3b8" />
						</Pressable>
					</View>

					{item.selectedOptions && (
						<Text style={styles.itemOptions} numberOfLines={1}>
							{Object.entries(item.selectedOptions)
								.map(([k, v]) => `${k}: ${v}`)
								.join(' • ')}
						</Text>
					)}
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
						<Text style={styles.itemPrice}>{item.price}</Text>
						<View style={styles.qtyWrap}>
							<Pressable onPress={() => onQty(-1)} style={styles.qtyBtn}>
								<Text style={styles.qtyBtnText}>−</Text>
							</Pressable>
							<Text style={styles.qtyValue}>{item.quantity}</Text>
							<Pressable onPress={() => onQty(1)} style={styles.qtyBtn}>
								<Text style={styles.qtyBtnText}>+</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</View>
		</Animated.View>
	);
}

function SummaryCard({
	subtotal,
	deliveryFee,
	serviceFee,
	estimatedTax,
	total,
	itemCount,
	onCheckout,
}: {
	subtotal: number;
	deliveryFee: number;
	serviceFee: number;
	estimatedTax: number;
	total: number;
	itemCount: number;
	onCheckout: () => void;
}) {
	return (
		<View style={styles.summaryCard}>
			<View style={styles.summaryRow}>
				<Text style={styles.summaryLabel}>Items ({itemCount})</Text>
				<Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
			</View>
			<View style={styles.summaryRow}>
				<Text style={styles.summaryLabel}>Estimated tax</Text>
				<Text style={styles.summaryValue}>${estimatedTax.toFixed(2)}</Text>
			</View>
			<View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 }} />
			<View style={styles.summaryRow}>
				<Text style={styles.summaryTotalLabel}>Total</Text>
				<Text style={styles.summaryTotal}>${total.toFixed(2)}</Text>
			</View>
		</View>
	);
}

function ClearRow({ count, onClear }: { count: number; onClear: () => void }) {
	return (
		<View style={styles.clearRow}>
			<Text style={styles.clearInfo}>{count} item(s) in your cart</Text>
			<Pressable onPress={onClear} hitSlop={10}>
				<Text style={styles.clearBtnText}>Clear cart</Text>
			</Pressable>
		</View>
	);
}

function CheckoutBar({
	bottomInset,
	total,
	count,
	onCheckout,
}: {
	bottomInset: number;
	total: number;
	count: number;
	onCheckout: () => void;
}) {
	return (
		<View style={[styles.stickyBar, { bottom: bottomInset > 0 ? bottomInset + 8 : 24 }]}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
				<View>
					<Text style={styles.stickyLabel}>SUBTOTAL</Text>
					<Text style={styles.stickyAmount}>${total.toFixed(2)}</Text>
				</View>
				<View style={{ flex: 1, marginLeft: 24 }}>
					<BrandButton title={`Checkout (${count})`} onPress={onCheckout} />
				</View>
			</View>
			<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
				<IconSymbol name="lock.fill" size={10} color="#94a3b8" />
				<Text style={styles.stickyHint}>Secure payment • Easy returns</Text>
			</View>
		</View>
	);
}

function EmptyState({ onStart }: { onStart: () => void }) {
	return (
		<View style={styles.emptyWrap}>
			<View style={styles.emptyIconCircle}>
				<IconSymbol name="gift.fill" size={28} color={PRIMARY} />
			</View>
			<Text style={styles.emptyTitle}>Your cart is empty… for now 😊</Text>
			<Text style={styles.emptySubtitle}>Add something thoughtful and make someone’s day.</Text>
			<View style={{ width: '100%', marginTop: 8 }}>
				<BrandButton title="Start gifting" onPress={onStart} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'transparent',
		paddingHorizontal: 16,
	},
	header: {
		paddingVertical: 10,
		gap: 2,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '900',
		color: '#0f172a',
	},
	headerSubtitle: {
		color: '#64748b',
		fontWeight: '600',
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#f1f5f9',
		shadowColor: '#000',
		shadowOpacity: 0.02,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	imageWrap: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	image: {
		width: 96,
		height: 96,
		backgroundColor: '#f1f5f9',
	},
	itemTitle: {
		fontWeight: '900',
		fontSize: 15,
		color: '#0f172a',
	},
	itemOptions: {
		color: '#6b7280',
		fontSize: 12,
	},
	itemPrice: {
		fontWeight: '900',
		fontSize: 16,
		color: '#0f172a',
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginTop: 6,
	},
	qtyWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	qtyBtn: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	qtyBtnText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#64748b',
	},
	qtyValue: {
		fontWeight: '800',
		color: '#0f172a',
		marginHorizontal: 12,
		fontSize: 13,
	},
	removeText: {
		color: '#ef4444',
		fontWeight: '800',
	},
	swipeDelete: {
		width: 90,
		backgroundColor: '#ef4444',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 16,
		marginVertical: 4,
	},
	swipeDeleteText: {
		color: '#fff',
		fontWeight: '800',
		fontSize: 12,
	},
	ctaCard: {
		backgroundColor: BLUSH,
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#ffd7e8',
	},
	ctaHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	ctaIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ffd7e8',
	},
	ctaTitle: {
		fontWeight: '900',
		fontSize: 15,
		color: '#0f172a',
	},
	ctaSubtitle: {
		color: '#475569',
		fontSize: 12,
		marginTop: 2,
	},
	videoAlbum: {
		paddingVertical: 4,
	},
	videoCard: {
		width: VIDEO_CARD_WIDTH,
	},
	videoThumbnail: {
		width: VIDEO_CARD_WIDTH,
		height: VIDEO_CARD_WIDTH * 1.25,
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: '#f1f5f9',
		position: 'relative',
	},
	playOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.2)',
	},
	playIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	durationBadge: {
		position: 'absolute',
		bottom: 4,
		right: 4,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		paddingHorizontal: 4,
		paddingVertical: 2,
		borderRadius: 4,
	},
	durationText: {
		color: '#fff',
		fontSize: 9,
		fontWeight: '700',
	},
	summaryCard: {
		backgroundColor: '#f8fafc',
		borderRadius: 16,
		padding: 20,
		gap: 12,
	},
	summaryTitle: {
		fontWeight: '900',
		fontSize: 16,
		color: '#0f172a',
	},
	summaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	summaryLabel: {
		color: '#475569',
		fontWeight: '700',
		fontSize: 14,
	},
	summaryValue: {
		color: '#0f172a',
		fontWeight: '800',
		fontSize: 14,
	},
	summaryTotalLabel: {
		fontWeight: '900',
		fontSize: 16,
		color: '#0f172a',
	},
	summaryTotal: {
		fontWeight: '900',
		fontSize: 20,
		color: PRIMARY,
	},
	summaryHint: {
		color: '#94a3b8',
		fontSize: 12,
	},
	summaryWarning: {
		color: '#b45309',
		fontSize: 12,
		fontWeight: '700',
		backgroundColor: '#fef3c7',
		borderWidth: 1,
		borderColor: '#fde68a',
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 12,
		overflow: 'hidden',
		lineHeight: 16,
	},
	clearRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 4,
	},
	clearInfo: {
		color: '#64748b',
		fontWeight: '700',
		fontSize: 14,
	},
	clearBtn: {
		backgroundColor: '#ef4444',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
	},
	clearBtnText: {
		color: '#ef4444',
		fontWeight: '800',
		fontSize: 14,
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
	stickyLabel: {
		color: '#64748b',
		fontWeight: '800',
		fontSize: 11,
		letterSpacing: 0.5,
	},
	stickyAmount: {
		fontSize: 20,
		fontWeight: '900',
		color: '#0f172a',
	},
	stickyHint: {
		color: '#94a3b8',
		fontSize: 11,
		fontWeight: '600',
	},
	emptyWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingHorizontal: 24,
	},
	emptyIconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: PEACH,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '900',
		color: '#0f172a',
		textAlign: 'center',
	},
	emptySubtitle: {
		color: '#475569',
		textAlign: 'center',
	},
});

