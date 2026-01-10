/**
 * Add Personal Message Button Component
 * Giftyy's signature feature - animated button to add personalized video message
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

type AddPersonalMessageButtonProps = {
	onPress: () => void;
	hasMessage?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AddPersonalMessageButton({
	onPress,
	hasMessage = false,
}: AddPersonalMessageButtonProps) {
	const scale = useSharedValue(1);
	const glowOpacity = useSharedValue(0.6);

	// Pulsing glow animation
	React.useEffect(() => {
		glowOpacity.value = withRepeat(
			withSequence(
				withTiming(1, { duration: 1500 }),
				withTiming(0.3, { duration: 1500 })
			),
			-1,
			true
		);
	}, []);

	const animatedButtonStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const animatedGlowStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value,
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};

	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedButtonStyle]}
		>
			{/* Glow effect */}
			<Animated.View style={[styles.glow, animatedGlowStyle]} />

			{/* Main button */}
			<LinearGradient
				colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.button}
			>
				<View style={styles.content}>
					<View style={styles.iconContainer}>
						<IconSymbol name="video.fill" size={24} color={GIFTYY_THEME.colors.white} />
						{hasMessage && (
							<View style={styles.checkBadge}>
								<IconSymbol name="checkmark" size={10} color={GIFTYY_THEME.colors.white} />
							</View>
						)}
					</View>
					<View style={styles.textContainer}>
						<Text style={styles.buttonText}>
							{hasMessage ? 'Edit Video Message' : 'Add Personalized Video Message'}
						</Text>
						<Text style={styles.buttonSubtext}>
							Make your gift extra special with a heartfelt video
						</Text>
					</View>
					<IconSymbol name="chevron.right" size={20} color={GIFTYY_THEME.colors.white} />
				</View>

				{/* Preview hint */}
				{hasMessage && (
					<View style={styles.previewHint}>
						<Text style={styles.previewText}>Video message added ✓</Text>
					</View>
				)}
			</LinearGradient>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		marginHorizontal: GIFTYY_THEME.spacing.lg,
		marginVertical: GIFTYY_THEME.spacing.md,
	},
	glow: {
		position: 'absolute',
		top: -8,
		left: -8,
		right: -8,
		bottom: -8,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		backgroundColor: GIFTYY_THEME.colors.primary + '40',
		zIndex: 0,
	},
	button: {
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		...GIFTYY_THEME.shadows.lg,
		overflow: 'hidden',
		position: 'relative',
		zIndex: 1,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		zIndex: 2,
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: GIFTYY_THEME.spacing.md,
		position: 'relative',
	},
	checkBadge: {
		position: 'absolute',
		bottom: -4,
		right: -4,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: GIFTYY_THEME.colors.success,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.white,
	},
	textContainer: {
		flex: 1,
		marginRight: GIFTYY_THEME.spacing.md,
	},
	buttonText: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
		marginBottom: 4,
	},
	buttonSubtext: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: 'rgba(255, 255, 255, 0.9)',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	previewHint: {
		marginTop: GIFTYY_THEME.spacing.md,
		paddingTop: GIFTYY_THEME.spacing.md,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255, 255, 255, 0.3)',
	},
	previewText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: 'rgba(255, 255, 255, 0.95)',
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		textAlign: 'center',
	},
});

