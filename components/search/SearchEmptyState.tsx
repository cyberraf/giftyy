/**
 * Search Empty State Component
 * Friendly empty state when no search results found
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SearchEmptyStateProps = {
	searchQuery: string;
};

export function SearchEmptyState({ searchQuery }: SearchEmptyStateProps) {
	const router = useRouter();
	const { t } = useTranslation();

	const CATEGORY_SUGGESTIONS = [
		{ id: 'birthday', name: t('search.category_suggestions.birthday'), icon: 'gift.fill' },
		{ id: 'valentine', name: t('search.category_suggestions.valentine'), icon: 'heart.fill' },
		{ id: 'mother', name: t('search.category_suggestions.mother'), icon: 'heart.circle.fill' },
		{ id: 'father', name: t('search.category_suggestions.father'), icon: 'person.fill' },
		{ id: 'christmas', name: t('search.category_suggestions.christmas'), icon: 'tree.fill' },
		{ id: 'couples', name: t('search.category_suggestions.couples'), icon: 'heart.2.fill' },
		{ id: 'kids', name: t('search.category_suggestions.kids'), icon: 'face.smiling.fill' },
		{ id: 'luxury', name: t('search.category_suggestions.luxury'), icon: 'star.fill' },
		{ id: 'handmade', name: t('search.category_suggestions.handmade'), icon: 'paintbrush.fill' },
	];

	return (
		<View style={styles.container}>
			<Animated.View entering={FadeInDown.duration(400)} style={styles.content}>
				{/* Icon */}
				<View style={styles.iconContainer}>
					<View style={styles.iconCircle}>
						<IconSymbol name="magnifyingglass" size={48} color={GIFTYY_THEME.colors.gray400} />
					</View>
				</View>

				{/* Message */}
				<Text style={styles.title}>{t('search.no_results')}</Text>
				<Text style={styles.subtitle}>
					{searchQuery.trim()
						? t('search.no_results_subtitle', { query: searchQuery })
						: t('search.no_query_subtitle')}
				</Text>

				{/* Category Suggestions */}
				<View style={styles.categoriesContainer}>
					<Text style={styles.categoriesTitle}>{t('search.explore_categories')}</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.categoriesScroll}
					>
						{CATEGORY_SUGGESTIONS.map((category, index) => (
							<Animated.View
								key={category.id}
								entering={FadeInDown.duration(300).delay(index * 50)}
							>
								<Pressable
									style={styles.categoryCard}
									onPress={() => router.push({
										pathname: '/(buyer)/(tabs)/shop',
										params: { category: category.id },
									})}
								>
									<View style={styles.categoryIconContainer}>
										<IconSymbol
											name={category.icon as any}
											size={24}
											color={GIFTYY_THEME.colors.primary}
										/>
									</View>
									<Text style={styles.categoryName}>{category.name}</Text>
								</Pressable>
							</Animated.View>
						))}
					</ScrollView>
				</View>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	content: {
		alignItems: 'center',
		maxWidth: 400,
	},
	iconContainer: {
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	iconCircle: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: GIFTYY_THEME.colors.cream,
		justifyContent: 'center',
		alignItems: 'center',
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.sm,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing['2xl'],
		lineHeight: 22,
	},
	categoriesContainer: {
		width: '100%',
	},
	categoriesTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	categoriesScroll: {
		gap: GIFTYY_THEME.spacing.md,
		paddingRight: GIFTYY_THEME.spacing.lg,
	},
	categoryCard: {
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		minWidth: 100,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
		marginRight: GIFTYY_THEME.spacing.md,
	},
	categoryIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: GIFTYY_THEME.colors.cream,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	categoryName: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
	},
});

