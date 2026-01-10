/**
 * Shimmer Loader Component
 * Animated skeleton loader for product cards
 */

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

type ShimmerLoaderProps = {
	style?: ViewStyle;
};

export function ShimmerLoader({ style }: ShimmerLoaderProps) {
	const shimmer = useSharedValue(0);

	useEffect(() => {
		shimmer.value = withRepeat(
			withTiming(1, { duration: 1500 }),
			-1,
			false
		);
	}, [shimmer]);

	const shimmerStyle = useAnimatedStyle(() => {
		return {
			opacity: 0.3 + shimmer.value * 0.5,
		};
	});

	return (
		<View style={[styles.container, style]}>
			{/* Image placeholder */}
			<Animated.View style={[styles.imagePlaceholder, shimmerStyle]} />
			
			{/* Text placeholders */}
			<View style={styles.textContainer}>
				<Animated.View style={[styles.textLine, { width: '60%' }, shimmerStyle]} />
				<Animated.View style={[styles.textLine, { width: '80%' }, shimmerStyle]} />
				<Animated.View style={[styles.textLine, { width: '40%' }, shimmerStyle]} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	imagePlaceholder: {
		width: '100%',
		aspectRatio: 1,
		backgroundColor: GIFTYY_THEME.colors.gray200,
	},
	textContainer: {
		padding: GIFTYY_THEME.spacing.md,
		gap: GIFTYY_THEME.spacing.sm,
	},
	textLine: {
		height: 12,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		borderRadius: 4,
	},
});

