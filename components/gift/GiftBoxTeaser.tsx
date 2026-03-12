import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GiftBoxTeaserProps {
    onOpen: () => void;
    recipientName: string;
    senderFirstName: string | null;
}

export default function GiftBoxTeaser({ onOpen, recipientName, senderFirstName }: GiftBoxTeaserProps) {
    const boxScale = useSharedValue(0.8);
    const boxY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const ribbonRotation = useSharedValue(0);

    useEffect(() => {
        // Initial entrance
        opacity.value = withTiming(1, { duration: 1000 });
        boxScale.value = withSpring(1, { damping: 12, stiffness: 90 });
        textOpacity.value = withDelay(1000, withTiming(1, { duration: 800 }));

        // Breathing/Shaking animation
        boxY.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 1500 }),
                withTiming(0, { duration: 1500 })
            ),
            -1,
            true
        );

        ribbonRotation.value = withRepeat(
            withSequence(
                withTiming(2, { duration: 2000 }),
                withTiming(-2, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedBoxStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: boxScale.value },
            { translateY: boxY.value },
            { rotate: `${ribbonRotation.value}deg` }
        ],
        opacity: opacity.value,
    }));

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) }]
    }));

    const handlePress = () => {
        boxScale.value = withSequence(
            withTiming(1.1, { duration: 100 }),
            withTiming(0, { duration: 400 }, (finished) => {
                if (finished && onOpen) {
                    runOnJS(onOpen)();
                }
            })
        );
        opacity.value = withTiming(0, { duration: 300 });
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#fffaf5', '#fff5eb', '#ffe8d6']}
                style={StyleSheet.absoluteFillObject}
            />

            <Animated.View style={[styles.content, animatedBoxStyle]}>
                <Pressable onPress={handlePress} style={styles.boxWrapper}>
                    <View style={styles.glow} />
                    <Image
                        source={require('@/assets/images/logo.png')}
                        style={styles.giftBox}
                        resizeMode="contain"
                    />
                </Pressable>
            </Animated.View>

            <Animated.View style={[styles.textWrapper, animatedTextStyle]}>
                <Text style={styles.greeting}>
                    Hi <Text style={styles.name}>{recipientName.split(' ')[0]}</Text>,
                </Text>
                <Text style={styles.title}>You have a gift!</Text>
                {senderFirstName && (
                    <Text style={styles.subtitle}>From {senderFirstName}</Text>
                )}

                <Pressable onPress={handlePress} style={styles.openButton}>
                    <Text style={styles.openButtonText}>Tap to Unwrap ✨</Text>
                </Pressable>
            </Animated.View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>A magical surprise awaits you</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    boxWrapper: {
        width: scale(280),
        height: scale(280),
        alignItems: 'center',
        justifyContent: 'center',
    },
    giftBox: {
        width: '100%',
        height: '100%',
        borderRadius: scale(20),
    },
    glow: {
        position: 'absolute',
        width: scale(220),
        height: scale(220),
        borderRadius: scale(110),
        backgroundColor: '#f75507',
        opacity: 0.15,
        transform: [{ scale: 1.5 }],
    },
    textWrapper: {
        alignItems: 'center',
        marginTop: verticalScale(40),
        paddingHorizontal: scale(32),
    },
    greeting: {
        fontSize: responsiveFontSize(20),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray600,
        marginBottom: verticalScale(8),
    },
    name: {
        color: '#f75507',
        fontWeight: '700',
    },
    title: {
        fontSize: responsiveFontSize(32),
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: verticalScale(8),
    },
    subtitle: {
        fontSize: responsiveFontSize(16),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        backgroundColor: 'rgba(242, 153, 74, 0.08)',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(6),
        borderRadius: scale(20),
        overflow: 'hidden',
    },
    openButton: {
        marginTop: verticalScale(32),
        backgroundColor: '#f75507',
        paddingVertical: verticalScale(16),
        paddingHorizontal: scale(48),
        borderRadius: scale(30),
        shadowColor: '#f75507',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    openButtonText: {
        color: '#fff',
        fontSize: responsiveFontSize(18),
        fontFamily: 'Outfit-Bold',
    },
    footer: {
        position: 'absolute',
        bottom: verticalScale(40),
    },
    footerText: {
        fontSize: responsiveFontSize(13),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray400,
        letterSpacing: 0.5,
    },
});
