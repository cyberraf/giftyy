import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import {
	Dimensions,
	Modal,
	Pressable,
	StyleSheet,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
	runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProductImagePreviewModalProps {
	visible: boolean;
	images: string[];
	initialIndex?: number;
	onClose: () => void;
}

export function ProductImagePreviewModal({
	visible,
	images,
	initialIndex = 0,
	onClose,
}: ProductImagePreviewModalProps) {
	const { top } = useSafeAreaInsets();
	const [activeIndex, setActiveIndex] = React.useState(initialIndex);
	const scale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const scrollViewRef = React.useRef<any>(null);

	// Reset state when modal opens
	React.useEffect(() => {
		if (visible) {
			setActiveIndex(initialIndex);
			scale.value = 1;
			translateX.value = 0;
			translateY.value = 0;
			// Small delay to ensure ScrollView is ready
			setTimeout(() => {
				if (scrollViewRef.current) {
					scrollViewRef.current.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
				}
			}, 50);
		}
	}, [visible, initialIndex]);

	// Gestures
	const pinchGesture = Gesture.Pinch()
		.onUpdate((e) => {
			scale.value = e.scale;
		})
		.onEnd(() => {
			if (scale.value < 1) {
				scale.value = withSpring(1);
			} else if (scale.value > 4) {
				scale.value = withSpring(4);
			}
		});

	const panGesture = Gesture.Pan()
		.onUpdate((e) => {
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

	const doubleTapGesture = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd(() => {
			if (scale.value === 1) {
				scale.value = withSpring(2.5);
			} else {
				scale.value = withSpring(1);
				translateX.value = withSpring(0);
				translateY.value = withSpring(0);
			}
		});

	const singleTapGesture = Gesture.Tap()
		.numberOfTaps(1)
		.onEnd(() => {
			if (onClose) {
				runOnJS(onClose)();
			}
		});

	const composedGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture, Gesture.Simultaneous(pinchGesture, panGesture));

	const animatedImageStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: scale.value },
			{ translateX: translateX.value },
			{ translateY: translateY.value },
		],
	}));

	return (
		<Modal
			visible={visible}
			transparent={true}
			animationType="fade"
			onRequestClose={onClose}
			statusBarTranslucent
		>
			<GestureHandlerRootView style={styles.overlay}>
				{/* Backdrop */}
				<View style={StyleSheet.absoluteFill}>
					<Pressable style={styles.backdrop} onPress={onClose} />
				</View>

				{/* Close Button */}
				<Pressable 
					style={[styles.closeButton, { top: top + 10 }]} 
					onPress={onClose}
				>
					<IconSymbol name="xmark" size={24} color="#FFF" />
				</Pressable>

				{/* Content */}
				<Animated.ScrollView
					ref={scrollViewRef}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					snapToInterval={SCREEN_WIDTH}
					decelerationRate="fast"
					bounces={false}
					scrollEventThrottle={16}
					onScroll={(e) => {
						const offsetX = e.nativeEvent.contentOffset.x;
						const newIndex = Math.round(offsetX / SCREEN_WIDTH);
						if (newIndex !== activeIndex) {
							setActiveIndex(newIndex);
							// Reset zoom when changing images
							scale.value = withTiming(1);
							translateX.value = withTiming(0);
							translateY.value = withTiming(0);
						}
					}}
				>
					{images.map((uri, index) => (
						<View key={`${uri}-${index}`} style={styles.imageWrapper}>
							<GestureDetector gesture={composedGesture}>
								<Animated.View style={styles.imageWrapper}>
									<Animated.Image
										source={{ uri }}
										style={[styles.image, animatedImageStyle]}
										resizeMode="contain"
									/>
								</Animated.View>
							</GestureDetector>
						</View>
					))}
				</Animated.ScrollView>

				{/* Indicator */}
				{images.length > 1 && (
					<View style={styles.indicatorContainer}>
						{images.map((_, index) => (
							<View
								key={index}
								style={[
									styles.dot,
									activeIndex === index && styles.dotActive
								]}
							/>
						))}
					</View>
				)}
			</GestureHandlerRootView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'transparent',
		justifyContent: 'center',
		alignItems: 'center',
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
	},
	closeButton: {
		position: 'absolute',
		right: 20,
		zIndex: 100,
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: 'rgba(0,0,0,0.5)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	imageWrapper: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		justifyContent: 'center',
		alignItems: 'center',
	},
	image: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT * 0.8,
	},
	indicatorContainer: {
		position: 'absolute',
		bottom: 50,
		flexDirection: 'row',
		gap: 8,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: 'rgba(255,255,255,0.3)',
	},
	dotActive: {
		backgroundColor: '#FFF',
		transform: [{ scale: 1.2 }],
	},
});
