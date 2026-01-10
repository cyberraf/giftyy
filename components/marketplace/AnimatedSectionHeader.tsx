/**
 * Animated Section Header Component
 * Smooth fade-in and slide animations for section titles
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	FadeInDown,
	FadeInRight
} from 'react-native-reanimated';

type AnimatedSectionHeaderProps = {
	title: string;
	subtitle?: string;
	actionText?: string;
	onActionPress?: () => void;
	icon?: string;
};

export function AnimatedSectionHeader({
	title,
	subtitle,
	actionText,
	onActionPress,
	icon,
}: AnimatedSectionHeaderProps) {
	return (
		<Animated.View 
			entering={FadeInDown.duration(400).delay(100)}
			style={styles.container}
		>
			<View style={styles.leftSection}>
				{icon && (
					<IconSymbol 
						name={icon as any} 
						size={20} 
						color={GIFTYY_THEME.colors.primary}
						style={{ marginRight: GIFTYY_THEME.spacing.sm }}
					/>
				)}
				<View style={styles.textContainer}>
					<Text style={styles.title}>{title}</Text>
					{subtitle && (
						<Text style={styles.subtitle}>{subtitle}</Text>
					)}
				</View>
			</View>
			{actionText && onActionPress && (
				<Animated.View entering={FadeInRight.duration(400).delay(200)}>
					<Pressable 
						onPress={onActionPress}
						style={styles.actionButton}
					>
						<Text style={styles.actionText}>{String(actionText || '')}</Text>
						<IconSymbol 
							name="chevron.right" 
							size={14} 
							color={GIFTYY_THEME.colors.primary}
							style={{ marginLeft: 4 }}
						/>
					</Pressable>
				</Animated.View>
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.md,
		marginTop: GIFTYY_THEME.spacing.xl,
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	textContainer: {
		flex: 1,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		letterSpacing: -0.5,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
		marginTop: 2,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 10,
	},
	actionText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
	},
});
