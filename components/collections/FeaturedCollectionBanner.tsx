/**
 * Featured Collection Banner Component
 * Large hero-style banner highlighting a major collection
 */

import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
	Dimensions,
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, {
	FadeInUp,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { GiftCollection } from '@/lib/gift-data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 280;

type Props = {
	collection: GiftCollection;
	onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FeaturedCollectionBanner({ collection, onPress }: Props) {
	const scale = useSharedValue(1);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};
	
	// Get first product image for banner background
	const backgroundImage = collection.products[0]?.image || undefined;
	const gradientColors = [
		collection.color + 'CC',
		collection.color + 'AA',
		collection.color + '99',
	];
	
	return (
		<AnimatedPressable
			style={[styles.container, animatedStyle]}
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			entering={FadeInUp.duration(500).delay(100)}
		>
			{backgroundImage && (
				<Image
					source={{ uri: backgroundImage }}
					style={styles.backgroundImage}
					resizeMode="cover"
				/>
			)}
			<LinearGradient
				colors={gradientColors}
				style={styles.gradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			>
				<View style={styles.content}>
					<View style={styles.iconContainer}>
						<IconSymbol name="sparkles" size={32} color="#fff" />
					</View>
					<Text style={styles.title}>{collection.title}</Text>
					{collection.description && (
						<Text style={styles.subtitle} numberOfLines={2}>
							{collection.description}
						</Text>
					)}
					<View style={styles.ctaContainer}>
						<View style={styles.ctaButton}>
							<Text style={styles.ctaText}>Explore Now</Text>
							<IconSymbol name="arrow.right" size={18} color="#fff" />
						</View>
					</View>
				</View>
			</LinearGradient>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		width: SCREEN_WIDTH - GIFTYY_THEME.spacing.lg * 2,
		height: BANNER_HEIGHT,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		overflow: 'hidden',
		marginHorizontal: GIFTYY_THEME.spacing.lg,
		marginVertical: GIFTYY_THEME.spacing.md,
		...GIFTYY_THEME.shadows.xl,
	},
	backgroundImage: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		opacity: 0.6,
	},
	gradient: {
		flex: 1,
		padding: GIFTYY_THEME.spacing.xl,
		justifyContent: 'center',
		position: 'relative',
	},
	content: {
		alignItems: 'center',
		zIndex: 1,
	},
	iconContainer: {
		marginBottom: GIFTYY_THEME.spacing.md,
		opacity: 0.9,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes['3xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: '#fff',
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.sm,
		textShadowColor: 'rgba(0, 0, 0, 0.3)',
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 4,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: '#fff',
		textAlign: 'center',
		opacity: 0.95,
		marginBottom: GIFTYY_THEME.spacing.xl,
		textShadowColor: 'rgba(0, 0, 0, 0.2)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	ctaContainer: {
		alignItems: 'center',
	},
	ctaButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		paddingVertical: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.full,
		backdropFilter: 'blur(10px)',
		borderWidth: 2,
		borderColor: 'rgba(255, 255, 255, 0.4)',
	},
	ctaText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: '#fff',
	},
});

