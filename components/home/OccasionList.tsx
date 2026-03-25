import { EmptyState } from '@/components/EmptyState';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { UpcomingOccasion } from '@/lib/hooks/useHome';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import {
	ActivityIndicator,
	Dimensions,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.4;
const CARD_GAP = 10;

type Props = {
	occasions: UpcomingOccasion[];
	loading: boolean;
	onPressOccasion: (recipientId: string, occasionId: string) => void;
	onAddOccasion: () => void;
	emptyTitle?: string;
	emptySubtitle?: string;
	actionLabel?: string;
};

export function formatDateLabel(dateIso: string): string {
	const parts = dateIso.split('-');
	let d: Date;

	if (parts.length === 3) {
		// YYYY-MM-DD string: parse explicitly as local midnight to avoid JS treating ISO as UTC
		d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
	} else {
		d = new Date(dateIso);
	}

	if (Number.isNaN(d.getTime())) return dateIso;

	return d.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

export function formatTimeUntil(diff: number, t: TFunction): string {
	if (diff === 0) return t('occasions.today');
	if (diff === 1) return t('occasions.tomorrow');
	if (diff < 0) return '';

	const months = Math.floor(diff / 30);
	const weeks = Math.floor(diff / 7);

	if (months > 0) return t('occasions.in_months', { count: months });
	if (weeks > 0) return t('occasions.in_weeks', { count: weeks });
	return t('occasions.in_days', { count: diff });
}

const OCCASION_EMOJI: Record<string, string> = {
	birthday: '🎂',
	anniversary: '💍',
	graduation: '🎓',
	christmas: '🎄',
	holiday: '🎁',
	wedding: '💒',
	valentine: '💝',
	mother: '🌸',
	father: '👔',
	'new year': '🥂',
	halloween: '🎃',
	easter: '🐣',
	hanukkah: '🕎',
};

function getOccasionEmoji(label: string): string {
	const l = label.toLowerCase();
	for (const [key, emoji] of Object.entries(OCCASION_EMOJI)) {
		if (l.includes(key)) return emoji;
	}
	return '🗓️';
}

function getInitials(name: string): string {
	const parts = name.trim().split(' ').filter(Boolean);
	return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function isUrgent(inDays: number) {
	return inDays <= 7;
}

export function OccasionList({ 
	occasions, 
	loading, 
	onPressOccasion, 
	onAddOccasion,
	emptyTitle,
	emptySubtitle,
	actionLabel
}: Props) {
	const { t } = useTranslation();

	if (loading) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{t('occasions.coming_up')}</Text>
				<View style={styles.loadingRow}>
					<ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.loadingText}>{t('occasions.loading')}</Text>
				</View>
			</View>
		);
	}

	if (occasions.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{t('occasions.coming_up')}</Text>
				<View style={styles.emptyWrapper}>
					<EmptyState
						title={emptyTitle || t('occasions.empty_title')}
						description={emptySubtitle || t('occasions.empty_subtitle')}
					/>
					<Pressable
						onPress={onAddOccasion}
						style={({ pressed }) => [styles.addOccasionButton, pressed && styles.addOccasionButtonPressed]}
						accessibilityRole="button"
					>
						<Text style={styles.addOccasionText}>{actionLabel || t('occasions.add_button')}</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{t('occasions.coming_up')}</Text>
			<ScrollView
				horizontal
				nestedScrollEnabled
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.carousel}
				decelerationRate="fast"
				snapToInterval={CARD_WIDTH + CARD_GAP}
				snapToAlignment="start"
				style={styles.carouselScroll}
			>
				{occasions.map((occ) => {
					const urgent = isUrgent(occ.inDays);
					const emoji = getOccasionEmoji(occ.label);

					return (
						<Pressable
							key={occ.id}
							onPress={() => onPressOccasion(occ.recipientId, occ.id)}
							style={({ pressed }) => [
								styles.card,
								pressed && styles.cardPressed,
								urgent && styles.cardUrgent,
							]}
							accessibilityRole="button"
							accessibilityLabel={`${occ.recipientName}'s ${occ.label}`}
						>
							<View style={[styles.avatarCircle, urgent && styles.avatarCircleUrgent]}>
								{occ.avatarUrl ? (
									<Image source={{ uri: occ.avatarUrl }} style={styles.avatarImg} />
								) : (
									<Text style={styles.avatarInitials}>{getInitials(occ.recipientName)}</Text>
								)}
							</View>
							<Text style={styles.recipientName} numberOfLines={1}>{occ.recipientName}</Text>
							<View style={styles.occasionRow}>
								<Text style={styles.occasionEmoji}>{emoji}</Text>
								<Text style={styles.occasionLabel} numberOfLines={1}>{occ.label}</Text>
							</View>
							<Text style={styles.dateText}>{formatDateLabel(occ.date)}</Text>
							<View style={[styles.badge, urgent && styles.badgeUrgent]}>
								<Text style={[styles.badgeText, urgent && styles.badgeTextUrgent]}>
									{formatTimeUntil(occ.inDays, t)}
								</Text>
							</View>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: GIFTYY_THEME.spacing.lg,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	loadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: GIFTYY_THEME.spacing.sm,
		gap: 8,
	},
	loadingText: {
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
	addOccasionButtonPressed: { opacity: 0.9 },
	addOccasionText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	carousel: {
		paddingRight: GIFTYY_THEME.spacing.lg,
		gap: CARD_GAP,
	},
	carouselScroll: {
		height: 165,
	},
	card: {
		width: CARD_WIDTH,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: 16,
		paddingVertical: 12,
		paddingHorizontal: 10,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 1,
	},
	cardPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
	cardUrgent: {
		borderColor: '#FED7AA',
		backgroundColor: '#FFFBF7',
	},
	avatarCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: GIFTYY_THEME.colors.cream,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		marginBottom: 6,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.gray100,
	},
	avatarCircleUrgent: {
		borderColor: '#FF6B00',
	},
	avatarImg: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	avatarInitials: {
		fontSize: 15,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.primary,
	},
	recipientName: {
		fontSize: 13,
		fontWeight: '800',
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 4,
		textAlign: 'center',
	},
	occasionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginBottom: 3,
	},
	occasionEmoji: { fontSize: 13 },
	occasionLabel: {
		fontSize: 11,
		fontWeight: '600',
		color: GIFTYY_THEME.colors.gray600,
		flexShrink: 1,
	},
	dateText: {
		fontSize: 11,
		color: GIFTYY_THEME.colors.gray400,
		marginBottom: 8,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	badgeUrgent: {
		backgroundColor: '#FFF0E5',
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray600,
	},
	badgeTextUrgent: {
		color: '#FF6B00',
	},
});
