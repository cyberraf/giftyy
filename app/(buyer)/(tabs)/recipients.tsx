import { OccasionFormModal } from '@/components/occasions/OccasionFormModal';
import { ConversationalRecipientForm } from '@/components/recipients/ConversationalRecipientForm';
import { FindFriendsModal } from '@/components/recipients/FindFriendsModal';
import { RelationshipPickerModal } from '@/components/recipients/RelationshipPickerModal';
import { ShareInviteModal } from '@/components/recipients/ShareInviteModal';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients, type Recipient } from '@/contexts/RecipientsContext';
import { GiftyyAlert } from '@/lib/AlertManager';
import { useHome } from '@/lib/hooks/useHome';
import { supabase } from '@/lib/supabase';
import { formatOccasionDate } from '@/lib/utils/date-formatter';
import { DEFAULT_HOLIDAYS } from '@/lib/utils/occasion-seeding';
import { dbRowToPreferences, RecipientPreferences } from '@/types/recipient-preferences';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Dimensions,
	Image,
	Pressable,
	RefreshControl,
	ScrollView, Share, StyleSheet,
	Text,
	View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecipientsListSkeleton } from '@/components/ui/SkeletonLoader';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const H_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - COLUMN_GAP) / 2;
const PENDING_CARD_WIDTH = SCREEN_WIDTH * 0.82;

// Category mapping logic
const getCategory = (relationship: string): string => {
	const rel = (relationship || 'Other').toLowerCase().trim();

	const familyTerms = [
		'brother', 'sister', 'wife', 'husband', 'son', 'daughter',
		'sibling', 'mother', 'mom', 'father', 'dad', 'parent', 'grandparent',
		'grandson', 'granddaughter', 'aunt', 'uncle', 'cousin',
		'nephew', 'niece', 'partner', 'fiance', 'fiancee', 'boyfriend', 'girlfriend'
	];

	const friendTerms = ['friend', 'best friend', 'buddy'];

	const colleagueTerms = ['colleague', 'coworker', 'manager', 'boss', 'employee', 'work'];

	if (familyTerms.some(term => rel.includes(term))) return 'Family';
	if (friendTerms.some(term => rel.includes(term))) return 'Friends';
	if (colleagueTerms.some(term => rel.includes(term))) return 'Colleagues';

	return 'Others';
};

// Family priority sorting logic
const getFamilyPriority = (relationship: string): number => {
	const rel = relationship.toLowerCase().trim();

	if (['husband', 'wife', 'girlfriend', 'boyfriend', 'partner', 'fiance', 'fiancee'].some(t => rel.includes(t))) return 1;
	if (['son', 'daughter', 'child'].some(t => rel.includes(t))) return 2;
	if (['mom', 'mother', 'dad', 'father', 'parent'].some(t => rel.includes(t))) return 3;
	if (['brother', 'sister', 'sibling'].some(t => rel.includes(t))) return 4;

	return 5;
};

type RecipientCardProps = Recipient & {
	onEdit: () => void;
	onDelete: () => void;
	onRequestInvite: () => void;
	onPress?: () => void;
	isEditing: boolean
};

const getInitials = (name: string): string => {
	const parts = name.split(' ').filter(Boolean);
	const firstCh = parts[0]?.[0] || '?';
	const lastCh = parts[1]?.[0] || '';
	return `${firstCh}${lastCh}`.toUpperCase();
};

const formatInDaysSmart = (days: number, t: any): string => {
	if (days === 0) return t('recipients.time.today');
	if (days === 1) return t('recipients.time.tomorrow');
	if (days < 7) return t('recipients.time.in_days', { count: days });
	if (days < 30) return t('recipients.time.in_weeks', { count: Math.floor(days / 7) });
	return t('recipients.time.in_months', { count: Math.floor(days / 30) });
};

const getOccasionIcon = (label?: string): string => {
	if (!label) return '📅';
	const l = label.toLowerCase();
	if (l.includes('birthday')) return '🎂';
	if (l.includes('anniversary')) return '💍';
	if (l.includes('wedding')) return '💒';
	if (l.includes('christmas')) return '🎄';
	if (l.includes('hanukkah')) return '🕎';
	if (l.includes('ramadan')) return '🌙';
	if (l.includes('halloween')) return '🎃';
	if (l.includes('valentine')) return '💝';
	if (l.includes('st. patrick')) return '🍀';
	if (l.includes('easter')) return '🐣';
	if (l.includes('mother')) return '👩‍👦';
	if (l.includes('father')) return '👨‍👦';
	if (l.includes('graduation')) return '🎓';
	if (l.includes('baby')) return '👶';
	if (l.includes('new year')) return '🥂';
	return '📅';
};

function RecipientCard({
	id,
	firstName,
	lastName,
	relationship,
	status,
	isClaimed,
	avatarUrl,
	senderAvatarUrl,
	senderName,
	onDelete,
	onApprove,
	onReject,
	onPress,
	isEditing,
	isOutgoing,
	displayName,
}: RecipientCardProps & { onApprove?: () => void, onReject?: () => void }) {
	const { t } = useTranslation();
	const isPending = status === 'pending';
	const showApprovalActions = isPending && !isOutgoing;
	const isIncoming = !isOutgoing;

	// For incoming requests (pending or accepted), the profile we're displaying is the sender's, so their avatar is senderAvatarUrl.
	// Otherwise (outgoing or claimed), the profile is the recipient's, so it's avatarUrl.
	const displayAvatarUrl = isIncoming ? senderAvatarUrl : avatarUrl;
	const currentDisplayName = isIncoming && senderName ? senderName : displayName;

	// Consistent color keyed to the name
	const avatarPalette = ['#FF6B00', '#7C3AED', '#0EA5E9', '#059669', '#DB2777'];
	const nameParts = currentDisplayName?.split(' ').filter(Boolean) || [];
	const firstCh = nameParts[0]?.[0] || '?';
	const lastCh = nameParts[1]?.[0] || '';
	const initials = `${firstCh}${lastCh}`.toUpperCase();

	const colorIdx = (firstCh.charCodeAt(0) + (lastCh.charCodeAt(0) || 0)) % avatarPalette.length;
	const avatarBg = avatarPalette[colorIdx] || avatarPalette[0];

	return (
		<Pressable
			onPress={isPending && !isOutgoing ? undefined : onPress}
			style={({ pressed }) => [
				styles.recipientCard,
				pressed && !isPending && styles.recipientCardPressed,
			]}
		>
			{/* Avatar */}
			<View style={[styles.avatarCircle, { backgroundColor: displayAvatarUrl ? 'transparent' : avatarBg }]}>
				{displayAvatarUrl ? (
					<Image
						source={{ uri: displayAvatarUrl }}
						style={{ width: '100%', height: '100%', borderRadius: 999 }}
						resizeMode="cover"
					/>
				) : (
					<Text style={styles.avatarInitials}>{initials || '?'}</Text>
				)}
			</View>

			{/* Name */}
			<Text style={styles.recipientName} numberOfLines={1}>
				{currentDisplayName}
			</Text>

			{/* Relationship Badge */}
			<View style={styles.relationshipBadge}>
				<Text style={styles.relationshipBadgeText} numberOfLines={1}>
					{isPending
						? (isOutgoing ? t('recipients.status.waiting') : t('recipients.status.pending_request'))
						: relationship}
				</Text>
			</View>

			{/* Approval actions for pending */}
			{showApprovalActions && (
				<View style={[styles.approvalRow, { marginTop: 8 }]}>
					<Pressable style={[styles.approvalBtn, styles.approvalBtnAccept]} onPress={onApprove}>
						<IconSymbol name="checkmark" size={14} color="#FFFFFF" />
					</Pressable>
					<Pressable style={[styles.approvalBtn, styles.approvalBtnReject]} onPress={onReject}>
						<IconSymbol name="xmark" size={14} color={GIFTYY_THEME.colors.gray600} />
					</Pressable>
				</View>
			)}
		</Pressable>
	);
}

function PendingCarouselCard({
	firstName,
	lastName,
	status,
	isClaimed,
	avatarUrl,
	senderAvatarUrl,
	senderName,
	onDelete,
	onApprove,
	onReject,
	isOutgoing,
	displayName,
}: RecipientCardProps & { onApprove?: () => void, onReject?: () => void }) {
	const { t } = useTranslation();
	const isIncoming = !isOutgoing;
	const displayAvatarUrl = isIncoming ? senderAvatarUrl : avatarUrl;
	const currentDisplayName = isIncoming && senderName ? senderName : displayName;

	// Avatar colors
	const avatarPalette = ['#FF6B00', '#7C3AED', '#0EA5E9', '#059669', '#DB2777'];
	const nameParts = currentDisplayName?.split(' ').filter(Boolean) || [];
	const firstCh = nameParts[0]?.[0] || '?';
	const lastCh = nameParts[1]?.[0] || '';
	const initials = `${firstCh}${lastCh}`.toUpperCase();

	const colorIdx = (firstCh.charCodeAt(0) + (lastCh.charCodeAt(0) || 0)) % avatarPalette.length;
	const avatarBg = avatarPalette[colorIdx] || avatarPalette[0];

	return (
		<View style={styles.pendingCard}>
			<View style={styles.pendingCardMain}>
				{/* Avatar */}
				<View style={[styles.pendingAvatarWrapper, { backgroundColor: displayAvatarUrl ? 'transparent' : avatarBg }]}>
					{displayAvatarUrl ? (
						<Image source={{ uri: displayAvatarUrl }} style={styles.pendingAvatarImage} />
					) : (
						<Text style={styles.pendingAvatarInitials}>{initials}</Text>
					)}
				</View>

				<View style={styles.pendingCardContent}>
					<View style={styles.pendingNameRow}>
						<Text style={styles.pendingName} numberOfLines={1}>{currentDisplayName}</Text>
						<View style={[
							styles.statusBadge,
							isOutgoing ? styles.statusBadgeWaiting : styles.statusBadgeRequest
						]}>
							<View style={[
								styles.statusDot,
								{ backgroundColor: isOutgoing ? '#FF6B00' : '#EF4444' }
							]} />
							<Text style={[
								styles.statusBadgeText,
								{ color: isOutgoing ? '#FF6B00' : '#EF4444' }
							]}>
								{isOutgoing ? t('recipients.status.waiting_label') : t('recipients.status.request_label')}
							</Text>
						</View>
					</View>
					<Text style={styles.pendingSubtitle}>
						{isOutgoing ? t('recipients.status.waiting_subtitle') : t('recipients.status.request_subtitle')}
					</Text>
				</View>
			</View>

			<View style={styles.pendingCardActions}>
				{isIncoming ? (
					<>
						<Pressable
							style={[styles.pendingActionBtn, styles.pendingBtnAccept]}
							onPress={onApprove}
						>
							<IconSymbol name="checkmark" size={16} color="#FFFFFF" />
							<Text style={styles.pendingBtnTextWhite}>{t('recipients.status.accept')}</Text>
						</Pressable>
						<Pressable
							style={[styles.pendingActionBtn, styles.pendingBtnReject]}
							onPress={onReject}
						>
							<IconSymbol name="xmark" size={16} color={GIFTYY_THEME.colors.gray600} />
						</Pressable>
					</>
				) : (
					<Pressable
						style={[styles.pendingActionBtn, styles.pendingBtnReject, { flex: 1, flexDirection: 'row', gap: 8 }]}
						onPress={onDelete}
					>
						<IconSymbol name="trash" size={14} color={GIFTYY_THEME.colors.gray500} />
						<Text style={styles.pendingBtnTextGray}>{t('recipients.status.cancel_invite')}</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
}

export default function RecipientsScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { t } = useTranslation();
	const { profile: authProfile, user } = useAuth();
	const { recipients, loading, refreshRecipients, approveConnection, rejectConnection, addRecipient, deleteRecipient, syncContacts } = useRecipients();

	const { upcomingOccasions, myProfileOccasions, refreshOccasions, myPreferences, myProfileId } = useHome();

	const { tab } = useLocalSearchParams<{ tab?: 'circle' | 'occasions' | 'preferences' | 'me' }>();

	// Tab state
	const [activeTab, setActiveTab] = useState<'circle' | 'occasions' | 'preferences'>(() => {
		if (tab === 'occasions') return 'occasions';
		if (tab === 'preferences' || tab === 'me') return 'preferences';
		return 'circle';
	});

	useEffect(() => {
		if (tab === 'occasions') {
			setActiveTab('occasions');
		} else if (tab === 'preferences' || tab === 'me') {
			setActiveTab('preferences');
		} else if (tab === 'circle') {
			setActiveTab('circle');
		}
	}, [tab]);

	// Recipient related state
	const [recipientModalVisible, setRecipientModalVisible] = useState(false);
	const [recipientModalMode, setRecipientModalMode] = useState<'add' | 'edit'>('add');
	const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
	const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [shareModalVisible, setShareModalVisible] = useState(false);
	const [recipientToInvite, setRecipientToInvite] = useState<Recipient | null>(null);
	const [findFriendsModalVisible, setFindFriendsModalVisible] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
	const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
	const [pendingApprovalName, setPendingApprovalName] = useState<string | undefined>(undefined);

	// Profile related state (from gifting-profile.tsx)
	const [profileLoading, setProfileLoading] = useState(false);
	const [myRpId, setMyRpId] = useState<string | null>(null);
	const [myProfileData, setMyProfileData] = useState<any | null>(null);
	const [myPrefs, setMyPrefs] = useState<RecipientPreferences | null>(null);
	const [isConversationalFormVisible, setIsConversationalFormVisible] = useState(false);
	const [isOccasionModalVisible, setIsOccasionModalVisible] = useState(false);
	const [editingOccasionId, setEditingOccasionId] = useState<string | null>(null);
	const [phantomProfile, setPhantomProfile] = useState<any | null>(null);
	const [initialPrefsStepLabel, setInitialPrefsStepLabel] = useState<string | undefined>(undefined);
	
	const scrollRef = useRef<ScrollView>(null);
	useScrollToTop(scrollRef);

	const myOccasions = myProfileOccasions;

	const unaddedHolidays = useMemo(() => {
		const addedNames = new Set(myOccasions.map(o => (o.label || o.title || '').toLowerCase()));
		return DEFAULT_HOLIDAYS.filter(h => !addedNames.has(h.title.toLowerCase()));
	}, [myOccasions]);

	const displayedOccasions = upcomingOccasions;

	const fetchGiftingProfile = async () => {
		if (!user) return;
		try {
			setProfileLoading(true);
			setPhantomProfile(null);

			let { data: rps, error: rpError } = await supabase
				.from('recipient_profiles')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.limit(1);

			if (rpError) throw rpError;
			let rp = rps?.[0];

			if (rp) {
				setMyRpId(rp.id);
				setMyProfileData(rp);
				const { data: prefs, error: prefsError } = await supabase
					.from('recipient_preferences')
					.select('*')
					.eq('recipient_profile_id', rp.id)
					.maybeSingle();

				if (prefsError) {
					console.warn('Error fetching preferences:', prefsError);
				} else if (prefs) {
					setMyPrefs(dbRowToPreferences(prefs));
				}
			} else {
				const userEmail = user.email;
				const rawPhone = authProfile?.phone || '';
				const digitsOnly = rawPhone.replace(/\D/g, '');
				const e164Phone = digitsOnly ? `+${digitsOnly}` : '';

				let conditions: string[] = [];
				if (userEmail) conditions.push(`email.ilike.${userEmail}`);
				if (e164Phone) conditions.push(`phone.eq.${e164Phone}`);
				if (digitsOnly && digitsOnly !== e164Phone) conditions.push(`phone.eq.${digitsOnly}`);

				if (conditions.length > 0) {
					const { data: phantoms, error: phantomError } = await supabase
						.from('recipient_profiles')
						.select('*')
						.is('user_id', null)
						.eq('is_claimed', false)
						.or(conditions.join(','))
						.limit(1);

					if (!phantomError && phantoms && phantoms.length > 0) {
						setPhantomProfile(phantoms[0]);
					}
				}
			}
		} catch (err: any) {
			console.error('Error in GiftingProfile:', err);
		} finally {
			setProfileLoading(false);
		}
	};

	useEffect(() => {
		fetchGiftingProfile();
	}, [user, authProfile]);

	const handleOpenAddressEdit = () => {
		setInitialPrefsStepLabel('Mailing Address');
		setIsConversationalFormVisible(true);
	};

	const handleAddOccasion = () => {
		if (!myRpId) {
			GiftyyAlert(
				t('recipients.alerts.profile_setup_required'),
				t('recipients.alerts.profile_setup_message'),
				[
					{ text: t('recipients.alerts.cancel'), style: 'cancel' },
					{ text: t('recipients.alerts.setup_now'), onPress: () => setIsConversationalFormVisible(true) }
				]
			);
			return;
		}
		setEditingOccasionId(null);
		setIsOccasionModalVisible(true);
	};

	const handleEditOccasion = (id: string) => {
		setEditingOccasionId(id);
		setIsOccasionModalVisible(true);
	};

	const handleDeleteOccasion = async (id: string, label: string) => {
		GiftyyAlert(
			t('recipients.alerts.delete_occasion_title'),
			t('recipients.alerts.delete_occasion_message', { label }),
			[
				{ text: t('recipients.alerts.cancel'), style: 'cancel' },
				{
					text: t('recipients.alerts.delete'),
					style: 'destructive',
					onPress: async () => {
						try {
							const { error } = await supabase
								.from('occasions')
								.delete()
								.eq('id', id)
								.eq('user_id', user!.id);
							if (error) throw error;
							refreshOccasions();
						} catch (err) {
							console.error('Error deleting occasion:', err);
							GiftyyAlert(t('auth.error'), t('recipients.alerts.error_deleting'));
						}
					},
				},
			]
		);
	};

	const handleAddSuggestedHoliday = async (holiday: any) => {
		if (!user) return;
		if (!myRpId) {
			GiftyyAlert(
				'Profile Setup Required',
				'Please set up your gifting profile first to save your occasions.',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Set Up Now', onPress: () => setIsConversationalFormVisible(true) }
				]
			);
			return;
		}
		try {
			const { error } = await supabase
				.from('occasions')
				.insert({
					user_id: user.id,
					recipient_profile_id: myRpId,
					...holiday,
				});

			if (error) throw error;
			refreshOccasions();
		} catch (err) {
			console.error('Error adding suggested holiday:', err);
			GiftyyAlert(t('auth.error'), t('recipients.alerts.error_adding_holiday'));
		}
	};

	const handleSyncContacts = async () => {
		setFindFriendsModalVisible(true);
	};

	const handleConnect = async (contact: any, relationship: string, nickname?: string) => {
		try {
			if (contact.isIncomingInvitation && contact.connectionId) {
				const { error } = await approveConnection(contact.connectionId, { relationship, nickname });
				if (error) GiftyyAlert(t('auth.error'), t('recipients.alerts.error_approving', { message: error.message }));
			} else {
				const { error } = await addRecipient({
					fullName: contact.name,
					phone: contact.phone,
					relationship,
					nickname,
					profileId: contact.userId,
				});
				if (error) GiftyyAlert(t('auth.error'), error.message);
			}
		} catch (error) {
			console.error('[handleConnect] Error:', error);
		}
	};

	const handleInvite = async (contact: any, relationship: string) => {
		const inviteLink = `https://giftyy.store`;
		const inviteMessage = `Hey there! 👋\n\nI want to make sure every gift and celebration between us is truly special 🎁\n\nJoin my private gifting network on Giftyy — tell me what you love and what you're into so I can nail it every time! ✨\n\nDownload the app here:\n${inviteLink}`;

		try {
			await Share.share({ message: inviteMessage });
		} catch (error) {
			console.error('[handleInvite] Error:', error);
		}
	};

	const pendingRecipients = useMemo(() =>
		recipients.filter(r => r.status === 'pending' && !r.isOutgoing),
		[recipients]
	);

	const approvedRecipients = useMemo(() =>
		recipients.filter(r => r.status === 'approved' || (r.status === 'pending' && r.isOutgoing)),
		[recipients]
	);

	// Group recipients and sort them
	const groupedRecipients = useMemo(() => {
		const groups: Record<string, Recipient[]> = {
			'Family': [],
			'Friends': [],
			'Colleagues': [],
			'Others': []
		};

		approvedRecipients.forEach(r => {
			const category = getCategory(r.relationship || 'Other');
			groups[category].push(r);
		});

		// Sort Family by priority
		groups['Family'].sort((a, b) => {
			const priorityA = getFamilyPriority(a.relationship || 'Other');
			const priorityB = getFamilyPriority(b.relationship || 'Other');

			if (priorityA !== priorityB) {
				return priorityA - priorityB;
			}
			// Fallback to name sorting if same priority
			return a.firstName.localeCompare(b.firstName);
		});

		// Filter out empty groups and order categories
		const order: [string, string][] = [
			['Family', t('recipients.sections.family')],
			['Friends', t('recipients.sections.friends')],
			['Colleagues', t('recipients.sections.colleagues')],
			['Others', t('recipients.sections.others')]
		];
		return order
			.filter(([cat]) => groups[cat].length > 0)
			.map(([cat, label]) => [label, groups[cat]] as [string, Recipient[]]);
	}, [approvedRecipients, t]);

	const onRefresh = React.useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([
				refreshRecipients(),
				syncContacts(true)
			]);
		} catch (error) {
			console.error('Error refreshing recipients:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshRecipients, syncContacts]);

	const closeModal = () => {
		setRecipientModalVisible(false);
		setRecipientModalMode('add');
		setEditingRecipient(null);
		setActiveRecipientId(null);
	};

	const handleAdd = () => {
		setActiveRecipientId(null);
		setEditingRecipient(null);
		setRecipientModalMode('add');
		setRecipientModalVisible(true);
	};

	const handleEdit = (recipient: Recipient) => {
		setActiveRecipientId(recipient.id);
		setEditingRecipient(recipient);
		setRecipientModalMode('edit');
		setRecipientModalVisible(true);
	};

	const handleDelete = (id: string) => {
		GiftyyAlert(t('recipients.alerts.remove_recipient_title'), t('recipients.alerts.remove_recipient_message'), [
			{ text: t('recipients.alerts.cancel'), style: 'cancel' },
			{
				text: t('recipients.alerts.remove_confirm'),
				style: 'destructive',
				onPress: async () => {
					const { error } = await deleteRecipient(id);
					if (error) {
						GiftyyAlert(t('auth.error'), t('recipients.alerts.error_rejecting')); // Maybe wrong key, but similar
					} else {
						if (activeRecipientId === id) {
							closeModal();
						}
					}
				},
			},
		]);
	};

	const handleApprove = (id: string, name?: string) => {
		setPendingApprovalId(id);
		setPendingApprovalName(name);
		setRelationshipModalVisible(true);
	};

	const handleRelationshipSelect = async (relationship: string, nickname?: string) => {
		if (!pendingApprovalId) return;
		const { error } = await approveConnection(pendingApprovalId, { relationship, nickname });
		if (error) {
			GiftyyAlert(t('auth.error'), t('recipients.alerts.error_approving', { message: error.message }));
		}
		setRelationshipModalVisible(false);
		setPendingApprovalId(null);
		setPendingApprovalName(undefined);
	};

	const handleReject = async (id: string) => {
		const { error } = await rejectConnection(id);
		if (error) GiftyyAlert(t('auth.error'), t('recipients.alerts.error_rejecting'));
	};

	return (
		<View style={styles.screen}>

			<ScrollView
				ref={scrollRef}
				style={styles.mainScrollView}
				contentContainerStyle={[
					styles.content,
					{
						paddingBottom: bottom + verticalScale(140),
						paddingTop: top + 72
					}
				]}
				scrollEnabled={true}
				nestedScrollEnabled={true}
				showsVerticalScrollIndicator={true}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={GIFTYY_THEME.colors.primary}
						colors={[GIFTYY_THEME.colors.primary]}
					/>
				}
			>

				<View style={styles.tabContainer}>
					<TourAnchor step="circle_tab" style={{ flex: 1 }}>
						<Pressable
							onPress={() => setActiveTab('circle')}
							style={[styles.tab, activeTab === 'circle' && styles.activeTab]}
						>
							<Text style={[styles.tabText, activeTab === 'circle' && styles.activeTabText]}>{t('recipients.tabs.circle')}</Text>
						</Pressable>
					</TourAnchor>
					<TourAnchor step="occasions_tab" style={{ flex: 1 }}>
						<Pressable
							onPress={() => setActiveTab('occasions')}
							style={[styles.tab, activeTab === 'occasions' && styles.activeTab]}
						>
							<Text style={[styles.tabText, activeTab === 'occasions' && styles.activeTabText]}>{t('recipients.tabs.occasions')}</Text>
						</Pressable>
					</TourAnchor>
					<TourAnchor step="preferences_tab" style={{ flex: 1 }}>
						<Pressable
							onPress={() => setActiveTab('preferences')}
							style={[styles.tab, activeTab === 'preferences' && styles.activeTab]}
						>
							<Text style={[styles.tabText, activeTab === 'preferences' && styles.activeTabText]}>{t('recipients.tabs.preferences')}</Text>
						</Pressable>
					</TourAnchor>
				</View>

				{activeTab === 'circle' ? (
					<>
						{pendingRecipients.length > 0 && (
							<View style={[styles.section, { marginBottom: verticalScale(24) }]}>
								<View style={styles.sectionHeader}>
									<Text style={[styles.sectionTitle, { color: GIFTYY_THEME.colors.primary }]}>{t('recipients.sections.pending')}</Text>
									<View style={[styles.countBadge, { backgroundColor: 'rgba(247, 85, 7, 0.08)' }]}>
										<Text style={[styles.countBadgeText, { color: GIFTYY_THEME.colors.primary }]}>{pendingRecipients.length}</Text>
									</View>
								</View>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									decelerationRate="fast"
									snapToInterval={PENDING_CARD_WIDTH + scale(12)}
									snapToAlignment="start"
									contentContainerStyle={styles.carouselContent}
								>
									{pendingRecipients.map((recipient) => (
										<PendingCarouselCard
											key={recipient.id}
											{...recipient}
											isEditing={false}
											onEdit={() => { }}
											onDelete={() => handleDelete(recipient.id)}
											onRequestInvite={() => { }}
											onApprove={() => handleApprove(recipient.id, recipient.displayName)}
											onReject={() => handleReject(recipient.id)}
										/>
									))}
								</ScrollView>
							</View>
						)}

						<View style={styles.welcomeSection}>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
								<View>
									<Text style={styles.welcomeTitle}>{t('recipients.sections.circle')}</Text>
									<Text style={styles.welcomeSubtitle}>{t('recipients.sections.circle_subtitle')}</Text>
								</View>
								<Pressable
									style={[styles.syncButton, isSyncing && { opacity: 0.7 }]}
									onPress={handleSyncContacts}
									disabled={isSyncing}
								>
									<IconSymbol
										name={isSyncing ? "arrow.2.circlepath" : "person.badge.plus"}
										size={15}
										color={GIFTYY_THEME.colors.gray600}
									/>
									<Text style={styles.syncButtonText}>
										{isSyncing ? t('recipients.actions.syncing') : t('recipients.actions.find_friends')}
									</Text>
								</Pressable>
							</View>
						</View>

						{groupedRecipients.map(([category, items]) => (
							<View key={category} style={styles.section}>
								<View style={styles.sectionHeader}>
									<Text style={styles.sectionTitle}>{category}</Text>
									<View style={styles.countBadge}>
										<Text style={styles.countBadgeText}>{items.length}</Text>
									</View>
								</View>

								<View style={styles.recipientList}>
									{items.map((recipient) => (
										<RecipientCard
											key={recipient.id}
											{...recipient}
											isEditing={activeRecipientId === recipient.id && recipientModalVisible && recipientModalMode === 'edit'}
											onEdit={() => handleEdit(recipient)}
											onDelete={() => handleDelete(recipient.id)}
											onApprove={() => handleApprove(recipient.id, recipient.displayName)}
											onReject={() => handleReject(recipient.id)}
											onRequestInvite={() => {
												setRecipientToInvite(recipient);
												setShareModalVisible(true);
											}}
											onPress={() => router.push({
												pathname: '/(buyer)/recipient/[id]',
												params: { id: recipient.id }
											})}
										/>
									))}
								</View>
							</View>
						))}

						{loading && recipients.length === 0 ? (
							<View style={{ paddingHorizontal: scale(4), paddingTop: scale(8) }}>
								<RecipientsListSkeleton count={5} />
							</View>
						) : recipients.length === 0 && (
							<View style={styles.emptyState}>
								<View style={styles.emptyIconContainer}>
									<IconSymbol name="person.2.fill" size={48} color={GIFTYY_THEME.colors.gray300} />
								</View>
								<Text style={styles.emptyStateTitle}>{t('recipients.empty.no_recipients')}</Text>
								<Text style={styles.emptyStateSubtitle}>{t('recipients.empty.no_recipients_subtitle')}</Text>
								<Pressable style={styles.emptyAddButton} onPress={handleSyncContacts}>
									<Text style={styles.emptyAddButtonText}>{t('recipients.actions.find_friends')}</Text>
								</Pressable>
							</View>
						)}
					</>
				) : activeTab === 'preferences' ? (
					/* Preferences Tab Content */
					<View style={styles.profileTabContent}>
						{/* Preferences Section */}
						<View style={styles.profileSection}>
							<View style={[styles.sectionHeader, { alignItems: 'flex-start', paddingHorizontal: 0 }]}>
								<View style={styles.sectionTitleBlock}>
									<View style={styles.titleRow}>
										<Text style={styles.sectionTitle}>{t('recipients.sections.preferences')}</Text>
										<View style={styles.privateBadge}>
											<IconSymbol name="lock.fill" size={10} color="#C2410C" />
											<Text style={styles.privateBadgeText}>{t('recipients.status.private_badge')}</Text>
										</View>
									</View>
									<Text style={styles.sectionSubtext}>{t('recipients.sections.preferences_subtext')}</Text>
								</View>
								{(myPrefs || myRpId) && (
									<Pressable onPress={() => setIsConversationalFormVisible(true)} style={styles.editBtn}>
										<Text style={styles.editBtnText}>{myPrefs ? t('recipients.actions.update') : t('recipients.actions.set_up')}</Text>
									</Pressable>
								)}
							</View>

							{myPrefs ? (
								<View style={styles.premiumCard}>
									<PreferencePreview preferences={myPrefs} />
								</View>
							) : phantomProfile ? (
								<View style={[styles.emptyCard, styles.phantomCard]}>
									<View style={styles.phantomBadge}>
										<Text style={styles.phantomBadgeText}>{t('recipients.status.found_badge')}</Text>
									</View>
									<IconSymbol name="gift" size={40} color={GIFTYY_THEME.colors.accent} />
									<Text style={styles.phantomIdTitle}>{t('recipients.empty.phantom_found_title')}</Text>
									<Text style={styles.phantomIdText}>
										{t('recipients.empty.phantom_found_text', { name: phantomProfile.full_name })}
									</Text>
									<Pressable style={styles.claimBtn} onPress={() => setIsConversationalFormVisible(true)}>
										<Text style={styles.claimBtnText}>{t('recipients.actions.claim_profile')}</Text>
									</Pressable>
								</View>
							) : (
								<View style={styles.emptyCard}>
									<IconSymbol name="sparkles" size={32} color={GIFTYY_THEME.colors.gray300} />
									<Text style={styles.emptyProfileText}>{t('recipients.empty.no_preferences')}</Text>
									<Pressable style={styles.setupBtn} onPress={() => setIsConversationalFormVisible(true)}>
										<Text style={styles.setupBtnText}>{t('recipients.actions.take_quiz')}</Text>
									</Pressable>
								</View>
							)}
						</View>

						{/* Shipping Address Section */}
						<View style={styles.profileSection}>
							<View style={[styles.sectionHeader, { alignItems: 'flex-start', paddingHorizontal: 0 }]}>
								<View style={styles.sectionTitleBlock}>
									<View style={styles.titleRow}>
										<Text style={styles.sectionTitle}>{t('recipients.sections.shipping_address')}</Text>
										<View style={styles.privateBadge}>
											<IconSymbol name="lock.fill" size={10} color="#64748B" />
											<Text style={styles.privateBadgeText}>{t('recipients.status.private_badge')}</Text>
										</View>
									</View>
									<Text style={styles.sectionSubtext}>{t('recipients.sections.shipping_address_subtext')}</Text>
								</View>
								{myRpId && (
									<Pressable onPress={handleOpenAddressEdit} style={styles.editBtn}>
										<Text style={styles.editBtnText}>{myProfileData?.address ? t('recipients.actions.update') : t('recipients.actions.add_address')}</Text>
									</Pressable>
								)}
							</View>
							<View style={styles.premiumCard}>
								{myProfileData?.address ? (
									<View style={styles.addressContainer}>
										<IconSymbol name="mappin.and.ellipse" size={20} color={GIFTYY_THEME.colors.gray400} />
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.addressLine}>{myProfileData.address}</Text>
											{myProfileData.apartment && <Text style={styles.addressLine}>{myProfileData.apartment}</Text>}
											<Text style={styles.addressLine}>
												{myProfileData.city}, {myProfileData.state} {myProfileData.zip}
											</Text>
											<Text style={styles.addressCountry}>{myProfileData.country || 'United States'}</Text>
										</View>
									</View>
								) : (
									<View style={styles.emptyAddress}>
										<Text style={styles.emptyProfileText}>{t('recipients.empty.no_address')}</Text>
									</View>
								)}
							</View>
						</View>
					</View>
				) : (
					/* Occasions Tab Content */
					<View style={styles.profileTabContent}>
						{/* Circle Celebrations Section */}
						<View style={[styles.profileSection, { marginBottom: 24 }]}>
							<View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
								<Text style={styles.sectionTitle}>{t('recipients.sections.circle_celebrations')}</Text>
							</View>
							{displayedOccasions.length > 0 ? (
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.celebrationCarousel}
									contentContainerStyle={styles.celebrationCarouselContent}
								>
									{displayedOccasions.slice(0, 20).map((occ) => {
										const avatarUrl = occ.avatarUrl;
										return (
											<View key={occ.id} style={styles.celebrationCardSmall}>
												<View style={styles.celebrationHeader}>
													<View style={styles.recipientAvatarSmall}>
														{avatarUrl ? (
															<Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
														) : (
															<Text style={styles.avatarTextSmall}>{getInitials(occ.recipientName || '')}</Text>
														)}
													</View>
													<View style={[
														styles.celebrationDaysSmall,
														occ.inDays === 0 && { backgroundColor: '#FEE2E2' },
														occ.inDays === 1 && { backgroundColor: '#FEF3C7' }
													]}>
														<Text style={[
															styles.celebrationDaysTextSmall,
															(occ.inDays === 0 || occ.inDays === 1) && { color: GIFTYY_THEME.colors.error }
														]}>
															{formatInDaysSmart(occ.inDays, t)}
														</Text>
													</View>
												</View>
												<Text style={styles.celebrationRecipientSmall} numberOfLines={1}>
													{occ.recipientName}
												</Text>
												<View style={styles.celebrationRowSmall}>
													<Text style={{ fontSize: 12 }}>{getOccasionIcon(occ.label || '')}</Text>
													<Text style={styles.celebrationLabelSmall} numberOfLines={1}>{occ.label}</Text>
												</View>
											</View>
										);
									})}
								</ScrollView>
							) : (
								<Pressable
									style={styles.emptyOccasionsCard}
									onPress={handleSyncContacts}
								>
									<IconSymbol name="person.2.fill" size={24} color={GIFTYY_THEME.colors.gray300} />
									<Text style={styles.emptyOccasionsText}>{t('recipients.empty.no_occasions_circle')}</Text>
								</Pressable>
							)}
						</View>

						<View style={styles.profileSection}>
							<View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
								<View style={styles.sectionTitleBlock}>
									<View style={styles.titleRow}>
										<Text style={styles.sectionTitle}>{t('recipients.sections.my_occasions', { count: myOccasions.length })}</Text>
										<View style={styles.publicBadge}>
											<IconSymbol name="eye.fill" size={10} color="#059669" />
											<Text style={styles.publicBadgeText}>{t('recipients.status.public_badge')}</Text>
										</View>
									</View>
									<Text style={styles.sectionSubtext}>{t('recipients.sections.my_occasions_subtext')}</Text>
								</View>
								<Pressable onPress={handleAddOccasion} style={styles.addBtn}>
									<IconSymbol name="plus" size={14} color={GIFTYY_THEME.colors.accent} />
									<Text style={styles.addBtnText}>{t('recipients.actions.add_occasion')}</Text>
								</Pressable>
							</View>

							{myOccasions.length > 0 ? (
								<View style={styles.occasionsListVertical}>
									{myOccasions.map(occ => (
										<View
											key={occ.id}
											style={styles.occasionCard}
										>
											<Pressable
												onPress={() => handleEditOccasion(occ.id)}
												style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
											>
												<View style={styles.occasionIconWrapper}>
													<Text style={styles.occasionEmojiSmall}>{getOccasionIcon(occ.label)}</Text>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={styles.occasionLabel}>{occ.label}</Text>
													<Text style={styles.occasionDate}>{formatOccasionDate(occ.date)}</Text>
												</View>
												<IconSymbol name="chevron.right" size={14} color={GIFTYY_THEME.colors.gray300} />
											</Pressable>
											<Pressable
												onPress={() => handleDeleteOccasion(occ.id, occ.label)}
												hitSlop={8}
												style={({ pressed }) => [styles.deleteOccasionBtn, pressed && { opacity: 0.6 }]}
											>
												<IconSymbol name="trash" size={16} color={GIFTYY_THEME.colors.gray400} />
											</Pressable>
										</View>
									))}
								</View>
							) : (
								<View style={styles.premiumCard}>
									<Text style={styles.emptyProfileText}>{t('recipients.empty.no_occasions_personal')}</Text>
								</View>
							)}

							{unaddedHolidays.length > 0 && (
								<View style={styles.suggestionsSection}>
									<Text style={styles.suggestionsTitle}>{t('recipients.sections.suggested_holidays')}</Text>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.suggestionsCarousel}
									>
										{unaddedHolidays.map((h, i) => (
											<Pressable
												key={i}
												onPress={() => handleAddSuggestedHoliday(h)}
												style={({ pressed }) => [
													styles.suggestionCard,
													pressed && { opacity: 0.7 }
												]}
											>
												<View style={styles.suggestionInfo}>
													<Text style={styles.suggestionName} numberOfLines={1}>{h.title}</Text>
													<Text style={styles.suggestionDate}>
														{formatOccasionDate(h.date, { short: true })}
													</Text>
												</View>
												<View style={styles.suggestedAddBtn}>
													<IconSymbol name="plus" size={12} color={GIFTYY_THEME.colors.primary} />
												</View>
											</Pressable>
										))}
									</ScrollView>
								</View>
							)
							}
						</View>
					</View>
				)}
			</ScrollView>

			<ConversationalRecipientForm
				visible={recipientModalVisible}
				onClose={closeModal}
				recipient={editingRecipient || undefined}
			/>

			<ConversationalRecipientForm
				visible={isConversationalFormVisible}
				onClose={() => {
					setIsConversationalFormVisible(false);
					setInitialPrefsStepLabel(undefined);
					fetchGiftingProfile();
				}}
				isSelf={true}
				matchedPhantom={phantomProfile}
				recipientProfileId={myRpId || undefined}
				initialStepLabel={initialPrefsStepLabel}
				recipient={{
					firstName: authProfile?.first_name || '',
					lastName: authProfile?.last_name || '',
					phone: authProfile?.phone || '',
					email: user?.email || '',
					profileId: myRpId || undefined,
					preferences: {
						...(myPrefs || {}),
						address: myProfileData?.address,
						apartment: myProfileData?.apartment,
						city: myProfileData?.city,
						state: myProfileData?.state,
						country: myProfileData?.country,
						zip: myProfileData?.zip
					}
				} as any}
			/>

			<OccasionFormModal
				visible={isOccasionModalVisible}
				defaultRecipientId={myRpId}
				editingOccasionId={editingOccasionId}
				onClose={() => setIsOccasionModalVisible(false)}
				onSaved={() => {
					refreshOccasions();
					setIsOccasionModalVisible(false);
				}}
				isSelf={true}
			/>

			<ShareInviteModal
				visible={shareModalVisible}
				onClose={() => setShareModalVisible(false)}
				recipientName={recipientToInvite ? `${recipientToInvite.firstName} ${recipientToInvite.lastName || ''}` : ''}
				recipientPhone={recipientToInvite?.phone || undefined}
				profileId={recipientToInvite?.profileId || ''}
			/>

			<FindFriendsModal
				visible={findFriendsModalVisible}
				onClose={() => setFindFriendsModalVisible(false)}
				onConnect={handleConnect}
				onInvite={handleInvite}
			/>

			<RelationshipPickerModal
				visible={relationshipModalVisible}
				onClose={() => {
					setRelationshipModalVisible(false);
					setPendingApprovalId(null);
					setPendingApprovalName(undefined);
				}}
				onSelect={handleRelationshipSelect}
				title={t('recipients.relationship_modal.title')}
				subtitle={t('recipients.relationship_modal.subtitle')}
				targetName={pendingApprovalName}
			/>

		</View>
	);
}

function PreferencePreview({ preferences }: { preferences: RecipientPreferences }) {
	const { t } = useTranslation();
	const categories = [
		// Demographics & Identity
		{ label: t('recipients.preferences_labels.age_range'), data: preferences.ageRange ? [preferences.ageRange] : [], icon: 'person.fill', bgColor: '#F0F9FF', borderColor: '#BAE6FD', textColor: '#0369A1' },
		{ label: t('recipients.preferences_labels.gender_identity'), data: preferences.genderIdentity ? [preferences.genderIdentity] : [], icon: 'person.fill', bgColor: '#FDF4FF', borderColor: '#F0ABFC', textColor: '#A21CAF' },
		{ label: t('recipients.preferences_labels.cultural_background'), data: preferences.culturalBackground || [], icon: 'globe.americas.fill', bgColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#047857' },

		// Interests & Hobbies
		{ label: t('recipients.preferences_labels.interests'), data: preferences.sportsActivities || [], icon: 'star.fill', bgColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' },
		{ label: t('recipients.preferences_labels.hobbies'), data: preferences.creativeHobbies || [], icon: 'paintbrush.fill', bgColor: '#FFF7ED', borderColor: '#FED7AA', textColor: '#C2410C' },
		{ label: t('recipients.preferences_labels.collecting'), data: preferences.collectingInterests || [], icon: 'trophy.fill', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#B45309' },
		{ label: t('recipients.preferences_labels.tech'), data: preferences.techInterests || [], icon: 'laptopcomputer', bgColor: '#F0F9FF', borderColor: '#BAE6FD', textColor: '#0284C7' },
		{ label: t('recipients.preferences_labels.outdoor'), data: preferences.outdoorActivities || [], icon: 'mountain.2.fill', bgColor: '#F0FDF4', borderColor: '#BBF7D0', textColor: '#15803D' },
		{ label: t('recipients.preferences_labels.indoor'), data: preferences.indoorActivities || [], icon: 'gamecontroller.fill', bgColor: '#FAF5FF', borderColor: '#E9D5FF', textColor: '#7E22CE' },

		// Entertainment & Media
		{ label: t('recipients.preferences_labels.music'), data: preferences.favoriteMusicGenres || [], icon: 'music.note', bgColor: '#FDF2F8', borderColor: '#FBCFE8', textColor: '#BE185D' },
		{ label: t('recipients.preferences_labels.artists'), data: preferences.favoriteArtists ? [preferences.favoriteArtists] : [], icon: 'music.note.list', bgColor: '#FDF2F8', borderColor: '#FBCFE8', textColor: '#9D174D' },
		{ label: t('recipients.preferences_labels.books'), data: preferences.favoriteBooksGenres || [], icon: 'book.fill', bgColor: '#FFF7ED', borderColor: '#FED7AA', textColor: '#9A3412' },
		{ label: t('recipients.preferences_labels.movies'), data: preferences.favoriteMoviesGenres || [], icon: 'film.fill', bgColor: '#F5F3FF', borderColor: '#DDD6FE', textColor: '#6D28D9' },
		{ label: t('recipients.preferences_labels.tv_shows'), data: preferences.favoriteTvShows || [], icon: 'tv.fill', bgColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' },
		{ label: t('recipients.preferences_labels.podcasts'), data: preferences.podcastInterests || [], icon: 'headphones', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#B91C1C' },

		// Style & Aesthetics
		{ label: t('recipients.preferences_labels.style'), data: preferences.fashionStyle || [], icon: 'tag.fill', bgColor: '#FAF5FF', borderColor: '#E9D5FF', textColor: '#7E22CE' },
		{ label: t('recipients.preferences_labels.colors'), data: preferences.colorPreferences || [], icon: 'palette.fill', bgColor: '#FFF1F2', borderColor: '#FECDD3', textColor: '#E11D48' },
		{ label: t('recipients.preferences_labels.home_decor'), data: preferences.homeDecorStyle || [], icon: 'sofa.fill', bgColor: '#F8FAFC', borderColor: '#E2E8F0', textColor: '#475569' },
		{ label: t('recipients.preferences_labels.design'), data: preferences.designPreferences ? [preferences.designPreferences] : [], icon: 'paintbrush.fill', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#B45309' },

		// Food & Wellness
		{ label: t('recipients.preferences_labels.food'), data: preferences.dietaryPreferences || [], icon: 'leaf.fill', bgColor: '#F0FDF4', borderColor: '#BBF7D0', textColor: '#15803D' },
		{ label: t('recipients.preferences_labels.allergies'), data: preferences.foodAllergies || [], icon: 'xmark.circle.fill', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#DC2626' },
		{ label: t('recipients.preferences_labels.cuisines'), data: preferences.favoriteCuisines || [], icon: 'fork.knife', bgColor: '#FFF7ED', borderColor: '#FED7AA', textColor: '#C2410C' },
		{ label: t('recipients.preferences_labels.beverages'), data: preferences.beveragePreferences || [], icon: 'cup.and.saucer.fill', bgColor: '#FDF4FF', borderColor: '#F0ABFC', textColor: '#A21CAF' },
		{ label: t('recipients.preferences_labels.wellness'), data: preferences.wellnessInterests || [], icon: 'cross.case.fill', bgColor: '#F0FDF4', borderColor: '#BBF7D0', textColor: '#047857' },

		// Lifestyle & Values
		{ label: t('recipients.preferences_labels.lifestyle'), data: preferences.lifestyleType ? [preferences.lifestyleType] : [], icon: 'house.fill', bgColor: '#F8FAFC', borderColor: '#E2E8F0', textColor: '#334155' },
		{ label: t('recipients.preferences_labels.values'), data: preferences.coreValues || [], icon: 'heart.text.square.fill', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#B91C1C' },
		{ label: t('recipients.preferences_labels.causes'), data: preferences.causesTheySupport || [], icon: 'globe.americas.fill', bgColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#047857' },

		// Gift Preferences
		{ label: t('recipients.preferences_labels.gift_types'), data: preferences.giftTypePreference || [], icon: 'gift.fill', bgColor: '#FFF1F2', borderColor: '#FECDD3', textColor: '#E11D48' },
		{ label: t('recipients.preferences_labels.dislikes'), data: preferences.giftDislikes || [], icon: 'xmark.circle.fill', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#DC2626' },

		// Sizes
		{
			label: t('recipients.preferences_labels.sizes'), data: [
				preferences.sizeTshirt ? `T-Shirt: ${preferences.sizeTshirt}` : '',
				preferences.sizeShoes ? `Shoes: ${preferences.sizeShoes}` : '',
				preferences.sizePants ? `Pants: ${preferences.sizePants}` : '',
				preferences.sizeDress ? `Dress: ${preferences.sizeDress}` : '',
				preferences.sizeHat ? `Hat: ${preferences.sizeHat}` : '',
				preferences.sizeRing ? `Ring: ${preferences.sizeRing}` : '',
			].filter(Boolean), icon: 'tshirt.fill', bgColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8'
		},

		// Life Context
		{ label: t('recipients.preferences_labels.life_stage'), data: preferences.currentLifeStage ? [preferences.currentLifeStage] : [], icon: 'figure.walk', bgColor: '#F0FDFA', borderColor: '#CCFBF1', textColor: '#0F766E' },
		{ label: t('recipients.preferences_labels.pets'), data: preferences.hasPets || [], icon: 'pawprint.fill', bgColor: '#FFF7ED', borderColor: '#FED7AA', textColor: '#C2410C' },

		// Personality
		{ label: t('recipients.preferences_labels.personality'), data: preferences.personalityTraits || [], icon: 'lightbulb.fill', bgColor: '#F0FDFA', borderColor: '#CCFBF1', textColor: '#0F766E' },
	].filter(cat => cat.data.length > 0);

	if (categories.length === 0) return <Text style={styles.emptyProfileText}>{t('recipients.empty.no_preferences_detailed')}</Text>;

	return (
		<View style={styles.previewContainer}>
			{categories.map(cat => (
				<View key={cat.label} style={styles.previewRow}>
					<View style={styles.iconCircle}>
						<IconSymbol name={cat.icon as any} size={14} color={GIFTYY_THEME.colors.gray600} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.previewLabel}>{cat.label}</Text>
						<View style={styles.tagsContainer}>
							{cat.data.map((item, i) => (
								<View key={i} style={[styles.tag, { backgroundColor: cat.bgColor, borderColor: cat.borderColor }]}>
									<Text style={[styles.tagText, { color: cat.textColor }]}>{item}</Text>
								</View>
							))}
						</View>
					</View>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.cream,
	},
	mainScrollView: {
		flex: 1,
	},
	content: {
		paddingTop: verticalScale(12),
	},
	tabContainer: {
		flexDirection: 'row',
		marginHorizontal: scale(20),
		marginBottom: verticalScale(24),
		gap: 6,
	},
	tab: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	activeTab: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	tabText: {
		fontSize: 13,
		fontWeight: '600',
		color: GIFTYY_THEME.colors.gray500,
	},
	activeTabText: {
		color: '#FFFFFF',
		fontWeight: '700',
		fontSize: 13,
	},
	profileTabContent: {
		paddingHorizontal: scale(24),
	},
	profileSection: {
		marginBottom: 32,
	},
	sectionTitleBlock: {
		flex: 1,
		paddingRight: 16,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 4,
	},
	sectionSubtext: {
		fontSize: 13,
		color: GIFTYY_THEME.colors.gray500,
		lineHeight: 18,
	},
	privateBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#FFF7ED',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#FED7AA',
	},
	privateBadgeText: {
		fontSize: 9,
		fontWeight: '800',
		color: '#C2410C',
		letterSpacing: 0.5,
	},
	publicBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#A7F3D0',
	},
	publicBadgeText: {
		fontSize: 9,
		fontWeight: '800',
		color: '#059669',
		letterSpacing: 0.5,
	},
	premiumCard: {
		backgroundColor: '#FFF',
		borderRadius: 24,
		padding: 20,
		...GIFTYY_THEME.shadows.md,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.02)',
	},
	emptyCard: {
		backgroundColor: '#FFF',
		borderRadius: 24,
		padding: 32,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		borderStyle: 'dashed',
	},
	emptyProfileText: {
		fontSize: 14,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
		lineHeight: 20,
	},
	editBtn: {
		paddingVertical: 6,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: '#F0F9FF',
	},
	editBtnText: {
		fontSize: 13,
		color: '#0369A1',
		fontWeight: '700',
	},
	setupBtn: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingVertical: 14,
		paddingHorizontal: 28,
		borderRadius: 16,
		marginTop: 16,
	},
	setupBtnText: {
		color: '#FFF',
		fontWeight: '800',
		fontSize: 15,
	},
	phantomCard: {
		borderColor: GIFTYY_THEME.colors.accent,
		borderWidth: 2,
		backgroundColor: '#F0FDFA',
		paddingVertical: 32,
		borderStyle: 'solid',
	},
	phantomBadge: {
		position: 'absolute',
		top: -14,
		backgroundColor: GIFTYY_THEME.colors.accent,
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 14,
		...GIFTYY_THEME.shadows.sm,
	},
	phantomBadgeText: {
		color: '#FFF',
		fontSize: 11,
		fontWeight: '900',
		letterSpacing: 1,
	},
	phantomIdTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#134E4A',
		marginTop: 12,
		marginBottom: 8,
	},
	phantomIdText: {
		fontSize: 15,
		color: '#0F766E',
		textAlign: 'center',
		lineHeight: 22,
		paddingHorizontal: 12,
		marginBottom: 24,
	},
	claimBtn: {
		backgroundColor: GIFTYY_THEME.colors.accent,
		paddingHorizontal: 28,
		paddingVertical: 14,
		borderRadius: 16,
		...GIFTYY_THEME.shadows.md,
	},
	claimBtnText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '800',
	},
	previewContainer: {
		gap: 16,
	},
	previewRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	iconCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	previewLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray400,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	tagsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	tag: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
	},
	tagText: {
		fontSize: 13,
		fontWeight: '600',
	},
	addressContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	addressLine: {
		fontSize: 16,
		color: GIFTYY_THEME.colors.gray800,
		fontWeight: '500',
		marginBottom: 2,
	},
	addressCountry: {
		fontSize: 14,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: '600',
		marginTop: 4,
		textTransform: 'uppercase',
	},
	emptyAddress: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
	},
	addBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: '#F0FDF4',
	},
	addBtnText: {
		fontSize: 13,
		color: '#15803D',
		fontWeight: '700',
	},
	occasionsListVertical: {
		gap: 12,
	},
	occasionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		backgroundColor: '#FFF',
		borderRadius: 16,
		...GIFTYY_THEME.shadows.sm,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.02)',
	},
	occasionIconWrapper: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#F3F4F6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	occasionEmojiSmall: {
		fontSize: 20,
	},
	occasionLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	occasionDate: {
		fontSize: 14,
		color: GIFTYY_THEME.colors.gray500,
		marginTop: 2,
		fontWeight: '500',
	},
	deleteOccasionBtn: {
		padding: 8,
		marginLeft: 4,
		borderRadius: 8,
	},
	suggestionsSection: {
		marginTop: 12,
	},
	suggestionsTitle: {
		fontSize: 13,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.gray400,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 12,
		marginLeft: 4,
	},
	suggestionsCarousel: {
		paddingLeft: 4,
		paddingRight: 20,
		paddingVertical: 12,
		gap: 12,
	},
	suggestionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFF',
		padding: 16,
		borderRadius: 20,
		...GIFTYY_THEME.shadows.sm,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.02)',
		width: 190,
	},
	suggestionInfo: {
		flex: 1,
		marginRight: 8,
	},
	suggestionName: {
		fontSize: 14,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray800,
	},
	suggestionDate: {
		fontSize: 12,
		color: GIFTYY_THEME.colors.gray500,
		marginTop: 2,
		fontWeight: '600',
	},
	suggestedAddBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	syncButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	syncButtonText: {
		color: GIFTYY_THEME.colors.gray700,
		fontSize: 12,
		fontWeight: '600',
	},
	welcomeSection: {
		marginBottom: verticalScale(20),
		paddingHorizontal: scale(24),
	},
	welcomeTitle: {
		fontSize: responsiveFontSize(18),
		fontWeight: '800',
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: verticalScale(2),
		letterSpacing: -0.3,
	},
	welcomeSubtitle: {
		fontSize: responsiveFontSize(13),
		color: GIFTYY_THEME.colors.gray500,
		lineHeight: verticalScale(18),
	},
	section: {
		marginBottom: verticalScale(24),
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scale(8),
		marginBottom: verticalScale(14),
		paddingHorizontal: scale(24),
	},
	sectionTitle: {
		fontSize: responsiveFontSize(15),
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray800,
		letterSpacing: -0.2,
	},
	countBadge: {
		backgroundColor: GIFTYY_THEME.colors.gray100,
		width: scale(24),
		height: scale(24),
		borderRadius: scale(12),
		alignItems: 'center',
		justifyContent: 'center',
	},
	countBadgeText: {
		fontSize: responsiveFontSize(11),
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray500,
	},
	carouselContent: {
		paddingHorizontal: scale(24),
		paddingBottom: verticalScale(32),
		gap: scale(16),
	},
	recipientList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: H_PADDING,
		gap: 8,
		rowGap: 20,
	},
	recipientCard: {
		width: (SCREEN_WIDTH - H_PADDING * 2 - 8 * 2) / 3,
		flexDirection: 'column',
		alignItems: 'center',
	},
	avatarCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
		borderWidth: 3,
		borderColor: '#FFFFFF',
	},
	avatarInitials: {
		fontSize: 21,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	approvalRow: {
		flexDirection: 'row',
		gap: 8,
	},
	approvalBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	approvalBtnAccept: {
		backgroundColor: GIFTYY_THEME.colors.gray900,
	},
	approvalBtnReject: {
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: verticalScale(48),
		paddingHorizontal: scale(32),
	},
	emptyIconContainer: {
		width: scale(72),
		height: scale(72),
		borderRadius: scale(36),
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: verticalScale(16),
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
	},
	emptyStateTitle: {
		fontSize: responsiveFontSize(16),
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: verticalScale(8),
	},
	emptyStateSubtitle: {
		fontSize: 15,
		fontFamily: 'Outfit-Medium',
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
		paddingHorizontal: scale(40),
		lineHeight: 22,
		marginBottom: verticalScale(24),
	},
	emptyAddButton: {
		backgroundColor: GIFTYY_THEME.colors.gray900,
		paddingHorizontal: scale(24),
		paddingVertical: verticalScale(11),
		borderRadius: scale(12),
	},
	emptyAddButtonText: {
		color: '#FFF',
		fontSize: responsiveFontSize(13),
		fontWeight: '600',
	},
	pendingCard: {
		width: PENDING_CARD_WIDTH,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginRight: 12,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
	},
	pendingCardMain: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 16,
	},
	pendingAvatarWrapper: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
	},
	pendingAvatarImage: {
		width: '100%',
		height: '100%',
		borderRadius: 24,
	},
	pendingAvatarInitials: {
		fontSize: 16,
		fontWeight: '800',
		color: '#FFF',
	},
	pendingCardContent: {
		flex: 1,
	},
	pendingNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		flexWrap: 'wrap',
		gap: 4,
	},
	pendingName: {
		fontSize: 15,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray900,
		letterSpacing: -0.2,
	},
	pendingSubtitle: {
		fontSize: 12,
		color: GIFTYY_THEME.colors.gray500,
		marginTop: 2,
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		gap: 4,
	},
	statusBadgeRequest: {
		backgroundColor: '#FEF2F2',
	},
	statusBadgeWaiting: {
		backgroundColor: '#FFF7ED',
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	statusBadgeText: {
		fontSize: 10,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	pendingCardActions: {
		flexDirection: 'row',
		gap: 8,
	},
	pendingActionBtn: {
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	pendingBtnAccept: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.gray900,
		flexDirection: 'row',
		gap: 8,
	},
	pendingBtnReject: {
		width: 40,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	pendingBtnTextWhite: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '800',
	},
	pendingBtnTextGray: {
		color: GIFTYY_THEME.colors.gray600,
		fontSize: 13,
		fontWeight: '700',
	},
	recipientName: {
		fontSize: 13,
		fontWeight: '600',
		color: GIFTYY_THEME.colors.gray900,
		textAlign: 'center',
		marginBottom: 2,
	},
	relationshipBadge: {
		backgroundColor: '#ecfdf5',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
		marginTop: 2,
	},
	relationshipBadgeText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#16a34a',
		textAlign: 'center',
		textTransform: 'capitalize',
	},
	recipientCardPressed: {
		opacity: 0.7,
	},
	verifiedBadge: {
		position: 'absolute',
		bottom: -1,
		right: -1,
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1.5,
		borderColor: '#FFFFFF',
	},
	fillImage: {
		width: '100%',
		height: '100%',
		borderRadius: 999,
	},
	// Celebrations Section
	celebrationCarousel: {
		marginHorizontal: scale(-24),
		marginBottom: verticalScale(16),
	},
	celebrationCarouselContent: {
		paddingHorizontal: scale(24),
		gap: scale(12),
	},
	celebrationCardSmall: {
		width: scale(150),
		backgroundColor: '#FFF',
		borderRadius: 20,
		padding: scale(12),
		...GIFTYY_THEME.shadows.md,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.03)',
	},
	celebrationHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: verticalScale(8),
	},
	recipientAvatarSmall: {
		width: scale(32),
		height: scale(32),
		borderRadius: scale(16),
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarTextSmall: {
		fontSize: responsiveFontSize(11),
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray600,
	},
	avatarImage: {
		width: '100%',
		height: '100%',
		borderRadius: scale(16),
	},
	celebrationDaysSmall: {
		paddingHorizontal: scale(8),
		paddingVertical: verticalScale(2),
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderRadius: 8,
	},
	celebrationDaysTextSmall: {
		fontSize: responsiveFontSize(9),
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray500,
	},
	celebrationRecipientSmall: {
		fontSize: responsiveFontSize(14),
		fontWeight: '700',
		color: '#2F2318',
		marginBottom: verticalScale(2),
	},
	celebrationRowSmall: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scale(4),
	},
	celebrationLabelSmall: {
		fontSize: responsiveFontSize(11),
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: '500',
	},
	emptyOccasionsCard: {
		backgroundColor: '#F9FAFB',
		borderRadius: 20,
		padding: scale(24),
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#F3F4F6',
		borderStyle: 'dashed',
	},
	emptyOccasionsText: {
		fontSize: 15,
		fontFamily: 'Outfit-Medium',
		color: GIFTYY_THEME.colors.gray500,
		marginTop: verticalScale(8),
		textAlign: 'center',
		lineHeight: 22,
	},
	// Address edit modal styles
	addressModalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: 48,
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(47,35,24,0.08)',
	},
	addressModalTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#2F2318',
	},
	closeButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(47,35,24,0.06)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addressModalContent: {
		padding: 20,
		gap: 4,
		paddingBottom: 40,
	},
	addressFieldLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: GIFTYY_THEME.colors.gray500,
		marginTop: 14,
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	addressFieldInput: {
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 15,
		color: '#2F2318',
		backgroundColor: '#FAFAFA',
	},
	addressModalFooter: {
		paddingHorizontal: 20,
		paddingBottom: 40,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: 'rgba(47,35,24,0.06)',
	},
	addressSaveBtn: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 14,
		paddingVertical: 15,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addressSaveBtnText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
});
