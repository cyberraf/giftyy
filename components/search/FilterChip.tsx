/**
 * Filter Chip Component
 * Removable chip showing applied filter with animation
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

type FilterChipProps = {
	label: string;
	onRemove: () => void;
};

export function FilterChip({ label, onRemove }: FilterChipProps) {
	const scale = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.95, { damping: 15 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15 });
	};

	return (
		<Animated.View style={animatedStyle}>
			<Pressable
				onPress={onRemove}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				style={styles.chip}
			>
				<Text style={styles.chipText}>{label}</Text>
				<IconSymbol name="xmark" size={14} color={GIFTYY_THEME.colors.gray600} />
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.xs,
		borderRadius: GIFTYY_THEME.radius.full,
		gap: GIFTYY_THEME.spacing.xs,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	chipText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
	},
});

