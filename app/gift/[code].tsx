import GiftBoxTeaser from '@/components/gift/GiftBoxTeaser';
import GiftViewerSlides from '@/components/gift/GiftViewerSlides';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GiftData {
    recipientName: string;
    senderFirstName: string | null;
    videoUrl: string | null;
    videoTitle: string | null;
    sharedMemoryUrl: string | null;
    sharedMemoryType: 'photo' | 'video' | null;
    sharedMemoryTitle: string | null;
    orderId: string;
    orderCode: string;
    videoMessageId: string | null;
    reactionVideoUrl: string | null;
}

export default function GiftViewScreen() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const giftCodeStr = Array.isArray(code) ? code[0] : code;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [giftData, setGiftData] = useState<GiftData | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const userId = user?.id;
    const [pendingRedirectSaved, setPendingRedirectSaved] = useState(false);
    const [isUnboxed, setIsUnboxed] = useState(false);

    // Save intent when unauthenticated
    useEffect(() => {
        if (!authLoading && !userId && Platform.OS !== 'web' && giftCodeStr && !pendingRedirectSaved) {
            AsyncStorage.setItem('@pending_gift_code', giftCodeStr)
                .then(() => setPendingRedirectSaved(true))
                .catch(err => {
                    console.error('Failed to save pending gift code:', err);
                    setPendingRedirectSaved(true); // Proceed anyway to avoid loop
                });
        }
    }, [authLoading, userId, giftCodeStr, pendingRedirectSaved]);

    useEffect(() => {
        if (!giftCodeStr) {
            setError('No gift code provided.');
            setLoading(false);
            return;
        }

        // ── Web (No-App) flow ──
        if (Platform.OS === 'web') {
            // We do not fetch gift data on the web, we just show the landing page.
            setLoading(false);
            return;
        }

        if (authLoading) return; // Wait until auth fully loads

        // ── Native (App Installed) Auth flow ──
        if (!userId) {
            // Handled by the redirect component below
            return;
        }

        // Only fetch if gift isn't already loaded (prevents fetching loop on AppState focus)
        fetchGiftData(giftCodeStr);
    }, [giftCodeStr, userId, authLoading]);

    // Redirect natively if not logged in (and we saved the intent)
    if (!authLoading && !userId && Platform.OS !== 'web' && pendingRedirectSaved) {
        return <Redirect href="/(auth)/signup" />;
    }

    const fetchGiftData = async (giftCode: string) => {
        try {
            setLoading(true);
            setError(null);

            // Try to fetch order by ID first (UUID format only), then by order_code
            let order: any = null;

            // Check if the code looks like a UUID before querying by ID
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isUuid = UUID_REGEX.test(giftCode);

            if (isUuid) {
                // First try: by ID (UUID format)
                const { data: orderById, error: idError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', giftCode)
                    .maybeSingle();

                if (idError) {
                    console.warn('[GiftView] Error fetching by ID:', idError.message);
                } else if (orderById) {
                    order = orderById;
                }
            }

            if (!order) {
                // Second try: by order_code
                const { data: orderByCode, error: codeError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('order_code', giftCode)
                    .maybeSingle();

                if (codeError) {
                    console.error('[GiftView] Error fetching by order_code:', codeError.message);
                } else if (orderByCode) {
                    order = orderByCode;
                }
            }

            if (!order) {
                setError('Gift not found. Please check your link and try again.');
                setLoading(false);
                return;
            }

            // Fetch customer (sender) info
            let senderFirstName: string | null = null;
            if (order.user_id) {
                const { data: customer } = await supabase
                    .from('profiles')
                    .select('first_name')
                    .eq('id', order.user_id)
                    .single();

                senderFirstName = customer?.first_name || null;
            }

            // Fetch the sender's original video message (direction = 'sent')
            const { data: videoMessage } = await supabase
                .from('video_messages')
                .select('id, title, video_url, duration_seconds, direction, created_at')
                .eq('order_id', order.id)
                .eq('direction', 'sent')
                .maybeSingle();

            // Fetch shared memory if exists
            let sharedMemory: any = null;
            if (order.shared_memory_id) {
                const { data: memoryData } = await supabase
                    .from('shared_memories')
                    .select('id, title, file_url, media_type, created_at')
                    .eq('id', order.shared_memory_id)
                    .single();

                sharedMemory = memoryData;
            }

            const recipientName = order.recipient_first_name
                ? `${order.recipient_first_name} ${order.recipient_last_name || ''}`.trim()
                : 'there';

            // Fetch existing reaction for this order (non-blocking — don't let this prevent loading)
            let existingReaction: { reaction_video_url: string | null } | null = null;
            try {
                const { data: reactionData, error: reactionError } = await supabase
                    .from('recipient_reactions')
                    .select('reaction_video_url')
                    .eq('order_id', order.id)
                    .order('recorded_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (reactionError) {
                    console.warn('[GiftView] Non-critical: failed to fetch reaction:', reactionError.message);
                } else {
                    existingReaction = reactionData;
                }
            } catch (reactionErr) {
                console.warn('[GiftView] Non-critical: reaction query failed:', reactionErr);
            }

            const data: GiftData = {
                recipientName,
                senderFirstName,
                videoUrl: videoMessage?.video_url || null,
                videoTitle: videoMessage?.title || null,
                sharedMemoryUrl: sharedMemory?.file_url || null,
                sharedMemoryType: sharedMemory?.media_type || null,
                sharedMemoryTitle: sharedMemory?.title || null,
                orderId: order.id,
                orderCode: giftCode,
                videoMessageId: videoMessage?.id || null,
                reactionVideoUrl: existingReaction?.reaction_video_url || null,
            };

            // Trigger "Gift Opened" notification if this is the first time the order is viewed
            // We'll do this asynchronously so it doesn't block the UI loading.
            if (order.user_id && (videoMessage?.video_url || sharedMemory?.file_url)) {
                supabase.functions.invoke('notify-buyer-opened', {
                    body: {
                        buyerId: order.user_id,
                        buyerName: senderFirstName,
                        recipientName: recipientName,
                        orderCode: giftCode,
                        orderId: order.id
                    }
                }).catch(err => {
                    console.warn('[GiftView] Failed to notify buyer that gift was opened:', err);
                });
            }

            setGiftData(data);

            // Check if the user has already saved this gift
            if (user && data.videoUrl) {
                const { data: alreadySaved } = await supabase
                    .from('video_messages')
                    .select('id')
                    .eq('order_id', order.id)
                    .eq('user_id', user.id)
                    .eq('direction', 'received')
                    .maybeSingle();

                if (alreadySaved) {
                    setSaved(true);
                }
            }
        } catch (err: any) {
            console.error('[GiftView] Error fetching gift data:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Web Landing Page state ──
    if (Platform.OS === 'web') {
        return (
            <View style={[styles.centeredContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Image
                    source={require('@/assets/images/giftyy.png')}
                    style={styles.loadingLogo}
                    resizeMode="contain"
                />
                <Text style={[styles.errorTitle, { marginTop: verticalScale(24) }]}>You have a gift! 🎁</Text>
                <Text style={styles.errorText}>
                    Someone special sent you a gift on Giftyy! Download the app to open it and see their video message.
                </Text>

                <Pressable
                    style={styles.retryButton}
                    onPress={() => Linking.openURL('https://apps.apple.com/app/id6739556270')} // Replace with actual App Store link if available
                >
                    <Text style={styles.retryButtonText}>Download on the App Store</Text>
                </Pressable>

                <Pressable
                    style={[styles.retryButton, { backgroundColor: '#1F2937', marginTop: verticalScale(12) }]}
                    onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.giftyy.app')} // Replace with actual Play Store link if available
                >
                    <Text style={styles.retryButtonText}>Get it on Google Play</Text>
                </Pressable>
            </View>
        );
    }

    // ── Loading state (Native only) ──
    if (loading) {
        return (
            <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Image
                    source={require('@/assets/images/giftyy.png')}
                    style={styles.loadingLogo}
                    resizeMode="contain"
                />
                <ActivityIndicator size="large" color="#f75507" style={{ marginTop: verticalScale(24) }} />
                <Text style={styles.loadingText}>Opening your gift...</Text>
            </View>
        );
    }

    // ── Error state ──
    if (error || !giftData) {
        return (
            <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorIcon}>
                    <Text style={{ fontSize: responsiveFontSize(40) }}>🎁</Text>
                </View>
                <Text style={styles.errorTitle}>Oops!</Text>
                <Text style={styles.errorText}>{error || 'Gift not found.'}</Text>
                <Pressable
                    style={styles.retryButton}
                    onPress={() => code && fetchGiftData(code)}
                >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </Pressable>
                {router.canGoBack() && (
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </Pressable>
                )}
            </View>
        );
    }

    // ── No video or memory (gift is pending) ──
    if (!giftData.videoUrl && !giftData.sharedMemoryUrl) {
        return (
            <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.pendingIcon}>
                    <Text style={{ fontSize: responsiveFontSize(40) }}>⏳</Text>
                </View>
                <Text style={styles.pendingTitle}>Your gift is on its way!</Text>
                <Text style={styles.pendingText}>
                    The personal message and media will be available soon.
                </Text>
            </View>
        );
    }

    // ── Save handler ──
    const handleSave = async () => {
        if (!giftData || !user) return;

        setSaving(true);
        try {
            // Save video message as received
            if (giftData.videoUrl) {
                const { data: existingVideo } = await supabase
                    .from('video_messages')
                    .select('id')
                    .eq('order_id', giftData.orderId)
                    .eq('user_id', user.id)
                    .eq('direction', 'received')
                    .maybeSingle();

                if (!existingVideo) {
                    const { error: insertError } = await supabase.from('video_messages').insert({
                        user_id: user.id,
                        order_id: giftData.orderId,
                        title: giftData.videoTitle || 'Gift from ' + (giftData.senderFirstName || 'someone special'),
                        video_url: giftData.videoUrl,
                        direction: 'received',
                    });

                    if (insertError) {
                        console.error('[GiftView] Error saving video message:', insertError.message);
                    }
                }
            }

            // Save shared memory
            if (giftData.sharedMemoryUrl && giftData.sharedMemoryType) {
                const { data: existingMemory } = await supabase
                    .from('shared_memories')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('file_url', giftData.sharedMemoryUrl)
                    .maybeSingle();

                if (!existingMemory) {
                    const { error: memInsertError } = await supabase.from('shared_memories').insert({
                        user_id: user.id,
                        media_type: giftData.sharedMemoryType,
                        file_url: giftData.sharedMemoryUrl,
                        title: giftData.sharedMemoryTitle || 'Shared memory from ' + (giftData.senderFirstName || 'someone special'),
                    });

                    if (memInsertError) {
                        console.error('[GiftView] Error saving shared memory:', memInsertError.message);
                    }
                }
            }

            setSaved(true);
        } catch (err: any) {
            console.error('[GiftView] Error saving to account:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isUnboxed && giftData) {
        return (
            <View style={{ flex: 1 }}>
                <Stack.Screen options={{ headerShown: false }} />
                <GiftBoxTeaser
                    recipientName={giftData.recipientName}
                    senderFirstName={giftData.senderFirstName}
                    onOpen={() => setIsUnboxed(true)}
                />
            </View>
        );
    }

    // ── Gift viewer ──
    return (
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <Stack.Screen options={{ headerShown: false }} />
            <GiftViewerSlides
                recipientName={giftData.recipientName}
                senderFirstName={giftData.senderFirstName}
                videoUrl={giftData.videoUrl}
                videoTitle={giftData.videoTitle}
                sharedMemoryUrl={giftData.sharedMemoryUrl}
                sharedMemoryType={giftData.sharedMemoryType}
                sharedMemoryTitle={giftData.sharedMemoryTitle}
                orderId={giftData.orderId}
                orderCode={giftData.orderCode}
                onSave={user ? handleSave : undefined}
                saving={saving}
                saved={saved}
                onDismiss={() => router.replace('/(buyer)/(tabs)')}
                videoMessageId={giftData.videoMessageId}
                userId={user?.id || null}
                reactionVideoUrl={giftData.reactionVideoUrl}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        backgroundColor: GIFTYY_THEME.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(32),
    },
    loadingLogo: {
        width: scale(100),
        height: scale(100),
    },
    loadingText: {
        marginTop: verticalScale(16),
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray500,
    },
    errorIcon: {
        width: scale(80),
        height: scale(80),
        borderRadius: scale(24),
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(24),
    },
    errorTitle: {
        fontSize: responsiveFontSize(28),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: verticalScale(8),
    },
    errorText: {
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: verticalScale(24),
        marginBottom: verticalScale(32),
    },
    retryButton: {
        backgroundColor: '#f75507',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(32),
        borderRadius: scale(14),
        marginBottom: verticalScale(12),
        alignSelf: 'stretch',
    },
    retryButtonText: {
        color: '#fff',
        fontSize: responsiveFontSize(16),
        fontWeight: '700',
        textAlign: 'center',
    },
    backButton: {
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(24),
        borderRadius: scale(14),
        borderWidth: 2,
        borderColor: GIFTYY_THEME.colors.gray200,
        alignSelf: 'stretch',
    },
    backButtonText: {
        color: GIFTYY_THEME.colors.gray600,
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
        textAlign: 'center',
    },
    pendingIcon: {
        width: scale(80),
        height: scale(80),
        borderRadius: scale(24),
        backgroundColor: 'rgba(242, 153, 74, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(24),
    },
    pendingTitle: {
        fontSize: responsiveFontSize(24),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: verticalScale(12),
    },
    pendingText: {
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: verticalScale(24),
    },
});
