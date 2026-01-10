/**
 * Collection Carousel Card Component
 * Smaller rectangular card for horizontal carousels
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
	FadeInRight,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { GiftCollection } from '@/lib/gift-data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = 200;
const CAROUSEL_CARD_HEIGHT = 140;

type Props = {
	collection: GiftCollection;
	badge?: 'New' | 'Popular';
	onPress: () => void;
	delay?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CollectionCarouselCard({ collection, badge, onPress, delay = 0 }: Props) {
	const scale = useSharedValue(1);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};
	
	const backgroundImage = collection.products[0]?.image || undefined;
	const gradientColors = [
		collection.color + 'BB',
		collection.color + '99',
	];
	
	return (
		<AnimatedPressable
			style={[styles.container, animatedStyle]}
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			entering={FadeInRight.duration(400).delay(delay)}
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
				{badge && (
					<View style={styles.badge}>
						<Text style={styles.badgeText}>{badge}</Text>
					</View>
				)}
				<View style={styles.content}>
					<Text style={styles.title} numberOfLines={2}>
						{collection.title}
					</Text>
				</View>
			</LinearGradient>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		width: CAROUSEL_CARD_WIDTH,
		height: CAROUSEL_CARD_HEIGHT,
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
		marginRight: GIFTYY_THEME.spacing.md,
		...GIFTYY_THEME.shadows.md,
	},
	backgroundImage: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		opacity: 0.65,
	},
	gradient: {
		flex: 1,
		padding: GIFTYY_THEME.spacing.md,
		justifyContent: 'space-between',
		position: 'relative',
	},
	badge: {
		alignSelf: 'flex-start',
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingHorizontal: GIFTYY_THEME.spacing.sm,
		paddingVertical: 4,
		borderRadius: GIFTYY_THEME.radius.sm,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: '#fff',
		letterSpacing: 0.5,
	},
	content: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: '#fff',
		textShadowColor: 'rgba(0, 0, 0, 0.3)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
});

