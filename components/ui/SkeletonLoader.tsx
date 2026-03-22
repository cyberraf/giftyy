import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { scale } from '@/utils/responsive';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated';

type SkeletonProps = {
	width?: number | `${number}%`;
	height?: number;
	borderRadius?: number;
	style?: ViewStyle;
};

function SkeletonBone({ width = '100%', height = 12, borderRadius = 4, style }: SkeletonProps) {
	const shimmer = useSharedValue(0.3);

	useEffect(() => {
		shimmer.value = withRepeat(withTiming(0.8, { duration: 1200 }), -1, true);
	}, [shimmer]);

	const animStyle = useAnimatedStyle(() => ({
		opacity: shimmer.value,
	}));

	return (
		<Animated.View
			style={[
				{
					width: width as any,
					height,
					borderRadius,
					backgroundColor: GIFTYY_THEME.colors.gray200,
				},
				animStyle,
				style,
			]}
		/>
	);
}

/** Skeleton for a single order row */
export function OrderRowSkeleton() {
	return (
		<View style={skeletonStyles.orderRow}>
			<View style={{ gap: scale(6) }}>
				<SkeletonBone width={scale(100)} height={14} borderRadius={4} />
				<SkeletonBone width={scale(140)} height={11} borderRadius={4} />
			</View>
			<SkeletonBone width={scale(70)} height={14} borderRadius={4} />
		</View>
	);
}

/** Skeleton for the orders list */
export function OrdersListSkeleton({ count = 4 }: { count?: number }) {
	return (
		<View style={skeletonStyles.ordersList}>
			{Array.from({ length: count }).map((_, i) => (
				<OrderRowSkeleton key={i} />
			))}
		</View>
	);
}

/** Skeleton for a recipient card (avatar + name) */
export function RecipientCardSkeleton() {
	return (
		<View style={skeletonStyles.recipientCard}>
			<SkeletonBone width={scale(52)} height={scale(52)} borderRadius={scale(26)} />
			<View style={{ gap: scale(6), flex: 1 }}>
				<SkeletonBone width="70%" height={14} borderRadius={4} />
				<SkeletonBone width="40%" height={11} borderRadius={4} />
			</View>
		</View>
	);
}

/** Skeleton for the recipients list */
export function RecipientsListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<View style={skeletonStyles.recipientsList}>
			{Array.from({ length: count }).map((_, i) => (
				<RecipientCardSkeleton key={i} />
			))}
		</View>
	);
}

/** Skeleton for home screen (occasions + onboarding) */
export function HomeSkeleton() {
	return (
		<View style={skeletonStyles.homeContainer}>
			{/* Section title */}
			<SkeletonBone width={scale(160)} height={18} borderRadius={6} style={{ marginBottom: scale(16) }} />
			{/* Occasion cards row */}
			<View style={skeletonStyles.occasionRow}>
				{Array.from({ length: 3 }).map((_, i) => (
					<View key={i} style={skeletonStyles.occasionCard}>
						<SkeletonBone width={scale(40)} height={scale(40)} borderRadius={scale(20)} />
						<SkeletonBone width="80%" height={12} borderRadius={4} />
						<SkeletonBone width="50%" height={10} borderRadius={4} />
					</View>
				))}
			</View>
			{/* Onboarding progress skeleton */}
			<View style={skeletonStyles.onboardingBlock}>
				<SkeletonBone width={scale(120)} height={16} borderRadius={6} style={{ marginBottom: scale(12) }} />
				<SkeletonBone width="100%" height={8} borderRadius={4} style={{ marginBottom: scale(16) }} />
				{Array.from({ length: 3 }).map((_, i) => (
					<View key={i} style={skeletonStyles.onboardingStep}>
						<SkeletonBone width={scale(20)} height={scale(20)} borderRadius={scale(10)} />
						<SkeletonBone width="70%" height={12} borderRadius={4} />
					</View>
				))}
			</View>
		</View>
	);
}

const skeletonStyles = StyleSheet.create({
	orderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: scale(16),
		paddingHorizontal: scale(16),
		backgroundColor: '#fff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.02)',
		...GIFTYY_THEME.shadows.md,
	},
	ordersList: {
		gap: scale(12),
	},
	recipientCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scale(12),
		paddingVertical: scale(12),
		paddingHorizontal: scale(16),
		backgroundColor: '#fff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray100,
	},
	recipientsList: {
		gap: scale(8),
	},
	homeContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	occasionRow: {
		flexDirection: 'row',
		gap: scale(12),
		marginBottom: scale(24),
	},
	occasionCard: {
		flex: 1,
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: scale(12),
		alignItems: 'center',
		gap: scale(8),
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray100,
	},
	onboardingBlock: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: scale(16),
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray100,
	},
	onboardingStep: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scale(10),
		marginBottom: scale(12),
	},
});
