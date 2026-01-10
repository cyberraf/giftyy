/**
 * Empty Collections State Component
 * Shown when no collections match filters
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
	onResetFilters: () => void;
};

export function EmptyCollectionsState({ onResetFilters }: Props) {
	return (
		<Animated.View style={styles.container} entering={FadeInDown.duration(400)}>
			<View style={styles.iconContainer}>
				<LinearGradient
					colors={[GIFTYY_THEME.colors.cream, GIFTYY_THEME.colors.peach + '40']}
					style={styles.iconBackground}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<IconSymbol name="sparkles" size={48} color={GIFTYY_THEME.colors.primary} />
					<IconSymbol 
						name="gift.fill" 
						size={32} 
						color={GIFTYY_THEME.colors.primary} 
						style={styles.giftIcon}
					/>
				</LinearGradient>
			</View>
			<Text style={styles.title}>No collections found</Text>
			<Text style={styles.subtitle}>
				Try adjusting your filters to discover more gift collections!
			</Text>
			<Pressable style={styles.resetButton} onPress={onResetFilters}>
				<LinearGradient
					colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
					style={styles.resetButtonGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<IconSymbol name="arrow.counterclockwise" size={18} color="#fff" />
					<Text style={styles.resetButtonText}>Reset Filters</Text>
				</LinearGradient>
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: GIFTYY_THEME.spacing['5xl'],
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	iconContainer: {
		position: 'relative',
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	iconBackground: {
		width: 120,
		height: 120,
		borderRadius: 60,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.lg,
	},
	giftIcon: {
		position: 'absolute',
		top: 35,
		left: 44,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.md,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.xl,
		lineHeight: GIFTYY_THEME.typography.sizes.base * 1.5,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	resetButton: {
		borderRadius: GIFTYY_THEME.radius.full,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.md,
	},
	resetButtonGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	resetButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: '#fff',
	},
});

