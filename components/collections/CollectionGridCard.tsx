/**
 * Collection Grid Card Component
 * Large image card for grid layout (Pinterest-style)
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
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { GiftCollection } from '@/lib/gift-data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - GIFTYY_THEME.spacing.lg * 2 - GIFTYY_THEME.spacing.md) / 2;
const CARD_HEIGHT = 240;

type Props = {
	collection: GiftCollection;
	onPress: () => void;
	delay?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CollectionGridCard({ collection, onPress, delay = 0 }: Props) {
	const scale = useSharedValue(1);
	const glowOpacity = useSharedValue(0);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const glowStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value,
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
		glowOpacity.value = withSpring(0.3, { damping: 10 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
		glowOpacity.value = withSpring(0, { damping: 10 });
	};
	
	const backgroundImage = collection.products[0]?.image || undefined;
	const gradientColors = [
		collection.color + 'AA',
		collection.color + '88',
	];
	
	return (
		<AnimatedPressable
			style={[styles.container, animatedStyle]}
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			entering={FadeInDown.duration(400).delay(delay)}
		>
			{backgroundImage && (
				<Image
					source={{ uri: backgroundImage }}
					style={styles.backgroundImage}
					resizeMode="cover"
				/>
			)}
			<Animated.View style={[styles.glowRing, glowStyle]} />
			<LinearGradient
				colors={gradientColors}
				style={styles.gradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			>
				<View style={styles.content}>
					<Text style={styles.title} numberOfLines={2}>
						{collection.title}
					</Text>
					{collection.description && (
						<Text style={styles.subtitle} numberOfLines={2}>
							{collection.description}
						</Text>
					)}
					<View style={styles.footer}>
						<Text style={styles.productCount}>
							{collection.products.length} {collection.products.length === 1 ? 'item' : 'items'}
						</Text>
						<View style={styles.arrowContainer}>
							<IconSymbol name="arrow.right" size={16} color="#fff" />
						</View>
					</View>
				</View>
			</LinearGradient>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		position: 'relative',
		...GIFTYY_THEME.shadows.lg,
	},
	backgroundImage: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		opacity: 0.7,
	},
	glowRing: {
		position: 'absolute',
		top: -10,
		left: -10,
		right: -10,
		bottom: -10,
		borderRadius: GIFTYY_THEME.radius.xl + 10,
		borderWidth: 3,
		borderColor: GIFTYY_THEME.colors.primary + '80',
		zIndex: 1,
	},
	gradient: {
		flex: 1,
		padding: GIFTYY_THEME.spacing.lg,
		justifyContent: 'space-between',
		position: 'relative',
	},
	content: {
		flex: 1,
		justifyContent: 'space-between',
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: '#fff',
		marginBottom: GIFTYY_THEME.spacing.xs,
		textShadowColor: 'rgba(0, 0, 0, 0.3)',
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 4,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: '#fff',
		opacity: 0.9,
		textShadowColor: 'rgba(0, 0, 0, 0.2)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: GIFTYY_THEME.spacing.md,
	},
	productCount: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: '#fff',
		opacity: 0.9,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	arrowContainer: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.3)',
	},
});

