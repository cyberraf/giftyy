import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmptyState } from '@/components/EmptyState';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { UpcomingOccasion } from '@/lib/hooks/useHome';
import React from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';

type Props = {
	occasions: UpcomingOccasion[];
	loading: boolean;
	onPressOccasion: (recipientId: string) => void;
	onAddOccasion: () => void;
};

function formatDateLabel(dateIso: string): string {
	const d = new Date(dateIso);
	if (Number.isNaN(d.getTime())) return dateIso;
	return d.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

export function OccasionList({ occasions, loading, onPressOccasion, onAddOccasion }: Props) {
	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<Text style={styles.title}>Coming up</Text>
			</View>

			{loading ? (
				<View style={styles.loadingRow}>
					<ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.loadingText}>Loading occasions…</Text>
				</View>
			) : occasions.length === 0 ? (
				<View style={styles.emptyWrapper}>
					<EmptyState
						title="No upcoming occasions yet"
						description="Add birthdays or special dates so you never miss a moment."
					/>
					<Pressable
						onPress={onAddOccasion}
						style={({ pressed }) => [
							styles.addOccasionButton,
							pressed && styles.addOccasionButtonPressed,
						]}
						accessibilityRole="button"
						accessibilityLabel="Add an occasion"
					>
						<Text style={styles.addOccasionText}>Add an occasion</Text>
					</Pressable>
				</View>
			) : (
				<View style={styles.list}>
					{occasions.map((occ) => (
						<Pressable
							key={occ.id}
							onPress={() => onPressOccasion(occ.recipientId)}
							style={({ pressed }) => [
								styles.row,
								pressed && styles.rowPressed,
							]}
							accessibilityRole="button"
							accessibilityLabel={`Open ${occ.recipientName}'s occasion`}
						>
							<View style={styles.rowLeft}>
								<View style={styles.avatar}>
									<Text style={styles.avatarText}>
										{occ.recipientName.charAt(0).toUpperCase()}
									</Text>
								</View>
								<View>
									<Text style={styles.rowTitle}>{occ.recipientName}</Text>
									<Text style={styles.rowSubtitle}>
										{occ.label} • {formatDateLabel(occ.date)}
									</Text>
								</View>
							</View>

							<View style={styles.rowRight}>
								<View style={styles.badge}>
									<Text style={styles.badgeText}>
										{occ.inDays === 0
											? 'Today'
											: `in ${occ.inDays} day${occ.inDays === 1 ? '' : 's'}`}
									</Text>
								</View>
								<IconSymbol
									name="chevron.right"
									size={16}
									color={GIFTYY_THEME.colors.gray400}
								/>
							</View>
						</Pressable>
					))}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: GIFTYY_THEME.spacing.lg,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	loadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: GIFTYY_THEME.spacing.sm,
	},
	loadingText: {
		marginLeft: GIFTYY_THEME.spacing.sm,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
	},
	emptyWrapper: {
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		paddingVertical: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	addOccasionButton: {
		marginTop: GIFTYY_THEME.spacing.sm,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.full,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	addOccasionButtonPressed: {
		opacity: 0.9,
	},
	addOccasionText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	list: {
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	rowPressed: {
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.cream,
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	avatarText: {
		fontSize: GIFTYY_THEME.typography.sizes.md,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
	},
	rowTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	rowSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		marginTop: 2,
	},
	rowRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	badge: {
		paddingHorizontal: GIFTYY_THEME.spacing.sm,
		paddingVertical: 4,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	badgeText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
	},
});

