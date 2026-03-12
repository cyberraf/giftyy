import { BRAND_COLOR } from '@/constants/theme';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InviteSuccessScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleCompleteProfile = () => {
        router.replace('/(buyer)/(tabs)/recipients?tab=preferences');
    };

    const handleGoHome = () => {
        router.replace('/(buyer)/(tabs)');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                <Animated.View
                    entering={FadeInDown.delay(200).duration(800)}
                    style={styles.iconContainer}
                >
                    <Ionicons name="gift-outline" size={scale(60)} color={BRAND_COLOR} />
                    <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={scale(20)} color="white" />
                    </View>
                </Animated.View>

                <Animated.Text
                    entering={FadeInDown.delay(400).duration(800)}
                    style={styles.title}
                >
                    Welcome to the Circle! 🎉
                </Animated.Text>

                <Animated.Text
                    entering={FadeInDown.delay(600).duration(800)}
                    style={styles.subtitle}
                >
                    Your invitation has been successfully accepted. Now, let's set up your gifting profile so your friends know exactly what to get you.
                </Animated.Text>

                <View style={styles.spacer} />

                <Animated.View
                    entering={FadeInDown.delay(800).duration(800)}
                    style={styles.buttonContainer}
                >
                    <Pressable
                        style={styles.primaryButton}
                        onPress={handleCompleteProfile}
                    >
                        <Text style={styles.primaryLabel}>Complete My Gifting Profile</Text>
                    </Pressable>

                    <Pressable
                        style={styles.secondaryButton}
                        onPress={handleGoHome}
                    >
                        <Text style={styles.secondaryLabel}>Go to Home</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(32),
    },
    iconContainer: {
        width: scale(120),
        height: scale(120),
        borderRadius: scale(60),
        backgroundColor: 'rgba(224,123,57,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(40),
        position: 'relative',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#10B981',
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    title: {
        fontSize: responsiveFontSize(28),
        fontWeight: '900',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: verticalScale(16),
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: responsiveFontSize(16),
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: verticalScale(24),
        marginBottom: verticalScale(40),
    },
    spacer: {
        height: verticalScale(20),
    },
    buttonContainer: {
        width: '100%',
    },
    primaryButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: verticalScale(16),
        borderRadius: scale(16),
        alignSelf: 'stretch',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: verticalScale(16),
    },
    primaryLabel: {
        color: 'white',
        textAlign: 'center',
        fontSize: responsiveFontSize(16),
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical: verticalScale(16),
        borderRadius: scale(16),
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    secondaryLabel: {
        textAlign: 'center',
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
        color: '#4B5563',
    },
});
