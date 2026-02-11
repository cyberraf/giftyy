import { GiftSuggestionRow } from '@/components/home/GiftSuggestionRow';
import { OccasionList } from '@/components/home/OccasionList';
import {
	RecipientCarousel,
	type RecipientCarouselItem,
} from '@/components/home/RecipientCarousel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useHome } from '@/lib/hooks/useHome';
import { useAppStore } from '@/lib/store/useAppStore';
import { RecipientFormModal } from '@/components/recipients/RecipientFormModal';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Buyer Home: high-level funnel into
 * 1) Add/select recipient
 * 2) See upcoming occasions
 * 3) Preview suggested gifts
 * 4) Start AI chat
 */
export default function BuyerHomeIndexScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { alert } = useAlert();
	const { profile } = useAuth();
	const { recipientsLoading, refreshRecipients } = useRecipients();
	const { unreadCount } = useNotifications();
	const {
		recipients,
		recipientsLoading: homeRecipientsLoading,
		activeRecipient,
		activeRecipientNextOccasion,
		upcomingOccasions,
		suggestions,
		suggestionsLoading,
	} = useHome();

	const { activeRecipientId, setActiveRecipient } = useAppStore();
	const [addRecipientVisible, setAddRecipientVisible] = useState(false);

	const loading = recipientsLoading || homeRecipientsLoading;

	// Default the active recipient to the first one if none is selected yet
	useEffect(() => {
		if (!activeRecipientId && recipients.length > 0) {
			setActiveRecipient(recipients[0].id);
		}
	}, [activeRecipientId, recipients, setActiveRecipient]);

	const recipientCarouselItems: RecipientCarouselItem[] = useMemo(
		() =>
			recipients.slice(0, 8).map((r) => ({
				id: r.id,
				displayName: r.firstName || 'Recipient',
				relationship: r.relationship,
				nextOccasionLabel: activeRecipientNextOccasion?.recipientId === r.id
					? activeRecipientNextOccasion.label
					: undefined,
				nextOccasionDateDisplay: activeRecipientNextOccasion?.recipientId === r.id
					? new Date(activeRecipientNextOccasion.date).toLocaleDateString(undefined, {
						month: 'short',
						day: 'numeric',
					})
					: undefined,
				nextOccasionInDays: activeRecipientNextOccasion?.recipientId === r.id
					? activeRecipientNextOccasion.inDays
					: undefined,
			})),
		[recipients, activeRecipientNextOccasion],
	);

	const handleNavigateToContact = (recipientId: string) => {
		// Today there is a single recipients screen; we pass the id as a param
		// so it can optionally highlight that contact in the future.
		router.push({
			pathname: '/(buyer)/recipients',
			params: { recipientId },
		});
	};

	const handleStartOrOpenSession = (recipientId: string) => {
		// TODO: When AI sessions are implemented, replace this with:
		// - find/create ai_session for recipient (+ occasion)
		// - router.push(`/sessions/${sessionId}`)
		//
		// For now we reuse the existing gift-finder flow so the UX works end‑to‑end.
		router.push({
			pathname: '/(buyer)/gift-finder',
			params: { recipientId },
		});
	};

	const handleAskAIEntry = () => {
		if (!activeRecipient) {
			alert(
				'Pick a recipient first',
				'Choose who you are shopping for so Giftyy can personalize suggestions.',
			);
			router.push('/(buyer)/recipients');
			return;
		}

		handleStartOrOpenSession(activeRecipient.id);
	};

	const handlePressSuggestion = (suggestion: any) => {
		if (!activeRecipient) {
			handleAskAIEntry();
			return;
		}

		// If a session id is present, we could route there in the future.
		// For now, keep behavior consistent with the main AI entry.
		handleStartOrOpenSession(activeRecipient.id);
	};

	const handleGetGiftIdeasForRecipient = (recipientId: string) => {
		setActiveRecipient(recipientId);
		handleStartOrOpenSession(recipientId);
	};

	const handleAddRecipient = () => {
		// Open the lightweight add-recipient dialog used in checkout
		setAddRecipientVisible(true);
	};

	const firstName = profile?.first_name || 'there';
	const headerPaddingTop = top + 6;
	const headerHeight = headerPaddingTop + 56; // header content height

	return (
		<View style={styles.container}>
			{/* Pinned header */}
			<View
				style={[
					styles.headerContainer,
					{ paddingTop: headerPaddingTop },
				]}
			>
				<View style={styles.headerRow}>
					<View>
						<Text style={styles.headerGreeting}>Hi, {firstName}</Text>
						<Text style={styles.headerSubtitle}>Plan gifts and remember every occasion.</Text>
					</View>
					<View style={styles.headerRight}>
						<View style={{ position: 'relative' }}>
							<Text
								accessible
								accessibilityRole="button"
								accessibilityLabel="Open notifications"
								onPress={() => router.push('/(buyer)/notifications')}
							>
								<IconSymbol name="bell" size={20} color={GIFTYY_THEME.colors.gray700} />
							</Text>
							{unreadCount > 0 && (
								<View style={styles.notificationBadge}>
									<Text style={styles.notificationBadgeText}>
										{unreadCount > 9 ? '9+' : unreadCount}
									</Text>
								</View>
							)}
						</View>
					</View>
				</View>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingTop: headerHeight + GIFTYY_THEME.spacing.sm,
						paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + GIFTYY_THEME.spacing.lg,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<RecipientCarousel
					items={recipientCarouselItems}
					activeRecipientId={activeRecipient?.id ?? null}
					loading={loading}
					onSelectRecipient={setActiveRecipient}
					onGetGiftIdeas={handleGetGiftIdeasForRecipient}
					onAddRecipient={handleAddRecipient}
				/>

				<OccasionList
					occasions={upcomingOccasions}
					loading={loading}
					onPressOccasion={handleNavigateToContact}
					onAddOccasion={handleAddRecipient}
				/>

				<GiftSuggestionRow
					activeRecipientName={activeRecipient?.firstName}
					hasActiveRecipient={!!activeRecipient}
					suggestions={suggestions}
					loading={suggestionsLoading}
					onPressSuggestion={handlePressSuggestion}
					onAskAI={handleAskAIEntry}
				/>

				{/* Bottom AI entry section */}
				<View style={styles.aiEntryCard}>
					<View style={styles.aiEntryHeader}>
						<Text style={styles.aiEntryTitle}>Ask Giftyy AI</Text>
						<Text style={styles.aiEntrySubtitle}>
							Describe what you’re shopping for and we’ll do the rest.
						</Text>
					</View>
					<View style={styles.aiEntryInputRow}>
						<View style={styles.aiEntryInputStub}>
							<Text style={styles.aiEntryInputText}>
								Describe what you’re shopping for…
							</Text>
						</View>
						<View style={styles.aiEntryIconPill}>
							<IconSymbol name="sparkles" size={18} color={GIFTYY_THEME.colors.white} />
						</View>
					</View>
					<View style={styles.aiEntryHintRow}>
						<Text style={styles.aiEntryHintText}>
							Try: “Birthday gift for my sister who loves coffee, under $50”
						</Text>
					</View>
					<View style={styles.aiEntryOverlayHitbox}>
					</View>
				</View>
			</ScrollView>

			<RecipientFormModal
				visible={addRecipientVisible}
				mode="add"
				editingRecipient={null}
				onClose={() => setAddRecipientVisible(false)}
				onSaved={refreshRecipients}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.backgroundSecondary,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	headerContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 20,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.sm,
		...GIFTYY_THEME.shadows.sm,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	headerGreeting: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	headerSubtitle: {
		marginTop: 2,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray600,
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	notificationBadge: {
		position: 'absolute',
		top: -4,
		right: -4,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: GIFTYY_THEME.colors.error,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 3,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.white,
	},
	notificationBadgeText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 9,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	aiEntryCard: {
		marginTop: GIFTYY_THEME.spacing['3xl'],
		borderRadius: GIFTYY_THEME.radius.xl,
		backgroundColor: GIFTYY_THEME.colors.white,
		padding: GIFTYY_THEME.spacing.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		position: 'relative',
	},
	aiEntryHeader: {
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	aiEntryTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	aiEntrySubtitle: {
		marginTop: 2,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray600,
	},
	aiEntryInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: GIFTYY_THEME.spacing.md,
	},
	aiEntryInputStub: {
		flex: 1,
		height: 44,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		justifyContent: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.md,
	},
	aiEntryInputText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
	},
	aiEntryIconPill: {
		marginLeft: GIFTYY_THEME.spacing.sm,
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	aiEntryHintRow: {
		marginTop: GIFTYY_THEME.spacing.sm,
	},
	aiEntryHintText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
	},
	aiEntryOverlayHitbox: {
		// Full-card invisible hitbox for the AI entry
		...StyleSheet.absoluteFillObject,
	},
});

