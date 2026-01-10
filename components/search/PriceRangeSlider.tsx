/**
 * Price Range Slider Component
 * Interactive dual-handle slider for price filtering
 */

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useCallback } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 64;
const HANDLE_SIZE = 24;
const TRACK_HEIGHT = 4;

type PriceRangeSliderProps = {
	min: number;
	max: number;
	minValue: number;
	maxValue: number;
	onValueChange: (min: number, max: number) => void;
};

export function PriceRangeSlider({
	min,
	max,
	minValue,
	maxValue,
	onValueChange,
}: PriceRangeSliderProps) {
	const minPosition = useSharedValue(((minValue - min) / (max - min)) * SLIDER_WIDTH);
	const maxPosition = useSharedValue(((maxValue - min) / (max - min)) * SLIDER_WIDTH);

	// Update positions when values change externally
	React.useEffect(() => {
		minPosition.value = withSpring(((minValue - min) / (max - min)) * SLIDER_WIDTH);
		maxPosition.value = withSpring(((maxValue - min) / (max - min)) * SLIDER_WIDTH);
	}, [minValue, maxValue, min, max, minPosition, maxPosition]);

	// Removed updateValues - now calling onValueChange directly in gestures

	const minStartX = useSharedValue(0);
	const maxStartX = useSharedValue(0);

	const [displayMin, setDisplayMin] = React.useState(minValue);
	const [displayMax, setDisplayMax] = React.useState(maxValue);

	React.useEffect(() => {
		setDisplayMin(minValue);
		setDisplayMax(maxValue);
	}, [minValue, maxValue]);

	const updateMinMax = useCallback((newMin: number, newMax: number) => {
		const clampedMin = Math.max(min, newMin);
		const clampedMax = Math.min(max, newMax);
		setDisplayMin(clampedMin);
		setDisplayMax(clampedMax);
		onValueChange(clampedMin, clampedMax);
	}, [min, max, onValueChange]);

	const minGesture = Gesture.Pan()
		.onStart(() => {
			minStartX.value = minPosition.value;
		})
		.onUpdate((e) => {
			const newPos = Math.max(0, Math.min(maxPosition.value - HANDLE_SIZE, minStartX.value + e.translationX));
			minPosition.value = newPos;
			const newMin = Math.round(min + (newPos / SLIDER_WIDTH) * (max - min));
			const currentMax = Math.round(min + (maxPosition.value / SLIDER_WIDTH) * (max - min));
			runOnJS(updateMinMax)(newMin, currentMax);
		})
		.onEnd(() => {
			minPosition.value = withSpring(minPosition.value, { damping: 15 });
		});

	const maxGesture = Gesture.Pan()
		.onStart(() => {
			maxStartX.value = maxPosition.value;
		})
		.onUpdate((e) => {
			const newPos = Math.min(SLIDER_WIDTH, Math.max(minPosition.value + HANDLE_SIZE, maxStartX.value + e.translationX));
			maxPosition.value = newPos;
			const currentMin = Math.round(min + (minPosition.value / SLIDER_WIDTH) * (max - min));
			const newMax = Math.round(min + (newPos / SLIDER_WIDTH) * (max - min));
			runOnJS(updateMinMax)(currentMin, newMax);
		})
		.onEnd(() => {
			maxPosition.value = withSpring(maxPosition.value, { damping: 15 });
		});

	const minHandleStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: minPosition.value }],
	}));

	const maxHandleStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: maxPosition.value }],
	}));

	const trackFillStyle = useAnimatedStyle(() => ({
		left: minPosition.value,
		width: maxPosition.value - minPosition.value,
	}));

	const currentMin = Math.round(displayMin);
	const currentMax = Math.round(displayMax);

	return (
		<GestureHandlerRootView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.label}>Price Range</Text>
				<View style={styles.valueContainer}>
					<Text style={styles.value}>
						${currentMin} - ${currentMax}
					</Text>
				</View>
			</View>
			<View style={styles.sliderContainer}>
				<View style={styles.track}>
					<Animated.View style={[styles.trackFill, trackFillStyle]} />
				</View>
				<GestureDetector gesture={minGesture}>
					<Animated.View style={[styles.handle, styles.minHandle, minHandleStyle]}>
						<View style={styles.handleInner} />
					</Animated.View>
				</GestureDetector>
				<GestureDetector gesture={maxGesture}>
					<Animated.View style={[styles.handle, styles.maxHandle, maxHandleStyle]}>
						<View style={styles.handleInner} />
					</Animated.View>
				</GestureDetector>
			</View>
			<View style={styles.labels}>
				<Text style={styles.rangeLabel}>${min}</Text>
				<Text style={styles.rangeLabel}>${max}</Text>
			</View>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: GIFTYY_THEME.spacing.lg,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	label: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	valueContainer: {
		backgroundColor: GIFTYY_THEME.colors.cream,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.xs,
		borderRadius: GIFTYY_THEME.radius.md,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	value: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.primary,
	},
	sliderContainer: {
		height: HANDLE_SIZE,
		justifyContent: 'center',
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	track: {
		height: TRACK_HEIGHT,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		borderRadius: TRACK_HEIGHT / 2,
		position: 'relative',
	},
	trackFill: {
		position: 'absolute',
		height: TRACK_HEIGHT,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: TRACK_HEIGHT / 2,
	},
	handle: {
		position: 'absolute',
		width: HANDLE_SIZE,
		height: HANDLE_SIZE,
		justifyContent: 'center',
		alignItems: 'center',
	},
	minHandle: {
		marginLeft: -HANDLE_SIZE / 2,
	},
	maxHandle: {
		marginLeft: -HANDLE_SIZE / 2,
	},
	handleInner: {
		width: HANDLE_SIZE,
		height: HANDLE_SIZE,
		borderRadius: HANDLE_SIZE / 2,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderWidth: 3,
		borderColor: GIFTYY_THEME.colors.white,
		...GIFTYY_THEME.shadows.md,
	},
	labels: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	rangeLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
});

