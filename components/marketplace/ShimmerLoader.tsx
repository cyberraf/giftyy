/**
 * Shimmer Loading Component
 * Skeleton loading animation for product grids
 */

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 3;

type ShimmerLoaderProps = {
	width?: number;
};

export function ShimmerLoader({ width = CARD_WIDTH }: ShimmerLoaderProps) {
	const shimmer = useSharedValue(0);
	
	React.useEffect(() => {
		shimmer.value = withRepeat(
			withTiming(1, { duration: 1500 }),
			-1,
			false
		);
	}, [shimmer]);
	
	const animatedStyle = useAnimatedStyle(() => {
		const opacity = interpolate(
			shimmer.value,
			[0, 0.5, 1],
			[0.3, 0.7, 0.3]
		);
		
		return {
			opacity,
		};
	});
	
	return (
		<Animated.View style={[styles.container, animatedStyle, { width }]}>
			<View style={styles.image} />
			<View style={styles.content}>
				<View style={styles.line} />
				<View style={[styles.line, styles.lineShort]} />
				<View style={styles.line} />
			</View>
		</Animated.View>
	);
}

export function ProductGridShimmer({ count = 6 }: { count?: number }) {
	return (
		<View style={styles.grid}>
			{Array.from({ length: count }).map((_, index) => (
				<View key={index} style={{ marginRight: 10, marginBottom: 10 }}>
					<ShimmerLoader />
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: CARD_WIDTH,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: GIFTYY_THEME.radius.md,
		overflow: 'hidden',
		marginBottom: 10,
	},
	image: {
		width: '100%',
		aspectRatio: 1,
		backgroundColor: GIFTYY_THEME.colors.gray200,
	},
	content: {
		padding: 8,
	},
	line: {
		height: 10,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		borderRadius: 4,
		marginTop: 6,
	},
	lineShort: {
		width: '60%',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
});

