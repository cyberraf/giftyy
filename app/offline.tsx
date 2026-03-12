import React from 'react';
import { DevSettings, StyleSheet, View, Text, Pressable, Image, SafeAreaView, StatusBar } from 'react-native';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function OfflineScreen() {
    const router = useRouter();
    const { syncAuth } = useAuth();
    const [retrying, setRetrying] = React.useState(false);

    const handleRetry = () => {
        setRetrying(true);
        // Force reload the entire application
        DevSettings.reload();
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
                            style={{ width: 80, height: 80 }} 
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
                                <IconSymbol name="arrow.clockwise" size={18} color="#FFFFFF" />
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
        backgroundColor: '#fff5f0', // GIFTYY_THEME.colors.cream
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        position: 'relative',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        ...GIFTYY_THEME.shadows.md,
    },
    pulse1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: GIFTYY_THEME.colors.primary,
        opacity: 0.1,
        zIndex: 1,
    },
    pulse2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: GIFTYY_THEME.colors.primary,
        opacity: 0.05,
        zIndex: 0,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Cooper BT',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        fontFamily: 'System', // Fallback as Cooper BT might be too heavy for body here
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonContainer: {
        width: '100%',
    },
    retryButton: {
        flexDirection: 'row',
        backgroundColor: GIFTYY_THEME.colors.primary,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...GIFTYY_THEME.shadows.md,
    },
    retryButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'System',
    },
});
