/**
 * Memory Type Card Component
 * Large rounded card for selecting memory type (Photo, Note, Skip)
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
	type: 'photo' | 'note' | 'skip';
	title: string;
	subtitle: string;
	icon: string;
	iconColor?: string;
	gradientColors?: string[];
	onPress: () => void;
	delay?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MemoryTypeCard({
	type,
	title,
	subtitle,
	icon,
	iconColor = GIFTYY_THEME.colors.primary,
	gradientColors,
	onPress,
	delay = 0,
}: Props) {
	const scale = useSharedValue(1);
	const glowOpacity = useSharedValue(0.3);
	
	useEffect(() => {
		// Subtle pulsing glow
		glowOpacity.value = withSpring(0.5, { damping: 10 }, () => {
			glowOpacity.value = withSpring(0.3, { damping: 10 });
		});
	}, []);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const glowStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value,
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};
	
	const colors = gradientColors || [
		type === 'skip' ? GIFTYY_THEME.colors.gray100 : GIFTYY_THEME.colors.cream,
		type === 'skip' ? GIFTYY_THEME.colors.gray50 : GIFTYY_THEME.colors.peach + '30',
	];
	
	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle]}
			entering={FadeInDown.duration(400).delay(delay)}
		>
			{gradientColors || type !== 'skip' ? (
				<LinearGradient
					colors={colors}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.gradient}
				>
					<Animated.View style={[styles.glowRing, glowStyle]} />
					<View style={styles.content}>
						<View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
							<IconSymbol name={icon as any} size={32} color={iconColor} />
						</View>
						<Text style={styles.title}>{title}</Text>
						<Text style={styles.subtitle}>{subtitle}</Text>
					</View>
				</LinearGradient>
			) : (
				<View style={[styles.gradient, { backgroundColor: colors[0] }]}>
					<View style={styles.content}>
						<View style={[styles.iconContainer, { backgroundColor: GIFTYY_THEME.colors.gray300 }]}>
							<IconSymbol name={icon as any} size={28} color={GIFTYY_THEME.colors.gray600} />
						</View>
						<Text style={[styles.title, { color: GIFTYY_THEME.colors.gray700 }]}>{title}</Text>
						<Text style={[styles.subtitle, { color: GIFTYY_THEME.colors.gray500 }]}>{subtitle}</Text>
					</View>
				</View>
			)}
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.md,
	},
	gradient: {
		padding: 24,
		minHeight: 140,
		position: 'relative',
	},
	glowRing: {
		position: 'absolute',
		top: -20,
		right: -20,
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: GIFTYY_THEME.colors.primary + '20',
	},
	content: {
		alignItems: 'center',
		zIndex: 1,
	},
	iconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
});


