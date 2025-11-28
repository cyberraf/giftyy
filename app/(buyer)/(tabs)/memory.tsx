import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoPreview } from '@/components/VideoPreview';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useVideoMessages, VideoMessage } from '@/contexts/VideoMessagesContext';
import { useSharedMemories, type SharedMemory } from '@/contexts/SharedMemoriesContext';
import { useVaults } from '@/contexts/VaultsContext';
import { useSignedVideoUrl } from '@/hooks/useSignedVideoUrl';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, RefreshControl, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs = ['Overview', 'Messages', 'Vaults', 'Shared memories'] as const;
type TabKey = (typeof tabs)[number];

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
    const { videoMessages, loading: videosLoading, refreshVideoMessages } = useVideoMessages();
    const { vaults, loading: vaultsLoading } = useVaults();
    const { sharedMemories, loading: sharedMemoriesLoading, refreshSharedMemories } = useSharedMemories();
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
        setViewerVisible(true);
    }, []);

    const handleCloseViewer = useCallback(() => {
        setViewerVisible(false);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshVideoMessages(), refreshSharedMemories()]);
        } catch (error) {
            console.error('Error refreshing memories:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshVideoMessages, refreshSharedMemories]);

    const [mediaTypeModalVisible, setMediaTypeModalVisible] = useState(false);
    const { addSharedMemory } = useSharedMemories();

    const handleUploadMemory = useCallback(() => {
        setMediaTypeModalVisible(true);
    }, []);

    const handleSelectMediaType = useCallback(async (mediaType: 'video' | 'photo') => {
        setMediaTypeModalVisible(false);
        
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Please allow media library access to upload a memory.');
            return;
        }

        const mediaTypes = mediaType === 'video' 
            ? ImagePicker.MediaTypeOptions.Videos 
            : ImagePicker.MediaTypeOptions.Images;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes,
            allowsMultipleSelection: false,
            quality: 1,
        });

        if (result.canceled) {
            return;
        }

        const asset = result.assets?.[0];
        if (!asset) {
            return;
        }

        // Open title input modal
        setSelectedAsset({ uri: asset.uri, mediaType });
        setTitleModalVisible(true);
    }, []);

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
                <MessagesPanel messageVideos={messageVideos} onOpenViewer={(index) => handleOpenViewer(index, messageVideos)} />
            ) : activeTab === 'Shared memories' ? (
                <SharedMemoriesPanel 
                    sharedMemories={sharedMemories} 
                    loading={sharedMemoriesLoading}
                    onUpload={handleUploadMemory}
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
                        {activeTab === 'Vaults' && <VaultsPanel vaultCollections={vaultCollections} loading={vaultsLoading} onOpenVault={(collection, startIndex = 0) => handleOpenViewer(startIndex, collection.videos)} />}
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
                        <FeaturedMemoryCard key={memory.id} {...memory} onPress={() => onOpenFeatured(index)} />
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
                        {vaultCollections.slice(0, 5).map((collection) => (
                        <VaultRow key={collection.id} collection={collection} onPress={() => onOpenVault(collection)} />
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
                        <RememberMemoryCard key={memory.id} {...memory} onPress={() => onOpenRemember(index)} />
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
            contentContainerStyle={[styles.messagesListContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
            columnWrapperStyle={styles.messageColumnWrapper}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.6}
                ListHeaderComponent={
                    <View style={styles.messagesHeader}>
                        <Text style={styles.messagesHeaderTitle}>All Messages</Text>
                        <Text style={styles.messagesHeaderSubtitle}>{messageVideos.length} {messageVideos.length === 1 ? 'message' : 'messages'}</Text>
                    </View>
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

function VaultsPanel({ vaultCollections, loading, onOpenVault }: { vaultCollections: VaultCollectionItem[]; loading: boolean; onOpenVault: (collection: VaultCollectionItem, startIndex?: number) => void }) {
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = useMemo(() => {
        const uniqueNames = new Set(vaultCollections.map((v) => v.name));
        return ['All', ...Array.from(uniqueNames)];
    }, [vaultCollections]);

    const filteredVaults = useMemo(() => {
        if (activeFilter === 'All') {
            return vaultCollections;
        }
        return vaultCollections.filter((collection) => collection.name === activeFilter);
    }, [activeFilter, vaultCollections]);

    return (
        <View style={styles.vaultTabContainer}>
            <View style={styles.vaultHeaderBlock}>
                <Text style={styles.sectionTitle}>Browse vaults</Text>
                <Text style={styles.vaultHeaderHint}>Filter vaults and jump right into their saved clips.</Text>
            </View>

            {loading && vaultCollections.length === 0 ? (
                <View style={styles.sectionEmpty}>
                    <ActivityIndicator color={BRAND_COLOR} />
                    <Text style={styles.sectionEmptyText}>Loading vaults…</Text>
                    <Text style={styles.sectionEmptySubtext}>Hang tight while we fetch your personalized vaults.</Text>
                </View>
            ) : vaultCollections.length === 0 ? (
                <View style={styles.sectionEmpty}>
                    <IconSymbol name="camera.fill" size={32} color="#9ba1a6" />
                    <Text style={styles.sectionEmptyText}>No vaults yet</Text>
                    <Text style={styles.sectionEmptySubtext}>Your videos will appear here once our AI curates themed vaults.</Text>
                </View>
            ) : (
                <>
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
                </>
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

function SharedMemoriesPanel({ sharedMemories, loading, onUpload }: { sharedMemories: SharedMemory[]; loading: boolean; onUpload: () => void }) {
    const batchSize = 9;
    const [visibleCount, setVisibleCount] = useState(batchSize);
    const [loadingMore, setLoadingMore] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerData, setViewerData] = useState<(MemoryVideoItem & { mediaType: 'video' | 'photo' })[]>([]);

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

    const renderItem = useCallback(({ item, index }: { item: typeof memoryItems[0]; index: number }) => (
        <SharedMemoryCard 
            item={item} 
            onPress={() => handleOpenViewer(index)} 
        />
    ), [handleOpenViewer]);

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
                contentContainerStyle={[styles.messagesListContent, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
                columnWrapperStyle={styles.messageColumnWrapper}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.6}
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

function SharedMemoryCard({ item, onPress }: { item: MemoryVideoItem & { mediaType: 'video' | 'photo' }; onPress: () => void }) {
    return (
        <Pressable style={styles.messageCardWrapper} onPress={onPress}>
            <View style={styles.messageCardContainer}>
                {item.mediaType === 'photo' ? (
                    <>
                        <Image 
                            source={{ uri: item.videoUrl }} 
                            style={styles.messageVideoPreview}
                            resizeMode="cover"
                        />
                        {/* Gradient overlay for better readability */}
                        <View style={styles.messageGradientOverlay} />
                        {/* Photo icon indicator */}
                        <View style={styles.messagePhotoBadge}>
                            <IconSymbol name="photo.fill" size={16} color="#FFFFFF" />
                        </View>
                        {/* Photo indicator at bottom */}
                        <View style={styles.messagePhotoIndicator}>
                            <Text style={styles.messagePhotoText}>Photo</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <VideoPreview videoUrl={item.videoUrl} style={styles.messageVideoPreview} />
                        {/* Gradient overlay for better readability */}
                        <View style={styles.messageGradientOverlay} />
                        {/* Direction indicator */}
                        <View style={[styles.messageDirectionBadge, styles.messageDirectionBadgeSent]}>
                            <IconSymbol
                                name="arrow.up.circle.fill"
                                size={16}
                                color="#FFFFFF"
                            />
                        </View>
                        {/* Modern play button */}
                        <View style={styles.messagePlayButton}>
                            <IconSymbol name="play.fill" size={14} color="#FFFFFF" />
                        </View>
                    </>
                )}
            </View>
        </Pressable>
    );
}

function FeaturedMemoryCard({ title, duration, date, videoUrl, direction, onPress }: MemoryVideoItem & { onPress: () => void }) {
    return (
        <Pressable style={styles.featuredCard} onPress={onPress}>
            <View style={styles.featuredVideoContainer}>
                <VideoPreview videoUrl={videoUrl} style={styles.featuredThumb} />
                {/* Gradient overlay for better text readability */}
                <View style={styles.featuredGradientOverlay} />
                
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
                    <View style={styles.featuredPlayButtonInner}>
                        <IconSymbol name="play.fill" size={20} color="#FFFFFF" />
                </View>
            </View>
                
                {/* Duration badge at bottom */}
                <View style={styles.featuredDurationBadge}>
                    <Text style={styles.featuredDurationText}>{duration}</Text>
                </View>
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
    const previewVideos = (collection.videos ?? []).slice(0, 3);
    const count = collection.videos?.length ?? 0;
    const secondary = collection.description || collection.categoryType?.replace(/-/g, ' ');
    return (
        <Pressable style={styles.vaultRow} onPress={onPress}>
            <View style={styles.vaultPreviewStrip}>
                {previewVideos.map((video, index) => (
                    <VideoPreview key={video.id} videoUrl={video.videoUrl} style={styles.vaultThumb} />
                ))}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.collectionName}>{collection.name}</Text>
                {secondary && <Text style={styles.collectionDescription}>{secondary}</Text>}
                <Text style={styles.collectionCount}>{count} memories</Text>
            </View>
            <Text style={styles.rowActionLabel}>Open</Text>
        </Pressable>
    );
}

function VaultCollectionCard({ collection, onOpen }: { collection: VaultCollectionItem; onOpen: () => void }) {
    const previewVideos = collection.videos.slice(0, 4);
    const secondary = collection.description || collection.categoryType?.replace(/-/g, ' ');
    return (
        <Pressable style={styles.vaultCollectionCard} onPress={onOpen}>
            <View style={styles.vaultCollectionHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.vaultCollectionName}>{collection.name}</Text>
                    {secondary && <Text style={styles.vaultCollectionDescription}>{secondary}</Text>}
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
        <Pressable style={styles.messageCardWrapper} onPress={onPress}>
            <View style={styles.messageCardContainer}>
                <VideoPreview videoUrl={videoUrl} style={styles.messageVideoPreview} />
                
                {/* Gradient overlay for better readability */}
                <View style={styles.messageGradientOverlay} />
                
                {/* Direction indicator */}
                <View style={[styles.messageDirectionBadge, direction === 'received' ? styles.messageDirectionBadgeReceived : styles.messageDirectionBadgeSent]}>
                    <IconSymbol 
                        name={direction === 'received' ? 'arrow.down.circle.fill' : 'arrow.up.circle.fill'} 
                        size={16} 
                        color="#FFFFFF" 
                    />
                </View>
                
                {/* Modern play button */}
                <View style={styles.messagePlayButton}>
                    <IconSymbol name="play.fill" size={14} color="#FFFFFF" />
                </View>
        </View>
        </Pressable>
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
                        {qrItem && (() => {
                            // If video has an orderId, link to the gift page; otherwise fallback to video URL
                            const qrUrl = qrItem.orderId 
                                ? `https://giftyy.store/gift/${qrItem.orderId}`
                                : qrItem.videoUrl;
                            const qrSubtitle = qrItem.orderId
                                ? 'Scan to view this gift'
                                : 'Scan to open this memory';
                            
                            return (
                                <>
                                    <Image
                                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrUrl)}` }}
                                        style={styles.qrImage}
                                    />
                                    <Text style={styles.qrSubtitle}>{qrSubtitle}</Text>
                                </>
                            );
                        })()}
                        <Pressable style={styles.qrCloseButton} onPress={() => setQrVisible(false)}>
                            <Text style={styles.qrCloseLabel}>Close</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

function ViewerSlide({ item, index, currentIndex, screenHeight, screenWidth, safeBottom, onShowQr }: { item: MemoryVideoItem | (MemoryVideoItem & { mediaType: 'video' | 'photo' }); index: number; currentIndex: number; screenHeight: number; screenWidth: number; safeBottom: number; onShowQr: (video: MemoryVideoItem) => void }) {
    const videoRef = useRef<Video>(null);
    const mediaType = 'mediaType' in item ? item.mediaType : 'video'; // Default to video for backward compatibility
    const isPhoto = mediaType === 'photo';
    const playbackUrl = isPhoto ? item.videoUrl : useSignedVideoUrl(item.videoUrl);
    const [videoReady, setVideoReady] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setVideoReady(false);
        setVideoError(false);
        setImageLoaded(false);
        setImageError(false);
    }, [playbackUrl]);

    useEffect(() => {
        if (!playbackUrl || isPhoto) {
            return;
        }
        const isActive = currentIndex === index;
        if (isActive) {
            videoRef.current?.playAsync().catch(() => {});
        } else {
            videoRef.current?.pauseAsync().catch(() => {});
        }
    }, [currentIndex, index, playbackUrl, isPhoto]);

    const handleShare = useCallback(() => {
        Share.share({
            message: `Check out this memory: ${item.title} (${item.videoUrl})`,
        }).catch(() => {});
    }, [item.title, item.videoUrl]);

    const handleQrView = useCallback(() => {
        onShowQr(item);
    }, [item, onShowQr]);

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
                </>
            )}
            <View style={styles.viewerSlideOverlay}>
                {!isPhoto && (
                <View style={[styles.viewerIconButtonSmall, item.direction === 'received' ? styles.viewerIconReceived : styles.viewerIconSent, { right: 20, bottom: safeBottom + 216 }]}>
                    <Text style={[styles.viewerMenuIcon, { fontSize: 22 }]}>{item.direction === 'received' ? '\u2b07' : '\u2b06'}</Text>
                </View>
                )}
                {isPhoto && (
                    <View style={[styles.viewerIconButtonSmall, styles.viewerIconPhoto, { right: 20, bottom: safeBottom + 216 }]}>
                        <IconSymbol name="photo.fill" size={22} color="#FFFFFF" />
                    </View>
                )}
                <Pressable style={[styles.viewerIconButton, { right: 20, bottom: safeBottom + 148 }]} onPress={handleQrView}>
                    <IconSymbol name="qrcode.viewfinder" size={24} color="#FFFFFF" />
                </Pressable>
                <Pressable style={[styles.viewerIconButton, { right: 20, bottom: safeBottom + 90 }]} onPress={handleShare}>
                    <IconSymbol name="square.and.arrow.up" size={24} color="#FFFFFF" />
                </Pressable>
            </View>
            <View style={styles.viewerOverlayBottom}>
                <Text style={styles.viewerTitle}>{item.title}</Text>
                <Text style={styles.viewerMeta}>
                    {item.date}{item.duration ? ` • ${item.duration}` : ''}
                    {isPhoto && <Text style={styles.viewerMetaType}> • Photo</Text>}
                </Text>
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
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 60,
    },
    messageColumnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
    },
    messageCardWrapper: {
        width: '31%',
        aspectRatio: 0.75,
    },
    messageCardContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    messageVideoPreview: {
         width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    messageGradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    messageDirectionBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageDirectionBadgeReceived: {
        backgroundColor: 'rgba(0, 125, 71, 0.85)',
    },
    messageDirectionBadgeSent: {
        backgroundColor: 'rgba(247, 85, 7, 0.85)',
    },
    messagePlayButton: {
        position: 'absolute',
        bottom: '50%',
        left: '50%',
        marginBottom: -16,
        marginLeft: -16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    messagePhotoBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(247, 85, 7, 0.85)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    messagePhotoIndicator: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
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
    vaultCollectionDescription: {
        color: palette.textSecondary,
        fontSize: 13,
        marginTop: 2,
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
    collectionDescription: {
        color: palette.textSecondary,
        fontSize: 12,
        marginTop: 2,
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
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredDirectionBadgeReceived: {
        backgroundColor: 'rgba(0, 125, 71, 0.85)',
    },
    featuredDirectionBadgeSent: {
        backgroundColor: 'rgba(247, 85, 7, 0.85)',
    },
    featuredPlayButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -28,
        marginLeft: -28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    featuredPlayButtonInner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: BRAND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 2,
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
    viewerMetaType: {
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
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
    viewerIconPhoto: {
        backgroundColor: 'rgba(247, 85, 7, 0.9)',
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
});
