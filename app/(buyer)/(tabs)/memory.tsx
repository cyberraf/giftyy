import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoPreview } from '@/components/VideoPreview';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useVideoMessages, VideoMessage } from '@/contexts/VideoMessagesContext';
import { useSignedVideoUrl } from '@/hooks/useSignedVideoUrl';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, Share, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs = ['Overview', 'Messages', 'Vaults'] as const;
type TabKey = (typeof tabs)[number];

const palette = {
    background: '#F5F4F2',
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
    };
}

type VaultCollectionItem = {
    id: string;
    name: string;
    videos: MemoryVideoItem[];
};

type RememberMemoryItem = MemoryVideoItem & { label: string };
type MessageVideoItem = MemoryVideoItem;

// Mock data removed - now using data from Supabase via VideoMessagesContext

const vaultCollections: VaultCollectionItem[] = [
    {
        id: 'c1',
        name: 'Family highlights',
        videos: [
            { id: 'c1v1', title: 'Family hike', duration: '02:12', date: 'June 11, 2025', videoUrl: 'https://cdn.coverr.co/videos/coverr-hiking-through-the-forest-5428/1080p.mp4', direction: 'received' },
            { id: 'c1v2', title: 'Reunion laughter', duration: '01:56', date: 'January 02, 2025', videoUrl: 'https://cdn.coverr.co/videos/coverr-family-celebration-6983/1080p.mp4', direction: 'received' },
            { id: 'c1v3', title: 'Beach picnic', duration: '02:05', date: 'August 15, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-family-at-the-beach-3349/1080p.mp4', direction: 'sent' },
        ],
    },
    {
        id: 'c2',
        name: 'Friends',
        videos: [
            { id: 'c2v1', title: 'City night out', duration: '01:44', date: 'May 08, 2025', videoUrl: 'https://cdn.coverr.co/videos/coverr-nightlife-1398/1080p.mp4', direction: 'received' },
            { id: 'c2v2', title: 'Coffee catchup', duration: '02:08', date: 'February 12, 2025', videoUrl: 'https://cdn.coverr.co/videos/coverr-coffee-shop-conversation-6296/1080p.mp4', direction: 'sent' },
            { id: 'c2v3', title: 'Festival dancing', duration: '02:22', date: 'September 19, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-dancing-at-the-festival-3193/1080p.mp4', direction: 'received' },
        ],
    },
    {
        id: 'c3',
        name: 'Work celebrations',
        videos: [
            { id: 'c3v1', title: 'Launch toast', duration: '01:48', date: 'March 02, 2025', videoUrl: 'https://cdn.coverr.co/videos/coverr-office-celebration-2587/1080p.mp4', direction: 'sent' },
            { id: 'c3v2', title: 'Team dinner', duration: '02:09', date: 'October 20, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-business-dinner-4433/1080p.mp4', direction: 'received' },
            { id: 'c3v3', title: 'Office awards', duration: '02:34', date: 'May 30, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-company-awards-night-7235/1080p.mp4', direction: 'received' },
        ],
    },
    {
        id: 'c4',
        name: 'Holiday reels',
        videos: [
            { id: 'c4v1', title: 'Winter market', duration: '01:39', date: 'December 09, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-christmas-market-2829/1080p.mp4', direction: 'received' },
            { id: 'c4v2', title: 'Mountain getaway', duration: '02:11', date: 'February 03, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-winter-holiday-1870/1080p.mp4', direction: 'sent' },
            { id: 'c4v3', title: 'Snowball fight', duration: '01:58', date: 'January 16, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-snow-fight-0323/1080p.mp4', direction: 'received' },
        ],
    },
];

const rememberMemories: RememberMemoryItem[] = [
    { id: 'r1', label: 'Last year', title: "Mom's retirement party", duration: '03:05', date: 'August 14, 2024', videoUrl: 'https://cdn.coverr.co/videos/coverr-retirement-party-1846/1080p.mp4', direction: 'received' },
    { id: 'r2', label: 'Two years ago', title: 'Jess & Sam anniversary', duration: '02:12', date: 'May 02, 2023', videoUrl: 'https://cdn.coverr.co/videos/coverr-anniversary-celebration-4038/1080p.mp4', direction: 'sent' },
    { id: 'r3', label: 'Five years ago', title: 'Team surprise launch', duration: '01:46', date: 'November 21, 2020', videoUrl: 'https://cdn.coverr.co/videos/coverr-business-team-celebrating-4331/1080p.mp4', direction: 'received' },
    { id: 'r4', label: 'Eight years ago', title: 'College move-in day', duration: '02:27', date: 'September 03, 2017', videoUrl: 'https://cdn.coverr.co/videos/coverr-college-campus-life-8646/1080p.mp4', direction: 'sent' },
];

export default function MemoryTabScreen() {
    const { top } = useSafeAreaInsets();
    const { videoMessages, loading: videosLoading } = useVideoMessages();
    const [activeTab, setActiveTab] = useState<TabKey>('Overview');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerData, setViewerData] = useState<MemoryVideoItem[]>([]);

    // Convert video messages to memory items
    const messageVideos = useMemo(() => {
        return videoMessages.map(videoMessageToMemoryItem);
    }, [videoMessages]);

    // Featured memories are the most recent 4 videos
    const featuredMemories = useMemo(() => {
        return messageVideos.slice(0, 4);
    }, [messageVideos]);

    const description = useMemo(() => {
        switch (activeTab) {
            case 'Messages':
                return 'Catch up on replies, share reactions, or download a clip for later.';
            case 'Vaults':
                return 'Organize memories in themed vaults to keep big moments easy to revisit.';
            default:
                return 'Relive heartfelt reactions, manage your greetings, and curate collections.';
        }
    }, [activeTab]);

    const handleOpenViewer = useCallback((index: number, data: MemoryVideoItem[]) => {
        setViewerData(data);
        setViewerIndex(index);
        setViewerVisible(true);
    }, []);

    const handleCloseViewer = useCallback(() => {
        setViewerVisible(false);
    }, []);

    const handleUploadVideo = useCallback(async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Please allow media library access to upload a video.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsMultipleSelection: false,
            quality: 1,
        });

        if (result.canceled) {
            return;
        }

        const asset = result.assets?.[0];
        if (asset) {
            Alert.alert('Video selected', asset.uri);
        }
    }, []);

    const { bottom } = useSafeAreaInsets();
    return (
        <View style={[styles.screen, { paddingTop: top + 6 }]}> 
            <View style={styles.fixedTabContainer}>
                <Text style={styles.fixedTabTitle}>Memories</Text>
                <View style={styles.tabBar}>
                    {tabs.map((tab) => {
                        const isActive = tab === activeTab;
                        return (
                            <Pressable key={tab} style={[styles.tabPill, isActive && styles.tabPillActive]} onPress={() => setActiveTab(tab)}>
                                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
            {activeTab === 'Messages' ? (
                <MessagesPanel messageVideos={messageVideos} onOpenViewer={(index) => handleOpenViewer(index, messageVideos)} />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollArea}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
                >
                    {activeTab === 'Overview' && (
                        <View style={styles.heroContainer}>
                            <Text style={styles.heroLabel}>Curated memories</Text>
                            <View style={styles.heroCard}>
                                <View style={styles.heroHeaderRow}>
                                    <View style={{ flex: 1, gap: 8 }}>
                                        <Text style={styles.heroHeading}>Every reaction, safely tucked away.</Text>
                                        <Text style={styles.heroSubtitle}>{description}</Text>
                                    </View>
                                    <View style={styles.heroBadge}>
                                        <Text style={styles.heroBadgeNumber}>12</Text>
                                        <Text style={styles.heroBadgeLabel}>new</Text>
                                    </View>
                                </View>

                                <View style={styles.heroStatsRow}>
                                    <View style={styles.heroStat}>
                                        <Text style={styles.heroStatNumber}>24</Text>
                                        <Text style={styles.heroStatLabel}>Saved clips</Text>
                                    </View>
                                    <View style={styles.heroStat}>
                                        <Text style={styles.heroStatNumber}>6</Text>
                                        <Text style={styles.heroStatLabel}>Shared vaults</Text>
                                    </View>
                                    <View style={styles.heroStat}>
                                        <Text style={styles.heroStatNumber}>3</Text>
                                        <Text style={styles.heroStatLabel}>Awaiting replies</Text>
                                    </View>
                                </View>

                                <View style={styles.heroActions}>
                                    <Pressable style={styles.heroSecondaryButton} onPress={handleUploadVideo}>
                                        <Text style={styles.heroSecondaryLabel}>Upload video</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={styles.panelContainer}>
                        {activeTab === 'Overview' && (
                            <OverviewPanel
                                featuredMemories={featuredMemories}
                                onOpenFeatured={(index) => handleOpenViewer(index, featuredMemories)}
                                onOpenVault={(collection, startIndex = 0) => handleOpenViewer(startIndex, collection.videos)}
                                onOpenRemember={(index) => handleOpenViewer(index, rememberMemories)}
                            />
                        )}
                        {activeTab === 'Vaults' && <VaultsPanel onOpenVault={(collection, startIndex = 0) => handleOpenViewer(startIndex, collection.videos)} />}
                    </View>
                </ScrollView>
            )}

            <MessageVideoViewer
                visible={viewerVisible}
                initialIndex={viewerIndex}
                data={viewerData}
                onClose={handleCloseViewer}
            />
        </View>
    );
}

function OverviewPanel({
    featuredMemories,
    onOpenFeatured,
    onOpenVault,
    onOpenRemember,
}: {
    featuredMemories: MemoryVideoItem[];
    onOpenFeatured: (index: number) => void;
    onOpenVault: (collection: VaultCollectionItem, startIndex?: number) => void;
    onOpenRemember: (index: number) => void;
}) {
    return (
        <View style={styles.sectionGap}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured messages</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredScroll}
                >
                    {featuredMemories.map((memory, index) => (
                        <FeaturedMemoryCard key={memory.id} {...memory} onPress={() => onOpenFeatured(index)} />
                    ))}
                </ScrollView>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured vaults</Text>
                <View style={styles.listStack}>
                    {vaultCollections.slice(0, 3).map((collection) => (
                        <VaultRow key={collection.id} collection={collection} onPress={() => onOpenVault(collection)} />
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Remember this?</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredScroll}
                >
                    {rememberMemories.map((memory, index) => (
                        <RememberMemoryCard key={memory.id} {...memory} onPress={() => onOpenRemember(index)} />
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

function MessagesPanel({ messageVideos, onOpenViewer }: { messageVideos: MessageVideoItem[]; onOpenViewer: (index: number) => void }) {
    const batchSize = 9;
    const [visibleCount, setVisibleCount] = useState(batchSize);
    const [loadingMore, setLoadingMore] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const visibleVideos = useMemo(() => messageVideos.slice(0, visibleCount), [messageVideos, visibleCount]);
    const canLoadMore = visibleCount < messageVideos.length;

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

    const renderItem = useCallback(({ item, index }: { item: MessageVideoItem; index: number }) => (
        <MessageVideoCard videoUrl={item.videoUrl} direction={item.direction} onPress={() => onOpenViewer(index)} />
    ), [onOpenViewer]);

    const { bottom } = useSafeAreaInsets();
    return (
        <FlatList
            data={visibleVideos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            style={styles.messagesList}
            contentContainerStyle={[styles.messagesListContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
            columnWrapperStyle={styles.messageColumnWrapper}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.6}
            ListFooterComponent={
                loadingMore ? (
                    <View style={styles.loadMoreFooter}>
                        <ActivityIndicator color={BRAND_COLOR} />
                        <Text style={styles.loadMoreText}>Loading more messages…</Text>
                    </View>
                ) : !canLoadMore ? (
                    <View style={styles.loadMoreFooter}>
                        <Text style={styles.loadMoreText}>You’re all caught up.</Text>
                    </View>
                ) : null
            }
        />
    );
}

function VaultsPanel({ onOpenVault }: { onOpenVault: (collection: VaultCollectionItem, startIndex?: number) => void }) {
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = useMemo(() => ['All', 'Family', 'Friends', 'Work', 'Holiday'], []);

    const filteredVaults = useMemo(() => {
        if (activeFilter === 'All') {
            return vaultCollections;
        }
        const keyword = activeFilter.toLowerCase();
        return vaultCollections.filter((collection) => collection.name.toLowerCase().includes(keyword));
    }, [activeFilter]);

    return (
        <View style={styles.vaultTabContainer}>
            <View style={styles.vaultHeaderBlock}>
                <Text style={styles.sectionTitle}>Browse vaults</Text>
                <Text style={styles.vaultHeaderHint}>Filter collections and jump right into their saved clips.</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vaultFilterRow}
            >
                {filters.map((filter) => {
                    const isActive = filter === activeFilter;
                    return (
                        <Pressable key={filter} style={[styles.vaultFilterChip, isActive && styles.vaultFilterChipActive]} onPress={() => setActiveFilter(filter)}>
                            <Text style={[styles.vaultFilterLabel, isActive && styles.vaultFilterLabelActive]}>{filter}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={styles.vaultCollectionList}>
                {filteredVaults.map((collection) => (
                    <VaultCollectionCard key={collection.id} collection={collection} onOpen={() => onOpenVault(collection)} />
                ))}
            </View>
        </View>
    );
}

function FeaturedMemoryCard({ title, duration, date, videoUrl, direction, onPress }: MemoryVideoItem & { onPress: () => void }) {
    return (
        <Pressable style={styles.featuredCard} onPress={onPress}>
            <View style={{ position: 'relative' }}>
                <VideoPreview videoUrl={videoUrl} style={styles.featuredThumb} />
                <View style={[styles.messageBadge, direction === 'received' ? styles.messageBadgeReceived : styles.messageBadgeSent]}>
                    <Text style={styles.messageBadgeLabel}>{direction === 'received' ? '⬇' : '⬆'}</Text>
                </View>
                <View style={styles.playOverlay}>
                    <Text style={styles.playIcon}>▶</Text>
                </View>
            </View>
            <View style={{ padding: 10, gap: 4 }}>
                <Text style={styles.featuredTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.featuredMeta}>{duration} • {date}</Text>
            </View>
        </Pressable>
    );
}

function VaultRow({ collection, onPress }: { collection: VaultCollectionItem; onPress: () => void }) {
    const previewVideos = (collection.videos ?? []).slice(0, 3);
    const count = collection.videos?.length ?? 0;
    return (
        <Pressable style={styles.vaultRow} onPress={onPress}>
            <View style={styles.vaultPreviewStrip}>
                {previewVideos.map((video, index) => (
                    <VideoPreview key={video.id} videoUrl={video.videoUrl} style={styles.vaultThumb} />
                ))}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.collectionName}>{collection.name}</Text>
                <Text style={styles.collectionCount}>{count} memories</Text>
            </View>
            <Text style={styles.rowActionLabel}>Open</Text>
        </Pressable>
    );
}

function VaultCollectionCard({ collection, onOpen }: { collection: VaultCollectionItem; onOpen: () => void }) {
    const previewVideos = collection.videos.slice(0, 4);
    return (
        <Pressable style={styles.vaultCollectionCard} onPress={onOpen}>
            <View style={styles.vaultCollectionHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.vaultCollectionName}>{collection.name}</Text>
                    <Text style={styles.vaultCollectionCount}>{collection.videos.length} memories saved</Text>
                </View>
                <Text style={styles.vaultCollectionAction}>View</Text>
            </View>
            <View style={styles.vaultCollectionBody}>
                {previewVideos.map((video) => (
                    <View key={video.id} style={styles.vaultCollectionThumbWrap}>
                        <VideoPreview videoUrl={video.videoUrl} style={styles.vaultCollectionThumb} />
                        <View style={[styles.vaultCollectionBadge, video.direction === 'received' ? styles.messageBadgeReceived : styles.messageBadgeSent]}>
                            <Text style={styles.messageBadgeLabel}>{video.direction === 'received' ? '⬇' : '⬆'}</Text>
                        </View>
                        <View style={styles.playOverlaySmall}>
                            <Text style={styles.playIconSmall}>▶</Text>
                        </View>
                        <Text style={styles.vaultThumbLabel} numberOfLines={1}>{video.title}</Text>
                    </View>
                ))}
            </View>
        </Pressable>
    );
}

function MessageVideoCard({ videoUrl, direction, onPress }: { videoUrl: string; direction: 'sent' | 'received'; onPress: () => void }) {
    return (
        <View style={styles.messageTileWrapper}>
            <Pressable style={styles.messageTile} onPress={onPress}>
                <VideoPreview videoUrl={videoUrl} style={styles.messageThumbLarge} />
                <View style={[styles.messageBadge, direction === 'received' ? styles.messageBadgeReceived : styles.messageBadgeSent]}>
                    <Text style={styles.messageBadgeLabel}>{direction === 'received' ? '⬇' : '⬆'}</Text>
                </View>
                <View style={styles.playOverlay}>
                    <Text style={styles.playIcon}>▶</Text>
                </View>
            </Pressable>
        </View>
    );
}

function RememberMemoryCard({ label, title, duration, date, videoUrl, direction, onPress }: RememberMemoryItem & { onPress: () => void }) {
    return (
        <Pressable style={styles.rememberCard} onPress={onPress}>
            <View style={{ position: 'relative' }}>
                <VideoPreview videoUrl={videoUrl} style={styles.rememberThumb} />
                <View style={[styles.messageBadge, direction === 'received' ? styles.messageBadgeReceived : styles.messageBadgeSent, styles.rememberBadgePosition]}>
                    <Text style={styles.messageBadgeLabel}>{direction === 'received' ? '⬇' : '⬆'}</Text>
                </View>
                <View style={styles.playOverlay}>
                    <Text style={styles.playIcon}>▶</Text>
                </View>
                <View style={styles.rememberChip}>
                    <Text style={styles.rememberChipLabel}>{label}</Text>
                </View>
            </View>
            <View style={{ padding: 10, gap: 4 }}>
                <Text style={styles.rememberTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.rememberMeta}>{duration} • {date}</Text>
            </View>
        </Pressable>
    );
}

export function MessageVideoViewer({ visible, initialIndex, data, onClose }: { visible: boolean; initialIndex: number; data: MemoryVideoItem[]; onClose: () => void }) {
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
            if (Platform.OS !== 'web') {
                StatusBar.setHidden(true, 'fade');
            }
        } else {
            setBottomBarVisible(true); // Show bottom bar when video viewer closes
            if (Platform.OS !== 'web') {
                StatusBar.setHidden(false, 'fade');
            }
        }
    }, [visible, initialIndex, dataKey, setBottomBarVisible]);

    useEffect(() => {
        return () => {
            setBottomBarVisible(true); // Ensure bottom bar is shown when component unmounts
            if (Platform.OS !== 'web') {
                StatusBar.setHidden(false, 'fade');
            }
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
            onShowQr={(video) => {
                setQrItem(video);
                setQrVisible(true);
            }}
        />
    ), [SCREEN_HEIGHT, SCREEN_WIDTH, currentIndex, insets.bottom]);

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
                        onScrollToIndexFailed={({ index }) => {
                            setTimeout(() => {
                                listRef.current?.scrollToIndex({ index, animated: false });
                            }, 120);
                        }}
                    />

                    <Pressable style={[styles.viewerCloseButton, { top: insets.top + 16 }]} onPress={onClose}>
                        <Text style={styles.viewerCloseLabel}>✕</Text>
                    </Pressable>
                </View>
            </Modal>

            <Modal
                visible={qrVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setQrVisible(false)}
            >
                <Pressable style={styles.qrBackdrop} onPress={() => setQrVisible(false)}>
                    <View style={styles.qrCard}>
                        <Text style={styles.qrTitle}>{qrItem?.title}</Text>
                        {qrItem && (
                            <Image
                                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrItem.videoUrl)}` }}
                                style={styles.qrImage}
                            />
                        )}
                        <Text style={styles.qrSubtitle}>Scan to open this memory</Text>
                        <Pressable style={styles.qrCloseButton} onPress={() => setQrVisible(false)}>
                            <Text style={styles.qrCloseLabel}>Close</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

function ViewerSlide({ item, index, currentIndex, screenHeight, screenWidth, safeBottom, onShowQr }: { item: MemoryVideoItem; index: number; currentIndex: number; screenHeight: number; screenWidth: number; safeBottom: number; onShowQr: (video: MemoryVideoItem) => void }) {
    const videoRef = useRef<Video>(null);
    const playbackUrl = useSignedVideoUrl(item.videoUrl);
    const [videoReady, setVideoReady] = useState(false);
    const [videoError, setVideoError] = useState(false);

    useEffect(() => {
        setVideoReady(false);
        setVideoError(false);
    }, [playbackUrl]);

    useEffect(() => {
        if (!playbackUrl) {
            return;
        }
        const isActive = currentIndex === index;
        if (isActive) {
            videoRef.current?.playAsync().catch(() => {});
        } else {
            videoRef.current?.pauseAsync().catch(() => {});
        }
    }, [currentIndex, index, playbackUrl]);

    const handleShare = useCallback(() => {
        Share.share({
            message: `Check out this memory: ${item.title} (${item.videoUrl})`,
        }).catch(() => {});
    }, [item.title, item.videoUrl]);

    const handleQrView = useCallback(() => {
        onShowQr(item);
    }, [item, onShowQr]);

    return (
        <View style={[styles.viewerSlide, { height: screenHeight, width: screenWidth }]}> 
            {playbackUrl ? (
                <Video
                    ref={videoRef}
                    style={styles.viewerVideo}
                    source={{ uri: playbackUrl }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={currentIndex === index}
                    isLooping
                    useNativeControls={false}
                    onLoad={() => setVideoReady(true)}
                    onError={(error) => {
                        console.error('Memory viewer video error:', error);
                        setVideoError(true);
                    }}
                />
            ) : (
                <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
            {!videoReady && !videoError && playbackUrl && (
                <View style={[styles.viewerVideo, { justifyContent: 'center', alignItems: 'center', position: 'absolute' }]}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
            <View style={styles.viewerSlideOverlay}>
                <View style={[styles.viewerIconButtonSmall, item.direction === 'received' ? styles.viewerIconReceived : styles.viewerIconSent, { right: 20, bottom: safeBottom + 216 }]}>
                    <Text style={[styles.viewerMenuIcon, { fontSize: 22 }]}>{item.direction === 'received' ? '\u2b07' : '\u2b06'}</Text>
                </View>
                <Pressable style={[styles.viewerIconButton, { right: 20, bottom: safeBottom + 148 }]} onPress={handleQrView}>
                    <IconSymbol name="qrcode.viewfinder" size={24} color="#FFFFFF" />
                </Pressable>
                <Pressable style={[styles.viewerIconButton, { right: 20, bottom: safeBottom + 90 }]} onPress={handleShare}>
                    <IconSymbol name="square.and.arrow.up" size={24} color="#FFFFFF" />
                </Pressable>
            </View>
            <View style={styles.viewerOverlayBottom}>
                <Text style={styles.viewerTitle}>{item.title}</Text>
                <Text style={styles.viewerMeta}>{item.date} • {item.duration}</Text>
            </View>
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
    tabBar: {
        flexDirection: 'row',
        gap: 10,
    },
    tabPill: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
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
        paddingBottom: 20,
        gap: 12,
    },
    heroLabel: {
        fontSize: 12,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: palette.textSecondary,
        fontWeight: '700',
    },
    heroCard: {
        backgroundColor: palette.card,
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 20,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 4,
    },
    heroHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 18,
    },
    heroBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND_COLOR,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 62,
    },
    heroBadgeNumber: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 18,
        lineHeight: 20,
    },
    heroBadgeLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.85,
    },
    heroHeading: {
        fontFamily: BRAND_FONT,
        fontSize: 26,
        color: palette.textPrimary,
    },
    heroSubtitle: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    heroStatsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    heroStat: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 6,
    },
    heroStatNumber: {
        fontFamily: BRAND_FONT,
        fontSize: 20,
        color: palette.textPrimary,
    },
    heroStatLabel: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    heroActions: {
        gap: 12,
        width: '100%',
    },
    heroPrimaryButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 3,
    },
    heroPrimaryLabel: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    heroSecondaryButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.cardAlt,
        width: '100%',
    },
    heroSecondaryLabel: {
        color: palette.textPrimary,
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
    sectionTitle: {
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        fontSize: 18,
    },
    listStack: {
        gap: 10,
    },
    rowActionLabel: {
        fontWeight: '700',
        color: palette.textSecondary,
    },
    messagesList: {
        flex: 1,
    },
    messagesListContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 60,
    },
    messageColumnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    messageTileWrapper: {
        width: '32%',
    },
    messageTile: {
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        position: 'relative',
    },
    messageThumbLarge: {
         width: '100%',
        height: 140,
    },
    messageBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    messageBadgeReceived: {
        backgroundColor: 'rgba(0, 125, 71, 0.75)',
    },
    messageBadgeSent: {
        backgroundColor: 'rgba(190, 98, 0, 0.8)',
    },
    messageBadgeLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    loadMoreFooter: {
        paddingVertical: 24,
        alignItems: 'center',
        gap: 10,
    },
    loadMoreText: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    vaultTabContainer: {
        gap: 22,
    },
    vaultHeaderBlock: {
        gap: 6,
    },
    vaultHeaderHint: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    vaultFilterRow: {
        paddingLeft: 4,
        paddingRight: 4,
        gap: 10,
    },
    vaultFilterChip: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
        marginRight: 10,
    },
    vaultFilterChipActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
    },
    vaultFilterLabel: {
        color: palette.textSecondary,
        fontWeight: '700',
    },
    vaultFilterLabelActive: {
        color: '#FFFFFF',
    },
    vaultCollectionList: {
        gap: 16,
    },
    vaultCollectionCard: {
        borderRadius: 22,
        padding: 18,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
        gap: 14,
    },
    vaultCollectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    vaultCollectionName: {
        fontFamily: BRAND_FONT,
        fontSize: 18,
        color: palette.textPrimary,
    },
    vaultCollectionCount: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    vaultCollectionAction: {
        fontWeight: '700',
        color: BRAND_COLOR,
    },
    vaultCollectionBody: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    vaultCollectionThumbWrap: {
        width: '47%',
        aspectRatio: 0.85,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
    },
    vaultCollectionThumb: {
        width: '100%',
        height: '75%',
    },
    vaultCollectionBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    vaultThumbLabel: {
        color: '#FFFFFF',
        fontSize: 11,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
        width: '100%',
    },
    vaultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderRadius: 16,
        padding: 14,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    vaultPreviewStrip: {
        flexDirection: 'row',
        gap: 6,
    },
    vaultThumb: {
        width: 40,
        height: 40,
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
        color: palette.textPrimary,
        fontWeight: '700',
    },
    collectionCount: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    featuredScroll: {
        paddingVertical: 4,
        paddingHorizontal: 2,
        gap: 12,
    },
    featuredCard: {
        width: 200,
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
    featuredThumb: {
        width: '100%',
        height: 120,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    featuredTitle: {
        color: palette.textPrimary,
        fontWeight: '800',
        fontSize: 16,
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
        backgroundColor: '#000',
    },
    viewerVideo: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    viewerSlideOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1,
    },
    viewerOverlayBottom: {
        width: '100%',
        paddingHorizontal: 24,
        paddingBottom: 36,
        gap: 6,
    },
    viewerTitle: {
        color: '#FFFFFF',
        fontFamily: BRAND_FONT,
        fontSize: 22,
    },
    viewerMeta: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 14,
    },
    viewerCloseButton: {
        position: 'absolute',
        right: 24,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerCloseLabel: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    rememberBadgePosition: {
        left: undefined,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    viewerIconButton: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerIconButtonSmall: {
        position: 'absolute',
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerIconReceived: {
        backgroundColor: 'rgba(0, 125, 71, 0.9)',
    },
    viewerIconSent: {
        backgroundColor: 'rgba(190, 98, 0, 0.95)',
    },
    viewerMenuIcon: {
        color: '#FFFFFF',
        fontSize: 21,
        fontWeight: '700',
    },
    qrBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    qrCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        backgroundColor: '#141312',
        padding: 20,
        alignItems: 'center',
        gap: 14,
    },
    qrTitle: {
        color: '#FFFFFF',
        fontFamily: BRAND_FONT,
        fontSize: 20,
        textAlign: 'center',
    },
    qrSubtitle: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        textAlign: 'center',
    },
    qrImage: {
        width: 220,
        height: 220,
        borderRadius: 16,
    },
    qrCloseButton: {
        marginTop: 4,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    qrCloseLabel: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
