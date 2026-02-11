import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type HeroCardProps = {
	onStartWithAI: () => void;
	onAddRecipient: () => void;
	disabled?: boolean;
};

export function HeroCard({ onStartWithAI, onAddRecipient, disabled }: HeroCardProps) {
	return (
		<View style={styles.card}>
			<View style={styles.headerRow}>
				<View style={styles.iconCircle}>
					<IconSymbol name="gift.fill" size={20} color={GIFTYY_THEME.colors.white} />
				</View>
				<Text style={styles.title}>Giftyy helps you pick the right gift fast — and makes it feel personal.</Text>
			</View>

			<Text style={styles.subtitle}>
				Add recipients, track occasions, and let AI suggest gifts that actually fit.
			</Text>

			<View style={styles.actionsRow}>
				<Pressable
					style={({ pressed }) => [
						styles.primaryButton,
						pressed && styles.primaryButtonPressed,
						disabled && styles.buttonDisabled,
					]}
					onPress={onStartWithAI}
					disabled={disabled}
					accessibilityRole="button"
					accessibilityLabel="Start with AI to get gift ideas"
				>
					<Text style={styles.primaryButtonText}>Start with AI</Text>
				</Pressable>

				<Pressable
					style={({ pressed }) => [
						styles.secondaryButton,
						pressed && styles.secondaryButtonPressed,
					]}
					onPress={onAddRecipient}
					accessibilityRole="button"
					accessibilityLabel="Add a new recipient"
				>
					<Text style={styles.secondaryButtonText}>Add a recipient</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.primary,
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	title: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.md,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: GIFTYY_THEME.spacing.xs,
	},
	primaryButton: {
		flex: 1,
		height: 44,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	primaryButtonPressed: {
		opacity: 0.9,
	},
	primaryButtonText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	secondaryButton: {
		height: 44,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.full,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray300,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryButtonPressed: {
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	secondaryButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray800,
	},
	buttonDisabled: {
		opacity: 0.6,
	},
});

