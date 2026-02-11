import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { HomeGiftSuggestion } from '@/lib/hooks/useHome';
import React from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';

type Props = {
	activeRecipientName?: string;
	hasActiveRecipient: boolean;
	suggestions: HomeGiftSuggestion[];
	loading: boolean;
	onPressSuggestion: (suggestion: HomeGiftSuggestion) => void;
	onAskAI: () => void;
};

const PLACEHOLDER_COUNT = 5;

export function GiftSuggestionRow({
	activeRecipientName,
	hasActiveRecipient,
	suggestions,
	loading,
	onPressSuggestion,
	onAskAI,
}: Props) {
	const showPlaceholders = hasActiveRecipient && suggestions.length === 0 && !loading;

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<Text style={styles.title}>Suggested gifts</Text>
				{hasActiveRecipient && (
					<Text style={styles.subtitle}>
						{activeRecipientName
							? `For ${activeRecipientName}`
							: 'Based on their profile'}
					</Text>
				)}
			</View>

			{loading ? (
				<View style={styles.loadingRow}>
					<ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.loadingText}>Loading suggestions…</Text>
				</View>
			) : !hasActiveRecipient ? (
				<View style={styles.emptyCard}>
					<Text style={styles.emptyTitle}>Pick a recipient to see suggestions</Text>
					<Text style={styles.emptySubtitle}>
						Select someone above, then ask Giftyy AI for ideas.
					</Text>
					<Pressable
						onPress={onAskAI}
						style={({ pressed }) => [
							styles.aiButton,
							pressed && styles.aiButtonPressed,
						]}
						accessibilityRole="button"
						accessibilityLabel="Ask AI for gift suggestions"
					>
						<IconSymbol
							name="sparkles"
							size={16}
							color={GIFTYY_THEME.colors.white}
						/>
						<Text style={styles.aiButtonText}>Ask AI for suggestions</Text>
					</Pressable>
				</View>
			) : showPlaceholders ? (
				<View>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.scrollContent}
					>
						{Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
							<View key={index} style={styles.placeholderCard}>
								<View style={styles.placeholderBadge} />
								<View style={styles.placeholderLineShort} />
								<View style={styles.placeholderLineLong} />
								<View style={styles.placeholderTagRow} />
							</View>
						))}
					</ScrollView>
					<Pressable
						onPress={onAskAI}
						style={({ pressed }) => [
							styles.aiButtonInline,
							pressed && styles.aiButtonPressed,
						]}
						accessibilityRole="button"
						accessibilityLabel="Ask AI for gift suggestions"
					>
						<IconSymbol
							name="sparkles"
							size={14}
							color={GIFTYY_THEME.colors.primary}
						/>
						<Text style={styles.aiButtonInlineText}>Ask AI for suggestions</Text>
					</Pressable>
				</View>
			) : suggestions.length === 0 ? (
				<View style={styles.emptyCard}>
					<Text style={styles.emptyTitle}>No suggestions yet</Text>
					<Text style={styles.emptySubtitle}>
						Ask Giftyy AI to generate ideas tailored to them.
					</Text>
					<Pressable
						onPress={onAskAI}
						style={({ pressed }) => [
							styles.aiButton,
							pressed && styles.aiButtonPressed,
						]}
						accessibilityRole="button"
						accessibilityLabel="Ask AI for gift suggestions"
					>
						<IconSymbol
							name="sparkles"
							size={16}
							color={GIFTYY_THEME.colors.white}
						/>
						<Text style={styles.aiButtonText}>Ask AI for suggestions</Text>
					</Pressable>
				</View>
			) : (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
				>
					{suggestions.map((sugg) => (
						<Pressable
							key={sugg.id}
							onPress={() => onPressSuggestion(sugg)}
							style={({ pressed }) => [
								styles.card,
								pressed && styles.cardPressed,
							]}
							accessibilityRole="button"
							accessibilityLabel={`Open suggestion ${sugg.title}`}
						>
							<Text style={styles.cardTitle} numberOfLines={2}>
								{sugg.title}
							</Text>
							{(sugg.category || sugg.priceRange) && (
								<Text style={styles.cardMeta} numberOfLines={1}>
									{sugg.category}
									{sugg.category && sugg.priceRange ? ' • ' : ''}
									{sugg.priceRange}
								</Text>
							)}
							{sugg.rationale && (
								<Text style={styles.cardRationale} numberOfLines={2}>
									{sugg.rationale}
								</Text>
							)}
						</Pressable>
					))}
				</ScrollView>
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
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
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
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 0.5,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	emptyTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	emptySubtitle: {
		marginTop: 4,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
	},
	aiButton: {
		marginTop: GIFTYY_THEME.spacing.sm,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.full,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.primary,
		flexDirection: 'row',
	},
	aiButtonInline: {
		marginTop: GIFTYY_THEME.spacing.sm,
		alignSelf: 'flex-start',
		borderRadius: GIFTYY_THEME.radius.full,
		borderWidth: 0.5,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		height: 36,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	aiButtonPressed: {
		opacity: 0.9,
	},
	aiButtonText: {
		marginLeft: 6,
		color: GIFTYY_THEME.colors.white,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	aiButtonInlineText: {
		marginLeft: 6,
		color: GIFTYY_THEME.colors.primary,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	scrollContent: {
		paddingVertical: GIFTYY_THEME.spacing.sm,
	},
	card: {
		width: 180,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 0.5,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		backgroundColor: GIFTYY_THEME.colors.white,
		padding: GIFTYY_THEME.spacing.sm,
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	cardPressed: {
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	cardTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 4,
	},
	cardMeta: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		marginBottom: 4,
	},
	cardRationale: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray600,
	},
	placeholderCard: {
		width: 180,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 0.5,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		backgroundColor: GIFTYY_THEME.colors.gray50,
		padding: GIFTYY_THEME.spacing.sm,
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	placeholderBadge: {
		width: 60,
		height: 10,
		borderRadius: 999,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		marginBottom: 8,
	},
	placeholderLineShort: {
		width: 90,
		height: 10,
		borderRadius: 999,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		marginBottom: 6,
	},
	placeholderLineLong: {
		width: '80%',
		height: 8,
		borderRadius: 999,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		marginBottom: 4,
	},
	placeholderTagRow: {
		width: '60%',
		height: 8,
		borderRadius: 999,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		marginTop: 4,
	},
});

