/**
 * Product Media Carousel Component
 * Full-width, edge-to-edge carousel with swipe, zoom, and smooth transitions
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
	FadeIn,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH; // Square images for premium feel

type ProductMediaCarouselProps = {
	images: string[];
	onImageChange?: (index: number) => void;
};

export function ProductMediaCarousel({ images, onImageChange }: ProductMediaCarouselProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const scrollX = useSharedValue(0);
	const scale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const scrollViewRef = useRef<any>(null);

	// Reset to first image when images change (e.g., when variation changes)
	const imagesKey = images.join(',');
	React.useEffect(() => {
		if (images && images.length > 0) {
			setActiveIndex(0);
			if (scrollViewRef.current) {
				scrollViewRef.current.scrollTo({ x: 0, animated: false });
			}
			scale.value = withTiming(1, { duration: 200 });
			translateX.value = withTiming(0, { duration: 200 });
			translateY.value = withTiming(0, { duration: 200 });
		}
	}, [imagesKey]); // React to actual image changes

	if (!images || images.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.placeholder}>
					<IconSymbol name="photo" size={64} color={GIFTYY_THEME.colors.gray300} />
				</View>
			</View>
		);
	}

	// Pan gesture for image zoom/pan - configured to allow horizontal scrolling
	// failOffsetX makes it fail on horizontal swipes, allowing ScrollView to handle them
	const panGesture = Gesture.Pan()
		.activeOffsetY([-5, 5]) // Only activate on vertical/diagonal movement  
		.failOffsetX([-20, 20]) // Fail if horizontal movement exceeds threshold (let ScrollView handle horizontal swipes)
		.onUpdate((e) => {
			// Only pan if zoomed
			if (scale.value > 1) {
				translateX.value = e.translationX;
				translateY.value = e.translationY;
			}
		})
		.onEnd(() => {
			if (scale.value <= 1) {
				translateX.value = withSpring(0);
				translateY.value = withSpring(0);
			}
		});

	// Double tap to zoom
	const doubleTapGesture = Gesture.Tap()
		.numberOfTaps(2)
		.maxDuration(250)
		.onEnd(() => {
			if (scale.value === 1) {
				scale.value = withSpring(2.5);
			} else {
				scale.value = withSpring(1);
				translateX.value = withSpring(0);
				translateY.value = withSpring(0);
			}
		});

	// Race between gestures - tap wins first, then pan can activate if needed
	// Pan gesture will fail on horizontal swipes, allowing ScrollView to handle them
	const composedGesture = Gesture.Race(doubleTapGesture, panGesture);

	const animatedImageStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: scale.value },
			{ translateX: translateX.value },
			{ translateY: translateY.value },
		],
	}));

	return (
		<GestureHandlerRootView style={styles.container}>
			<View style={styles.carouselContainer}>
				<Animated.ScrollView
					ref={scrollViewRef}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					snapToInterval={SCREEN_WIDTH}
					decelerationRate="fast"
					bounces={false}
					overScrollMode="never"
					scrollEventThrottle={16}
					onScroll={(e) => {
						const offsetX = e.nativeEvent.contentOffset.x;
						const newIndex = Math.round(offsetX / SCREEN_WIDTH);
						if (newIndex !== activeIndex) {
							setActiveIndex(newIndex);
							onImageChange?.(newIndex);
							// Reset zoom when changing images
							scale.value = withTiming(1);
							translateX.value = withTiming(0);
							translateY.value = withTiming(0);
						}
						scrollX.value = offsetX;
					}}
				>
					{images.map((uri, index) => (
						<View key={`${uri}-${index}`} style={styles.imageWrapper}>
							<GestureDetector gesture={composedGesture}>
								<Animated.View style={styles.imageWrapper}>
									<Animated.Image
										source={{ uri }}
										style={[styles.image, animatedImageStyle]}
										resizeMode="cover"
										entering={FadeIn.duration(300)}
										exiting={FadeOut.duration(200)}
									/>
								</Animated.View>
							</GestureDetector>
						</View>
					))}
				</Animated.ScrollView>

				{/* Indicator Dots */}
				{images.length > 1 && (
					<View style={styles.dotsContainer}>
						{images.map((_, index) => {
							const isActive = activeIndex === index;
							return (
								<Animated.View
									key={index}
									style={[
										styles.dot,
										isActive && styles.dotActive,
										{ opacity: isActive ? 1 : 0.4 },
									]}
								/>
							);
						})}
					</View>
				)}

				{/* Decorative Blob (subtle background element) */}
				<View style={styles.decorativeBlob} />
			</View>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		width: SCREEN_WIDTH,
		height: IMAGE_HEIGHT,
		backgroundColor: GIFTYY_THEME.colors.white,
		overflow: 'hidden',
	},
	carouselContainer: {
		flex: 1,
		position: 'relative',
		overflow: 'hidden',
		width: SCREEN_WIDTH,
		height: IMAGE_HEIGHT,
	},
	imageWrapper: {
		width: SCREEN_WIDTH,
		height: IMAGE_HEIGHT,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	image: {
		width: SCREEN_WIDTH,
		height: IMAGE_HEIGHT,
	},
	placeholder: {
		width: SCREEN_WIDTH,
		height: IMAGE_HEIGHT,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dotsContainer: {
		position: 'absolute',
		bottom: 20,
		left: 0,
		right: 0,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		zIndex: 10,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: 'rgba(255, 255, 255, 0.6)',
	},
	dotActive: {
		backgroundColor: GIFTYY_THEME.colors.white,
		width: 24,
	},
	decorativeBlob: {
		position: 'absolute',
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: GIFTYY_THEME.colors.peach + '15',
		top: -50,
		right: -50,
		zIndex: 0,
	},
});

