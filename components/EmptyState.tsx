import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
	title: string;
	description?: string;
	icon?: string;
	iconColor?: string;
	actionLabel?: string;
	onAction?: () => void;
};

export function EmptyState({ title, description, icon, iconColor, actionLabel, onAction }: Props) {
	return (
		<View style={styles.container}>
			{icon && (
				<View style={styles.iconWrapper}>
					<IconSymbol
						name={icon as any}
						size={48}
						color={iconColor || GIFTYY_THEME.colors.gray300}
					/>
				</View>
			)}
			<Text style={styles.title}>{title}</Text>
			{!!description && <Text style={styles.description}>{description}</Text>}
			{actionLabel && onAction && (
				<Pressable style={styles.actionButton} onPress={onAction}>
					<Text style={styles.actionText}>{actionLabel}</Text>
				</Pressable>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconWrapper: {
		marginBottom: 16,
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: 17,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray900,
		textAlign: 'center',
	},
	description: {
		color: GIFTYY_THEME.colors.gray500,
		marginTop: 6,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: 20,
		paddingHorizontal: 16,
	},
	actionButton: {
		marginTop: 20,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	actionText: {
		color: '#FFF',
		fontSize: 14,
		fontWeight: '700',
	},
});
