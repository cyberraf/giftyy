import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Image, Dimensions, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResizeMode, Video } from 'expo-av';
import { MessageVideoViewer, type MemoryVideoItem } from '../(buyer)/(tabs)/memory';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BRAND_COLOR } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { VideoPreview } from '@/components/VideoPreview';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OrderData = {
    id: string;
    orderCode: string;
    recipientFirstName: string;
    recipientLastName?: string;
    sharedMemoryId?: string;
    createdAt: string;
};

type VideoMessageData = {
    id: string;
    title: string;
    videoUrl: string;
    durationSeconds?: number;
    direction: 'sent' | 'received';
    createdAt: string;
};

type SharedMemoryData = {
    id: string;
    title: string;
    fileUrl: string;
    mediaType: 'video' | 'photo';
    createdAt: string;
};

export default function GiftScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const router = useRouter();
    const { top, bottom } = useSafeAreaInsets();
    const videoRef = useRef<Video>(null);

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<OrderData | null>(null);
    const [videoMessage, setVideoMessage] = useState<VideoMessageData | null>(null);
    const [sharedMemory, setSharedMemory] = useState<SharedMemoryData | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const [videoVisible, setVideoVisible] = useState(false);
    const [memoryVisible, setMemoryVisible] = useState(false);
    const [viewerData, setViewerData] = useState<MemoryVideoItem[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);

    // Fetch order data, video message, and shared memory
    useEffect(() => {
        if (!orderId) {
            setError('Invalid order ID');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch order
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('id, order_code, recipient_first_name, recipient_last_name, shared_memory_id, created_at')
                    .eq('id', orderId)
                    .single();

                if (orderError || !orderData) {
                    setError('Order not found');
                    setLoading(false);
                    return;
                }

                setOrder({
                    id: orderData.id,
                    orderCode: orderData.order_code,
                    recipientFirstName: orderData.recipient_first_name,
                    recipientLastName: orderData.recipient_last_name || undefined,
                    sharedMemoryId: orderData.shared_memory_id || undefined,
                    createdAt: orderData.created_at,
                });

                // Fetch video message linked to this order
                const { data: videoData, error: videoError } = await supabase
                    .from('video_messages')
                    .select('id, title, video_url, duration_seconds, direction, created_at')
                    .eq('order_id', orderData.id)
                    .single();

                if (!videoError && videoData) {
                    setVideoMessage({
                        id: videoData.id,
                        title: videoData.title,
                        videoUrl: videoData.video_url,
                        durationSeconds: videoData.duration_seconds || undefined,
                        direction: videoData.direction || 'sent',
                        createdAt: videoData.created_at,
                    });
                }

                // Fetch shared memory if exists
                if (orderData.shared_memory_id) {
                    const { data: memoryData, error: memoryError } = await supabase
                        .from('shared_memories')
                        .select('id, title, file_url, media_type, created_at')
                        .eq('id', orderData.shared_memory_id)
                        .single();

                    if (!memoryError && memoryData) {
                        setSharedMemory({
                            id: memoryData.id,
                            title: memoryData.title,
                            fileUrl: memoryData.file_url,
                            mediaType: memoryData.media_type,
                            createdAt: memoryData.created_at,
                        });
                    }
                }
            } catch (err: any) {
                console.error('Error fetching gift data:', err);
                setError(err.message || 'Failed to load gift');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId]);

    // Convert video message to MemoryVideoItem
    const videoItem: MemoryVideoItem | null = useMemo(() => {
        if (!videoMessage) return null;
        
        const duration = videoMessage.durationSeconds
            ? `${Math.floor(videoMessage.durationSeconds / 60)}:${String(videoMessage.durationSeconds % 60).padStart(2, '0')}`
            : '00:00';
        
        const date = new Date(videoMessage.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        return {
            id: videoMessage.id,
            title: videoMessage.title,
            duration,
            date: formattedDate,
            videoUrl: videoMessage.videoUrl,
            direction: videoMessage.direction,
        };
    }, [videoMessage]);

    // Convert shared memory to MemoryVideoItem
    const memoryItem: (MemoryVideoItem & { mediaType: 'video' | 'photo' }) | null = useMemo(() => {
        if (!sharedMemory) return null;
        
        const date = new Date(sharedMemory.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        return {
            id: sharedMemory.id,
            title: sharedMemory.title,
            duration: sharedMemory.mediaType === 'video' ? '00:00' : '',
            date: formattedDate,
            videoUrl: sharedMemory.fileUrl,
            direction: 'sent',
            mediaType: sharedMemory.mediaType,
        };
    }, [sharedMemory]);

    const handleOpenVideo = useCallback(() => {
        if (!videoItem) return;
        setViewerData([videoItem]);
        setViewerIndex(0);
        setVideoVisible(true);
    }, [videoItem]);

    const handleOpenMemory = useCallback(() => {
        if (!memoryItem) return;
        setViewerData([memoryItem]);
        setViewerIndex(0);
        setMemoryVisible(true);
    }, [memoryItem]);

    const recipientName = order 
        ? `${order.recipientFirstName} ${order.recipientLastName || ''}`.trim() 
        : 'there';

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 20 : top, paddingBottom: bottom }]}>
                {Platform.OS !== 'web' && <StatusBar barStyle="light-content" />}
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BRAND_COLOR} />
                    <Text style={styles.loadingText}>Loading your gift...</Text>
                </View>
            </View>
        );
    }

    if (error || !order) {
        return (
            <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 20 : top, paddingBottom: bottom }]}>
                {Platform.OS !== 'web' && <StatusBar barStyle="light-content" />}
                <View style={styles.errorContainer}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={64} color="#EF4444" />
                    <Text style={styles.errorTitle}>Gift Not Found</Text>
                    <Text style={styles.errorText}>{error || 'Unable to load this gift'}</Text>
                    <Pressable style={styles.retryButton} onPress={() => {
                        if (Platform.OS === 'web' && typeof window !== 'undefined') {
                            window.location.href = '/';
                        } else {
                            router.back();
                        }
                    }}>
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 0 : top, maxWidth: Platform.OS === 'web' ? 600 : undefined, alignSelf: Platform.OS === 'web' ? 'center' : undefined }]}>
            {Platform.OS !== 'web' && <StatusBar barStyle="light-content" />}
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.closeButton} onPress={() => {
                        if (Platform.OS === 'web' && typeof window !== 'undefined') {
                            window.location.href = '/';
                        } else {
                            router.back();
                        }
                    }}>
                        <IconSymbol name="xmark" size={24} color="#FFFFFF" />
                    </Pressable>
                </View>

                {/* Hero Section */}
                <View style={styles.hero}>
                    <View style={styles.heroIconContainer}>
                        <IconSymbol name="gift.fill" size={64} color={BRAND_COLOR} />
                    </View>
                    <Text style={styles.heroTitle}>You have a gift! 🎁</Text>
                    <Text style={styles.heroSubtitle}>
                        {recipientName}, someone special has sent you a surprise
                    </Text>
                </View>

                {/* Video Message Section */}
                {videoItem && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <IconSymbol name="video.fill" size={20} color={BRAND_COLOR} />
                            <Text style={styles.sectionTitle}>Personal Message</Text>
                        </View>
                        <Pressable style={styles.messageCard} onPress={handleOpenVideo}>
                            <View style={styles.messageCardContent}>
                                <View style={styles.messageIconContainer}>
                                    <IconSymbol name="play.circle.fill" size={48} color={BRAND_COLOR} />
                                </View>
                                <View style={styles.messageTextContainer}>
                                    <Text style={styles.messageTitle}>{videoItem.title}</Text>
                                    <Text style={styles.messageMeta}>
                                        {videoItem.duration} • {videoItem.date}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.messageArrow}>
                                <IconSymbol name="chevron.right" size={20} color="#94A3B8" />
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* Shared Memory Section */}
                {memoryItem && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <IconSymbol 
                                name={memoryItem.mediaType === 'photo' ? 'photo.fill' : 'video.fill'} 
                                size={20} 
                                color={BRAND_COLOR} 
                            />
                            <Text style={styles.sectionTitle}>
                                {memoryItem.mediaType === 'photo' ? 'Shared Photo' : 'Shared Memory'}
                            </Text>
                        </View>
                        <Pressable style={styles.memoryCard} onPress={handleOpenMemory}>
                            {memoryItem.mediaType === 'photo' ? (
                                <>
                                    <Image 
                                        source={{ uri: memoryItem.videoUrl }} 
                                        style={styles.memoryPreview}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.memoryPhotoBadge}>
                                        <IconSymbol name="photo.fill" size={16} color="#FFFFFF" />
                                    </View>
                                </>
                            ) : (
                                <>
                                    <VideoPreview videoUrl={memoryItem.videoUrl} style={styles.memoryPreview} />
                                    <View style={styles.memoryPlayButton}>
                                        <IconSymbol name="play.fill" size={24} color="#FFFFFF" />
                                    </View>
                                </>
                            )}
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                                locations={[0, 0.5, 1]}
                                style={styles.memoryGradientOverlay}
                            />
                            <View style={styles.memoryCardOverlay}>
                                <Text style={styles.memoryTitle} numberOfLines={2}>
                                    {memoryItem.title}
                                </Text>
                                <Text style={styles.memoryDate}>{memoryItem.date}</Text>
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* Order Info */}
                <View style={styles.orderInfo}>
                    <Text style={styles.orderInfoLabel}>Order Code</Text>
                    <Text style={styles.orderInfoValue}>{order.orderCode}</Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Made with ❤️ via Giftyy</Text>
                </View>
            </ScrollView>

            {/* Video Viewer */}
            <MessageVideoViewer
                visible={videoVisible}
                initialIndex={0}
                data={viewerData}
                onClose={() => setVideoVisible(false)}
            />

            {/* Memory Viewer */}
            <MessageVideoViewer
                visible={memoryVisible}
                initialIndex={0}
                data={viewerData}
                onClose={() => setMemoryVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        ...(Platform.OS === 'web' ? {
            minHeight: '100vh',
            width: '100%',
        } : {}),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 16,
    },
    errorTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 16,
    },
    errorText: {
        color: '#94A3B8',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 8,
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: BRAND_COLOR,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: 16,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hero: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 16,
    },
    heroIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(247, 85, 7, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
    },
    heroSubtitle: {
        color: '#94A3B8',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    section: {
        marginTop: 32,
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    messageCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    messageCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    messageIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(247, 85, 7, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageTextContainer: {
        flex: 1,
        gap: 4,
    },
    messageTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    messageMeta: {
        color: '#94A3B8',
        fontSize: 14,
    },
    messageArrow: {
        marginLeft: 8,
    },
    memoryCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
    },
    memoryPreview: {
        width: '100%',
        height: 300,
        backgroundColor: '#1F2937',
    },
    memoryPhotoBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    memoryPlayButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -24 }, { translateY: -24 }],
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(247, 85, 7, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    memoryGradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    memoryCardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        gap: 4,
        zIndex: 1,
    },
    memoryTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    memoryDate: {
        color: '#94A3B8',
        fontSize: 14,
    },
    orderInfo: {
        marginTop: 32,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        gap: 8,
    },
    orderInfoLabel: {
        color: '#94A3B8',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    orderInfoValue: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        color: '#64748B',
        fontSize: 14,
    },
});
