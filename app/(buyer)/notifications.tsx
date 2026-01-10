import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	Modal,
	Platform,
	Pressable,
	SectionList,
	StyleSheet,
	Switch,
	Text,
	View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#f75507';
const PRIMARY_LIGHT = '#ff6d2a';
const PEACH = '#ffe5e0';
const PINK = '#fff0f5';
const CREAM = '#fff7f1';
const GRAY_BG = '#f9fafb';

type Category = 'all' | 'orders' | 'messages' | 'celebrations' | 'offers';

type NotificationItem = {
	id: string;
	title: string;
	body?: string;
	createdAt: number;
	read: boolean;
	type?: string;
	category?: Category | string;
	thumbnailUrl?: string;
	vendorAvatar?: string;
	actionHref?: string;
	actionLabel?: string;
};

type Section = {
	title: string;
	data: NotificationItem[];
};

const CATEGORY_TABS: { key: Category; label: string; icon: string }[] = [
	{ key: 'all', label: 'All', icon: 'bell' },
	{ key: 'orders', label: 'Orders', icon: 'cart.fill' },
	{ key: 'messages', label: 'Messages', icon: 'message.fill' },
	{ key: 'celebrations', label: 'Celebrations', icon: 'sparkles' },
	{ key: 'offers', label: 'Offers', icon: 'tag.fill' },
];

function bucketByDay(ts: number) {
	const now = new Date();
	const date = new Date(ts);
	const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return 'This Week';
	return 'Earlier';
}

function mapCategory(item: NotificationItem): Category {
	const t = (item.category || item.type || '').toLowerCase();
	if (t.includes('order')) return 'orders';
	if (t.includes('message') || t.includes('vendor')) return 'messages';
	if (t.includes('celebration') || t.includes('memory') || t.includes('video')) return 'celebrations';
	if (t.includes('offer') || t.includes('promo') || t.includes('deal')) return 'offers';
	return 'all';
}

function groupNotifications(items: NotificationItem[], category: Category, mode: 'all' | 'unread'): Section[] {
	const filtered = items.filter((n) => (mode === 'all' ? true : !n.read)).filter((n) => {
		if (category === 'all') return true;
		return mapCategory(n) === category;
	});

	const buckets: Record<string, NotificationItem[]> = {};
	filtered.forEach((n) => {
		const bucket = bucketByDay(n.createdAt);
		if (!buckets[bucket]) buckets[bucket] = [];
		buckets[bucket].push(n);
	});

	return Object.entries(buckets).map(([title, data]) => ({
		title,
		data: data.sort((a, b) => b.createdAt - a.createdAt),
	}));
}

function formatTime(ts: number) {
	const diff = Date.now() - ts;
	const m = Math.floor(diff / 60000);
	const h = Math.floor(diff / 3600000);
	const d = Math.floor(diff / 86400000);
	if (m < 1) return 'Just now';
	if (m < 60) return `${m}m ago`;
	if (h < 24) return `${h}h ago`;
	if (d < 7) return `${d}d ago`;
	return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CardAccent({ category }: { category: Category }) {
	const color =
		category === 'orders'
			? PRIMARY
			: category === 'messages'
			? '#f59e0b'
			: category === 'celebrations'
			? '#ec4899'
			: '#8b5cf6';
	return <View style={[styles.cardAccent, { backgroundColor: color }]} />;
}

function CategoryTag({ category }: { category: Category }) {
	const label =
		category === 'orders'
			? 'Order Update'
			: category === 'messages'
			? 'Message'
			: category === 'celebrations'
			? 'Celebration'
			: category === 'offers'
			? 'Offer'
			: 'Notification';
	const color =
		category === 'orders'
			? PRIMARY_LIGHT
			: category === 'messages'
			? PEACH
			: category === 'celebrations'
			? PINK
			: '#ede9fe';
	const text =
		category === 'orders'
			? PRIMARY
			: category === 'messages'
			? '#c2410c'
			: category === 'celebrations'
			? '#be185d'
			: '#6d28d9';
	return (
		<View style={[styles.tag, { backgroundColor: color }]}>
			<Text style={[styles.tagText, { color: text }]}>{label}</Text>
		</View>
	);
}

function NotificationCard({
	item,
	onToggleRead,
	onAction,
}: {
	item: NotificationItem;
	onToggleRead: () => void;
	onAction?: () => void;
}) {
	const category = mapCategory(item);
	const isUnread = !item.read;
	const bg =
		category === 'orders'
			? '#fffaf5'
			: category === 'messages'
			? '#fff7ed'
			: category === 'celebrations'
			? '#fff5f7'
			: '#f8f7ff';

	const icon =
		category === 'orders'
			? 'cart.fill'
			: category === 'messages'
			? 'message.fill'
			: category === 'celebrations'
			? 'sparkles'
			: 'tag.fill';

	const swipeActions = (progress: any, dragX: any, label: string, actionColor: string, action: () => void) => (
		<Pressable style={[styles.swipeAction, { backgroundColor: actionColor }]} onPress={action}>
			<Text style={styles.swipeActionText}>{label}</Text>
		</Pressable>
	);

	return (
		<Swipeable
			renderRightActions={() =>
				swipeActions(null, null, isUnread ? 'Mark Read' : 'Mark Unread', '#f97316', onToggleRead)
			}
			overshootRight={false}
		>
			<Animated.View entering={FadeInUp.duration(250)} layout={Layout.springify()}>
				<Pressable style={[styles.card, { backgroundColor: isUnread ? bg : '#fff' }]} onPress={onToggleRead}>
					<CardAccent category={category} />
					<View style={styles.cardTopRow}>
						<View style={[styles.iconBubble, { backgroundColor: '#fff', borderColor: bg }]}>
							<IconSymbol name={icon as any} size={20} color={PRIMARY} />
						</View>
						<CategoryTag category={category} />
						<Text style={styles.time}>{formatTime(item.createdAt)}</Text>
					</View>

					<Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
						{item.title}
					</Text>
					{item.body ? (
						<Text style={styles.body} numberOfLines={3}>
							{item.body}
						</Text>
					) : null}

					<View style={styles.footerRow}>
						{isUnread && <View style={styles.unreadPill} />}
						{item.actionHref && (
							<Pressable style={styles.cta} onPress={onAction}>
								<Text style={styles.ctaText}>{item.actionLabel ?? 'View'}</Text>
								<IconSymbol name="chevron.right" size={14} color="#fff" />
							</Pressable>
						)}
					</View>
				</Pressable>
			</Animated.View>
		</Swipeable>
	);
}

function SegmentedTabs({
	value,
	onChange,
	counts,
}: {
	value: Category;
	onChange: (v: Category) => void;
	counts: Record<Category, number>;
}) {
	return (
		<Animated.ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.segmented}
			overScrollMode="never"
		>
			{CATEGORY_TABS.map((tab) => {
				const active = value === tab.key;
				return (
					<Pressable
						key={tab.key}
						onPress={() => onChange(tab.key)}
						style={[styles.segment, active && styles.segmentActive]}
					>
						<IconSymbol
							name={tab.icon as any}
							size={16}
							color={active ? PRIMARY : '#6b7280'}
						/>
						<Text
							style={[styles.segmentText, active && styles.segmentTextActive]}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							{tab.label}
						</Text>
						{counts[tab.key] > 0 && (
							<View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
								<Text style={[styles.segmentBadgeText, active && styles.segmentBadgeTextActive]}>
									{counts[tab.key]}
								</Text>
							</View>
						)}
					</Pressable>
				);
			})}
		</Animated.ScrollView>
	);
}

function FilterSheet({
	visible,
	onClose,
	showUnreadOnly,
	onToggleUnread,
}: {
	visible: boolean;
	onClose: () => void;
	showUnreadOnly: boolean;
	onToggleUnread: () => void;
}) {
	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<View style={styles.modalOverlay}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<Animated.View entering={FadeInDown.duration(220)} style={styles.modalContent}>
					<View style={styles.modalHandle} />
					<View style={styles.modalHeaderRow}>
						<View style={styles.modalIconBubble}>
							<IconSymbol name="sparkles" size={18} color={PRIMARY} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.modalTitle}>Quick filters</Text>
							<Text style={styles.modalSubtitle}>Keep the joyful updates upfront.</Text>
						</View>
						<Pressable style={styles.modalClose} onPress={onClose} hitSlop={10}>
							<Text style={styles.modalCloseText}>Done</Text>
						</Pressable>
					</View>

					<View style={styles.modalCard}>
						<View style={styles.modalRow}>
							<View style={styles.modalRowLeft}>
								<IconSymbol name="bell" size={18} color={PRIMARY} />
								<View>
									<Text style={styles.modalLabel}>Unread only</Text>
									<Text style={styles.modalHint}>Hide notifications you’ve already seen</Text>
								</View>
							</View>
							<Switch value={showUnreadOnly} onValueChange={onToggleUnread} />
						</View>
					</View>
				</Animated.View>
			</View>
		</Modal>
	);
}

export default function NotificationsScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const {
		notifications,
		unreadCount,
		markRead,
		markAllRead,
		loading,
		loadingMore,
		hasMore,
		refresh,
		loadMore,
	} = useNotifications();

	const [mode, setMode] = useState<'all' | 'unread'>('all');
	const [category, setCategory] = useState<Category>('all');
	const [filterOpen, setFilterOpen] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	useFocusEffect(
		useCallback(() => {
			refresh();
		}, [refresh])
	);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await refresh();
		setRefreshing(false);
	}, [refresh]);

	const sections = useMemo(
		() => groupNotifications(notifications as NotificationItem[], category, mode),
		[notifications, category, mode]
	);

	const counts = useMemo(() => {
		const base: Record<Category, number> = { all: notifications.length, orders: 0, messages: 0, celebrations: 0, offers: 0 };
		notifications.forEach((n) => {
			const c = mapCategory(n as NotificationItem);
			if (c !== 'all') base[c] += 1;
		});
		return base;
	}, [notifications]);

	const empty = !loading && sections.every((s) => s.data.length === 0);

	return (
		<GestureHandlerRootView style={styles.root}>
		<View style={[styles.container, { paddingTop: top }]}>
			{/* Hero header */}
			<LinearGradient
				colors={['#fff5ef', '#fff']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.header}
			>
				<View style={styles.headerTopRow}>
					<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
						<IconSymbol name="chevron.left" size={22} color="#0f172a" />
					</Pressable>
					<View style={styles.titleBlock}>
						<Text style={styles.headerTitle}>Notifications</Text>
					</View>
					<View style={styles.headerActions}>
						<Pressable style={styles.iconButton} onPress={() => setFilterOpen(true)}>
							<IconSymbol name="slider.horizontal.3" size={18} color="#0f172a" />
						</Pressable>
					</View>
				</View>
				{unreadCount > 0 && (
					<View style={styles.headerChips}>
						<Pressable onPress={markAllRead} style={styles.markAll}>
							<Text style={styles.markAllText}>Mark all read · {unreadCount}</Text>
						</Pressable>
					</View>
				)}
			</LinearGradient>

			{/* Segmented tabs */}
			<SegmentedTabs value={category} onChange={setCategory} counts={counts} />

			{/* Content */}
			{loading && notifications.length === 0 ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={PRIMARY} />
					<Text style={styles.loadingText}>Loading notifications…</Text>
				</View>
			) : (
				<SectionList
					sections={sections}
					keyExtractor={(item) => item.id}
					contentContainerStyle={[
						styles.listContent,
						{ paddingBottom: bottom + 80, flexGrow: 1 },
					]}
					stickySectionHeadersEnabled
					renderSectionHeader={({ section: { title } }) => (
						<Animated.View entering={FadeInDown.duration(200)} style={styles.sectionHeader}>
							<Text style={styles.sectionHeaderText}>{title}</Text>
						</Animated.View>
					)}
					renderItem={({ item }) => (
						<NotificationCard
							item={item}
							onToggleRead={() => markRead(item.id)}
							onAction={() => item.actionHref && router.push(item.actionHref as any)}
						/>
					)}
					onEndReached={() => {
						if (hasMore && !loadingMore && !loading) loadMore();
					}}
					onEndReachedThreshold={0.4}
					refreshing={refreshing}
					onRefresh={handleRefresh}
					ListEmptyComponent={
						<View style={styles.emptyWrapper}>
							<View style={styles.emptyState}>
								<LinearGradient colors={[PEACH, CREAM]} style={styles.emptyGradient} />
								<View style={styles.emptyIcon}>
									<IconSymbol name="sparkles" size={40} color={PRIMARY} />
								</View>
								<Text style={styles.emptyTitle}>All caught up!</Text>
								<Text style={styles.emptySubtitle}>No new updates right now. We’ll keep the good news coming.</Text>
							</View>
						</View>
					}
					ListFooterComponent={
						loadingMore ? (
							<View style={styles.footerLoading}>
								<ActivityIndicator size="small" color={PRIMARY} />
								<Text style={styles.footerLoadingText}>Loading more…</Text>
							</View>
						) : null
					}
				/>
			)}

			<FilterSheet
				visible={filterOpen}
				onClose={() => setFilterOpen(false)}
				showUnreadOnly={mode === 'unread'}
				onToggleUnread={() => setMode((m) => (m === 'unread' ? 'all' : 'unread'))}
			/>
		</View>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
		paddingHorizontal: 18,
		paddingTop: 6,
		paddingBottom: 6,
	},
	headerTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	titleBlock: {
		flex: 1,
	},
	headerEyebrow: {
		fontSize: 12,
		fontWeight: '700',
		color: '#fb923c',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	headerTitle: {
		fontSize: 26,
		fontWeight: '900',
		color: '#0f172a',
		letterSpacing: -0.6,
	},
	headerBadge: {
		backgroundColor: PRIMARY,
		paddingHorizontal: 8,
		height: 22,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerBadgeText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '800',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	headerChips: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 12,
	},
	headerPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ffe4d5',
	},
	headerPillText: {
		color: '#fb923c',
		fontWeight: '800',
		fontSize: 13,
	},
	markAll: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	markAllText: {
		color: PRIMARY,
		fontWeight: '800',
		fontSize: 13,
	},
	segmented: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 10,
		gap: 10,
		alignItems: 'center',
		height: 64,
	},
	segment: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 18,
		minWidth: 132,
		minHeight: 44,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: 'transparent',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 5,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
	},
	segmentActive: {
		backgroundColor: CREAM,
		borderColor: PRIMARY + '40',
	},
	segmentText: {
		fontSize: 14,
		fontWeight: '800',
		color: '#334155',
		lineHeight: 18,
	},
	segmentTextActive: {
		color: PRIMARY,
	},
	segmentBadge: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e2e8f0',
		paddingHorizontal: 6,
	},
	segmentBadgeActive: {
		backgroundColor: PRIMARY,
	},
	segmentBadgeText: {
		fontSize: 12,
		color: '#1e293b',
		fontWeight: '800',
	},
	segmentBadgeTextActive: {
		color: '#fff',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 8,
		gap: 10,
	},
	sectionHeader: {
		paddingVertical: 8,
		paddingHorizontal: 4,
		backgroundColor: '#fff',
	},
	sectionHeaderText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#94a3b8',
		letterSpacing: 0.2,
		textTransform: 'uppercase',
	},
	card: {
		borderRadius: 20,
		padding: 14,
		marginBottom: 10,
		position: 'relative',
		borderWidth: 1,
		borderColor: '#f1f5f9',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOpacity: 0.08,
				shadowRadius: 10,
				shadowOffset: { width: 0, height: 4 },
			},
			android: {
				elevation: 3,
			},
		}),
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	iconBubble: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
	},
	tag: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	tagText: {
		fontSize: 12,
		fontWeight: '800',
	},
	time: {
		marginLeft: 'auto',
		fontSize: 12,
		color: '#94a3b8',
		fontWeight: '700',
	},
	title: {
		fontSize: 16,
		fontWeight: '900',
		color: '#0f172a',
		marginBottom: 6,
	},
	titleUnread: {
		color: '#0f172a',
	},
	body: {
		fontSize: 14,
		lineHeight: 20,
		color: '#475569',
		marginBottom: 10,
	},
	footerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	unreadPill: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: PRIMARY,
	},
	cta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: PRIMARY,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
	},
	ctaText: {
		color: '#fff',
		fontWeight: '800',
		fontSize: 13,
	},
	cardAccent: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		width: 5,
		borderTopLeftRadius: 20,
		borderBottomLeftRadius: 20,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
	loadingText: {
		color: '#6b7280',
		fontSize: 15,
		fontWeight: '600',
	},
	footerLoading: {
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	footerLoadingText: {
		color: '#6b7280',
		fontWeight: '700',
	},
	emptyState: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyGradient: {
		...StyleSheet.absoluteFillObject,
		opacity: 0.5,
	},
	emptyIcon: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
		elevation: 4,
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '900',
		color: '#0f172a',
		marginBottom: 6,
	},
	emptySubtitle: {
		fontSize: 15,
		color: '#475569',
		textAlign: 'center',
		lineHeight: 22,
	},
	emptyWrapper: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingTop: 0,
		paddingBottom: 0,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: '#fff',
		padding: 18,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		gap: 14,
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: -6 },
		elevation: 18,
		marginTop: 'auto',
	},
	modalHandle: {
		width: 48,
		height: 5,
		borderRadius: 2.5,
		backgroundColor: '#e2e8f0',
		alignSelf: 'center',
		marginBottom: 6,
	},
	modalHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	modalIconBubble: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: CREAM,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '900',
		color: '#0f172a',
	},
	modalSubtitle: {
		fontSize: 13,
		color: '#475569',
		fontWeight: '600',
	},
	modalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
		gap: 10,
	},
	modalLabel: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0f172a',
	},
	modalHint: {
		fontSize: 12,
		color: '#64748b',
		fontWeight: '500',
	},
	modalRowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
	},
	modalClose: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 14,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	modalCloseText: {
		color: PRIMARY,
		fontWeight: '800',
	},
	modalCard: {
		marginTop: 10,
		padding: 12,
		borderRadius: 16,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 6,
	},
	swipeAction: {
		width: 100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	swipeActionText: {
		color: '#fff',
		fontWeight: '800',
	},
});
