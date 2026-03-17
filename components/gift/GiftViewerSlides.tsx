import ReactionRecorder from '@/components/gift/ReactionRecorder';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import { setAudioModeAsync } from 'expo-audio';
import { SimpleVideo } from '@/components/SimpleVideo';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

export interface GiftViewerProps {
    recipientName: string;
    senderFirstName: string | null;
    videoUrl: string | null;
    videoTitle: string | null;
    sharedMemoryUrl: string | null;
    sharedMemoryType: 'photo' | 'video' | null;
    sharedMemoryTitle: string | null;
    orderId: string;
    orderCode: string;
    onSave?: () => Promise<void>;
    saving?: boolean;
    saved?: boolean;
    onDismiss?: () => void;
    // Reaction recording
    videoMessageId?: string | null;
    userId?: string | null;
    reactionVideoUrl?: string | null;
}

type SlideKey = 'welcome' | 'video' | 'memory-transition' | 'memory' | 'reaction' | 'cta';

export default function GiftViewerSlides({
    recipientName,
    senderFirstName,
    videoUrl,
    videoTitle,
    sharedMemoryUrl,
    sharedMemoryType,
    sharedMemoryTitle,
    orderId,
    orderCode,
    onSave,
    saving,
    saved,
    onDismiss,
    videoMessageId,
    userId,
    reactionVideoUrl: initialReactionUrl,
}: GiftViewerProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const slideAnim = useSharedValue(0);
    const [videoEnded, setVideoEnded] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Reaction recording state
    const [showRecordingPrompt, setShowRecordingPrompt] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [reactionUrl, setReactionUrl] = useState<string | null>(initialReactionUrl || null);
    const hasShownPromptRef = useRef(false);

    // Build slide list based on available content
    const slides = useMemo<SlideKey[]>(() => {
        const s: SlideKey[] = [];
        if (videoUrl || sharedMemoryUrl) s.push('welcome');
        if (videoUrl) s.push('video');
        if (sharedMemoryUrl && videoUrl) s.push('memory-transition');
        if (sharedMemoryUrl) s.push('memory');
        if (reactionUrl) s.push('reaction');
        s.push('cta');
        return s;
    }, [videoUrl, sharedMemoryUrl, reactionUrl]);

    const totalSlides = slides.length;

    // Enable audio playback in silent mode
    useEffect(() => {
        setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
        }).catch(() => { });
    }, []);

    const animateToSlide = useCallback((index: number) => {
        slideAnim.value = withSpring(-index * SCREEN_WIDTH, {
            damping: 18,
            stiffness: 90,
            mass: 0.8,
        });
    }, [slideAnim]);

    const goToSlide = useCallback((index: number) => {
        if (index < 0 || index >= totalSlides) return;
        setCurrentSlide(index);
        animateToSlide(index);
    }, [totalSlides, animateToSlide]);

    // Auto-advance after video ends
    useEffect(() => {
        if (!videoEnded) return;
        if (slides[currentSlide] !== 'video') return;
        if (currentSlide >= totalSlides - 1) return;

        const timer = setTimeout(() => {
            goToSlide(currentSlide + 1);
        }, 1500);
        return () => clearTimeout(timer);
    }, [videoEnded, currentSlide, totalSlides, slides, goToSlide]);

    // Show recording prompt when entering video slide (only once, only if no reaction exists)
    useEffect(() => {
        const videoSlideIndex = slides.indexOf('video');
        if (
            currentSlide === videoSlideIndex &&
            videoSlideIndex !== -1 &&
            !hasShownPromptRef.current &&
            !reactionUrl &&
            userId &&
            videoMessageId
        ) {
            hasShownPromptRef.current = true;
            setShowRecordingPrompt(true);
        }
    }, [currentSlide, slides, reactionUrl, userId, videoMessageId]);

    // Pan responder for swipe gestures
    const panResponder = useMemo(() =>
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy * 1.5),
            onPanResponderMove: (_, gs) => {
                const offset = -currentSlide * SCREEN_WIDTH + gs.dx;
                slideAnim.value = offset;
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dx < -SWIPE_THRESHOLD && currentSlide < totalSlides - 1) {
                    goToSlide(currentSlide + 1);
                } else if (gs.dx > SWIPE_THRESHOLD && currentSlide > 0) {
                    goToSlide(currentSlide - 1);
                } else {
                    animateToSlide(currentSlide);
                }
            },
        }),
        [currentSlide, totalSlides, slideAnim, goToSlide, animateToSlide]
    );

    const firstName = recipientName !== 'there'
        ? recipientName.split(' ')[0]
        : 'there';

    // ── CONFETTI COMPONENT ──
    const Confetti = ({ active }: { active: boolean }) => {
        if (!active) return null;

        const pieces = Array.from({ length: 40 });
        const colors = ['#f75507', '#fbbf24', '#3b82f6', '#10b981', '#ec4899'];

        return (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {pieces.map((_, i) => {
                    const startX = Math.random() * SCREEN_WIDTH;
                    const delay = Math.random() * 2000;
                    const color = colors[i % colors.length];

                    return (
                        <ConfettiPiece
                            key={i}
                            startX={startX}
                            delay={delay}
                            color={color}
                        />
                    );
                })}
            </View>
        );
    };

    const ConfettiPiece = ({ startX, delay, color }: { startX: number; delay: number; color: string }) => {
        const y = useSharedValue(-20);
        const x = useSharedValue(startX);
        const rotate = useSharedValue(0);

        useEffect(() => {
            setTimeout(() => {
                y.value = withTiming(SCREEN_HEIGHT + 20, { duration: 2500 + Math.random() * 1500 });
                x.value = withTiming(startX + (Math.random() - 0.5) * 100, { duration: 3000 });
                rotate.value = withTiming(720, { duration: 3000 });
            }, delay);
        }, []);

        const style = useAnimatedStyle(() => ({
            position: 'absolute',
            top: y.value,
            left: x.value,
            width: scale(8),
            height: scale(8),
            backgroundColor: color,
            borderRadius: scale(2),
            transform: [{ rotate: `${rotate.value}deg` }],
        }));

        return <Animated.View style={style} />;
    };

    // ─── SLIDE RENDERERS ───

    const renderWelcomeSlide = () => (
        <View style={styles.slide}>
            <View style={styles.welcomeContent}>
                <Animated.Image
                    entering={FadeInUp.delay(200).duration(800)}
                    source={require('@/assets/images/giftyy.png')}
                    style={styles.welcomeLogo}
                    resizeMode="contain"
                />
                <Animated.Text
                    entering={FadeInUp.delay(400).duration(800)}
                    style={styles.welcomeTitle}
                >
                    Hi <Text style={styles.welcomeNameHighlight}>{firstName}!</Text>
                </Animated.Text>
                <Animated.Text
                    entering={FadeInDown.delay(600).duration(800)}
                    style={styles.welcomeSubtitle}
                >
                    {videoUrl ? 'You have a special message waiting' : 'Someone has something special for you'}
                </Animated.Text>
                {senderFirstName && (
                    <Animated.View
                        entering={FadeInDown.delay(800).duration(800)}
                        style={styles.senderBadge}
                    >
                        <Text style={styles.senderBadgeText}>From {senderFirstName}</Text>
                        <Text style={{ fontSize: responsiveFontSize(16) }}>💌</Text>
                    </Animated.View>
                )}
                <Animated.View
                    entering={FadeInDown.delay(1000).duration(800)}
                    style={styles.swipeHint}
                >
                    <Text style={styles.swipeHintText}>Swipe to continue</Text>
                    <IconSymbol name="chevron.right" size={14} color={GIFTYY_THEME.colors.gray400} />
                </Animated.View>
            </View>
        </View>
    );

    const renderVideoSlide = () => (
        <View style={[styles.slide, styles.videoSlide]}>
            {videoTitle && (
                <BlurView intensity={20} style={styles.videoTitleBar}>
                    <Text style={styles.videoTitleText}>{videoTitle}</Text>
                </BlurView>
            )}
            <View style={styles.videoContainer}>
                <SimpleVideo
                    source={{ uri: videoUrl! }}
                    style={styles.video}
                    contentFit="contain"
                    useNativeControls={true}
                    shouldPlay={currentSlide === slides.indexOf('video') && !showRecordingPrompt}
                    isMuted={false}
                    onPlayToEnd={() => setVideoEnded(true)}
                />
            </View>
            {senderFirstName && (
                <View style={styles.videoSenderRow}>
                    <View style={styles.senderAvatar}>
                        <Text style={styles.senderAvatarText}>
                            {senderFirstName[0].toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.videoSenderName}>
                        From {senderFirstName}
                    </Text>
                </View>
            )}
        </View>
    );

    const renderMemoryTransition = () => (
        <View style={styles.slide}>
            <View style={styles.welcomeContent}>
                <View style={styles.transitionIconContainer}>
                    <Text style={{ fontSize: responsiveFontSize(48) }}>📸</Text>
                </View>
                <Text style={styles.transitionTitle}>There's more...</Text>
                <Text style={styles.transitionSubtitle}>
                    {senderFirstName || 'Someone'} also shared a special memory with you
                </Text>
                <View style={styles.swipeHint}>
                    <Text style={styles.swipeHintText}>Swipe to see it</Text>
                    <IconSymbol name="chevron.right" size={14} color={GIFTYY_THEME.colors.gray400} />
                </View>
            </View>
        </View>
    );

    const renderMemorySlide = () => (
        <View style={[styles.slide, styles.memorySlide]}>
            <Text style={styles.memoryLabel}>Shared Memory</Text>
            {sharedMemoryTitle && (
                <Text style={styles.memoryTitle}>{sharedMemoryTitle}</Text>
            )}
            <View style={styles.memoryContainer}>
                {sharedMemoryType === 'photo' ? (
                    <Image
                        source={{ uri: sharedMemoryUrl! }}
                        style={styles.memoryImage}
                        resizeMode="contain"
                    />
                ) : (
                    <SimpleVideo
                        source={{ uri: sharedMemoryUrl! }}
                        style={styles.memoryVideo}
                        contentFit="contain"
                        useNativeControls={true}
                        shouldPlay={currentSlide === slides.indexOf('memory')}
                        isMuted={false}
                    />
                )}
            </View>
        </View>
    );

    const renderReactionSlide = () => (
        <View style={[styles.slide, styles.videoSlide]}>
            <BlurView intensity={20} style={styles.videoTitleBar}>
                <Text style={styles.videoTitleText}>Your Reaction</Text>
            </BlurView>
            <View style={styles.videoContainer}>
                <SimpleVideo
                    source={{ uri: reactionUrl! }}
                    style={styles.video}
                    contentFit="contain"
                    useNativeControls={true}
                    shouldPlay={currentSlide === slides.indexOf('reaction')}
                    isMuted={false}
                />
            </View>
            <View style={styles.videoSenderRow}>
                <Text style={styles.videoSenderName}>
                    Recorded while watching the message 🎬
                </Text>
            </View>
        </View>
    );

    const renderCtaSlide = () => (
        <View style={styles.slide}>
            <View style={styles.welcomeContent}>
                <View style={styles.ctaIconContainer}>
                    {saved ? (
                        <Image
                            source={require('@/assets/images/giftyy.png')}
                            style={{ width: scale(64), height: scale(64) }}
                            resizeMode="contain"
                        />
                    ) : (
                        <Text style={{ fontSize: responsiveFontSize(48) }}>💝</Text>
                    )}
                </View>
                <Text style={styles.ctaTitle}>{saved ? 'Saved!' : "That's your gift!"}</Text>
                <Text style={styles.ctaSubtitle}>
                    {saved
                        ? `This video message${sharedMemoryUrl ? ' and shared memory have' : ' has'} been saved to your Memories.`
                        : `Save this video message${sharedMemoryUrl ? ' and shared memory' : ''} so you can revisit it anytime.`
                    }
                </Text>
                {onSave && !saved && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.saveButton,
                            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                            saving && { opacity: 0.7 },
                        ]}
                        onPress={() => {
                            if (onSave) {
                                onSave();
                                setShowConfetti(true);
                                setTimeout(() => setShowConfetti(false), 5000);
                            }
                        }}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save to My Account</Text>
                        )}
                    </Pressable>
                )}
                {saved && onDismiss && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.saveButton,
                            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                        ]}
                        onPress={onDismiss}
                    >
                        <Text style={styles.saveButtonText}>Go to Home</Text>
                    </Pressable>
                )}
                {!saved && onDismiss && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.skipButton,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={onDismiss}
                    >
                        <Text style={styles.skipButtonText}>Maybe Later</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );

    const renderSlide = (key: SlideKey) => {
        switch (key) {
            case 'welcome': return renderWelcomeSlide();
            case 'video': return renderVideoSlide();
            case 'memory-transition': return renderMemoryTransition();
            case 'memory': return renderMemorySlide();
            case 'reaction': return renderReactionSlide();
            case 'cta': return renderCtaSlide();
        }
    };

    return (
        <View style={styles.container}>
            {/* Background gradient */}
            <LinearGradient
                colors={['#fffaf5', '#fff5eb', '#ffe8d6']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Slides */}
            <Animated.View
                style={[
                    styles.slidesRow,
                    { width: SCREEN_WIDTH * totalSlides },
                    useAnimatedStyle(() => ({
                        transform: [{ translateX: slideAnim.value }],
                    })),
                ]}
                {...panResponder.panHandlers}
            >
                {slides.map((key, i) => (
                    <View key={`${key}-${i}`} style={{ width: SCREEN_WIDTH }}>
                        {renderSlide(key)}
                    </View>
                ))}
            </Animated.View>

            <Confetti active={showConfetti} />

            {/* Slide indicators */}
            <View style={styles.indicators}>
                {slides.map((_, i) => (
                    <Pressable key={i} onPress={() => goToSlide(i)}>
                        <View
                            style={[
                                styles.dot,
                                currentSlide === i && styles.dotActive,
                            ]}
                        />
                    </Pressable>
                ))}
            </View>

            {/* Reaction Recorder overlay */}
            {userId && videoMessageId && (
                <ReactionRecorder
                    orderId={orderId}
                    videoMessageId={videoMessageId}
                    userId={userId}
                    showPrompt={showRecordingPrompt}
                    onReactionSaved={(url, _duration) => {
                        setReactionUrl(url);
                        setIsRecording(false);
                        setShowRecordingPrompt(false);
                    }}
                    onDismiss={() => {
                        setShowRecordingPrompt(false);
                        setIsRecording(false);
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slidesRow: {
        flex: 1,
        flexDirection: 'row',
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(24),
    },

    // ── Welcome slide ──
    welcomeContent: {
        alignItems: 'center',
        maxWidth: scale(340),
    },
    welcomeLogo: {
        width: scale(120),
        height: scale(120),
        marginBottom: verticalScale(24),
    },
    welcomeTitle: {
        fontSize: responsiveFontSize(36),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: verticalScale(12),
    },
    welcomeNameHighlight: {
        color: '#f75507',
    },
    welcomeSubtitle: {
        fontSize: responsiveFontSize(17),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: verticalScale(26),
        marginBottom: verticalScale(16),
    },
    senderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        backgroundColor: 'rgba(242, 153, 74, 0.1)',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: scale(24),
        borderWidth: 1,
        borderColor: 'rgba(242, 153, 74, 0.25)',
        marginBottom: verticalScale(24),
    },
    senderBadgeText: {
        fontSize: responsiveFontSize(14),
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray700,
    },
    swipeHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        marginTop: verticalScale(24),
    },
    swipeHintText: {
        fontSize: responsiveFontSize(13),
        color: GIFTYY_THEME.colors.gray400,
        fontWeight: '500',
    },

    // ── Video slide ──
    videoSlide: {
        paddingHorizontal: 0,
        justifyContent: 'center',
    },
    videoTitleBar: {
        paddingHorizontal: scale(24),
        paddingBottom: verticalScale(12),
    },
    videoTitleText: {
        fontSize: responsiveFontSize(18),
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
    },
    videoContainer: {
        aspectRatio: 9 / 16,
        maxHeight: SCREEN_HEIGHT * 0.65,
        backgroundColor: '#000',
        borderRadius: scale(16),
        overflow: 'hidden',
        alignSelf: 'center',
        width: SCREEN_WIDTH - scale(32),
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoSenderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        marginTop: verticalScale(16),
        paddingHorizontal: scale(24),
        alignSelf: 'center',
    },
    senderAvatar: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
        backgroundColor: 'rgba(242, 153, 74, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    senderAvatarText: {
        fontSize: responsiveFontSize(14),
        fontWeight: '700',
        color: '#f75507',
    },
    videoSenderName: {
        fontSize: responsiveFontSize(15),
        fontWeight: '600',
        color: GIFTYY_THEME.colors.gray600,
    },

    // ── Memory transition ──
    transitionIconContainer: {
        width: scale(80),
        height: scale(80),
        borderRadius: scale(24),
        backgroundColor: 'rgba(242, 153, 74, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(24),
    },
    transitionTitle: {
        fontSize: responsiveFontSize(32),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: verticalScale(12),
    },
    transitionSubtitle: {
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: verticalScale(24),
    },

    // ── Memory slide ──
    memorySlide: {
        paddingHorizontal: scale(16),
        justifyContent: 'center',
    },
    memoryLabel: {
        fontSize: responsiveFontSize(12),
        fontWeight: '700',
        color: '#f75507',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: verticalScale(6),
    },
    memoryTitle: {
        fontSize: responsiveFontSize(20),
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: verticalScale(16),
    },
    memoryContainer: {
        width: '100%',
        aspectRatio: 1,
        maxHeight: SCREEN_HEIGHT * 0.55,
        borderRadius: scale(20),
        overflow: 'hidden',
        backgroundColor: GIFTYY_THEME.colors.gray100,
    },
    memoryImage: {
        width: '100%',
        height: '100%',
    },
    memoryVideo: {
        width: '100%',
        height: '100%',
    },

    // ── CTA slide ──
    ctaIconContainer: {
        width: scale(80),
        height: scale(80),
        borderRadius: scale(24),
        backgroundColor: 'rgba(242, 153, 74, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(24),
    },
    ctaTitle: {
        fontSize: responsiveFontSize(30),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: verticalScale(12),
    },
    ctaSubtitle: {
        fontSize: responsiveFontSize(16),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: verticalScale(24),
        marginBottom: verticalScale(8),
    },
    ctaExplore: {
        fontSize: responsiveFontSize(15),
        fontWeight: '600',
        color: '#f75507',
        textAlign: 'center',
        marginTop: verticalScale(8),
    },
    saveButton: {
        backgroundColor: '#f75507',
        paddingVertical: verticalScale(16),
        paddingHorizontal: scale(40),
        borderRadius: scale(16),
        marginTop: verticalScale(24),
        alignSelf: 'stretch',
        shadowColor: '#f75507',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: verticalScale(52),
    },
    saveButtonText: {
        color: '#fff',
        fontSize: responsiveFontSize(17),
        fontWeight: '700',
        textAlign: 'center',
    },
    skipButton: {
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(32),
        marginTop: verticalScale(12),
        alignSelf: 'stretch',
        alignItems: 'center',
    },
    skipButtonText: {
        color: GIFTYY_THEME.colors.gray400,
        fontSize: responsiveFontSize(15),
        fontWeight: '600',
        textAlign: 'center',
    },

    // ── Indicators ──
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: verticalScale(32),
        gap: scale(8),
    },
    dot: {
        width: scale(6),
        height: scale(6),
        borderRadius: scale(3),
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    dotActive: {
        width: scale(28),
        backgroundColor: '#f75507',
    },
});
