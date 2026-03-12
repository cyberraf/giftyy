import { BRAND_COLOR } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { claimPendingInvite } from '@/lib/api/invite';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InviteLandingScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const idString = Array.isArray(id) ? id[0] : id;
        if (idString && idString !== 'undefined' && idString !== 'null') {
            console.error('[ID_SCREEN] Saving @pending_invite_id:', idString);
            // Save the invite ID so we can claim this profile after they sign up or log in
            AsyncStorage.setItem('@pending_invite_id', idString)
                .catch(err => console.error('Failed to save pending_invite_id:', err));
        }
    }, [id]);

    // In a future iteration, we could fetch who invited them using this ID,
    // or automatically link their account after signup.

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Image
                        source={require('@/assets/images/giftyy.png')}
                        style={{ width: scale(64), height: scale(64) }}
                        resizeMode="contain"
                    />
                </View>

                <Text style={styles.title}>You&apos;ve been invited! ✨</Text>

                <Text style={styles.subtitle}>
                    Someone special wants to celebrate you perfectly.
                    Join their private gifting network on Giftyy and share your favorite things!
                </Text>

                <View style={styles.spacer} />

                {user ? (
                    // User is already logged in
                    <Pressable
                        style={styles.primaryButton}
                        onPress={async () => {
                            const idString = Array.isArray(id) ? id[0] : id;
                            console.error('[ID_SCREEN] Accept Invitation clicked. user:', user.id, 'idParam:', idString);
                            // Pass the ID explicitly to avoid relying on AsyncStorage sync
                            const claimed = await claimPendingInvite(user.id, idString);
                            console.error('[ID_SCREEN] claimPendingInvite result:', claimed);
                            if (claimed) {
                                console.error('[ID_SCREEN] Redirecting to success screen');
                                router.replace('/invite/success');
                            } else {
                                console.error('[ID_SCREEN] Claim result was false, going to home');
                                router.replace('/(buyer)/(tabs)');
                            }
                        }}
                    >
                        <Text style={styles.primaryLabel}>Accept Invitation & Continue</Text>
                    </Pressable>
                ) : (
                    // User is NOT logged in
                    <>
                        <Link href="/(auth)/signup" asChild>
                            <Pressable style={styles.primaryButton}>
                                <Text style={styles.primaryLabel}>Sign Up to Accept</Text>
                            </Pressable>
                        </Link>

                        <Link href="/(auth)/login" asChild>
                            <Pressable style={styles.secondaryButton}>
                                <Text style={styles.secondaryLabel}>I already have an account</Text>
                            </Pressable>
                        </Link>
                    </>
                )}
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
        paddingHorizontal: scale(24),
    },
    iconContainer: {
        width: scale(110),
        height: scale(110),
        borderRadius: scale(55),
        backgroundColor: 'rgba(224,123,57,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(32),
    },
    title: {
        fontSize: responsiveFontSize(32),
        fontWeight: '900',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: verticalScale(16),
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: responsiveFontSize(18),
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: verticalScale(28),
        paddingHorizontal: scale(10),
    },
    spacer: {
        height: verticalScale(48),
    },
    primaryButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: verticalScale(18),
        paddingHorizontal: scale(24),
        borderRadius: scale(16),
        alignSelf: 'stretch',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: verticalScale(16),
    },
    primaryLabel: {
        color: 'white',
        textAlign: 'center',
        fontSize: responsiveFontSize(18),
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical: verticalScale(16),
        paddingHorizontal: scale(24),
        borderRadius: scale(16),
        borderWidth: 2,
        borderColor: '#F3F4F6',
        backgroundColor: '#F9FAFB',
        alignSelf: 'stretch',
    },
    secondaryLabel: {
        textAlign: 'center',
        fontSize: responsiveFontSize(16),
        fontWeight: '700',
        color: '#4B5563',
    },
});
