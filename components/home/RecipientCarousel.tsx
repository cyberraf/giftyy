import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';

export type RecipientCarouselItem = {
	id: string;
	displayName: string;
	relationship?: string;
	nextOccasionLabel?: string;
	nextOccasionDateDisplay?: string;
	nextOccasionInDays?: number | null;
};

type Props = {
	items: RecipientCarouselItem[];
	activeRecipientId: string | null;
	loading: boolean;
	onSelectRecipient: (id: string) => void;
	onGetGiftIdeas: (id: string) => void;
	onAddRecipient: () => void;
};

export function RecipientCarousel({
	items,
	activeRecipientId,
	loading,
	onSelectRecipient,
	onGetGiftIdeas,
	onAddRecipient,
}: Props) {
	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<Text style={styles.title}>Recipients</Text>
				<Pressable
					onPress={onAddRecipient}
					style={({ pressed }) => [
						styles.addButton,
						pressed && styles.addButtonPressed,
					]}
					accessibilityRole="button"
					accessibilityLabel="Add a new recipient"
				>
					<IconSymbol name="plus" size={14} color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.addButtonText}>Add</Text>
				</Pressable>
			</View>

			{loading ? (
				<View style={styles.loadingRow}>
					<ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.loadingText}>Loading recipients…</Text>
				</View>
			) : items.length === 0 ? (
				<Pressable
					onPress={onAddRecipient}
					style={styles.emptyCard}
					accessibilityRole="button"
					accessibilityLabel="Add your first recipient"
				>
					<IconSymbol name="person.badge.plus" size={32} color={GIFTYY_THEME.colors.gray400} />
					<Text style={styles.emptyTitle}>Add your first recipient</Text>
					<Text style={styles.emptySubtitle}>Start by saving someone you’d like to gift.</Text>
				</Pressable>
			) : (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
				>
					{items.map((item) => {
						const isActive = item.id === activeRecipientId;
						return (
							<View key={item.id} style={styles.cardWrapper}>
								<Pressable
									onPress={() => onSelectRecipient(item.id)}
									style={({ pressed }) => [
										styles.card,
										isActive && styles.cardActive,
										pressed && styles.cardPressed,
									]}
									accessibilityRole="button"
									accessibilityLabel={`Select ${item.displayName} as active recipient`}
								>
									<View style={styles.cardHeaderRow}>
										<Text style={styles.cardName} numberOfLines={1}>
											{item.displayName}
										</Text>
										{isActive && (
											<View style={styles.activeDot} />
										)}
									</View>
									{item.relationship ? (
										<Text style={styles.cardRelationship} numberOfLines={1}>
											{item.relationship}
										</Text>
									) : null}

									{item.nextOccasionLabel && item.nextOccasionDateDisplay && (
										<View style={styles.occasionRow}>
											<IconSymbol
												name="calendar"
												size={14}
												color={GIFTYY_THEME.colors.gray500}
											/>
											<Text style={styles.occasionText} numberOfLines={1}>
												{item.nextOccasionLabel} • {item.nextOccasionDateDisplay}
											</Text>
										</View>
									)}

									<Pressable
										onPress={() => onGetGiftIdeas(item.id)}
										style={({ pressed }) => [
											styles.ideaButton,
											pressed && styles.ideaButtonPressed,
										]}
										accessibilityRole="button"
										accessibilityLabel={`Get gift ideas for ${item.displayName}`}
									>
										<IconSymbol
											name="sparkles"
											size={14}
											color={GIFTYY_THEME.colors.primary}
										/>
										<Text style={styles.ideaButtonText}>Get gift ideas</Text>
									</Pressable>
								</Pressable>
							</View>
						);
					})}
				</ScrollView>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.lg,
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
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.sm,
		height: 32,
		borderRadius: GIFTYY_THEME.radius.full,
		borderWidth: 0.5,
		borderColor: 'rgba(0, 0, 0, 0.1)',
	},
	addButtonPressed: {
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	addButtonText: {
		marginLeft: 4,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.primary,
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
	emptyCard: {
		marginTop: GIFTYY_THEME.spacing.sm,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 0.5,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		alignItems: 'center',
	},
	emptyTitle: {
		marginTop: GIFTYY_THEME.spacing.sm,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	emptySubtitle: {
		marginTop: 2,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
	},
	scrollContent: {
		paddingVertical: GIFTYY_THEME.spacing.sm,
	},
	cardWrapper: {
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	card: {
		width: 180,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 0.5,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		backgroundColor: GIFTYY_THEME.colors.white,
		padding: GIFTYY_THEME.spacing.sm,
		minHeight: 120,
		justifyContent: 'space-between',
	},
	cardActive: {
		borderColor: GIFTYY_THEME.colors.primary,
	},
	cardPressed: {
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 2,
	},
	cardName: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginRight: 4,
	},
	cardRelationship: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		marginBottom: 4,
	},
	activeDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	occasionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	occasionText: {
		marginLeft: 4,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray600,
	},
	ideaButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		height: 32,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	ideaButtonPressed: {
		backgroundColor: GIFTYY_THEME.colors.gray200,
	},
	ideaButtonText: {
		marginLeft: 4,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.primary,
	},
});

