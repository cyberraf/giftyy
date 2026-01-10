/**
 * Empty Wishlist State Component
 * Friendly, emotional empty screen with hearts and sparkles
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
	FadeInDown,
	FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
	onExplore: () => void;
};

function FloatingHeart({ delay = 0, position = 'left' }: { delay?: number; position?: 'left' | 'right' }) {
	const translateY = useSharedValue(0);
	const opacity = useSharedValue(0.6);
	const scale = useSharedValue(1);
	
	useEffect(() => {
		setTimeout(() => {
			translateY.value = withRepeat(
				withSequence(
					withTiming(-20, { duration: 2000 }),
					withTiming(0, { duration: 2000 })
				),
				-1,
				true
			);
			
			opacity.value = withRepeat(
				withSequence(
					withTiming(0.9, { duration: 1500 }),
					withTiming(0.6, { duration: 1500 })
				),
				-1,
				true
			);
			
			scale.value = withRepeat(
				withSequence(
					withSpring(1.1, { damping: 10 }),
					withSpring(1, { damping: 10 })
				),
				-1,
				true
			);
		}, delay);
	}, []);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateY: translateY.value },
			{ scale: scale.value },
		],
		opacity: opacity.value,
	}));
	
	return (
		<Animated.View
			style={[
				styles.floatingHeart,
				{ 
					left: position === 'left' ? SCREEN_WIDTH * 0.2 : SCREEN_WIDTH * 0.7,
					top: position === 'left' ? 150 : 200,
				},
				animatedStyle,
			]}
			entering={FadeInDown.duration(800).delay(delay)}
		>
			<IconSymbol name="heart.fill" size={32} color={GIFTYY_THEME.colors.primary} />
		</Animated.View>
	);
}

function Sparkle({ delay = 0, position = 'left' }: { delay?: number; position?: 'left' | 'right' | 'top' }) {
	const rotate = useSharedValue(0);
	const scale = useSharedValue(0.8);
	const opacity = useSharedValue(0);
	
	useEffect(() => {
		setTimeout(() => {
			opacity.value = withRepeat(
				withSequence(
					withTiming(1, { duration: 1000 }),
					withTiming(0.3, { duration: 1000 })
				),
				-1,
				true
			);
			
			rotate.value = withRepeat(
				withTiming(360, { duration: 3000 }),
				-1,
				false
			);
			
			scale.value = withRepeat(
				withSequence(
					withSpring(1.2, { damping: 8 }),
					withSpring(0.8, { damping: 8 })
				),
				-1,
				true
			);
		}, delay);
	}, []);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ rotate: `${rotate.value}deg` },
			{ scale: scale.value },
		],
		opacity: opacity.value,
	}));
	
	const positions = {
		left: { left: SCREEN_WIDTH * 0.15, top: 100 },
		right: { right: SCREEN_WIDTH * 0.15, top: 120 },
		top: { top: 80, alignSelf: 'center' as const },
	};
	
	return (
		<Animated.View
			style={[
				styles.sparkle,
				positions[position],
				animatedStyle,
			]}
			entering={FadeInDown.duration(600).delay(delay)}
		>
			<IconSymbol name="sparkles" size={20} color={GIFTYY_THEME.colors.primary} />
		</Animated.View>
	);
}

export function EmptyWishlistState({ onExplore }: Props) {
	return (
		<View style={styles.container}>
			{/* Decorative Elements */}
			<Sparkle delay={0} position="left" />
			<Sparkle delay={300} position="right" />
			<Sparkle delay={600} position="top" />
			<FloatingHeart delay={200} position="left" />
			<FloatingHeart delay={400} position="right" />
			
			{/* Main Content */}
			<Animated.View
				style={styles.content}
				entering={FadeInUp.duration(600).delay(200)}
			>
				{/* Gift Box Icon */}
				<View style={styles.iconContainer}>
					<LinearGradient
						colors={[GIFTYY_THEME.colors.primary + '20', GIFTYY_THEME.colors.peach + '20']}
						style={styles.iconGradient}
					>
						<IconSymbol name="gift.fill" size={64} color={GIFTYY_THEME.colors.primary} />
					</LinearGradient>
				</View>
				
				{/* Title */}
				<Text style={styles.title}>Your wishlist is empty… for now 😊</Text>
				
				{/* Subtitle */}
				<Text style={styles.subtitle}>
					Start saving the gifts that speak to your heart.
				</Text>
				
				{/* CTA Button */}
				<Pressable
					style={styles.ctaButton}
					onPress={onExplore}
				>
					<LinearGradient
						colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
						style={styles.ctaGradient}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
					>
						<IconSymbol name="sparkles" size={18} color="#fff" />
						<Text style={styles.ctaText}>Explore Gifts</Text>
					</LinearGradient>
				</Pressable>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		paddingVertical: 80,
		position: 'relative',
	},
	content: {
		alignItems: 'center',
		zIndex: 1,
	},
	floatingHeart: {
		position: 'absolute',
		zIndex: 0,
	},
	sparkle: {
		position: 'absolute',
		zIndex: 0,
	},
	iconContainer: {
		marginBottom: 24,
	},
	iconGradient: {
		width: 120,
		height: 120,
		borderRadius: 60,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		textAlign: 'center',
		marginBottom: 12,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	ctaButton: {
		borderRadius: GIFTYY_THEME.radius.full,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
	},
	ctaGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 32,
		paddingVertical: 16,
	},
	ctaText: {
		color: '#fff',
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		marginLeft: 8,
	},
});

