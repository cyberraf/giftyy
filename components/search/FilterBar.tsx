/**
 * Filter & Sort Bar Component
 * Sticky bar with filter button, sort dropdown, and applied filter chips
 */

import { FilterChip } from '@/components/search/FilterChip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type FilterChip = {
	id: string;
	label: string;
	type: string;
};

type FilterBarProps = {
	sortBy: string;
	onSortChange: (sortBy: any) => void;
	appliedFilters: FilterChip[];
	onRemoveFilter: (id: string, type: string) => void;
	onFilterPress: () => void;
};

const SORT_OPTIONS = [
	{ value: 'recommended', label: 'Recommended' },
	{ value: 'popular', label: 'Most Popular' },
	{ value: 'price-low', label: 'Price: Low to High' },
	{ value: 'price-high', label: 'Price: High to Low' },
	{ value: 'newest', label: 'Newest' },
	{ value: 'rating', label: 'Best Reviewed' },
];

export function FilterBar({
	sortBy,
	onSortChange,
	appliedFilters,
	onRemoveFilter,
	onFilterPress,
}: FilterBarProps) {
	const [showSortModal, setShowSortModal] = useState(false);
	const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Sort';

	return (
		<>
			<Animated.View entering={FadeInDown.duration(300)} style={styles.container}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
				>
					{/* Filter Button */}
					<Pressable onPress={onFilterPress} style={styles.filterButton}>
						<IconSymbol name="slider.horizontal.3" size={18} color={GIFTYY_THEME.colors.primary} />
						<Text style={styles.filterButtonText}>Filters</Text>
						{appliedFilters.length > 0 && (
							<View style={styles.badge}>
								<Text style={styles.badgeText}>{appliedFilters.length}</Text>
							</View>
						)}
					</Pressable>

					{/* Sort Button */}
					<Pressable onPress={() => setShowSortModal(true)} style={styles.sortButton}>
						<IconSymbol name="arrow.up.arrow.down" size={16} color={GIFTYY_THEME.colors.gray700} />
						<Text style={styles.sortButtonText}>{currentSortLabel}</Text>
					</Pressable>

					{/* Applied Filter Chips */}
					{appliedFilters.map((chip) => (
						<FilterChip
							key={chip.id}
							label={chip.label}
							onRemove={() => onRemoveFilter(chip.id, chip.type)}
						/>
					))}
				</ScrollView>
			</Animated.View>

			{/* Sort Modal */}
			<Modal
				visible={showSortModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowSortModal(false)}
			>
				<Pressable
					style={styles.modalOverlay}
					onPress={() => setShowSortModal(false)}
				>
					<Pressable onPress={(e) => e.stopPropagation()} style={styles.sortModal}>
						<View style={styles.sortModalHeader}>
							<Text style={styles.sortModalTitle}>Sort By</Text>
							<Pressable onPress={() => setShowSortModal(false)}>
								<IconSymbol name="xmark" size={24} color={GIFTYY_THEME.colors.gray700} />
							</Pressable>
						</View>
						<View style={styles.sortOptions}>
							{SORT_OPTIONS.map((option) => (
								<Pressable
									key={option.value}
									style={[
										styles.sortOption,
										sortBy === option.value && styles.sortOptionActive,
									]}
									onPress={() => {
										onSortChange(option.value);
										setShowSortModal(false);
									}}
								>
									<Text
										style={[
											styles.sortOptionText,
											sortBy === option.value && styles.sortOptionTextActive,
										]}
									>
										{option.label}
									</Text>
									{sortBy === option.value && (
										<IconSymbol
											name="checkmark"
											size={20}
											color={GIFTYY_THEME.colors.primary}
										/>
									)}
								</Pressable>
							))}
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		paddingVertical: GIFTYY_THEME.spacing.sm,
	},
	scrollContent: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.sm,
		alignItems: 'center',
	},
	filterButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.cream,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		borderRadius: GIFTYY_THEME.radius.full,
		gap: GIFTYY_THEME.spacing.xs,
		position: 'relative',
		borderWidth: 1.5,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	filterButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
	},
	badge: {
		position: 'absolute',
		top: -6,
		right: -6,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.white,
	},
	badgeText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	sortButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		borderRadius: GIFTYY_THEME.radius.full,
		gap: GIFTYY_THEME.spacing.xs,
	},
	sortButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	sortModal: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopLeftRadius: GIFTYY_THEME.radius['2xl'],
		borderTopRightRadius: GIFTYY_THEME.radius['2xl'],
		paddingTop: GIFTYY_THEME.spacing.xl,
		paddingBottom: GIFTYY_THEME.spacing['2xl'],
		maxHeight: '60%',
	},
	sortModalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	sortModalTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	sortOptions: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	sortOption: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: GIFTYY_THEME.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray100,
	},
	sortOptionActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
		marginHorizontal: -GIFTYY_THEME.spacing.lg,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		borderRadius: GIFTYY_THEME.radius.md,
		borderBottomWidth: 0,
	},
	sortOptionText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
	},
	sortOptionTextActive: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
});

