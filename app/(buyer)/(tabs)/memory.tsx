import { IconSymbol } from '@/components/ui/icon-symbol';
import { MemoryThumbnail } from '@/components/memory/MemoryThumbnail';
import { VideoPreview } from '@/components/VideoPreview';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useOrders } from '@/contexts/OrdersContext';
import { useSharedMemories, type SharedMemory } from '@/contexts/SharedMemoriesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useVaults } from '@/contexts/VaultsContext';
import { useVideoMessages, VideoMessage } from '@/contexts/VideoMessagesContext';
import { useSignedVideoUrl } from '@/hooks/useSignedVideoUrl';
import { supabase } from '@/lib/supabase';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, InteractionManager, Modal, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const baseTabs = ['Overview', 'Messages', 'Reactions', 'Shared memories'] as const;
type TabKey = (typeof baseTabs)[number] | 'Vaults';

const palette = {
    background: '#fff',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accent: '#FCEEE7',
};

export type MemoryVideoItem = {
    id: string;
    title: string;
    duration: string;
    date: string;
    videoUrl: string;
    direction: 'sent' | 'received';
    mediaType?: 'video' | 'photo'; // Optional for backward compatibility
    orderId?: string; // Optional order ID for gift QR codes
};

type RecipientReactionRow = {
    id: string;
    order_id: string | null;
    video_message_id: string | null;
    reaction_video_url: string | null;
    duration_seconds: number | null;
    recorded_at: string | null;
    created_at: string | null;
    recipient_user_id: string | null;
};

type ReactionVideoItem = MemoryVideoItem & {
    reactionType: 'to_your_gifts' | 'your_reactions';
    orderId?: string;
};

// Helper function to convert VideoMessage to MemoryVideoItem
function videoMessageToMemoryItem(video: VideoMessage): MemoryVideoItem {
    const date = new Date(video.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Format duration if available
    const duration = video.durationSeconds
        ? `${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, '0')}`
        : '00:00';

    return {
        id: video.id,
        title: video.title,
        duration,
        date: formattedDate,
        videoUrl: video.videoUrl,
        direction: video.direction,
        orderId: video.orderId, // Include orderId for QR code generation
    };
}

type VaultCollectionItem = {
    id: string;
    name: string;
    description?: string;
    categoryType?: string;
    videos: MemoryVideoItem[];
};

type RememberMemoryItem = MemoryVideoItem & { label: string };
type MessageVideoItem = MemoryVideoItem;

// Helper function to get older memories for "Remember this?" section
function getRememberMemories(videos: MemoryVideoItem[], videoMessages: VideoMessage[]): RememberMemoryItem[] {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    // Create a map of video ID to createdAt date for efficient lookup
    const videoDateMap = new Map<string, Date>();
    videoMessages.forEach((vm) => {
        videoDateMap.set(vm.id, new Date(vm.createdAt));
    });

    const older = videos.filter((video) => {
        const videoDate = videoDateMap.get(video.id) || new Date(video.date);
        return videoDate < threeMonthsAgo;
    });

    return older.slice(0, 8).map((video) => {
        const videoDate = videoDateMap.get(video.id) || new Date(video.date);
        let label = 'Older';

        if (videoDate >= oneYearAgo) {
            label = 'Last year';
        } else if (videoDate >= twoYearsAgo) {
            label = 'Two years ago';
        } else {
            const yearsAgo = now.getFullYear() - videoDate.getFullYear();
            label = `${yearsAgo} ${yearsAgo === 1 ? 'year' : 'years'} ago`;
        }

        return { ...video, label };
    });
}

export default function MemoryTabScreen() {
    const { top } = useSafeAreaInsets();
    const params = useLocalSearchParams<{ tab?: string }>();
    const { videoMessages, loading: videosLoading, refreshVideoMessages } = useVideoMessages();
    const { vaults, loading: vaultsLoading, refreshVaults } = useVaults();
    const { sharedMemories, loading: sharedMemoriesLoading, refreshSharedMemories } = useSharedMemories();
    const { addNotification } = useNotifications();
    const [activeTab, setActiveTab] = useState<TabKey>('Overview');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerData, setViewerData] = useState<MemoryVideoItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Convert video messages to memory items
    const messageVideos = useMemo(() => {
        return videoMessages.map(videoMessageToMemoryItem);
    }, [videoMessages]);

    // Featured memories are the most recent 4 videos
    const featuredMemories = useMemo(() => {
        return messageVideos.slice(0, 4);
    }, [messageVideos]);

    // Use vaults fetched from Supabase
    const vaultCollections = useMemo(() => {
        return vaults.map((vault) => ({
            id: vault.id,
            name: vault.name,
            description: vault.description,
            categoryType: vault.categoryType,
            videos: vault.videos.map(videoMessageToMemoryItem),
        }));
    }, [vaults]);

    const hasVaults = useMemo(
        () => vaultCollections.some((v) => (v.videos?.length ?? 0) > 0),
        [vaultCollections]
    );

    const vaultUnlockNotifiedRef = useRef(false);

    const tabs = useMemo<TabKey[]>(() => {
        return hasVaults ? [...baseTabs, 'Vaults'] : [...baseTabs];
    }, [hasVaults]);

    // Allow navigation directly to a specific tab via URL param (e.g. from Home "Key features" carousel)
    useEffect(() => {
        const raw = params?.tab;
        const requested = typeof raw === 'string' ? raw : undefined;
        if (!requested) return;

        // Accept exact match, or case-insensitive match against available tabs.
        const normalized = requested.trim().toLowerCase();
        const match = tabs.find((t) => String(t).toLowerCase() === normalized);
        if (match && match !== activeTab) {
            setActiveTab(match);
        }
    }, [params?.tab, tabs, activeTab]);

    useEffect(() => {
        if (!tabs.includes(activeTab)) {
            setActiveTab(tabs[0]);
        }
    }, [tabs, activeTab]);

    useEffect(() => {
        if (hasVaults && !vaultUnlockNotifiedRef.current) {
            vaultUnlockNotifiedRef.current = true;
            const createdAt = Date.now();

            // In-app alert
            Alert.alert(
                'Vaults unlocked',
                'You just unlocked Vaults. Organize and replay all your memories in one place.',
                [
                    { text: 'Maybe later', style: 'cancel' },
                    { text: 'View vaults', onPress: () => setActiveTab('Vaults') },
                ]
            );

            // Persistent in-app notification
            addNotification({
                id: `vaults-unlocked-${createdAt}`,
                title: 'Vaults unlocked',
                body: 'Your memories are now organized into Vaults. Tap to view them.',
                createdAt,
                read: false,
                actionLabel: 'View vaults',
                actionHref: '/(buyer)/(tabs)/memory?vaults=1',
            });
        }
    }, [hasVaults, setActiveTab, addNotification]);

    // Generate "Remember this?" memories from older videos
    const rememberMemories = useMemo(() => {
        return getRememberMemories(messageVideos, videoMessages);
    }, [messageVideos, videoMessages]);

    // Calculate real stats
    const stats = useMemo(() => {
        const totalVideos = messageVideos.length;
        const sentCount = messageVideos.filter((v) => v.direction === 'sent').length;
        const receivedCount = messageVideos.filter((v) => v.direction === 'received').length;
        // Count "new" as videos from the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const newCount = videoMessages.filter((v) => new Date(v.createdAt) >= weekAgo).length;

        return {
            total: totalVideos,
            sent: sentCount,
            received: receivedCount,
            new: newCount,
            vaults: vaultCollections.length,
        };
    }, [messageVideos, videoMessages, vaultCollections]);

    const description = useMemo(() => {
        switch (activeTab) {
            case 'Messages':
                return 'Catch up on replies, share reactions, or download a clip for later.';
            case 'Reactions':
                return 'Watch reactions to your gifts and revisit the reactions you recorded.';
            case 'Vaults':
                return 'Organize memories in themed vaults to keep big moments easy to revisit.';
            case 'Shared memories':
                return 'View and manage your uploaded shared memories, including videos and photos.';
            default:
                return 'Relive heartfelt reactions, manage your greetings, and curate vaults.';
        }
    }, [activeTab]);

    const handleOpenViewer = useCallback((index: number, data: MemoryVideoItem[]) => {
        setViewerData(data);
        setViewerIndex(index);
        // On Android, add a delay to allow VideoPreview components to unload before opening viewer
        // This helps prevent HEVC decoder initialization failures when multiple videos are loaded
        if (Platform.OS === 'android') {
            // Small delay to allow VideoPreview cleanup before opening full-screen viewer
            setTimeout(() => {
                setViewerVisible(true);
            }, 250);
        } else {
            setViewerVisible(true);
        }
    }, []);

    const handleCloseViewer = useCallback(() => {
        setViewerVisible(false);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                refreshVideoMessages(),
                refreshSharedMemories(),
                refreshVaults(),
            ]);
        } catch (error) {
            console.error('Error refreshing memories:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshVideoMessages, refreshSharedMemories, refreshVaults]);

    const [mediaTypeModalVisible, setMediaTypeModalVisible] = useState(false);
    const { addSharedMemory } = useSharedMemories();
    const [pendingPickerType, setPendingPickerType] = useState<'video' | 'photo' | null>(null);

    const handleUploadMemory = useCallback(() => {
        setMediaTypeModalVisible(true);
    }, []);

    const handleSelectMediaType = useCallback((mediaType: 'video' | 'photo') => {
        // Close the modal first, then launch the picker after the dismissal animation finishes.
        setPendingPickerType(mediaType);
        setMediaTypeModalVisible(false);
    }, []);

    useEffect(() => {
        if (!pendingPickerType) return;
        if (mediaTypeModalVisible) return;

        let cancelled = false;

        const run = () => {
            InteractionManager.runAfterInteractions(async () => {
                try {
                    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!permission.granted) {
                        Alert.alert('Permission required', 'Please allow media library access to upload a memory.');
                        return;
                    }

                    // Support both newer and older expo-image-picker APIs.
                    const MediaTypeEnum = (ImagePicker as any).MediaType;
                    const mediaTypes =
                        pendingPickerType === 'video'
                            ? MediaTypeEnum?.Videos
                                ? [MediaTypeEnum.Videos]
                                : (['videos'] as const)
                            : MediaTypeEnum?.Images
                                ? [MediaTypeEnum.Images]
                                : (['images'] as const);

                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes,
                        allowsMultipleSelection: false,
                        quality: 1,
                    });

                    if (cancelled || result.canceled) {
                        return;
                    }

                    const asset = result.assets?.[0];
                    if (!asset?.uri) {
                        Alert.alert('No media selected', 'Please try selecting a photo or video again.');
                        return;
                    }

                    // Open title input modal
                    setSelectedAsset({ uri: asset.uri, mediaType: pendingPickerType });
                    setTitleModalVisible(true);
                } catch (err: any) {
                    console.error('[Shared memories] Image picker failed:', err);
                    Alert.alert('Could not open gallery', err?.message || 'Please try again.');
                } finally {
                    !cancelled && setPendingPickerType(null);
                }
            });
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [pendingPickerType, mediaTypeModalVisible]);

    const [titleModalVisible, setTitleModalVisible] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<{ uri: string; mediaType: 'video' | 'photo' } | null>(null);
    const [memoryTitle, setMemoryTitle] = useState('');

    const handleUploadWithTitle = useCallback(async () => {
        if (!selectedAsset || !memoryTitle.trim()) {
            Alert.alert('Title required', 'Please enter a title for your memory.');
            return;
        }

        setTitleModalVisible(false);

        try {
            const { memory, error } = await addSharedMemory(
                selectedAsset.uri,
                memoryTitle.trim(),
                selectedAsset.mediaType
            );

            if (error) {
                Alert.alert('Upload failed', error.message);
            } else {
                Alert.alert('Success', 'Your memory has been uploaded!');
                setMemoryTitle('');
                setSelectedAsset(null);
            }
        } catch (err: any) {
            Alert.alert('Upload failed', err.message || 'An error occurred while uploading.');
        }
    }, [selectedAsset, memoryTitle, addSharedMemory]);

    const handleCancelMediaType = useCallback(() => {
        setMediaTypeModalVisible(false);
    }, []);

    const { bottom } = useSafeAreaInsets();
    return (
        <View style={[styles.screen, { paddingTop: top + 6 }]}>
            <View style={styles.fixedTabContainer}>
                <Text style={styles.fixedTabTitle}>Memories</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBar}
                    style={styles.tabBarContainer}
                >
                    {tabs.map((tab) => {
                        const isActive = tab === activeTab;
                        return (
                            <Pressable key={tab} style={[styles.tabPill, isActive && styles.tabPillActive]} onPress={() => setActiveTab(tab)}>
                                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>{tab}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>
            {activeTab === 'Messages' ? (
                <MessagesPanel
                    messageVideos={messageVideos}
                    onOpenViewer={(index) => handleOpenViewer(index, messageVideos)}
                    viewerVisible={viewerVisible}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : activeTab === 'Shared memories' ? (
                <SharedMemoriesPanel
                    sharedMemories={sharedMemories}
                    loading={sharedMemoriesLoading}
                    onUpload={handleUploadMemory}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : activeTab === 'Reactions' ? (
                <ReactionsPanel
                    onOpenViewer={(index, data) => handleOpenViewer(index, data)}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : activeTab === 'Vaults' ? (
                <VaultsPanel
                    vaultCollections={vaultCollections}
                    loading={vaultsLoading}
                    onOpenVault={(collection, startIndex = 0) => handleOpenViewer(startIndex, collection.videos)}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    onUploadMemory={() => {
                        setActiveTab('Shared memories');
                        handleUploadMemory();
                    }}
                    onGoToMessages={() => setActiveTab('Messages')}
                />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollArea}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20, flexGrow: 1 }]}
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
                    {activeTab === 'Overview' && (
                        <View style={styles.heroContainer}>
                            <View style={styles.heroCard}>
                                <View style={styles.heroHeaderSection}>
                                    <View style={styles.heroTitleRow}>
                                        <Text style={styles.heroHeading}>Memories</Text>
                                        {stats.new > 0 && (
                                            <View style={styles.heroNewBadge}>
                                                <Text style={styles.heroNewBadgeText}>{stats.new} new</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.heroSubtitle}>{description}</Text>
                                </View>

                                <View style={styles.heroStatsGrid}>
                                    <View style={styles.heroStatItem}>
                                        <Text style={styles.heroStatNumber}>{stats.total}</Text>
                                        <Text style={styles.heroStatLabel}>Total clips</Text>
                                    </View>
                                    <View style={styles.heroStatDivider} />
                                    <View style={styles.heroStatItem}>
                                        <Text style={styles.heroStatNumber}>{stats.vaults}</Text>
                                        <Text style={styles.heroStatLabel}>Vaults</Text>
                                    </View>
                                    <View style={styles.heroStatDivider} />
                                    <View style={styles.heroStatItem}>
                                        <Text style={styles.heroStatNumber}>{stats.received}</Text>
                                        <Text style={styles.heroStatLabel}>Received</Text>
                                    </View>
                                </View>

                                <Pressable style={styles.heroActionButton} onPress={handleUploadMemory}>
                                    <IconSymbol name="plus.circle.fill" size={18} color={BRAND_COLOR} />
                                    <Text style={styles.heroActionLabel}>Upload shared memory</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    <View style={styles.panelContainer}>
                        {activeTab === 'Overview' && (
                            <OverviewPanel
                                featuredMemories={featuredMemories}
                                vaultCollections={vaultCollections}
                                rememberMemories={rememberMemories}
                                vaultsLoading={vaultsLoading}
                                onOpenFeatured={(index) => handleOpenViewer(index, featuredMemories)}
                                onOpenVault={(collection, startIndex = 0) => handleOpenViewer(startIndex, collection.videos)}
                                onOpenRemember={(index) => handleOpenViewer(index, rememberMemories)}
                            />
                        )}
                    </View>
                </ScrollView>
            )}

            <MessageVideoViewer
                visible={viewerVisible}
                initialIndex={viewerIndex}
                data={viewerData}
                onClose={handleCloseViewer}
            />

            {/* Media Type Selection Modal */}
            <Modal
                visible={mediaTypeModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCancelMediaType}
            >
                <Pressable style={styles.modalBackdrop} onPress={handleCancelMediaType}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Select Media Type</Text>
                        <Text style={styles.modalSubtitle}>Choose what you'd like to upload</Text>

                        <Pressable
                            style={styles.modalOption}
                            onPress={() => handleSelectMediaType('video')}
                        >
                            <View style={styles.modalOptionIcon}>
                                <IconSymbol name="video.fill" size={24} color={BRAND_COLOR} />
                            </View>
                            <View style={styles.modalOptionContent}>
                                <Text style={styles.modalOptionTitle}>Video</Text>
                                <Text style={styles.modalOptionSubtitle}>Upload a video memory</Text>
                            </View>
                            <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
                        </Pressable>

                        <Pressable
                            style={styles.modalOption}
                            onPress={() => handleSelectMediaType('photo')}
                        >
                            <View style={styles.modalOptionIcon}>
                                <IconSymbol name="photo.fill" size={24} color={BRAND_COLOR} />
                            </View>
                            <View style={styles.modalOptionContent}>
                                <Text style={styles.modalOptionTitle}>Photo</Text>
                                <Text style={styles.modalOptionSubtitle}>Upload a photo memory</Text>
                            </View>
                            <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
                        </Pressable>

                        <Pressable style={styles.modalCancelButton} onPress={handleCancelMediaType}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Title Input Modal */}
            <Modal
                visible={titleModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTitleModalVisible(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setTitleModalVisible(false)}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Memory Title</Text>
                        <Text style={styles.modalSubtitle}>Give your memory a title</Text>

                        <View style={styles.titleInputContainer}>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="Enter memory title..."
                                placeholderTextColor={palette.textSecondary}
                                value={memoryTitle}
                                onChangeText={setMemoryTitle}
                                autoFocus
                                maxLength={100}
                            />
                        </View>

                        <View style={styles.titleModalActions}>
                            <Pressable
                                style={[styles.titleModalButton, styles.titleModalButtonSecondary]}
                                onPress={() => {
                                    setTitleModalVisible(false);
                                    setMemoryTitle('');
                                    setSelectedAsset(null);
                                }}
                            >
                                <Text style={styles.titleModalButtonTextSecondary}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.titleModalButton, styles.titleModalButtonPrimary]}
                                onPress={handleUploadWithTitle}
                            >
                                <Text style={styles.titleModalButtonTextPrimary}>Upload</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

function formatDuration(durationSeconds?: number | null): string {
    if (!durationSeconds || durationSeconds <= 0) return '00:00';
    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.floor(durationSeconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatDate(dateString?: string | null): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ReactionCard({ item, onPress }: { item: ReactionVideoItem; onPress: () => void }) {
    return (
        <Pressable style={styles.reactionCard} onPress={onPress}>
            <MemoryThumbnail
                fallbackUrl={item.videoUrl}
                style={styles.reactionThumb}
                showPlay={true}
            />
            <View style={styles.reactionMeta}>
                <Text style={styles.reactionTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.reactionMetaRow}>
                    {item.date ? (
                        <Text style={styles.reactionMetaText}>{item.date}</Text>
                    ) : null}
                    <Text style={styles.reactionMetaDot}>•</Text>
                    <Text style={styles.reactionMetaText}>{item.duration}</Text>
                </View>
            </View>
            <IconSymbol name="chevron.right" size={18} color={palette.textSecondary} />
        </Pressable>
    );
}

function ReactionsPanel({
    onOpenViewer,
    refreshing,
    onRefresh,
}: {
    onOpenViewer: (index: number, data: ReactionVideoItem[]) => void;
    refreshing?: boolean;
    onRefresh?: () => void;
}) {
    const { user } = useAuth();
    const { orders } = useOrders();
    const { bottom } = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [toYourGifts, setToYourGifts] = useState<ReactionVideoItem[]>([]);
    const [yourReactions, setYourReactions] = useState<ReactionVideoItem[]>([]);

    const fetchReactions = useCallback(async () => {
        if (!user) {
            setToYourGifts([]);
            setYourReactions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const orderIds = orders.map(o => o.id);

            const baseSelect = 'id,order_id,video_message_id,reaction_video_url,duration_seconds,recorded_at,created_at,recipient_user_id';

            const [mineRes, toGiftsRes] = await Promise.all([
                supabase
                    .from('recipient_reactions')
                    .select(baseSelect)
                    .eq('recipient_user_id', user.id)
                    .order('recorded_at', { ascending: false }),
                orderIds.length > 0
                    ? supabase
                        .from('recipient_reactions')
                        .select(baseSelect)
                        .in('order_id', orderIds)
                        .neq('recipient_user_id', user.id)
                        .order('recorded_at', { ascending: false })
                    : Promise.resolve({ data: [], error: null } as any),
            ]);

            if (mineRes.error) {
                console.warn('[ReactionsPanel] Error fetching your reactions:', mineRes.error);
            }
            if (toGiftsRes.error) {
                console.warn('[ReactionsPanel] Error fetching reactions to your gifts:', toGiftsRes.error);
            }

            const orderById = new Map(orders.map(o => [o.id, o]));

            const mapRow = (row: any, reactionType: ReactionVideoItem['reactionType']): ReactionVideoItem | null => {
                const r = row as RecipientReactionRow;
                const url = r.reaction_video_url || '';
                if (!url) return null;
                const order = r.order_id ? orderById.get(r.order_id) : undefined;
                const recorded = r.recorded_at || r.created_at;
                const date = formatDate(recorded);
                const duration = formatDuration(r.duration_seconds);

                let title = 'Reaction';
                if (reactionType === 'to_your_gifts' && order?.recipient?.firstName) {
                    title = `Reaction from ${order.recipient.firstName}`;
                } else if (reactionType === 'your_reactions') {
                    title = 'Your reaction';
                }

                return {
                    id: r.id,
                    title,
                    duration,
                    date,
                    videoUrl: url,
                    direction: reactionType === 'to_your_gifts' ? 'received' : 'sent',
                    orderId: r.order_id || undefined,
                    reactionType,
                };
            };

            const mine = (mineRes.data || [])
                .map((row: any) => mapRow(row, 'your_reactions'))
                .filter(Boolean) as ReactionVideoItem[];
            const toGifts = (toGiftsRes.data || [])
                .map((row: any) => mapRow(row, 'to_your_gifts'))
                .filter(Boolean) as ReactionVideoItem[];

            setYourReactions(mine);
            setToYourGifts(toGifts);
        } catch (err) {
            console.warn('[ReactionsPanel] Unexpected error fetching reactions:', err);
        } finally {
            setLoading(false);
        }
    }, [user, orders]);

    useEffect(() => {
        fetchReactions();
    }, [fetchReactions]);

    const hasAny = toYourGifts.length > 0 || yourReactions.length > 0;

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24 }]}
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing || false}
                        onRefresh={async () => {
                            await Promise.all([fetchReactions(), onRefresh()]);
                        }}
                        tintColor={BRAND_COLOR}
                        colors={[BRAND_COLOR]}
                    />
                ) : undefined
            }
        >
            <View style={styles.reactionsSection}>
                <Text style={styles.sectionTitle}>Reactions</Text>
                <Text style={styles.sectionSubtitle}>
                    {loading ? 'Loading reactions…' : hasAny ? 'All your reaction videos in one place.' : 'No reactions yet.'}
                </Text>
            </View>

            {!loading && !hasAny ? (
                <View style={styles.sectionEmpty}>
                    <IconSymbol name="heart" size={34} color="#9ba1a6" />
                    <Text style={styles.sectionEmptyText}>No reactions yet</Text>
                    <Text style={styles.sectionEmptySubtext}>
                        When someone reacts to a gift you sent — or when you record a reaction — it will appear here.
                    </Text>
                </View>
            ) : (
                <>
                    {toYourGifts.length > 0 && (
                        <View style={styles.reactionGroup}>
                            <Text style={styles.reactionGroupTitle}>Reactions to your gifts</Text>
                            {toYourGifts.map((item, idx) => (
                                <ReactionCard
                                    key={item.id}
                                    item={item}
                                    onPress={() => onOpenViewer(idx, toYourGifts)}
                                />
                            ))}
                        </View>
                    )}

                    {yourReactions.length > 0 && (
                        <View style={styles.reactionGroup}>
                            <Text style={styles.reactionGroupTitle}>Your reactions</Text>
                            {yourReactions.map((item, idx) => (
                                <ReactionCard
                                    key={item.id}
                                    item={item}
                                    onPress={() => onOpenViewer(idx, yourReactions)}
                                />
                            ))}
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
}

function OverviewPanel({
    featuredMemories,
    vaultCollections,
    rememberMemories,
    vaultsLoading,
    onOpenFeatured,
    onOpenVault,
    onOpenRemember,
}: {
    featuredMemories: MemoryVideoItem[];
    vaultCollections: VaultCollectionItem[];
    rememberMemories: RememberMemoryItem[];
    vaultsLoading?: boolean;
    onOpenFeatured: (index: number) => void;
    onOpenVault: (collection: VaultCollectionItem, startIndex?: number) => void;
    onOpenRemember: (index: number) => void;
}) {
    const { orders } = useOrders();
    const { sharedMemories } = useSharedMemories();
    const { user } = useAuth();

    // Create maps of videoId -> sharedMemoryType for featured and remember memories
    const [featuredSharedMemoryMap, setFeaturedSharedMemoryMap] = useState<Map<string, 'video' | 'photo'>>(new Map());
    const [rememberSharedMemoryMap, setRememberSharedMemoryMap] = useState<Map<string, 'video' | 'photo'>>(new Map());

    // Fetch shared memory types for featured memories
    useEffect(() => {
        const fetchFeaturedSharedMemoryInfo = async () => {
            const map = new Map<string, 'video' | 'photo'>();

            for (const memory of featuredMemories) {
                if (memory.orderId) {
                    const order = orders.find(o => o.id === memory.orderId);
                    if (order?.sharedMemoryId) {
                        const sharedMemory = sharedMemories.find(sm => sm.id === order.sharedMemoryId);
                        if (sharedMemory) {
                            map.set(memory.id, sharedMemory.mediaType);
                        }
                    }
                }
            }

            setFeaturedSharedMemoryMap(map);
        };

        fetchFeaturedSharedMemoryInfo();
    }, [featuredMemories, orders, sharedMemories]);

    // Fetch shared memory types for remember memories
    useEffect(() => {
        const fetchRememberSharedMemoryInfo = async () => {
            const map = new Map<string, 'video' | 'photo'>();

            for (const memory of rememberMemories) {
                if (memory.orderId) {
                    const order = orders.find(o => o.id === memory.orderId);
                    if (order?.sharedMemoryId) {
                        const sharedMemory = sharedMemories.find(sm => sm.id === order.sharedMemoryId);
                        if (sharedMemory) {
                            map.set(memory.id, sharedMemory.mediaType);
                        }
                    }
                }
            }

            setRememberSharedMemoryMap(map);
        };

        fetchRememberSharedMemoryInfo();
    }, [rememberMemories, orders, sharedMemories]);

    return (
        <View style={styles.sectionGap}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured messages</Text>
                {featuredMemories.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.featuredScroll}
                    >
                        {featuredMemories.map((memory, index) => (
                            <FeaturedMemoryCard
                                key={memory.id}
                                {...memory}
                                sharedMemoryType={featuredSharedMemoryMap.get(memory.id)}
                                onPress={() => onOpenFeatured(index)}
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.sectionEmpty}>
                        <IconSymbol name="camera.fill" size={32} color="#9ba1a6" />
                        <Text style={styles.sectionEmptyText}>No featured messages yet</Text>
                        <Text style={styles.sectionEmptySubtext}>Your most recent video messages will appear here.</Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vaults</Text>
                {vaultsLoading && vaultCollections.length === 0 ? (
                    <View style={styles.sectionEmpty}>
                        <ActivityIndicator color={BRAND_COLOR} />
                        <Text style={styles.sectionEmptyText}>Loading vaults…</Text>
                        <Text style={styles.sectionEmptySubtext}>Hang tight while we fetch your personalized vaults.</Text>
                    </View>
                ) : vaultCollections.length > 0 ? (
                    <View style={styles.listStack}>
                        {vaultCollections.slice(0, 4).map((collection) => (
                            <VaultRow
                                key={collection.id}
                                collection={collection}
                                onPress={() => onOpenVault(collection)}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={styles.sectionEmpty}>
                        <IconSymbol name="camera.fill" size={32} color="#9ba1a6" />
                        <Text style={styles.sectionEmptyText}>No vaults yet</Text>
                        <Text style={styles.sectionEmptySubtext}>Your videos will appear here once our AI curates themed vaults.</Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Remember this?</Text>
                {rememberMemories.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.featuredScroll}
                    >
                        {rememberMemories.map((memory, index) => (
                            <RememberMemoryCard
                                key={memory.id}
                                {...memory}
                                sharedMemoryType={rememberSharedMemoryMap.get(memory.id)}
                                onPress={() => onOpenRemember(index)}
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.sectionEmpty}>
                        <IconSymbol name="camera.fill" size={32} color="#9ba1a6" />
                        <Text style={styles.sectionEmptyText}>No older memories yet</Text>
                        <Text style={styles.sectionEmptySubtext}>Memories from more than 3 months ago will appear here.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

function MessagesPanel({ messageVideos, onOpenViewer, viewerVisible, refreshing, onRefresh }: { messageVideos: MessageVideoItem[]; onOpenViewer: (index: number) => void; viewerVisible?: boolean; refreshing?: boolean; onRefresh?: () => void }) {
    const batchSize = 9;
    const [visibleCount, setVisibleCount] = useState(batchSize);
    const [loadingMore, setLoadingMore] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { orders } = useOrders();
    const { user } = useAuth();
    const { sharedMemories } = useSharedMemories();
    const [sharedMemoryMap, setSharedMemoryMap] = useState<Map<string, 'video' | 'photo'>>(new Map());

    const visibleVideos = useMemo(() => messageVideos.slice(0, visibleCount), [messageVideos, visibleCount]);
    const canLoadMore = visibleCount < messageVideos.length;

    // Fetch shared_memory_id for orders referenced by video messages
    // Relationship: video_messages -> orders (via order_id) -> shared_memories (via shared_memory_id)
    useEffect(() => {
        const fetchSharedMemoryInfo = async () => {
            // Debug: Check for videos without orderIds (shouldn't happen - videos are created during order placement)
            const videosWithoutOrders = messageVideos.filter(item => !item.orderId);
            if (videosWithoutOrders.length > 0) {
                console.warn('[MessagesPanel] Found videos without orderId (unexpected):', videosWithoutOrders.map(v => ({ id: v.id, title: v.title })));
            }

            // Get unique orderIds from video messages
            const orderIds = messageVideos
                .filter(item => item.orderId)
                .map(item => item.orderId!)
                .filter((id, index, self) => self.indexOf(id) === index); // unique

            if (orderIds.length === 0) {
                setSharedMemoryMap(new Map());
                return;
            }

            try {
                // Query database for shared_memory_id of these orders
                // First check in-memory orders array
                const inMemoryMap = new Map<string, 'video' | 'photo'>();
                const videosWithMissingOrders: string[] = [];

                messageVideos.forEach(item => {
                    if (item.orderId) {
                        const order = orders.find(o => o.id === item.orderId);
                        if (order) {
                            if (order.sharedMemoryId) {
                                // Find the shared memory to get its type
                                const sharedMemory = sharedMemories.find(sm => sm.id === order.sharedMemoryId);
                                if (sharedMemory) {
                                    inMemoryMap.set(item.id, sharedMemory.mediaType);
                                }
                            }
                        } else {
                            videosWithMissingOrders.push(item.id);
                        }
                    }
                });

                // Debug: Log videos whose orders aren't found in memory
                if (videosWithMissingOrders.length > 0) {
                    const missingOrderIds = messageVideos
                        .filter(item => videosWithMissingOrders.includes(item.id))
                        .map(item => item.orderId!);
                    console.warn('[MessagesPanel] Videos with orders not found in memory (will query DB):',
                        missingOrderIds.map((orderId, idx) => ({ videoId: videosWithMissingOrders[idx], orderId }))
                    );
                }

                // Find orderIds that aren't in the in-memory orders
                const missingOrderIds = orderIds.filter(orderId =>
                    !orders.some(o => o.id === orderId)
                );

                if (missingOrderIds.length > 0) {
                    // Query database for missing orders
                    // Filter by user_id to match RLS policies (users can only see their own orders)
                    let query = supabase
                        .from('orders')
                        .select('id, shared_memory_id')
                        .in('id', missingOrderIds);

                    // Add user_id filter if user is available (required for RLS)
                    if (user?.id) {
                        query = query.eq('user_id', user.id);
                    }

                    const { data, error } = await query;

                    if (error) {
                        console.error('[MessagesPanel] Error fetching order shared_memory_ids:', error);
                        setSharedMemoryMap(inMemoryMap);
                        return;
                    }

                    // Debug: Check if all orders were found in database
                    const foundOrderIds = new Set((data || []).map((o: any) => o.id));
                    const notFoundOrderIds = missingOrderIds.filter(id => !foundOrderIds.has(id));
                    if (notFoundOrderIds.length > 0) {
                        console.warn('[MessagesPanel] Orders not found in database (may be due to RLS or deleted orders):', notFoundOrderIds);
                        console.warn('[MessagesPanel] User ID:', user?.id, 'Total orders queried:', missingOrderIds.length, 'Found:', foundOrderIds.size);
                    }

                    // Create a map of orderId -> sharedMemoryId
                    const orderSharedMemoryMap = new Map<string, string | null>();
                    (data || []).forEach((order: any) => {
                        orderSharedMemoryMap.set(order.id, order.shared_memory_id);
                    });

                    // Update the map with database results
                    messageVideos.forEach(item => {
                        if (item.orderId && !inMemoryMap.has(item.id)) {
                            const sharedMemoryId = orderSharedMemoryMap.get(item.orderId);
                            if (sharedMemoryId) {
                                // Find the shared memory to get its type
                                const sharedMemory = sharedMemories.find(sm => sm.id === sharedMemoryId);
                                if (sharedMemory) {
                                    inMemoryMap.set(item.id, sharedMemory.mediaType);
                                }
                            }
                        }
                    });
                }

                setSharedMemoryMap(inMemoryMap);
            } catch (err) {
                console.error('[MessagesPanel] Unexpected error fetching shared memory info:', err);
                setSharedMemoryMap(new Map());
            }
        };

        fetchSharedMemoryInfo();
    }, [messageVideos, orders, user?.id, sharedMemories]);

    const handleLoadMore = useCallback(() => {
        if (!canLoadMore || loadingMore) {
            return;
        }

        setLoadingMore(true);
        timeoutRef.current = setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + batchSize, messageVideos.length));
            setLoadingMore(false);
        }, 350);
    }, [canLoadMore, loadingMore, messageVideos.length]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const renderItem = useCallback(({ item, index }: { item: MessageVideoItem; index: number }) => {
        const sharedMemoryType = sharedMemoryMap.get(item.id);

        return (
            <MessageVideoCard
                videoUrl={item.videoUrl}
                direction={item.direction}
                onPress={() => onOpenViewer(index)}
                pauseWhenViewerOpen={viewerVisible}
                sharedMemoryType={sharedMemoryType}
            />
        );
    }, [onOpenViewer, viewerVisible, sharedMemoryMap]);

    const { bottom } = useSafeAreaInsets();

    if (messageVideos.length === 0) {
        return (
            <View style={[styles.emptyState, { paddingTop: 40, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}>
                <IconSymbol name="camera.fill" size={48} color="#9ba1a6" />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>Your video messages will appear here once you send or receive them.</Text>
            </View>
        );
    }

    return (
        <View style={styles.messagesPanelContainer}>
            <FlatList
                data={visibleVideos}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={3}
                style={styles.messagesList}
                contentContainerStyle={[styles.messagesListContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 10 }]}
                columnWrapperStyle={styles.messageColumnWrapper}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.6}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={refreshing || false}
                            onRefresh={onRefresh}
                            tintColor={BRAND_COLOR}
                            colors={[BRAND_COLOR]}
                        />
                    ) : undefined
                }
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.loadMoreFooter}>
                            <ActivityIndicator color={BRAND_COLOR} size="small" />
                            <Text style={styles.loadMoreText}>Loading more messages…</Text>
                        </View>
                    ) : !canLoadMore ? (
                        <View style={styles.loadMoreFooter}>
                            <Text style={styles.loadMoreText}>You're all caught up.</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

function VaultsPanel({
    vaultCollections,
    loading,
    onOpenVault,
    refreshing,
    onRefresh,
    onUploadMemory,
    onGoToMessages,
}: {
    vaultCollections: VaultCollectionItem[];
    loading: boolean;
    onOpenVault: (collection: VaultCollectionItem, startIndex?: number) => void;
    refreshing?: boolean;
    onRefresh?: () => void;
    onUploadMemory?: () => void;
    onGoToMessages?: () => void;
}) {
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = useMemo(() => {
        const uniqueNames = new Set(
            vaultCollections
                .map((v) => String(v.name || 'Untitled'))
                .filter((name) => name.trim().length > 0)
        );
        return ['All', ...Array.from(uniqueNames)];
    }, [vaultCollections]);

    const hasAnyVaultVideos = useMemo(() => {
        return vaultCollections.some((v) => (v.videos?.length ?? 0) > 0);
    }, [vaultCollections]);

    const filteredVaults = useMemo(() => {
        const nonEmptyVaults = vaultCollections.filter((v) => (v.videos?.length ?? 0) > 0);
        if (activeFilter === 'All') {
            return nonEmptyVaults;
        }
        return nonEmptyVaults.filter((collection) => String(collection.name || 'Untitled') === activeFilter);
    }, [activeFilter, vaultCollections]);

    const { bottom } = useSafeAreaInsets();
    const renderVaultCard = useCallback(({ item }: { item: VaultCollectionItem }) => (
        <VaultCollectionCard
            collection={item}
            onOpen={() => onOpenVault(item)}
        />
    ), [onOpenVault]);

    return (
        <View style={styles.vaultTabContainer}>
            {loading && vaultCollections.length === 0 ? (
                <View style={[styles.vaultEmptyState, { paddingTop: 80, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 40 }]}>
                    <ActivityIndicator color={BRAND_COLOR} />
                    <Text style={styles.vaultSimpleText}>Loading vaults…</Text>
                </View>
            ) : !hasAnyVaultVideos ? (
                <View style={[styles.vaultEmptyState, { paddingTop: 80, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 40 }]}>
                    <View style={styles.vaultEmptyIconContainer}>
                        <IconSymbol name="square.stack.3d.up.fill" size={34} color={BRAND_COLOR} />
                    </View>
                    <Text style={styles.vaultEmptyTitle}>No vaults yet</Text>
                    <Text style={styles.vaultEmptySubtitle}>
                        Add memories first, then we’ll automatically group them into vaults so you can relive moments faster.
                    </Text>

                    {onUploadMemory ? (
                        <Pressable style={styles.vaultEmptyPrimaryButton} onPress={onUploadMemory}>
                            <IconSymbol name="plus.circle.fill" size={18} color="#FFFFFF" />
                            <Text style={styles.vaultEmptyPrimaryButtonText}>Add shared memory</Text>
                        </Pressable>
                    ) : null}

                    {onGoToMessages ? (
                        <Pressable style={styles.vaultEmptySecondaryButton} onPress={onGoToMessages}>
                            <Text style={styles.vaultEmptySecondaryButtonText}>Go to Messages</Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : (
                <FlatList
                    data={filteredVaults}
                    renderItem={renderVaultCard}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={[styles.vaultCollectionList, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 120 }]}
                    columnWrapperStyle={styles.vaultCollectionColumnWrapper}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.vaultListHeader}>
                            {filters.length > 1 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.vaultFilterRow}
                                >
                                    {filters.map((filter) => {
                                        const isActive = filter === activeFilter;
                                        return (
                                            <Pressable
                                                key={filter}
                                                style={[styles.vaultFilterChip, isActive && styles.vaultFilterChipActive]}
                                                onPress={() => setActiveFilter(filter)}
                                            >
                                                <Text style={[styles.vaultFilterLabel, isActive && styles.vaultFilterLabelActive]}>
                                                    {filter}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.vaultListEmptyState}>
                                <Text style={styles.vaultSimpleTitle}>No matches</Text>
                                <Text style={styles.vaultSimpleText}>Try another filter.</Text>
                            </View>
                        ) : null
                    }
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl
                                refreshing={refreshing || false}
                                onRefresh={onRefresh}
                                tintColor={BRAND_COLOR}
                                colors={[BRAND_COLOR]}
                            />
                        ) : undefined
                    }
                    ListFooterComponent={
                        <View style={styles.vaultListFooter}>
                            <IconSymbol name="checkmark.circle.fill" size={24} color={palette.textSecondary} />
                            <Text style={styles.vaultListFooterText}>You're all caught up</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// Helper function to convert SharedMemory to MemoryVideoItem format
function sharedMemoryToMemoryItem(memory: SharedMemory): MemoryVideoItem & { mediaType: 'video' | 'photo' } {
    const date = new Date(memory.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // For photos, we don't have duration
    const duration = memory.mediaType === 'video' ? '00:00' : '';

    return {
        id: memory.id,
        title: memory.title,
        duration,
        date: formattedDate,
        videoUrl: memory.fileUrl, // Use fileUrl for both videos and photos
        direction: 'sent', // Shared memories are always "sent"
        mediaType: memory.mediaType,
    };
}

function SharedMemoriesPanel({ sharedMemories, loading, onUpload, refreshing, onRefresh }: { sharedMemories: SharedMemory[]; loading: boolean; onUpload: () => void; refreshing?: boolean; onRefresh?: () => void }) {
    const batchSize = 9;
    const [visibleCount, setVisibleCount] = useState(batchSize);
    const [loadingMore, setLoadingMore] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerData, setViewerData] = useState<(MemoryVideoItem & { mediaType: 'video' | 'photo' })[]>([]);
    const { deleteSharedMemory } = useSharedMemories();

    // Convert shared memories to memory items
    const memoryItems = useMemo(() => {
        return sharedMemories.map(sharedMemoryToMemoryItem);
    }, [sharedMemories]);

    const visibleMemories = useMemo(() => memoryItems.slice(0, visibleCount), [memoryItems, visibleCount]);
    const canLoadMore = visibleCount < memoryItems.length;

    const handleLoadMore = useCallback(() => {
        if (!canLoadMore || loadingMore) {
            return;
        }

        setLoadingMore(true);
        timeoutRef.current = setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + batchSize, memoryItems.length));
            setLoadingMore(false);
        }, 350);
    }, [canLoadMore, loadingMore, memoryItems.length]);

    const handleOpenViewer = useCallback((index: number) => {
        setViewerData(memoryItems);
        setViewerIndex(index);
        setViewerVisible(true);
    }, [memoryItems]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleDeleteSharedMemory = useCallback(async (memoryId: string) => {
        Alert.alert(
            'Delete Shared Memory',
            'Are you sure you want to delete this shared memory? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await deleteSharedMemory(memoryId);
                        if (error) {
                            Alert.alert('Error', 'Failed to delete shared memory. Please try again.');
                            console.error('Error deleting shared memory:', error);
                        }
                    }
                }
            ]
        );
    }, [deleteSharedMemory]);

    const renderItem = useCallback(({ item, index }: { item: typeof memoryItems[0]; index: number }) => (
        <SharedMemoryCard
            item={item}
            onPress={() => handleOpenViewer(index)}
            onLongPress={() => handleDeleteSharedMemory(item.id)}
        />
    ), [handleOpenViewer, handleDeleteSharedMemory]);

    const { bottom } = useSafeAreaInsets();

    if (loading && sharedMemories.length === 0) {
        return (
            <View style={[styles.emptyState, { paddingTop: 40, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}>
                <ActivityIndicator color={BRAND_COLOR} size="large" />
                <Text style={styles.emptyTitle}>Loading shared memories…</Text>
                <Text style={styles.emptySubtitle}>Hang tight while we fetch your memories.</Text>
            </View>
        );
    }

    if (sharedMemories.length === 0) {
        return (
            <View style={[styles.sharedMemoriesEmptyContainer, { paddingTop: 40, paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}>
                <View style={styles.sharedMemoriesIntro}>
                    <IconSymbol name="photo.fill" size={48} color={BRAND_COLOR} />
                    <Text style={styles.sharedMemoriesIntroTitle}>Create Shared Memories</Text>
                    <Text style={styles.sharedMemoriesIntroText}>
                        Capture good moments, photos, videos, drawings, or pictures of your best times together.
                        Share these memories with your gifts to make them even more special.
                    </Text>
                </View>
                <Pressable style={styles.sharedMemoriesUploadButton} onPress={onUpload}>
                    <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
                    <Text style={styles.sharedMemoriesUploadButtonText}>Upload shared memory</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.messagesPanelContainer}>
            <FlatList
                data={visibleMemories}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={3}
                style={styles.messagesList}
                contentContainerStyle={[styles.messagesListContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 10 }]}
                columnWrapperStyle={styles.messageColumnWrapper}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.6}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={refreshing || false}
                            onRefresh={onRefresh}
                            tintColor={BRAND_COLOR}
                            colors={[BRAND_COLOR]}
                        />
                    ) : undefined
                }
                ListHeaderComponent={
                    <View style={styles.sharedMemoriesHeader}>
                        <View style={styles.sharedMemoriesHeaderTop}>
                            <View style={styles.sharedMemoriesHeaderInfo}>
                                <Text style={styles.messagesHeaderTitle}>Shared Memories</Text>
                                <Text style={styles.messagesHeaderSubtitle}>{sharedMemories.length} {sharedMemories.length === 1 ? 'memory' : 'memories'}</Text>
                            </View>
                            <Pressable style={styles.sharedMemoriesHeaderButton} onPress={onUpload}>
                                <IconSymbol name="plus.circle.fill" size={18} color={BRAND_COLOR} />
                                <Text style={styles.sharedMemoriesHeaderButtonText}>Add</Text>
                            </Pressable>
                        </View>
                        <View style={styles.sharedMemoriesIntroSection}>
                            <Text style={styles.sharedMemoriesIntroText}>
                                Capture good moments, photos, videos, drawings, or pictures of your best times together.
                                Share these memories with your gifts to make them even more special.
                            </Text>
                        </View>
                    </View>
                }
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.loadMoreFooter}>
                            <ActivityIndicator color={BRAND_COLOR} size="small" />
                            <Text style={styles.loadMoreText}>Loading more memories…</Text>
                        </View>
                    ) : !canLoadMore ? (
                        <View style={styles.loadMoreFooter}>
                            <Text style={styles.loadMoreText}>You're all caught up.</Text>
                        </View>
                    ) : null
                }
            />
            <MessageVideoViewer
                visible={viewerVisible}
                initialIndex={viewerIndex}
                data={viewerData}
                onClose={() => setViewerVisible(false)}
            />
        </View>
    );
}

function SharedMemoryCard({ item, onPress, onLongPress }: { item: MemoryVideoItem & { mediaType: 'video' | 'photo' }; onPress: () => void; onLongPress?: () => void }) {
    const [imageError, setImageError] = useState(false);

    return (
        <Pressable style={styles.messageCardWrapper} onPress={onPress} onLongPress={onLongPress}>
            <View style={styles.messageCardContainer}>
                {item.mediaType === 'photo' ? (
                    imageError ? (
                        <View style={[styles.messageVideoPreview, styles.sharedMemoryPhotoPlaceholder]}>
                            <IconSymbol name="photo" size={22} color="rgba(255,255,255,0.6)" />
                        </View>
                    ) : (
                        <Image
                            source={{ uri: item.videoUrl }}
                            style={styles.messageVideoPreview}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    )
                ) : (
                    <MemoryThumbnail
                        fallbackUrl={item.videoUrl}
                        style={styles.messageVideoPreview}
                        showPlay={false}
                    />
                )}

                {/* Video / Photo indicator */}
                {item.mediaType === 'video' ? (
                    <View style={styles.messagePlayButton}>
                        <IconSymbol name="play.fill" size={26} color="#FFFFFF" />
                    </View>
                ) : (
                    <View style={styles.messagePhotoIndicator}>
                        <Text style={styles.messagePhotoText}>PHOTO</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

function FeaturedMemoryCard({ title, duration, date, videoUrl, direction, onPress, sharedMemoryType }: MemoryVideoItem & { onPress: () => void; sharedMemoryType?: 'video' | 'photo' }) {
    // Debug: Log if video URL is missing
    useEffect(() => {
        if (!videoUrl) {
            console.warn(`[FeaturedMemoryCard] Featured memory "${title}" has no videoUrl`);
        }
    }, [videoUrl, title]);

    return (
        <Pressable style={styles.featuredCard} onPress={onPress}>
            <View style={styles.featuredVideoContainer}>
                <MemoryThumbnail
                    fallbackUrl={videoUrl}
                    style={styles.featuredThumb}
                />
                {/* Direction indicator in top corner */}
                <View style={[styles.featuredDirectionBadge, direction === 'received' ? styles.featuredDirectionBadgeReceived : styles.featuredDirectionBadgeSent]}>
                    <IconSymbol
                        name={direction === 'received' ? 'arrow.down.circle.fill' : 'arrow.up.circle.fill'}
                        size={18}
                        color="#FFFFFF"
                    />
                </View>

                {/* Modern circular play button */}
                <View style={styles.featuredPlayButton}>
                    <IconSymbol name="play.fill" size={32} color="#FFFFFF" />
                </View>

                {/* Duration badge at bottom */}
                <View style={styles.featuredDurationBadge}>
                    <Text style={styles.featuredDurationText}>{duration}</Text>
                </View>

                {/* Shared Memory Indicator - Bottom Left */}
                {sharedMemoryType && (
                    <View style={styles.featuredSharedMemoryBadge}>
                        <IconSymbol
                            name={
                                sharedMemoryType === 'photo'
                                    ? 'photo.fill'
                                    : sharedMemoryType === 'video'
                                        ? 'video.fill'
                                        : 'music.note'
                            }
                            size={16}
                            color="#FFFFFF"
                        />
                    </View>
                )}
            </View>

            {/* Card content */}
            <View style={styles.featuredCardContent}>
                <Text style={styles.featuredTitle} numberOfLines={2}>{title}</Text>
                <View style={styles.featuredMetaRow}>
                    <View style={styles.featuredDateContainer}>
                        <IconSymbol name="calendar" size={12} color={palette.textSecondary} />
                        <Text style={styles.featuredDateText}>{date}</Text>
                    </View>
                    <View style={styles.featuredDirectionLabel}>
                        <Text style={[styles.featuredDirectionText, direction === 'received' ? styles.featuredDirectionTextReceived : styles.featuredDirectionTextSent]}>
                            {direction === 'received' ? 'Received' : 'Sent'}
                        </Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

function VaultRow({ collection, onPress }: { collection: VaultCollectionItem; onPress: () => void }) {
    const previewVideos = (collection.videos ?? []).slice(0, 4);
    const count = collection.videos?.length ?? 0;
    const secondary = collection.description || collection.categoryType?.replace(/-/g, ' ');

    // Debug: Log video URLs to check if they're valid
    useEffect(() => {
        if (previewVideos.length > 0) {
            previewVideos.forEach((video, idx) => {
                if (!video.videoUrl) {
                    console.warn(`[VaultRow] Video ${idx} in vault "${collection.name}" has no videoUrl`);
                }
            });
        }
    }, [previewVideos, collection.name]);

    return (
        <Pressable style={styles.vaultRow} onPress={onPress}>
            <View style={styles.vaultRowImageContainer}>
                {previewVideos.length > 0 ? (
                    <View style={styles.vaultPreviewGrid}>
                        {previewVideos.map((video, index) => (
                            <View key={video.id || index} style={styles.vaultThumbContainer}>
                                <MemoryThumbnail
                                    fallbackUrl={video.videoUrl}
                                    style={styles.vaultThumb}
                                />
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={[styles.vaultRowPlaceholder, { backgroundColor: palette.accent, justifyContent: 'center', alignItems: 'center' }]}>
                        <IconSymbol name="square.stack.3d.up.fill" size={28} color={BRAND_COLOR} />
                    </View>
                )}
            </View>
            <View style={styles.vaultRowContent}>
                <View style={styles.vaultRowHeader}>
                    <Text style={styles.collectionName} numberOfLines={2}>{collection.name}</Text>
                    {secondary && (
                        <Text style={styles.collectionDescription} numberOfLines={2}>
                            {secondary}
                        </Text>
                    )}
                </View>
                <View style={styles.vaultRowFooter}>
                    <View style={styles.vaultRowCountBadge}>
                        <IconSymbol name="video.fill" size={11} color={BRAND_COLOR} />
                        <Text style={styles.collectionCount}>{count}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

function VaultCollectionCard({ collection, onOpen }: { collection: VaultCollectionItem; onOpen: () => void }) {
    const previewVideos = (collection.videos ?? []).slice(0, 4);
    const count = collection.videos?.length ?? 0;
    const secondary = collection.description || collection.categoryType?.replace(/-/g, ' ');

    // Debug: Log video URLs to check if they're valid
    useEffect(() => {
        if (previewVideos.length > 0) {
            previewVideos.forEach((video, idx) => {
                if (!video.videoUrl) {
                    console.warn(`[VaultCollectionCard] Video ${idx} in vault "${collection.name}" has no videoUrl`);
                }
            });
        }
    }, [previewVideos, collection.name]);

    return (
        <Pressable style={styles.vaultCollectionCard} onPress={onOpen}>
            <View style={styles.vaultCollectionMedia}>
                <View style={styles.vaultCollectionBody}>
                    {Array.from({ length: 4 }).map((_, index) => {
                        const video = previewVideos[index];
                        return (
                            <View key={video?.id || index} style={styles.vaultCollectionThumbWrap}>
                                {video?.videoUrl ? (
                                    <>
                                        <MemoryThumbnail
                                            fallbackUrl={video.videoUrl}
                                            style={styles.vaultCollectionThumb}
                                            showPlay={false}
                                        />
                                        <View style={styles.vaultCollectionPlayOverlay} pointerEvents="none">
                                            <View style={styles.vaultCollectionPlayIcon}>
                                                <IconSymbol name="play.fill" size={14} color="#FFFFFF" />
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.vaultCollectionThumbPlaceholder}>
                                        <IconSymbol name="photo.on.rectangle.angled" size={18} color="rgba(255,255,255,0.55)" />
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                <View style={styles.vaultCollectionBadges} pointerEvents="none">
                    <View style={styles.vaultCollectionCountPill}>
                        <IconSymbol name="video.fill" size={12} color="#FFFFFF" />
                        <Text style={styles.vaultCollectionCountPillText}>{count}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.vaultCollectionHeader}>
                <View style={styles.vaultCollectionTitleRow}>
                    <Text style={styles.vaultCollectionName} numberOfLines={2}>
                        {collection.name}
                    </Text>
                </View>
                {collection.description ? (
                    <Text style={styles.vaultCollectionDescription} numberOfLines={2}>
                        {collection.description}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

function MessageVideoCard({ videoUrl, direction, onPress, onLongPress, pauseWhenViewerOpen, sharedMemoryType }: { videoUrl: string; direction: 'sent' | 'received'; onPress: () => void; onLongPress?: () => void; pauseWhenViewerOpen?: boolean; sharedMemoryType?: 'video' | 'photo' }) {
    // Debug: Log if video URL is missing
    useEffect(() => {
        if (!videoUrl) {
            console.warn(`[MessageVideoCard] Message video has no videoUrl`);
        }
    }, [videoUrl]);


    return (
        <Pressable style={styles.messageCardWrapper} onPress={onPress} onLongPress={onLongPress}>
            <View style={styles.messageCardContainer}>
                <MemoryThumbnail
                    fallbackUrl={videoUrl}
                    style={styles.messageVideoPreview}
                />

                {/* Shared Memory Indicator - Bottom Left */}
                {sharedMemoryType && (
                    <View style={styles.messageSharedMemoryBadge}>
                        <IconSymbol
                            name={
                                sharedMemoryType === 'photo'
                                    ? 'photo.fill'
                                    : sharedMemoryType === 'video'
                                        ? 'video.fill'
                                        : 'music.note'
                            }
                            size={16}
                            color="#FFFFFF"
                        />
                    </View>
                )}

                {/* Direction indicator */}
                <View style={[styles.messageDirectionBadge, direction === 'received' ? styles.messageDirectionBadgeReceived : styles.messageDirectionBadgeSent]}>
                    <IconSymbol
                        name={direction === 'received' ? 'arrow.down.circle.fill' : 'arrow.up.circle.fill'}
                        size={20}
                        color="#FFFFFF"
                    />
                </View>

                {/* Modern play button */}
                <View style={styles.messagePlayButton}>
                    <IconSymbol name="play.fill" size={24} color="#FFFFFF" />
                </View>
            </View>
        </Pressable>
    );
}

function RememberMemoryCard({ label, title, duration, date, videoUrl, direction, onPress, sharedMemoryType }: RememberMemoryItem & { onPress: () => void; sharedMemoryType?: 'video' | 'photo' }) {
    // Debug: Log if video URL is missing
    useEffect(() => {
        if (!videoUrl) {
            console.warn(`[RememberMemoryCard] Remember memory "${title}" has no videoUrl`);
        }
    }, [videoUrl, title]);

    return (
        <Pressable style={styles.rememberCard} onPress={onPress}>
            <View style={{ position: 'relative' }}>
                <MemoryThumbnail
                    fallbackUrl={videoUrl}
                    style={styles.rememberThumb}
                />
                <View style={[styles.messageBadge, direction === 'received' ? styles.messageBadgeReceived : styles.messageBadgeSent, styles.rememberBadgePosition]}>
                    <Text style={styles.messageBadgeLabel}>{direction === 'received' ? '⬇' : '⬆'}</Text>
                </View>
                <View style={styles.rememberChip}>
                    <Text style={styles.rememberChipLabel}>{label}</Text>
                </View>

                {/* Shared Memory Indicator - Bottom Left */}
                {sharedMemoryType && (
                    <View style={styles.rememberSharedMemoryBadge}>
                        <IconSymbol
                            name={
                                sharedMemoryType === 'photo'
                                    ? 'photo.fill'
                                    : sharedMemoryType === 'video'
                                        ? 'video.fill'
                                        : 'music.note'
                            }
                            size={14}
                            color="#FFFFFF"
                        />
                    </View>
                )}
            </View>
            <View style={{ padding: 10, gap: 4 }}>
                <Text style={styles.rememberTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.rememberMeta}>{duration} • {date}</Text>
            </View>
        </Pressable>
    );
}

export function MessageVideoViewer({ visible, initialIndex, data, onClose }: { visible: boolean; initialIndex: number; data: (MemoryVideoItem | (MemoryVideoItem & { mediaType: 'video' | 'photo' }))[]; onClose: () => void }) {
    const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
    const listRef = useRef<FlatList<MemoryVideoItem>>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const insets = useSafeAreaInsets();
    const [qrVisible, setQrVisible] = useState(false);
    const [qrItem, setQrItem] = useState<MemoryVideoItem | null>(null);
    const dataKey = useMemo(() => data.map((item) => item.id).join('|'), [data]);
    const { setVisible: setBottomBarVisible } = useBottomBarVisibility();

    useEffect(() => {
        if (visible) {
            setBottomBarVisible(false); // Hide bottom bar when video viewer opens
            setCurrentIndex(initialIndex);
            requestAnimationFrame(() => {
                listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
            });
            // Status bar handling is now done by edge-to-edge mode
            // No need to manually hide/show status bar
        } else {
            setBottomBarVisible(true); // Show bottom bar when video viewer closes
            setQrVisible(false);
            setQrItem(null);
        }
    }, [visible, initialIndex, dataKey, setBottomBarVisible]);

    useEffect(() => {
        return () => {
            setBottomBarVisible(true); // Ensure bottom bar is shown when component unmounts
        };
    }, [setBottomBarVisible]);

    const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const nextIndex = Math.round(offsetY / SCREEN_HEIGHT);
        setCurrentIndex(nextIndex);
    }, [SCREEN_HEIGHT]);

    const renderItem = useCallback(({ item, index }: { item: MemoryVideoItem; index: number }) => (
        <ViewerSlide
            key={item.id}
            item={item}
            index={index}
            currentIndex={currentIndex}
            screenHeight={SCREEN_HEIGHT}
            screenWidth={SCREEN_WIDTH}
            safeBottom={insets.bottom}
            safeTop={insets.top}
            viewerVisible={visible}
            onShowQr={(video) => {
                setQrItem(video);
                setQrVisible(true);
            }}
            onClose={onClose}
        />
    ), [SCREEN_HEIGHT, SCREEN_WIDTH, currentIndex, insets.bottom, insets.top, visible, onClose]);

    const getItemLayout = useCallback((_: unknown, index: number) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index }), [SCREEN_HEIGHT]);

    return (
        <>
            <Modal
                visible={visible}
                animationType="fade"
                presentationStyle="fullScreen"
                onRequestClose={onClose}
            >
                <View style={styles.viewerBackdrop}>
                    <FlatList
                        key={dataKey}
                        ref={listRef}
                        data={data}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        pagingEnabled
                        showsVerticalScrollIndicator={false}
                        onMomentumScrollEnd={handleMomentumEnd}
                        initialScrollIndex={initialIndex}
                        getItemLayout={getItemLayout}
                        extraData={{ currentIndex, dataKey }}
                        windowSize={3}
                        maxToRenderPerBatch={3}
                        initialNumToRender={2}
                        removeClippedSubviews={false}
                        updateCellsBatchingPeriod={50}
                        onScrollToIndexFailed={({ index }) => {
                            setTimeout(() => {
                                listRef.current?.scrollToIndex({ index, animated: false });
                            }, 120);
                        }}
                    />

                    {/* QR popup overlay (rendered inside the viewer modal for reliable stacking) */}
                    {qrVisible ? (
                        <View style={styles.qrOverlay}>
                            <Pressable style={styles.qrBackdrop} onPress={() => setQrVisible(false)}>
                                <View style={styles.qrCard} onStartShouldSetResponder={() => true}>
                                    {/* Header */}
                                    <View style={styles.qrHeader}>
                                        <Text style={styles.qrTitle}>Share to View</Text>
                                        <Text style={styles.qrDescription}>
                                            Scan this QR code to view the message and shared memory
                                        </Text>
                                    </View>

                                    {/* QR Code */}
                                    {qrItem && (() => {
                                        // If video has an orderId, link to the gift page; otherwise fallback to video URL
                                        const qrUrl = qrItem.orderId
                                            ? `https://giftyy.store/gift/${qrItem.orderId}`
                                            : qrItem.videoUrl;

                                        return (
                                            <View style={styles.qrCodeContainer}>
                                                <View style={styles.qrCodeWrapper}>
                                                    <Image
                                                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}` }}
                                                        style={styles.qrImage}
                                                    />
                                                </View>
                                            </View>
                                        );
                                    })()}

                                    {/* Footer */}
                                    <View style={styles.qrFooter}>
                                        <Pressable
                                            style={styles.qrCloseButton}
                                            onPress={() => setQrVisible(false)}
                                        >
                                            <Text style={styles.qrCloseLabel}>Done</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            </Modal>
        </>
    );
}

function ViewerSlide({ item, index, currentIndex, screenHeight, screenWidth, safeBottom, safeTop, onShowQr, onClose, viewerVisible }: { item: MemoryVideoItem | (MemoryVideoItem & { mediaType: 'video' | 'photo' }); index: number; currentIndex: number; screenHeight: number; screenWidth: number; safeBottom: number; safeTop: number; onShowQr: (video: MemoryVideoItem) => void; onClose: () => void; viewerVisible: boolean }) {
    const videoRef = useRef<Video>(null);
    const shouldResumeMainVideoAfterSharedModalRef = useRef(false);
    const mediaType = 'mediaType' in item ? item.mediaType : 'video'; // Default to video for backward compatibility
    const isPhoto = mediaType === 'photo';
    // Always call the hook, but only use it for videos
    const signedVideoUrl = useSignedVideoUrl(isPhoto ? null : item.videoUrl);
    const playbackUrl = isPhoto
        ? (item.videoUrl && typeof item.videoUrl === 'string' ? item.videoUrl : null)
        : (signedVideoUrl && typeof signedVideoUrl === 'string' ? signedVideoUrl : null);

    // Ensure playbackUrl is valid before using it
    const isValidPlaybackUrl = playbackUrl && typeof playbackUrl === 'string' && playbackUrl.length > 0 && playbackUrl.startsWith('http');

    // Debug logging for video URL resolution
    useEffect(() => {
        if (!isPhoto && currentIndex === index) {
            console.log('[ViewerSlide] Video URL status:', {
                itemId: item.id,
                videoUrl: item.videoUrl?.substring(0, 50),
                signedVideoUrl: signedVideoUrl?.substring(0, 50),
                playbackUrl: playbackUrl?.substring(0, 50),
                isValidPlaybackUrl,
                viewerVisible,
                isActive: currentIndex === index,
            });
        }
    }, [item.id, item.videoUrl, signedVideoUrl, playbackUrl, isValidPlaybackUrl, viewerVisible, currentIndex, index, isPhoto]);
    const [videoReady, setVideoReady] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [userPaused, setUserPaused] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [titleExpanded, setTitleExpanded] = useState(false);
    const [titleNeedsExpand, setTitleNeedsExpand] = useState(false);
    const titleMeasureRef = useRef<Text>(null);
    const [showFeatureDialog, setShowFeatureDialog] = useState(false);
    const [isFeaturing, setIsFeaturing] = useState(false);
    const [sharedMemoryViewerVisible, setSharedMemoryViewerVisible] = useState(false);
    const { videoMessages, updateVideoMessageFeatured, deleteVideoMessage } = useVideoMessages();
    const { orders } = useOrders();
    const { sharedMemories, deleteSharedMemory } = useSharedMemories();
    const { user } = useAuth();

    // Find the video message to check if it's already featured (only for video messages, not shared memories/photos)
    const videoMessage = useMemo(() => {
        if (isPhoto) return null;
        return videoMessages.find(vm => vm.id === item.id);
    }, [videoMessages, item.id, isPhoto]);

    const isFeatured = videoMessage?.isFeatured || false;

    // Find shared memory associated with this video message (via order)
    // First check in-memory orders, then query database if needed
    const [sharedMemory, setSharedMemory] = useState<SharedMemory | null>(null);

    useEffect(() => {
        const fetchSharedMemory = async () => {
            // Debug: Videos should always have orderIds (created during order placement)
            if (!item.orderId) {
                console.warn('[ViewerSlide] Video message without orderId (unexpected):', item.id, item.title);
                setSharedMemory(null);
                return;
            }

            // First check in-memory orders
            const order = orders.find(o => o.id === item.orderId);
            if (order?.sharedMemoryId) {
                const memory = sharedMemories.find(sm => sm.id === order.sharedMemoryId);
                if (memory) {
                    setSharedMemory(memory);
                    return;
                }
            }

            // If not found in memory, query database for order's shared_memory_id
            if (!order) {
                console.warn('[ViewerSlide] Order not found in memory for orderId:', item.orderId, 'videoId:', item.id, '(querying database)');
            }

            try {
                let query = supabase
                    .from('orders')
                    .select('shared_memory_id')
                    .eq('id', item.orderId);

                // Add user_id filter if user is available (required for RLS)
                if (user?.id) {
                    query = query.eq('user_id', user.id);
                }

                const { data, error } = await query.maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

                if (error) {
                    // PGRST116 means 0 rows found - order doesn't exist or RLS blocked access
                    if (error.code === 'PGRST116') {
                        console.warn('[ViewerSlide] Order not found in database (may be due to RLS or deleted order):', item.orderId, 'videoId:', item.id, 'userId:', user?.id);
                    } else {
                        console.error('[ViewerSlide] Error fetching order from database:', error, 'orderId:', item.orderId);
                    }
                    setSharedMemory(null);
                    return;
                }

                if (!data) {
                    // Order doesn't exist (maybeSingle returns null for 0 rows) or RLS blocked access
                    console.warn('[ViewerSlide] Order not found in database (may be due to RLS or deleted order):', item.orderId, 'videoId:', item.id, 'userId:', user?.id);
                    setSharedMemory(null);
                    return;
                }

                if (!data.shared_memory_id) {
                    setSharedMemory(null);
                    return;
                }

                // Find the shared memory in our list
                const memory = sharedMemories.find(sm => sm.id === data.shared_memory_id);
                setSharedMemory(memory || null);
            } catch (err) {
                console.error('[ViewerSlide] Unexpected error fetching shared memory:', err, 'orderId:', item.orderId);
                setSharedMemory(null);
            }
        };

        fetchSharedMemory();
    }, [item.orderId, item.id, item.title, orders, sharedMemories, user?.id]);

    // Get signed URL for shared memory video (if it's a video)
    const sharedMemorySignedUrl = useSignedVideoUrl(
        sharedMemory && sharedMemory.mediaType === 'video' ? sharedMemory.fileUrl : null
    );

    useEffect(() => {
        setVideoReady(false);
        setVideoError(false);
        setUserPaused(false);
        setIsPlaying(false);
        setImageLoaded(false);
        setImageError(false);
        setTitleExpanded(false);
        setTitleNeedsExpand(false);

        // Reset video state when URL changes - only pause, don't aggressively unload
        // Unloading is handled when the component becomes inactive
        if (!isPhoto && videoRef.current) {
            const cleanupVideo = async () => {
                try {
                    const video = videoRef.current;
                    if (video) {
                        // Just pause, don't unload to avoid timeout errors
                        await video.pauseAsync().catch(() => { });
                    }
                } catch (error) {
                    console.warn('[ViewerSlide] Error pausing video on URL change:', error);
                }
            };
            cleanupVideo();
        }
    }, [playbackUrl, item.id, isPhoto]);

    const handleTogglePlayback = useCallback(async () => {
        if (isPhoto || !isValidPlaybackUrl) return;
        if (!viewerVisible || currentIndex !== index) return;
        const video = videoRef.current;
        if (!video) return;

        try {
            const status = await video.getStatusAsync();
            if (status?.isLoaded && status.isPlaying) {
                await video.pauseAsync().catch(() => { });
                setUserPaused(true);
            } else if (status?.isLoaded) {
                await video.playAsync().catch(() => { });
                setUserPaused(false);
            }
        } catch (err) {
            console.warn('[ViewerSlide] Toggle playback error:', err);
        }
    }, [currentIndex, index, isPhoto, isValidPlaybackUrl, viewerVisible]);

    // Measure title on mount and when title changes to determine if expand is needed
    useEffect(() => {
        if (!item.title || titleExpanded) return;

        // Use a simple heuristic: if title is longer than ~40 characters, likely needs expand
        // Or measure using a hidden text component
        const estimatedCharsPerLine = Math.floor((screenWidth - 48 - 36) / 13); // rough estimate
        if (item.title.length > estimatedCharsPerLine) {
            setTitleNeedsExpand(true);
        }
    }, [item.title, screenWidth, titleExpanded]);

    // Ensure only the active video plays - start playing immediately when active, pause adjacent videos
    // This works with preloaded videos (currentIndex ± 1) for smooth scrolling
    useEffect(() => {
        if (isPhoto || !isValidPlaybackUrl || !videoRef.current) {
            return;
        }

        const isActive = viewerVisible && currentIndex === index;
        const isAdjacent = Math.abs(currentIndex - index) === 1;

        if (isActive) {
            // When this video becomes active, start playing immediately
            // Video may already be preloaded from when it was adjacent
            const startPlaying = async () => {
                try {
                    if (videoRef.current) {
                        // Respect user pause
                        if (userPaused) {
                            await videoRef.current.pauseAsync().catch(() => { });
                            return;
                        }
                        // Try to play immediately - video may already be buffered
                        await videoRef.current.playAsync().catch(() => { });
                    }
                } catch (error) {
                    console.warn('[ViewerSlide] Error starting video playback:', error);
                }
            };
            startPlaying();
        } else if (isAdjacent) {
            // Keep adjacent videos paused but loaded (they're preloading for smooth scrolling)
            // Don't unload them - just ensure they're paused
            const pauseAdjacent = async () => {
                try {
                    if (videoRef.current) {
                        await videoRef.current.pauseAsync().catch(() => { });
                    }
                } catch (error) {
                    console.warn('[ViewerSlide] Error pausing adjacent video:', error);
                }
            };
            pauseAdjacent();
        } else {
            // Videos far from current - pause and reset ready state
            // They will reload when scrolled to
            const pauseDistant = async () => {
                try {
                    if (videoRef.current) {
                        await videoRef.current.pauseAsync().catch(() => { });
                        setVideoReady(false);
                    }
                } catch (error) {
                    console.warn('[ViewerSlide] Error pausing distant video:', error);
                }
            };
            pauseDistant();
        }
    }, [viewerVisible, currentIndex, index, isPhoto, isValidPlaybackUrl, userPaused]);

    // Cleanup on unmount - ensure video is properly stopped and unloaded
    useEffect(() => {
        if (isPhoto) {
            return;
        }

        return () => {
            // Cleanup function runs when component unmounts
            const video = videoRef.current;
            if (video) {
                // Just pause, don't aggressively unload to avoid timeout errors
                const cleanup = async () => {
                    try {
                        await video.pauseAsync().catch(() => { });
                        // Only unload if we're sure the video is no longer needed
                        // Set a timeout to avoid blocking and timeout errors
                        setTimeout(() => {
                            video.unloadAsync().catch(() => { });
                        }, 500);
                    } catch (error) {
                        console.warn('[ViewerSlide] Error during video cleanup:', error);
                    }
                };
                cleanup();
            }
        };
    }, [isPhoto]);

    const handleShare = useCallback(() => {
        Share.share({
            message: `Check out this memory: ${item.title} (${item.videoUrl})`,
        }).catch(() => { });
    }, [item.title, item.videoUrl]);

    const handleQrView = useCallback(() => {
        onShowQr(item);
    }, [item, onShowQr]);

    const openSharedMemoryViewer = useCallback(() => {
        if (!sharedMemory) return;

        // Pause the main viewer video so it doesn't keep playing behind the modal.
        if (!isPhoto && videoRef.current) {
            // IMPORTANT: This is a temporary pause (not a user pause).
            // We'll resume automatically on close if it was playing.
            const pauseMain = async () => {
                try {
                    const status = await videoRef.current?.getStatusAsync();
                    const wasPlaying = !!(status && 'isLoaded' in status && (status as any).isLoaded && (status as any).isPlaying);
                    shouldResumeMainVideoAfterSharedModalRef.current = wasPlaying;
                } catch {
                    shouldResumeMainVideoAfterSharedModalRef.current = false;
                } finally {
                    videoRef.current?.pauseAsync().catch(() => { });
                }
            };
            pauseMain();
        }

        setSharedMemoryViewerVisible(true);
    }, [isPhoto, sharedMemory]);

    const closeSharedMemoryViewer = useCallback(() => {
        setSharedMemoryViewerVisible(false);

        // Resume main video if it was playing before opening the modal
        // (and the user didn't manually pause).
        if (!isPhoto && !userPaused && viewerVisible && currentIndex === index && videoRef.current) {
            if (shouldResumeMainVideoAfterSharedModalRef.current) {
                shouldResumeMainVideoAfterSharedModalRef.current = false;
                videoRef.current.playAsync().catch(() => { });
            }
        } else {
            shouldResumeMainVideoAfterSharedModalRef.current = false;
        }
    }, []);

    const handleFeature = useCallback(async () => {
        if (isPhoto || !videoMessage) {
            return;
        }

        setIsFeaturing(true);
        try {
            const { error } = await updateVideoMessageFeatured(videoMessage.id, !isFeatured);
            if (error) {
                Alert.alert('Error', 'Failed to update featured status. Please try again.');
                console.error('Error updating featured status:', error);
            } else {
                setShowFeatureDialog(false);
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            console.error('Unexpected error:', err);
        } finally {
            setIsFeaturing(false);
        }
    }, [videoMessage, isFeatured, isPhoto, updateVideoMessageFeatured]);

    const handleFeaturePress = useCallback(() => {
        if (isPhoto) {
            return;
        }
        if (isFeatured) {
            // If already featured, allow unfeaturing without confirmation
            handleFeature();
        } else {
            // Show confirmation dialog for featuring
            setShowFeatureDialog(true);
        }
    }, [isPhoto, isFeatured, handleFeature]);

    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);
        try {
            if (isPhoto && sharedMemory) {
                // Delete shared memory
                const { error } = await deleteSharedMemory(sharedMemory.id);
                if (error) {
                    Alert.alert('Error', 'Failed to delete shared memory. Please try again.');
                    console.error('Error deleting shared memory:', error);
                } else {
                    Alert.alert('Deleted', 'Shared memory deleted successfully.');
                    onClose(); // Close viewer after deletion
                }
            } else if (!isPhoto && videoMessage) {
                // Delete video message
                const { error } = await deleteVideoMessage(videoMessage.id);
                if (error) {
                    Alert.alert('Error', 'Failed to delete video message. Please try again.');
                    console.error('Error deleting video message:', error);
                } else {
                    Alert.alert('Deleted', 'Video message deleted successfully.');
                    onClose(); // Close viewer after deletion
                }
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            console.error('Unexpected error deleting:', err);
        } finally {
            setIsDeleting(false);
            setShowMenu(false);
        }
    }, [isPhoto, sharedMemory, videoMessage, deleteSharedMemory, deleteVideoMessage, onClose]);

    const handleDeletePress = useCallback(() => {
        setShowMenu(false); // Close menu first
        Alert.alert(
            'Delete Memory',
            isPhoto
                ? 'Are you sure you want to delete this shared memory? This action cannot be undone.'
                : 'Are you sure you want to delete this video message? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: handleDelete
                }
            ]
        );
    }, [isPhoto, handleDelete]);

    return (
        <View style={[styles.viewerSlide, { height: screenHeight, width: screenWidth, backgroundColor: '#000000' }]}>
            {isPhoto ? (
                <>
                    <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }]}>
                        {playbackUrl ? (
                            <View style={{ width: '100%', height: '100%', backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
                                <Image
                                    source={{ uri: playbackUrl }}
                                    style={[styles.viewerImage, { backgroundColor: '#000000' }]}
                                    resizeMode="contain"
                                    onLoad={() => setImageLoaded(true)}
                                    onError={() => {
                                        console.error('Memory viewer image error');
                                        setImageError(true);
                                    }}
                                />
                            </View>
                        ) : (
                            <ActivityIndicator size="large" color="#fff" />
                        )}
                    </View>
                    {!imageLoaded && !imageError && playbackUrl && (
                        <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', position: 'absolute', backgroundColor: '#000000' }]}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    )}
                    {imageError && (
                        <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', position: 'absolute', backgroundColor: '#000000' }]}>
                            <IconSymbol name="photo.fill" size={48} color="#666" />
                            <Text style={{ color: '#666', marginTop: 12, fontSize: 14 }}>Failed to load image</Text>
                        </View>
                    )}
                </>
            ) : (
                <>
                    {/* NOTE: Only mount the active video to avoid decoder/network issues on some real devices. */}
                    {isValidPlaybackUrl && viewerVisible && currentIndex === index ? (
                        <Video
                            key={`video-${item.id}-${playbackUrl.substring(0, 50)}`}
                            ref={videoRef}
                            style={styles.viewerVideo}
                            source={{ uri: playbackUrl }}
                            overrideFileExtensionAndroid="mp4"
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={currentIndex === index && !userPaused && !sharedMemoryViewerVisible}
                            isMuted={false}
                            isLooping={true}
                            volume={1.0}
                            useNativeControls={false}
                            progressUpdateIntervalMillis={500}
                            onLoad={() => {
                                console.log('[ViewerSlide] Video loaded:', item.id, playbackUrl.substring(0, 50));
                                // Mark as ready when video is loaded (has enough buffer to start playing)
                                setVideoReady(true);
                                // Start playing immediately when video loads if this is the active video
                                // Video may already be partially buffered if it was preloaded as adjacent
                                if (currentIndex === index && viewerVisible && videoRef.current && !userPaused && !sharedMemoryViewerVisible) {
                                    videoRef.current.playAsync().catch((err) => {
                                        console.warn('[ViewerSlide] Error playing video on load:', err);
                                    });
                                }
                            }}
                            onError={(error) => {
                                const errorStr = error?.toString() || '';
                                const isCodecError = errorStr.includes('Decoder') || errorStr.includes('codec') || errorStr.includes('HEVC') || errorStr.includes('hevc');
                                const isNetworkError = errorStr.includes('NSURLErrorDomain') || errorStr.includes('network') || errorStr.includes('connection');

                                // Enhanced error logging for Android debugging
                                console.error('[Video] Playback error details:', {
                                    error: errorStr,
                                    url: playbackUrl?.substring(0, 100),
                                    isCodecError,
                                    isNetworkError,
                                    platform: Platform.OS,
                                });

                                // Only log non-network errors (network errors are often transient and noisy)
                                if (isCodecError) {
                                    console.error('[Video] Codec error detected - video may be in HEVC format:', error);
                                } else if (!isNetworkError) {
                                    console.error('Memory viewer video error:', error);
                                } else {
                                    // Network errors are common and usually resolve themselves - just warn
                                    console.warn('[ViewerSlide] Video network error (will retry):', errorStr.substring(0, 100));
                                }

                                setVideoError(true);
                                setVideoReady(false);
                                // Don't aggressively unload on error to avoid timeout issues
                                // Just pause the video
                                if (videoRef.current) {
                                    videoRef.current.pauseAsync().catch(() => { });
                                }
                            }}
                            onLoadStart={() => {
                                setVideoReady(false);
                                setVideoError(false);
                            }}
                            onPlaybackStatusUpdate={(status) => {
                                // Handle playback status updates
                                try {
                                    if (status?.isLoaded) {
                                        setIsPlaying(!!status.isPlaying);
                                        const isActive = viewerVisible && currentIndex === index;

                                        // Mark as ready as soon as video starts playing or has enough buffer
                                        // Hide loading indicator once playback begins (progressive playback)
                                        if (status.isPlaying || (status.isLoaded && !videoReady)) {
                                            setVideoReady(true);
                                        }

                                        // Auto-play when ready if this is the active video and not already playing
                                        // Start playing as soon as video is loaded and has enough buffer (progressive playback)
                                        if (isActive && status.isLoaded && !status.isPlaying && !status.didJustFinish && videoRef.current && !userPaused && !sharedMemoryViewerVisible) {
                                            // Check if video has enough buffer to start playing
                                            // If playableDuration exists and is > 0, we have enough buffer
                                            const hasBuffer = status.playableDurationMillis
                                                ? status.playableDurationMillis > 0
                                                : status.isLoaded;

                                            if (hasBuffer) {
                                                // Start playing immediately when video has enough buffer
                                                // This enables progressive playback without waiting for full load
                                                videoRef.current.playAsync().catch((err) => {
                                                    console.warn('[ViewerSlide] Error playing video from status update:', err);
                                                });
                                            }
                                        }

                                        // Handle playback errors
                                        if (status.error) {
                                            const errorStr = status.error?.toString() || '';
                                            const isNetworkError = errorStr.includes('NSURLErrorDomain') || errorStr.includes('network') || errorStr.includes('connection');

                                            // Only log non-network errors (network errors are often transient)
                                            if (!isNetworkError) {
                                                console.error('[ViewerSlide] Video playback status error:', status.error);
                                            } else {
                                                console.warn('[ViewerSlide] Video network error (will retry):', errorStr.substring(0, 100));
                                            }

                                            setVideoError(true);
                                            setVideoReady(false);
                                            // Don't aggressively unload on error to avoid timeout issues
                                            // Just pause the video
                                            if (videoRef.current) {
                                                videoRef.current.pauseAsync().catch(() => { });
                                            }
                                        }
                                    } else if (status?.isLoaded === false && status.error) {
                                        // Handle errors even when video is not fully loaded
                                        const errorStr = status.error?.toString() || '';
                                        const isNetworkError = errorStr.includes('NSURLErrorDomain') || errorStr.includes('network') || errorStr.includes('connection');

                                        // Only log non-network errors
                                        if (!isNetworkError) {
                                            console.error('[ViewerSlide] Video loading error:', status.error);
                                        } else {
                                            console.warn('[ViewerSlide] Video network loading error (will retry):', errorStr.substring(0, 100));
                                        }

                                        setVideoError(true);
                                        setVideoReady(false);
                                    }
                                } catch (error) {
                                    console.warn('[ViewerSlide] Error in playback status update:', error);
                                }
                            }}
                        />
                    ) : currentIndex === index ? (
                        <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>Loading video...</Text>
                        </View>
                    ) : null}
                    {/* Show loading indicator only if this is the active video and not ready/playing yet */}
                    {!videoReady && !videoError && isValidPlaybackUrl && currentIndex === index && (
                        <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', position: 'absolute', pointerEvents: 'none' }]}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>Loading video...</Text>
                        </View>
                    )}
                    {videoError && currentIndex === index && (
                        <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', position: 'absolute', backgroundColor: '#000', padding: 20 }]}>
                            <IconSymbol name="play.slash.fill" size={48} color="#666" />
                            <Text style={{ color: '#666', marginTop: 12, fontSize: 14, textAlign: 'center' }}>Failed to load video</Text>
                            <Text style={{ color: '#666', marginTop: 8, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 }}>
                                This video format may not be supported on your device. Please try again or contact support.
                            </Text>
                        </View>
                    )}
                    {!isValidPlaybackUrl && !isPhoto && currentIndex === index && (
                        <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={{ color: '#666', marginTop: 12, fontSize: 14, textAlign: 'center' }}>Loading video...</Text>
                        </View>
                    )}
                </>
            )}
            <View style={styles.viewerSlideOverlay} pointerEvents="box-none">
                {/* Tap-to-pause/play layer (behind buttons) */}
                {!isPhoto && isValidPlaybackUrl && viewerVisible && currentIndex === index ? (
                    <Pressable
                        style={styles.viewerTapToToggle}
                        onPress={handleTogglePlayback}
                        accessibilityRole="button"
                        accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
                    />
                ) : null}

                {/* Center play indicator when paused */}
                {!isPhoto && isValidPlaybackUrl && viewerVisible && currentIndex === index && userPaused ? (
                    <View style={styles.viewerPausedOverlay} pointerEvents="none">
                        <View style={styles.viewerPausedIcon}>
                            <IconSymbol name="play.fill" size={26} color="#FFFFFF" />
                        </View>
                    </View>
                ) : null}

                {/* Back button (explicit) */}
                <Pressable
                    style={[styles.viewerBackButton, { left: 20, top: safeTop + 16 }]}
                    onPress={onClose}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                >
                    <IconSymbol name="chevron.left" size={22} color="#FFFFFF" />
                </Pressable>

                {/* Direction/Photo Indicator - Top Right (Replaces Close Button) */}
                <Pressable
                    style={[styles.viewerDirectionBadge,
                    !isPhoto
                        ? (item.direction === 'received' ? styles.viewerDirectionBadgeReceived : styles.viewerDirectionBadgeSent)
                        : styles.viewerDirectionBadgePhoto,
                    { right: 20, top: safeTop + 16 }]}
                    onPress={onClose}
                >
                    {!isPhoto ? (
                        <IconSymbol
                            name={item.direction === 'received' ? "arrow.down.circle.fill" : "arrow.up.circle.fill"}
                            size={18}
                            color="#FFFFFF"
                        />
                    ) : (
                        <IconSymbol name="photo.fill" size={18} color="#FFFFFF" />
                    )}
                </Pressable>

                {/* Action Buttons Container */}
                <View style={[styles.viewerActionsContainer, { right: 20, bottom: safeBottom + 160 }]}>
                    {/* Shared Memory Thumbnail (on top of Feature/Star button) */}
                    {sharedMemory && (
                        <Pressable
                            style={styles.viewerSharedMemoryThumbnail}
                            pointerEvents="auto"
                            onPress={openSharedMemoryViewer}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel="View shared memory"
                        >
                            {sharedMemory.mediaType === 'photo' ? (
                                <Image
                                    source={{ uri: sharedMemory.fileUrl }}
                                    style={styles.viewerSharedMemoryImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.viewerSharedMemoryImage,
                                        { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
                                    ]}
                                >
                                    <IconSymbol name="play.fill" size={22} color="#FFFFFF" />
                                </View>
                            )}
                        </Pressable>
                    )}

                    {/* Feature Button - Most Prominent */}
                    {!isPhoto && videoMessage && (
                        <Pressable
                            style={[
                                styles.viewerActionButton,
                                isFeatured ? styles.viewerFeatureButtonActive : styles.viewerFeatureButtonInactive
                            ]}
                            onPress={handleFeaturePress}
                            disabled={isFeaturing}
                        >
                            {isFeaturing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <IconSymbol
                                    name={isFeatured ? "star.fill" : "star"}
                                    size={24}
                                    color="#FFFFFF"
                                />
                            )}
                        </Pressable>
                    )}

                    {/* Share Button */}
                    <Pressable
                        style={styles.viewerActionButton}
                        onPress={handleShare}
                    >
                        <IconSymbol name="square.and.arrow.up" size={22} color="#FFFFFF" />
                    </Pressable>

                    {/* QR Code Button */}
                    <Pressable
                        style={styles.viewerActionButton}
                        onPress={handleQrView}
                    >
                        <IconSymbol name="qrcode.viewfinder" size={22} color="#FFFFFF" />
                    </Pressable>

                    {/* Menu Button (Three Dots) */}
                    <Pressable
                        style={styles.viewerActionButton}
                        onPress={() => setShowMenu(true)}
                    >
                        <IconSymbol name="ellipsis.circle" size={22} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>

            {/* Menu Modal - Positioned next to button */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <Pressable
                    style={styles.menuBackdrop}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={[styles.menuContainer, { right: 20 + 56 + 8, bottom: safeBottom + 140 }]} onStartShouldSetResponder={() => true}>
                        <Pressable
                            style={styles.menuItem}
                            onPress={handleDeletePress}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <>
                                    <IconSymbol name="trash.fill" size={16} color="#EF4444" />
                                    <Text style={styles.menuItemTextDelete}>Delete</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.6, 1]}
                style={styles.viewerGradientOverlay}
            />
            <View style={[styles.viewerOverlayBottom, { paddingBottom: safeBottom + 60 }]}>
                <View style={styles.viewerTitleContainer}>
                    <Text
                        ref={titleMeasureRef}
                        style={styles.viewerTitle}
                        numberOfLines={titleExpanded ? undefined : 1}
                        onTextLayout={(e) => {
                            if (!titleExpanded && !titleNeedsExpand) {
                                const { lines } = e.nativeEvent;
                                // If text has multiple lines, it definitely needs expand
                                if (lines.length > 1) {
                                    setTitleNeedsExpand(true);
                                }
                            }
                        }}
                    >
                        {item.title}
                    </Text>
                    {titleNeedsExpand && (
                        <Pressable
                            style={styles.viewerExpandButton}
                            onPress={() => setTitleExpanded(!titleExpanded)}
                        >
                            <IconSymbol
                                name={titleExpanded ? "chevron.up" : "chevron.down"}
                                size={16}
                                color="rgba(255,255,255,0.8)"
                            />
                        </Pressable>
                    )}
                </View>
                <Text style={styles.viewerMeta}>
                    {item.date}{item.duration ? ` • ${item.duration}` : ''}
                    {isPhoto && <Text style={styles.viewerMetaType}> • Photo</Text>}
                </Text>
            </View>

            {/* Shared memory viewer modal */}
            <Modal
                visible={sharedMemoryViewerVisible}
                transparent
                animationType="fade"
                onRequestClose={closeSharedMemoryViewer}
            >
                <Pressable style={styles.sharedMemoryViewerBackdrop} onPress={closeSharedMemoryViewer}>
                    <View style={[styles.sharedMemoryViewerCard, { marginTop: safeTop + 8, marginBottom: safeBottom + 8 }]} onStartShouldSetResponder={() => true}>
                        <View style={styles.sharedMemoryViewerHeader}>
                            <View style={styles.sharedMemoryViewerHeaderLeft}>
                                <View style={styles.sharedMemoryViewerHeaderIcon}>
                                    <IconSymbol
                                        name={sharedMemory?.mediaType === 'photo' ? 'photo.fill' : 'video.fill'}
                                        size={16}
                                        color={BRAND_COLOR}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.sharedMemoryViewerTitle}>Shared memory</Text>
                                    <Text style={styles.sharedMemoryViewerSubtitle}>
                                        {sharedMemory?.mediaType === 'photo' ? 'Photo' : 'Video'}
                                    </Text>
                                </View>
                            </View>

                            <Pressable
                                style={styles.sharedMemoryViewerClose}
                                onPress={closeSharedMemoryViewer}
                                hitSlop={10}
                                accessibilityRole="button"
                                accessibilityLabel="Close shared memory"
                            >
                                <IconSymbol name="xmark" size={16} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <View style={styles.sharedMemoryViewerMediaWrap}>
                            {sharedMemory?.mediaType === 'photo' ? (
                                <Image
                                    source={{ uri: sharedMemory.fileUrl }}
                                    style={styles.sharedMemoryViewerMedia}
                                    resizeMode="contain"
                                />
                            ) : sharedMemorySignedUrl || sharedMemory?.fileUrl ? (
                                <Video
                                    style={styles.sharedMemoryViewerMedia}
                                    source={{ uri: sharedMemorySignedUrl || sharedMemory?.fileUrl || '' }}
                                    resizeMode={ResizeMode.CONTAIN}
                                    useNativeControls
                                    shouldPlay
                                    isLooping
                                    isMuted={false}
                                    volume={1.0}
                                    progressUpdateIntervalMillis={500}
                                    onError={(e) => {
                                        console.warn('[SharedMemoryViewer] Video error:', e?.toString?.() || e);
                                    }}
                                />
                            ) : (
                                <View style={styles.sharedMemoryViewerLoading}>
                                    <ActivityIndicator color={BRAND_COLOR} />
                                    <Text style={styles.sharedMemoryViewerLoadingText}>Loading…</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Feature Confirmation Dialog */}
            <Modal
                visible={showFeatureDialog}
                transparent
                animationType="fade"
                onRequestClose={() => setShowFeatureDialog(false)}
            >
                <Pressable
                    style={styles.featureDialogBackdrop}
                    onPress={() => !isFeaturing && setShowFeatureDialog(false)}
                >
                    <View style={styles.featureDialogCard}>
                        <Text style={styles.featureDialogTitle}>Feature This Video?</Text>
                        <Text style={styles.featureDialogMessage}>
                            This video will be featured on our app and website. Other users may be able to see it.
                        </Text>
                        <View style={styles.featureDialogButtons}>
                            <Pressable
                                style={[styles.featureDialogButton, styles.featureDialogButtonCancel]}
                                onPress={() => setShowFeatureDialog(false)}
                                disabled={isFeaturing}
                            >
                                <Text style={styles.featureDialogButtonCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.featureDialogButton, styles.featureDialogButtonConfirm]}
                                onPress={handleFeature}
                                disabled={isFeaturing}
                            >
                                {isFeaturing ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.featureDialogButtonConfirmText}>Feature</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
        paddingBottom: 40,
    },
    fixedTabContainer: {
        backgroundColor: palette.background,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.6)',
        gap: 10,
    },
    fixedTabTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 24,
        color: palette.textPrimary,
    },
    tabBarContainer: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    tabBar: {
        flexDirection: 'row',
        gap: 10,
        paddingRight: 20,
    },
    tabPill: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    tabPillActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 3,
    },
    tabLabel: {
        color: palette.textSecondary,
        fontWeight: '700',
    },
    tabLabelActive: {
        color: '#FFFFFF',
    },
    heroContainer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    heroCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(230, 222, 214, 0.4)',
        gap: 24,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    heroHeaderSection: {
        gap: 10,
    },
    heroTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    heroHeading: {
        fontFamily: BRAND_FONT,
        fontSize: 28,
        color: palette.textPrimary,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    heroNewBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(247, 85, 7, 0.1)',
    },
    heroNewBadgeText: {
        color: BRAND_COLOR,
        fontSize: 12,
        fontWeight: '700',
    },
    heroSubtitle: {
        color: palette.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        letterSpacing: -0.2,
    },
    heroStatsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(230, 222, 214, 0.3)',
    },
    heroStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    heroStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(230, 222, 214, 0.4)',
    },
    heroStatNumber: {
        fontFamily: BRAND_FONT,
        fontSize: 24,
        color: palette.textPrimary,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    heroStatLabel: {
        color: palette.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    heroActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(247, 85, 7, 0.2)',
        backgroundColor: 'rgba(247, 85, 7, 0.05)',
    },
    heroActionLabel: {
        color: BRAND_COLOR,
        fontSize: 15,
        fontWeight: '700',
    },
    panelContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 36,
        gap: 24,
    },
    sectionGap: {
        gap: 18,
    },
    section: {
        gap: 12,
    },
    sectionLoading: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    sectionLoadingText: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    sectionEmpty: {
        paddingVertical: 32,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 120,
    },
    sectionEmptyText: {
        color: palette.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    sectionEmptySubtext: {
        color: palette.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    sectionTitle: {
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        fontSize: 18,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: palette.textSecondary,
        fontWeight: '500',
        marginTop: 6,
    },
    reactionsSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    reactionGroup: {
        paddingHorizontal: 20,
        paddingBottom: 18,
    },
    reactionGroupTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: palette.textPrimary,
        marginBottom: 10,
        letterSpacing: -0.1,
    },
    reactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    reactionThumb: {
        width: 64,
        height: 64,
        borderRadius: 14,
    },
    reactionMeta: {
        flex: 1,
        marginLeft: 12,
        marginRight: 10,
        gap: 6,
    },
    reactionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.2,
    },
    reactionMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reactionMetaText: {
        fontSize: 12,
        color: palette.textSecondary,
        fontWeight: '600',
    },
    reactionMetaDot: {
        marginHorizontal: 8,
        fontSize: 12,
        color: palette.textSecondary,
        fontWeight: '700',
    },
    listStack: {
        gap: 10,
    },
    rowActionLabel: {
        fontWeight: '700',
        color: palette.textSecondary,
    },
    messagesPanelContainer: {
        flex: 1,
        backgroundColor: palette.background,
    },
    messagesHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 6,
    },
    messagesHeaderTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 24,
        color: palette.textPrimary,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    messagesHeaderSubtitle: {
        fontSize: 14,
        color: palette.textSecondary,
        fontWeight: '500',
    },
    messagesList: {
        flex: 1,
    },
    messagesListContent: {
        paddingHorizontal: 1,
        paddingTop: 0,
        paddingBottom: 20,
    },
    messageColumnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 1,
        gap: 1,
    },
    messageCardWrapper: {
        width: '33.3%',
        aspectRatio: 0.75,
    },
    messageCardContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
    },
    messageVideoPreview: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
    },
    sharedMemoryPhotoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111',
    },
    messageGradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    messageDirectionBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageDirectionBadgeReceived: {
        // Transparent - no background
    },
    messageDirectionBadgeSent: {
        // Transparent - no background
    },
    messagePlayButton: {
        position: 'absolute',
        bottom: '50%',
        left: '50%',
        marginBottom: -16,
        marginLeft: -16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageSharedMemoryBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 5,
        zIndex: 10,
    },
    featuredSharedMemoryBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 5,
        zIndex: 10,
    },
    rememberSharedMemoryBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 5,
        zIndex: 10,
    },
    vaultSharedMemoryBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 4,
        zIndex: 10,
    },
    messagePhotoBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 0,
        backgroundColor: 'rgba(247, 85, 7, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    messagePhotoIndicator: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    messagePhotoText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Keep old styles for backward compatibility (used in other components)
    messageBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageBadgeReceived: {
        // Transparent - no background
    },
    messageBadgeSent: {
        // Transparent - no background
    },
    messageBadgeLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    loadMoreFooter: {
        paddingVertical: 32,
        alignItems: 'center',
        gap: 12,
    },
    loadMoreText: {
        color: palette.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    vaultTabContainer: {
        gap: 22,
    },
    vaultHeaderBlock: {
        gap: 6,
    },
    vaultHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 14,
        gap: 12,
    },
    vaultHeaderTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 20,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.4,
    },
    vaultHeaderHint: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    vaultHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
    },
    vaultHeaderButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    vaultFilterRow: {
        paddingLeft: 16,
        paddingRight: 20,
        gap: 8,
    },
    vaultFilterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: palette.border,
        backgroundColor: palette.card,
        marginRight: 0,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    vaultFilterChipActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    vaultFilterLabel: {
        color: palette.textSecondary,
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.2,
    },
    vaultFilterLabelActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    vaultListHeader: {
        paddingTop: 8,
        paddingBottom: 10,
    },
    vaultEmptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 16,
    },
    vaultEmptyPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: BRAND_COLOR,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        minWidth: 220,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        marginTop: 6,
    },
    vaultEmptyPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    vaultEmptySecondaryButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    vaultEmptySecondaryButtonText: {
        color: palette.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    vaultSimpleTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 18,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.2,
    },
    vaultSimpleText: {
        color: palette.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '600',
        paddingHorizontal: 24,
    },
    vaultEmptyCard: {
        width: '100%',
        maxWidth: 460,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 24,
        padding: 18,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    vaultEmptyIconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: palette.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: palette.border,
    },
    vaultEmptyProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    vaultEmptyProgressText: {
        color: palette.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    vaultEmptyHero: {
        alignItems: 'center',
        paddingTop: 6,
    },
    vaultEmptyHintCard: {
        marginTop: 16,
        backgroundColor: palette.cardAlt,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 14,
        gap: 10,
        width: '100%',
    },
    vaultEmptyHintRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    vaultEmptyHintText: {
        flex: 1,
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    vaultEmptyHintEmphasis: {
        color: palette.textPrimary,
        fontWeight: '800',
    },
    vaultEmptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: palette.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    vaultEmptyTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 22,
        fontWeight: '800',
        color: palette.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    vaultEmptySubtitle: {
        fontSize: 15,
        color: palette.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    vaultListFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    vaultListFooterText: {
        fontSize: 14,
        color: palette.textSecondary,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    vaultCollectionList: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    vaultCollectionColumnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    vaultCollectionCard: {
        flex: 1,
        borderRadius: 22,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
    },
    vaultListEmptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
        gap: 8,
    },
    vaultCollectionHeader: {
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 6,
        backgroundColor: palette.card,
    },
    vaultCollectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    vaultCollectionName: {
        fontFamily: BRAND_FONT,
        fontSize: 13,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.3,
        lineHeight: 17,
        flex: 1,
    },
    vaultCollectionDescription: {
        color: palette.textSecondary,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
        marginTop: 2,
    },
    vaultCollectionFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    vaultCollectionCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: palette.accent,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    vaultCollectionCount: {
        color: BRAND_COLOR,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    vaultCollectionCountLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    vaultDescriptionModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    vaultDescriptionModalContent: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
    },
    vaultDescriptionModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    vaultDescriptionModalTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 20,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.5,
        lineHeight: 26,
        flex: 1,
    },
    vaultDescriptionModalCloseButton: {
        padding: 4,
        marginTop: -4,
    },
    vaultDescriptionModalBody: {
        marginTop: 4,
    },
    vaultDescriptionModalText: {
        fontSize: 15,
        color: palette.textSecondary,
        lineHeight: 22,
        letterSpacing: 0.1,
    },
    vaultCollectionBody: {
        flexDirection: 'row',
        gap: 1,
        flexWrap: 'wrap',
        width: '100%',
    },
    vaultCollectionThumbWrap: {
        width: '49.5%',
        aspectRatio: 0.75,
        borderRadius: 0,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
    },
    vaultCollectionThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
    },
    vaultCollectionMedia: {
        height: 150,
        backgroundColor: '#000',
    },
    vaultCollectionThumbPlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    vaultCollectionBadges: {
        position: 'absolute',
        left: 10,
        right: 10,
        top: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    vaultCollectionCountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    vaultCollectionCountPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    vaultCollectionPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: 8,
    },
    vaultCollectionPlayIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    vaultRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        borderRadius: 0,
        padding: 0,
        paddingVertical: 14,
        paddingHorizontal: 4,
        backgroundColor: 'transparent',
    },
    vaultRowImageContainer: {
        width: 88,
        height: 88,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: palette.accent,
    },
    vaultPreviewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        height: '100%',
        gap: 2,
    },
    vaultThumbContainer: {
        flex: 1,
        minWidth: '48%',
        aspectRatio: 1,
    },
    vaultThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
    },
    vaultRowPlaceholder: {
        width: '100%',
        height: '100%',
    },
    vaultRowContent: {
        flex: 1,
        gap: 8,
        justifyContent: 'space-between',
        paddingVertical: 2,
        minWidth: 0,
    },
    vaultRowHeader: {
        gap: 5,
        flex: 1,
        minWidth: 0,
    },
    vaultRowFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    vaultRowCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: palette.accent,
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 10,
    },
    previewTile: {
        width: 30,
        height: 30,
        borderRadius: 8,
        opacity: 0.7,
    },
    rememberCard: {
        width: 180,
        borderRadius: 16,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
        marginRight: 12,
    },
    rememberThumb: {
        width: '100%',
        height: 110,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    rememberBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    rememberBadgeLabel: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    rememberChip: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    rememberChipLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    rememberTitle: {
        fontWeight: '800',
        color: palette.textPrimary,
        fontSize: 15,
    },
    rememberMeta: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    collectionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    collectionPill: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
    },
    collectionName: {
        fontFamily: BRAND_FONT,
        fontSize: 15,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.4,
        lineHeight: 20,
        flexShrink: 1,
    },
    collectionDescription: {
        color: palette.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
        letterSpacing: 0.1,
        opacity: 0.85,
        flexShrink: 1,
    },
    collectionCount: {
        color: BRAND_COLOR,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    collectionCountLabel: {
        color: palette.textSecondary,
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    featuredScroll: {
        paddingVertical: 4,
        paddingHorizontal: 2,
        gap: 12,
    },
    featuredCard: {
        width: 220,
        borderRadius: 20,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        marginRight: 16,
        overflow: 'hidden',
    },
    featuredVideoContainer: {
        position: 'relative',
        width: '100%',
        height: 160,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    featuredThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    featuredGradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    featuredDirectionBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredDirectionBadgeReceived: {
        // Transparent - no background
    },
    featuredDirectionBadgeSent: {
        // Transparent - no background
    },
    featuredPlayButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -16,
        marginLeft: -16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredDurationBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    featuredDurationText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    featuredCardContent: {
        padding: 14,
        gap: 8,
    },
    featuredTitle: {
        color: palette.textPrimary,
        fontWeight: '700',
        fontSize: 15,
        lineHeight: 20,
        letterSpacing: -0.2,
    },
    featuredMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    featuredDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    featuredDateText: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    featuredDirectionLabel: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: palette.cardAlt,
    },
    featuredDirectionText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    featuredDirectionTextReceived: {
        color: '#10B981',
    },
    featuredDirectionTextSent: {
        color: BRAND_COLOR,
    },
    featuredMeta: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    playIcon: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '900',
    },
    playOverlaySmall: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: '30%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    playIconSmall: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
    },
    viewerBackdrop: {
        flex: 1,
        backgroundColor: '#000000',
    },
    viewerSlide: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    viewerVideo: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#000000',
    },
    viewerImage: {
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        backgroundColor: '#000000',
    },
    viewerSlideOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        pointerEvents: 'box-none', // Allow touches to pass through to video, but capture touches on children
    },
    viewerBackButton: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    viewerTapToToggle: {
        ...StyleSheet.absoluteFillObject,
        // Keep this BEHIND the overlay buttons, otherwise it steals taps.
        zIndex: 0,
    },
    viewerPausedOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    viewerPausedIcon: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    viewerGradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 220,
        zIndex: 0,
    },
    viewerOverlayBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 36,
        gap: 10,
        zIndex: 1,
    },
    viewerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    viewerTitle: {
        color: '#FFFFFF',
        fontFamily: BRAND_FONT,
        fontSize: 22,
        flex: 1,
        lineHeight: 28,
    },
    viewerExpandButton: {
        padding: 4,
        marginTop: 2,
    },
    viewerMeta: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 14,
    },
    viewerMetaType: {
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
    rememberBadgePosition: {
        left: undefined,
        right: 10,
    },
    viewerDirectionBadge: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        zIndex: 20,
    },
    viewerDirectionBadgeReceived: {
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        borderColor: 'rgba(255,255,255,0.25)',
    },
    viewerDirectionBadgeSent: {
        backgroundColor: 'rgba(247, 85, 7, 0.9)',
        borderColor: 'rgba(255,255,255,0.25)',
    },
    viewerDirectionBadgePhoto: {
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        borderColor: 'rgba(255,255,255,0.25)',
    },
    viewerSharedMemoryThumbnail: {
        width: 80,
        height: 120,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 15,
        zIndex: 100,
        backgroundColor: '#000',
    },
    viewerSharedMemoryImage: {
        width: '100%',
        height: '100%',
    },
    viewerActionsContainer: {
        position: 'absolute',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        zIndex: 20,
    },
    sharedMemoryViewerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(47,35,24,0.55)',
        paddingHorizontal: 18,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sharedMemoryViewerCard: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '86%',
        backgroundColor: palette.card,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
    },
    sharedMemoryViewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        backgroundColor: palette.card,
    },
    sharedMemoryViewerHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        paddingRight: 10,
    },
    sharedMemoryViewerHeaderIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: palette.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sharedMemoryViewerTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 16,
        color: palette.textPrimary,
    },
    sharedMemoryViewerSubtitle: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
        color: palette.textSecondary,
    },
    sharedMemoryViewerClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: BRAND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sharedMemoryViewerMediaWrap: {
        padding: 14,
        backgroundColor: palette.card,
        flexGrow: 1,
    },
    sharedMemoryViewerMedia: {
        width: '100%',
        aspectRatio: 9 / 16,
        backgroundColor: '#0B0B0B',
        borderRadius: 18,
        overflow: 'hidden',
    },
    sharedMemoryViewerLoading: {
        width: '100%',
        aspectRatio: 9 / 16,
        backgroundColor: palette.cardAlt,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: palette.border,
    },
    sharedMemoryViewerLoadingText: {
        fontSize: 13,
        fontWeight: '600',
        color: palette.textSecondary,
    },
    viewerActionButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    menuContainer: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 4,
        minWidth: 110,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    menuItemTextDelete: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },
    viewerFeatureButtonInactive: {
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderColor: 'rgba(255,255,255,0.4)',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    viewerFeatureButtonActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: 'rgba(255,255,255,0.3)',
        borderWidth: 2,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.6,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    qrBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    qrOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        elevation: 999,
    },
    qrCard: {
        width: '90%',
        maxWidth: 360,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        padding: 0,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
        overflow: 'hidden',
    },
    qrHeader: {
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 20,
        alignItems: 'center',
        gap: 8,
    },
    qrTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 22,
        fontWeight: '800',
        color: palette.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    qrDescription: {
        fontSize: 14,
        color: palette.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    qrCodeContainer: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    qrCodeWrapper: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 3,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    qrImage: {
        width: 220,
        height: 220,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    qrFooter: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 28,
        backgroundColor: '#FFFFFF',
    },
    qrCloseButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: BRAND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    qrCloseLabel: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.3,
    },
    emptyState: {
        paddingVertical: 60,
        paddingHorizontal: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    emptyTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 20,
        color: palette.textPrimary,
        fontWeight: '800',
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: palette.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    // Shared Memories styles
    sharedMemoriesEmptyContainer: {
        flex: 1,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
    },
    sharedMemoriesIntro: {
        alignItems: 'center',
        gap: 16,
        maxWidth: 340,
    },
    sharedMemoriesIntroTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 24,
        fontWeight: '700',
        color: palette.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    sharedMemoriesIntroText: {
        fontSize: 15,
        color: palette.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: -0.2,
    },
    sharedMemoriesUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        backgroundColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    sharedMemoriesUploadButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    sharedMemoriesHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 16,
    },
    sharedMemoriesHeaderTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
    },
    sharedMemoriesHeaderInfo: {
        flex: 1,
        gap: 6,
    },
    sharedMemoriesHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(247, 85, 7, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(247, 85, 7, 0.2)',
    },
    sharedMemoriesHeaderButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: BRAND_COLOR,
    },
    sharedMemoriesIntroSection: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: palette.cardAlt,
    },
    // Modal styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: palette.card,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    modalTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 24,
        fontWeight: '700',
        color: palette.textPrimary,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    modalSubtitle: {
        fontSize: 15,
        color: palette.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: palette.cardAlt,
        marginBottom: 12,
        gap: 16,
    },
    modalOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(247, 85, 7, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOptionContent: {
        flex: 1,
        gap: 4,
    },
    modalOptionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    modalOptionSubtitle: {
        fontSize: 13,
        color: palette.textSecondary,
    },
    modalCancelButton: {
        marginTop: 8,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: palette.textSecondary,
    },
    titleInputContainer: {
        marginVertical: 20,
    },
    titleInput: {
        borderWidth: 1.5,
        borderColor: palette.border,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: palette.textPrimary,
        backgroundColor: palette.cardAlt,
        fontFamily: BRAND_FONT,
    },
    titleModalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    titleModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleModalButtonSecondary: {
        backgroundColor: palette.cardAlt,
        borderWidth: 1.5,
        borderColor: palette.border,
    },
    titleModalButtonPrimary: {
        backgroundColor: BRAND_COLOR,
    },
    titleModalButtonTextSecondary: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    titleModalButtonTextPrimary: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    featureDialogBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    featureDialogCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 28,
        width: '100%',
        maxWidth: 380,
        gap: 20,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
    },
    featureDialogTitle: {
        fontSize: 24,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: palette.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    featureDialogMessage: {
        fontSize: 15,
        color: palette.textSecondary,
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    featureDialogButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    featureDialogButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    featureDialogButtonCancel: {
        backgroundColor: palette.cardAlt,
        borderWidth: 2,
        borderColor: palette.border,
    },
    featureDialogButtonCancelText: {
        color: palette.textPrimary,
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.2,
    },
    featureDialogButtonConfirm: {
        backgroundColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    featureDialogButtonConfirmText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.2,
    },
});
