/**
 * Search Empty State Component
 * Friendly empty state when no search results found
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SearchEmptyStateProps = {
	searchQuery: string;
};

// Use the same categories as the home page for consistency
const CATEGORY_SUGGESTIONS = [
	{ id: 'birthday', name: 'Birthday', icon: 'gift.fill' },
	{ id: 'valentine', name: 'Valentine', icon: 'heart.fill' },
	{ id: 'mother', name: 'Mother', icon: 'heart.circle.fill' },
	{ id: 'father', name: 'Father', icon: 'person.fill' },
	{ id: 'christmas', name: 'Christmas', icon: 'tree.fill' },
	{ id: 'couples', name: 'Couples', icon: 'heart.2.fill' },
	{ id: 'kids', name: 'Kids', icon: 'face.smiling.fill' },
	{ id: 'luxury', name: 'Luxury', icon: 'star.fill' },
	{ id: 'handmade', name: 'Handmade', icon: 'paintbrush.fill' },
];

export function SearchEmptyState({ searchQuery }: SearchEmptyStateProps) {
	const router = useRouter();

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
				<Text style={styles.title}>No results found</Text>
				<Text style={styles.subtitle}>
					{searchQuery.trim()
						? `We couldn't find anything matching "${searchQuery}". Try exploring these categories!`
						: 'Try exploring these popular categories!'}
				</Text>

				{/* Category Suggestions */}
				<View style={styles.categoriesContainer}>
					<Text style={styles.categoriesTitle}>Explore Categories</Text>
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
										pathname: '/(buyer)/(tabs)/home',
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

