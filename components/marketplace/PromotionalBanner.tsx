/**
 * Promotional Banner Component
 * Rotating promo card carousel with snap scrolling
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { verticalScale, responsiveFontSize } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Use responsive height: scale between min and max based on screen height
// Smaller phones get smaller banners, larger phones get proportionally larger
const MIN_BANNER_HEIGHT = verticalScale(140);
const MAX_BANNER_HEIGHT = verticalScale(200);
const BANNER_HEIGHT = Math.min(Math.max(SCREEN_WIDTH * 0.42, MIN_BANNER_HEIGHT), MAX_BANNER_HEIGHT);
const BANNER_WIDTH = SCREEN_WIDTH - (GIFTYY_THEME.spacing.lg * 2);
const CARD_SPACING = GIFTYY_THEME.spacing.md; // Use responsive spacing
const CARD_PEEK = GIFTYY_THEME.spacing['2xl']; // Use responsive spacing
const CARD_WIDTH = BANNER_WIDTH - CARD_PEEK;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;

type BannerItem = {
	id: string;
	title: string;
	subtitle?: string;
	/** Remote image URL (legacy) */
	image?: string;
	/** Bundled image (preferred for onboarding / guides) */
	imageSource?: ImageSourcePropType;
	backgroundColor?: string;
	ctaText?: string;
	onPress?: () => void;
};

type PromotionalBannerProps = {
	banners: BannerItem[];
	autoRotate?: boolean;
	rotateInterval?: number;
};

function AnimatedDot({ isActive, index }: { isActive: boolean; index: number }) {
	const scale = useSharedValue(isActive ? 1.3 : 1);
	const opacity = useSharedValue(isActive ? 1 : 0.4);
	
	useEffect(() => {
		scale.value = withSpring(isActive ? 1.3 : 1, {
			damping: 15,
			stiffness: 200,
		});
		opacity.value = withTiming(isActive ? 1 : 0.4, {
			duration: 300,
			easing: Easing.out(Easing.ease),
		});
	}, [isActive]);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));
	
	return (
		<Animated.View
			style={[
				styles.dot,
				isActive && styles.dotActive,
				index > 0 && { marginLeft: 6 },
				animatedStyle,
			]}
		/>
	);
}

function BannerSlide({ banner }: { banner: BannerItem }) {
	const imageSource =
		banner.imageSource ??
		(banner.image ? ({ uri: banner.image } as const) : undefined);

	return (
		<View style={styles.cardOuter}>
			<View style={styles.cardInner}>
			<LinearGradient
				colors={[
					banner.backgroundColor || GIFTYY_THEME.colors.primary,
					banner.backgroundColor || GIFTYY_THEME.colors.primaryLight,
				]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.gradient}
			>
				{imageSource && (
					<View style={styles.previewContainer}>
						<Image source={imageSource} style={styles.previewImage} resizeMode="contain" />
					</View>
				)}
				<View style={styles.content}>
					<Text style={styles.title} numberOfLines={2}>{banner.title}</Text>
					{banner.subtitle && (
						<Text style={styles.subtitle}>{banner.subtitle}</Text>
					)}
					<Pressable
						onPress={banner.onPress}
						disabled={!banner.onPress}
						style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
						accessibilityRole="button"
						accessibilityLabel={banner.ctaText || 'Shop Now'}
					>
						<Text style={styles.ctaText}>{banner.ctaText || 'Shop Now'}</Text>
						<IconSymbol name="arrow.right" size={16} color={GIFTYY_THEME.colors.white} style={{ marginLeft: 6 }} />
					</Pressable>
				</View>
				
				{/* Decorative Elements */}
				<View style={styles.decorativeBlob} />
				<View style={[styles.decorativeBlob, styles.decorativeBlob2]} />
			</LinearGradient>
			</View>
		</View>
	);
}

export function PromotionalBanner({
	banners,
	autoRotate = true,
	rotateInterval = 5000,
}: PromotionalBannerProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const listRef = useRef<Animated.ScrollView>(null);
	const isAutoRotating = useRef(true);
	const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	
	// Auto-rotate functionality
	useEffect(() => {
		if (!autoRotate || banners.length <= 1) return;
		
		const interval = setInterval(() => {
			if (isAutoRotating.current) {
				setCurrentIndex((prev) => {
					const next = (prev + 1) % banners.length;
					listRef.current?.scrollTo({ x: next * SNAP_INTERVAL, animated: true });
					return next;
				});
			}
		}, rotateInterval);
		
		return () => clearInterval(interval);
	}, [autoRotate, banners.length, rotateInterval]);
	
	if (banners.length === 0) return null;

	const pauseAutoRotate = () => {
		isAutoRotating.current = false;
		if (resumeTimeoutRef.current) {
			clearTimeout(resumeTimeoutRef.current);
		}
	};

	const scheduleResume = () => {
		if (resumeTimeoutRef.current) {
			clearTimeout(resumeTimeoutRef.current);
		}
		resumeTimeoutRef.current = setTimeout(() => {
			isAutoRotating.current = true;
		}, 2500);
	};

	const onMomentumEnd = (e: any) => {
		const x = e?.nativeEvent?.contentOffset?.x ?? 0;
		const idx = Math.round(x / SNAP_INTERVAL);
		const clamped = Math.max(0, Math.min(banners.length - 1, idx));
		setCurrentIndex(clamped);
		scheduleResume();
	};

	useEffect(() => {
		return () => {
			if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
		};
	}, []);
	
	return (
		<View style={styles.gestureContainer}>
			<Animated.ScrollView
				ref={listRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				decelerationRate="fast"
				snapToInterval={SNAP_INTERVAL}
				snapToAlignment="start"
				contentContainerStyle={styles.carouselContent}
				onScrollBeginDrag={pauseAutoRotate}
				onMomentumScrollEnd={onMomentumEnd}
				scrollEventThrottle={16}
			>
				{banners.map((banner, index) => (
					<View
						key={banner.id}
						style={[
							styles.cardContainer,
							{
								width: CARD_WIDTH,
								marginRight: index === banners.length - 1 ? 0 : CARD_SPACING,
							},
						]}
					>
						<BannerSlide banner={banner} />
					</View>
				))}
			</Animated.ScrollView>

			{/* Pagination Dots */}
			{banners.length > 1 && (
				<View style={styles.pagination}>
					{banners.map((_, index) => (
						<AnimatedDot key={index} isActive={index === currentIndex} index={index} />
					))}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	gestureContainer: {
		marginHorizontal: GIFTYY_THEME.spacing.lg,
		marginTop: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	carouselContent: {
		paddingRight: CARD_PEEK, // ensure last card isn't clipped and matches peek spacing
	},
	cardContainer: {
		height: BANNER_HEIGHT,
	},
	cardOuter: {
		flex: 1,
		borderRadius: GIFTYY_THEME.radius.xl,
		...GIFTYY_THEME.shadows.lg,
		backgroundColor: 'transparent',
	},
	cardInner: {
		flex: 1,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
	},
	gradient: {
		flex: 1,
		padding: GIFTYY_THEME.spacing['2xl'],
		justifyContent: 'center',
		position: 'relative',
		overflow: 'hidden',
	},
	previewContainer: {
		position: 'absolute',
		right: GIFTYY_THEME.spacing.lg,
		top: '10%',
		bottom: '10%',
		width: '30%',
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		backgroundColor: 'rgba(255, 255, 255, 0.18)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.26)',
		padding: 6,
	},
	previewImage: {
		width: '100%',
		height: '100%',
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: 'rgba(255, 255, 255, 0.06)',
	},
	content: {
		zIndex: 1,
		// keep enough room for the right-side screenshot preview
		maxWidth: '66%',
	},
	title: {
		// Use smaller font size on smaller screens (< 375px)
		fontSize: SCREEN_WIDTH < 375 ? GIFTYY_THEME.typography.sizes.xl : GIFTYY_THEME.typography.sizes['2xl'],
		lineHeight: SCREEN_WIDTH < 375 ? 24 : 28,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
		marginBottom: GIFTYY_THEME.spacing.sm,
		textShadowColor: 'rgba(0, 0, 0, 0.2)',
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 4,
	},
	subtitle: {
		// Use smaller font size on smaller screens (< 375px)
		fontSize: SCREEN_WIDTH < 375 ? GIFTYY_THEME.typography.sizes.sm : GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.white,
		opacity: 0.95,
		marginBottom: GIFTYY_THEME.spacing.md,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	cta: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: GIFTYY_THEME.radius.full,
		backdropFilter: 'blur(10px)',
	},
	ctaPressed: {
		opacity: 0.9,
		transform: [{ scale: 0.98 }],
	},
	ctaText: {
		// Use smaller font size on smaller screens (< 375px)
		fontSize: SCREEN_WIDTH < 375 ? GIFTYY_THEME.typography.sizes.sm : GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
	decorativeBlob: {
		position: 'absolute',
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		right: -50,
		top: -50,
	},
	decorativeBlob2: {
		width: 150,
		height: 150,
		bottom: -30,
		left: -30,
		top: 'auto',
		right: 'auto',
	},
	pagination: {
		marginTop: 10,
		flexDirection: 'row',
		justifyContent: 'center',
		zIndex: 10,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: 'rgba(255, 255, 255, 0.4)',
	},
	dotActive: {
		backgroundColor: GIFTYY_THEME.colors.white,
		width: 20,
	},
});
