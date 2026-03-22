import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, SafeAreaView, StatusBar } from 'react-native';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { scale, normalizeFont } from '@/utils/responsive';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { getQueue } from '@/lib/offline/queue';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function OfflineScreen() {
    const router = useRouter();
    const { syncAuth } = useAuth();
    const { isConnected } = useNetwork();
    const [retrying, setRetrying] = React.useState(false);
    const [queueCount, setQueueCount] = React.useState(0);

    // Load queued operation count
    React.useEffect(() => {
        getQueue().then((q) => setQueueCount(q.length));
    }, []);

    // Auto-retry when connectivity restores
    React.useEffect(() => {
        if (isConnected) {
            syncAuth().catch(() => {});
        }
    }, [isConnected, syncAuth]);

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await syncAuth();
        } catch {
            // If it still fails, allow the user to try again
        } finally {
            setRetrying(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.content}>
                <Animated.View 
                    entering={FadeInUp.delay(200).duration(800)}
                    style={styles.iconContainer}
                >
                    <View style={styles.iconCircle}>
                        <Image 
                            source={require('@/assets/images/giftyy.png')} 
                            style={{ width: scale(80), height: scale(80) }}
                            resizeMode="contain" 
                        />
                    </View>
                    <View style={styles.pulse1} />
                    <View style={styles.pulse2} />
                </Animated.View>

                <Animated.View 
                    entering={FadeInDown.delay(400).duration(800)}
                    style={styles.textContainer}
                >
                    <Text style={styles.title}>Connection Lost</Text>
                    <Text style={styles.description}>
                        Giftyy needs an active internet connection to find the perfect gifts for your loved ones. Please check your network and try again.
                    </Text>
                    {queueCount > 0 && (
                        <Text style={styles.queueInfo}>
                            {queueCount} action{queueCount !== 1 ? 's' : ''} will sync when you reconnect.
                        </Text>
                    )}
                </Animated.View>

                <Animated.View 
                    entering={FadeInDown.delay(600).duration(800)}
                    style={styles.buttonContainer}
                >
                    <Pressable
                        onPress={handleRetry}
                        disabled={retrying}
                        style={({ pressed }) => [
                            styles.retryButton,
                            (pressed || retrying) && styles.retryButtonPressed
                        ]}
                    >
                        {retrying ? (
                            <Text style={styles.retryButtonText}>Connecting...</Text>
                        ) : (
                            <>
                                <IconSymbol name="arrow.clockwise" size={scale(18)} color="#FFFFFF" />
                                <Text style={styles.retryButtonText}>Try Again</Text>
                            </>
                        )}
                    </Pressable>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GIFTYY_THEME.colors.cream,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: GIFTYY_THEME.spacing['4xl'],
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GIFTYY_THEME.spacing['4xl'],
        position: 'relative',
    },
    iconCircle: {
        width: scale(120),
        height: scale(120),
        borderRadius: scale(60),
        backgroundColor: GIFTYY_THEME.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        ...GIFTYY_THEME.shadows.md,
    },
    pulse1: {
        position: 'absolute',
        width: scale(160),
        height: scale(160),
        borderRadius: scale(80),
        backgroundColor: GIFTYY_THEME.colors.primary,
        opacity: 0.1,
        zIndex: 1,
    },
    pulse2: {
        position: 'absolute',
        width: scale(200),
        height: scale(200),
        borderRadius: scale(100),
        backgroundColor: GIFTYY_THEME.colors.primary,
        opacity: 0.05,
        zIndex: 0,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: GIFTYY_THEME.spacing['4xl'],
    },
    title: {
        fontSize: GIFTYY_THEME.typography.sizes['3xl'],
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: GIFTYY_THEME.spacing.lg,
        textAlign: 'center',
    },
    description: {
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontFamily: GIFTYY_THEME.typography.fontFamily,
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: normalizeFont(24),
    },
    queueInfo: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontFamily: GIFTYY_THEME.typography.fontFamily,
        color: GIFTYY_THEME.colors.primary,
        textAlign: 'center',
        marginTop: GIFTYY_THEME.spacing.md,
    },
    buttonContainer: {
        width: '100%',
    },
    retryButton: {
        flexDirection: 'row',
        backgroundColor: GIFTYY_THEME.colors.primary,
        paddingVertical: GIFTYY_THEME.spacing.lg,
        borderRadius: scale(30),
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(10),
        ...GIFTYY_THEME.shadows.md,
    },
    retryButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    retryButtonText: {
        color: GIFTYY_THEME.colors.white,
        fontSize: GIFTYY_THEME.typography.sizes.lg,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        fontFamily: GIFTYY_THEME.typography.fontFamily,
    },
});
