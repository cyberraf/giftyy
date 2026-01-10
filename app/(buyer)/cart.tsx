import BrandButton from '@/components/BrandButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoPreview } from '@/components/VideoPreview';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/contexts/ProductsContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	FlatList,
	Image,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#f75507';
const PEACH = '#fff1ea';
const BLUSH = '#ffe8f1';
const SOFT = '#f9fafb';

type FeaturedVideo = {
	id: string;
	title: string;
	videoUrl: string;
	durationSeconds?: number;
};

const VIDEO_CARD_WIDTH = 80; // Small compact video cards

function parsePriceToNumber(price: string): number {
	const n = parseFloat(price.replace(/[^0-9.]/g, ''));
	return isNaN(n) ? 0 : n;
}

export default function CartScreen() {
	const { items, removeItem, updateQuantity, clear, totalQuantity } = useCart();
	const { refreshProducts, refreshCollections } = useProducts();
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const [refreshing, setRefreshing] = useState(false);

	const subtotal = useMemo(
		() => items.reduce((sum, it) => sum + parsePriceToNumber(it.price) * it.quantity, 0),
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
			<View style={[styles.container, { paddingTop: top + 8 }]}>
				<Header />

			{items.length === 0 ? (
				<EmptyState onStart={() => router.push('/(buyer)/(tabs)/home')} />
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
								<PersonalizedCTA />
								<SummaryCard
									subtotal={subtotal}
									deliveryFee={deliveryFee}
									serviceFee={serviceFee}
									estimatedTax={estimatedTax}
									total={total}
									itemCount={totalQuantity}
									onCheckout={() => router.push('/(buyer)/checkout/design')}
								/>
								<ClearRow count={totalQuantity} onClear={clear} />
							</View>
						}
						ListEmptyComponent={<EmptyState onStart={() => router.push('/(buyer)/(tabs)/home')} />}
					/>

					<CheckoutBar
						bottomInset={bottom}
						total={total}
						count={totalQuantity}
						onCheckout={() => router.push('/(buyer)/checkout/design')}
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
	const onQty = (delta: number) => onQtyChange(Math.max(1, item.quantity + delta));

	return (
		<Swipeable
			renderRightActions={() => (
				<Pressable style={styles.swipeDelete} onPress={onRemove}>
					<IconSymbol name="trash" size={18} color="#fff" />
					<Text style={styles.swipeDeleteText}>Remove</Text>
				</Pressable>
			)}
			overshootRight={false}
		>
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
						<Text numberOfLines={2} style={styles.itemTitle}>
							{item.name}
						</Text>
						{item.selectedOptions && (
							<Text style={styles.itemOptions} numberOfLines={1}>
								{Object.entries(item.selectedOptions)
									.map(([k, v]) => `${k}: ${v}`)
									.join(' • ')}
							</Text>
						)}
						<Text style={styles.itemPrice}>{item.price}</Text>
						<View style={styles.actionsRow}>
							<View style={styles.qtyWrap}>
								<Pressable onPress={() => onQty(-1)} style={styles.qtyBtn}>
									<Text style={styles.qtyBtnText}>–</Text>
								</Pressable>
								<Text style={styles.qtyValue}>{item.quantity}</Text>
								<Pressable onPress={() => onQty(1)} style={styles.qtyBtn}>
									<Text style={styles.qtyBtnText}>+</Text>
								</Pressable>
							</View>
							<Pressable onPress={onRemove}>
								<Text style={styles.removeText}>Remove</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Animated.View>
		</Swipeable>
	);
}

function PersonalizedCTA() {
	const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchFeaturedVideos = async () => {
			try {
				setLoading(true);
				const { data, error } = await supabase
					.from('video_messages')
					.select('id, title, video_url, duration_seconds')
					.eq('is_featured', true)
					.not('video_url', 'is', null)
					.order('created_at', { ascending: false })
					.limit(10);

				if (error) {
					console.error('Error fetching featured videos:', error);
					return;
				}

				// Shuffle and take 4 random videos
				const videos = (data || []).map((row) => ({
					id: row.id,
					title: row.title,
					videoUrl: row.video_url,
					durationSeconds: row.duration_seconds || undefined,
				}));

				// Shuffle array
				const shuffled = videos.sort(() => Math.random() - 0.5);
				setFeaturedVideos(shuffled.slice(0, 4));
			} catch (err) {
				console.error('Error fetching featured videos:', err);
			} finally {
				setLoading(false);
			}
		};

		fetchFeaturedVideos();
	}, []);

	if (loading || featuredVideos.length === 0) {
		return null;
	}

	return (
		<Animated.View entering={FadeInUp.duration(220)} style={styles.ctaCard}>
			<View style={styles.ctaHeader}>
				<View style={styles.ctaIcon}>
					<IconSymbol name="video.fill" size={18} color={PRIMARY} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.ctaTitle}>Add a personalized video message</Text>
					<Text style={styles.ctaSubtitle}>Make your gift unforgettable</Text>
				</View>
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.videoAlbum}
				style={{ marginTop: 12 }}
			>
				{featuredVideos.map((video, index) => (
					<View
						key={video.id}
						style={[styles.videoCard, index > 0 && { marginLeft: 8 }]}
					>
						<View style={styles.videoThumbnail}>
							<VideoPreview videoUrl={video.videoUrl} style={StyleSheet.absoluteFill} />
							<View style={styles.playOverlay}>
								<View style={styles.playIcon}>
									<IconSymbol name="play.fill" size={12} color="#fff" />
								</View>
							</View>
							{video.durationSeconds && (
								<View style={styles.durationBadge}>
									<Text style={styles.durationText}>
										{Math.floor(video.durationSeconds / 60)}:
										{String(Math.floor(video.durationSeconds % 60)).padStart(2, '0')}
									</Text>
								</View>
							)}
						</View>
					</View>
				))}
			</ScrollView>
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
			<Text style={styles.summaryTitle}>Order summary</Text>
			<View style={styles.summaryRow}>
				<Text style={styles.summaryLabel}>Items ({itemCount})</Text>
				<Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
			</View>
			<View style={styles.summaryRow}>
				<Text style={styles.summaryLabel}>Delivery fee</Text>
				<Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
			</View>
			<View style={styles.summaryRow}>
				<Text style={styles.summaryLabel}>Service fee</Text>
				<Text style={styles.summaryValue}>${serviceFee.toFixed(2)}</Text>
			</View>
			<View style={styles.summaryRow}>
				<Text style={styles.summaryLabel}>Estimated tax</Text>
				<Text style={styles.summaryValue}>${estimatedTax.toFixed(2)}</Text>
			</View>
			<View style={[styles.summaryRow, { marginTop: 8 }]}>
				<Text style={styles.summaryTotalLabel}>Total</Text>
				<Text style={styles.summaryTotal}>${total.toFixed(2)}</Text>
			</View>
			<Text style={styles.summaryHint}>Tax and shipping will be finalized at checkout.</Text>
			<View style={{ marginTop: 16 }}>
				<BrandButton
					title="Proceed to Checkout"
					onPress={onCheckout}
				/>
			</View>
		</View>
	);
}

function ClearRow({ count, onClear }: { count: number; onClear: () => void }) {
	return (
		<View style={styles.clearRow}>
			<Text style={styles.clearInfo}>{count} item(s)</Text>
			<Pressable onPress={onClear} style={styles.clearBtn}>
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
		<View style={[styles.stickyBar, { paddingBottom: bottomInset + 12 }]}>
			<View>
				<Text style={styles.stickyLabel}>Subtotal</Text>
				<Text style={styles.stickyAmount}>${total.toFixed(2)}</Text>
				<Text style={styles.stickyHint}>Secure payment • Easy returns</Text>
			</View>
			<BrandButton title={`Proceed to checkout (${count})`} onPress={onCheckout} />
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
		backgroundColor: '#fff',
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
		padding: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
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
		gap: 10,
		backgroundColor: SOFT,
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	qtyBtn: {
		width: 28,
		height: 28,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	qtyBtnText: {
		fontSize: 18,
		fontWeight: '900',
		color: '#0f172a',
	},
	qtyValue: {
		fontWeight: '900',
		color: '#0f172a',
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
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
		gap: 8,
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
	},
	summaryValue: {
		color: '#0f172a',
		fontWeight: '800',
	},
	summaryTotalLabel: {
		fontWeight: '900',
		fontSize: 15,
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
	clearRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 4,
	},
	clearInfo: {
		color: '#475569',
		fontWeight: '700',
	},
	clearBtn: {
		backgroundColor: '#ef4444',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
	},
	clearBtnText: {
		color: '#fff',
		fontWeight: '800',
	},
	stickyBar: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#e2e8f0',
		gap: 12,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: -2 },
		elevation: 10,
	},
	stickyLabel: {
		color: '#475569',
		fontWeight: '700',
	},
	stickyAmount: {
		fontSize: 20,
		fontWeight: '900',
		color: '#0f172a',
	},
	stickyHint: {
		color: '#94a3b8',
		fontSize: 12,
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

