/**
 * Comprehensive Filter Modal Component
 * Full-featured filter system with categories, price range, vendors, etc.
 * Premium design with smooth animations
 */

import { PriceRangeSlider } from '@/components/search/PriceRangeSlider';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
	Dimensions,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FilterState = {
	categories: string[];
	priceRange: { min: number; max: number };
	vendors: string[];
	verifiedVendorsOnly: boolean;
	minRating: number;
	sortBy: any;
};

	type FilterModalProps = {
		visible: boolean;
		onClose: () => void;
		filters: FilterState;
		onFiltersChange: (filters: FilterState) => void;
		onReset: () => void;
		categories: any[];
		vendors?: any[];
	};

export function FilterModal({
	visible,
	onClose,
	filters,
	onFiltersChange,
	onReset,
	categories = [],
	vendors = [],
}: FilterModalProps) {
	const [localFilters, setLocalFilters] = useState(filters);
	const [categoriesExpanded, setCategoriesExpanded] = useState(true);

	React.useEffect(() => {
		if (visible) {
			setLocalFilters(filters);
		}
	}, [visible, filters]);

	const handleApply = () => {
		onFiltersChange(localFilters);
		onClose();
	};

	const toggleCategory = (categoryId: string) => {
		setLocalFilters(prev => ({
			...prev,
			categories: prev.categories.includes(categoryId)
				? prev.categories.filter(id => id !== categoryId)
				: [...prev.categories, categoryId],
		}));
	};

	const handlePriceChange = (min: number, max: number) => {
		setLocalFilters(prev => ({
			...prev,
			priceRange: { min, max },
		}));
	};


	const appliedCount = 
		localFilters.categories.length +
		(localFilters.priceRange.min > 0 || localFilters.priceRange.max < 1000 ? 1 : 0);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable onPress={(e) => e.stopPropagation()}>
					<View style={styles.modal}>
						{/* Header with gradient */}
						<LinearGradient
							colors={[GIFTYY_THEME.colors.white, GIFTYY_THEME.colors.cream]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.headerGradient}
						>
							<View style={styles.header}>
								<Pressable onPress={onReset} style={styles.resetButton}>
									<IconSymbol name="arrow.counterclockwise" size={18} color={GIFTYY_THEME.colors.primary} />
									<Text style={styles.resetText}>Reset</Text>
								</Pressable>
								<View style={styles.titleContainer}>
									<Text style={styles.title}>Filters</Text>
									{appliedCount > 0 && (
										<View style={styles.countBadge}>
											<Text style={styles.countText}>{appliedCount}</Text>
										</View>
									)}
								</View>
								<Pressable onPress={onClose} style={styles.closeButton}>
									<IconSymbol name="xmark.circle.fill" size={28} color={GIFTYY_THEME.colors.gray600} />
								</Pressable>
							</View>
						</LinearGradient>

						{/* Applied Filters Summary */}
						{appliedCount > 0 && (
							<View style={styles.appliedContainer}>
								<IconSymbol name="checkmark.circle.fill" size={16} color={GIFTYY_THEME.colors.success} />
								<Text style={styles.appliedText}>
									{appliedCount} {appliedCount === 1 ? 'filter' : 'filters'} active
								</Text>
							</View>
						)}

						<ScrollView
							style={styles.content}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.contentContainer}
						>
							{/* Categories Section */}
							<View style={styles.section}>
								<Pressable
									style={styles.dropdownHeader}
									onPress={() => setCategoriesExpanded(!categoriesExpanded)}
								>
									<View style={styles.dropdownHeaderContent}>
										<Text style={styles.sectionTitle}>Categories</Text>
										{localFilters.categories.length > 0 && (
											<View style={styles.badge}>
												<Text style={styles.badgeText}>
													{localFilters.categories.length}
												</Text>
											</View>
										)}
									</View>
									<IconSymbol
										name={categoriesExpanded ? "chevron.up" : "chevron.down"}
										size={20}
										color={GIFTYY_THEME.colors.gray600}
									/>
								</Pressable>
								{categoriesExpanded && (
									<View style={styles.dropdownContent}>
										{categories && categories.length > 0 ? (
											<View style={styles.categoryList}>
												{categories.map((category) => {
													const isSelected = localFilters.categories.includes(category.id);
													return (
														<Pressable
															key={category.id}
															style={[
																styles.categoryItem,
																isSelected && styles.categoryItemActive,
															]}
															onPress={() => toggleCategory(category.id)}
														>
															<View style={styles.categoryItemContent}>
																{isSelected ? (
																	<IconSymbol
																		name="checkmark.circle.fill"
																		size={20}
																		color={GIFTYY_THEME.colors.primary}
																	/>
																) : (
																	<View style={styles.categoryCheckbox} />
																)}
																<Text
																	style={[
																		styles.categoryText,
																		isSelected && styles.categoryTextActive,
																	]}
																>
																	{category.name}
																</Text>
															</View>
														</Pressable>
													);
												})}
											</View>
										) : (
											<Text style={styles.emptyText}>No categories available</Text>
										)}
									</View>
								)}
							</View>

							{/* Price Range Section */}
							<View style={styles.section}>
								<View style={styles.sectionHeader}>
									<IconSymbol name="dollarsign.circle.fill" size={20} color={GIFTYY_THEME.colors.primary} />
									<Text style={styles.sectionTitle}>Price Range</Text>
								</View>
								<View style={styles.priceSection}>
									<PriceRangeSlider
										min={0}
										max={1000}
										minValue={localFilters.priceRange.min}
										maxValue={localFilters.priceRange.max}
										onValueChange={handlePriceChange}
									/>
								</View>
							</View>

						</ScrollView>

						{/* Bottom Action Bar */}
						<View style={styles.actionBar}>
							<Pressable 
								style={styles.resetAllButton} 
								onPress={onReset}
							>
								<IconSymbol name="arrow.counterclockwise" size={18} color={GIFTYY_THEME.colors.gray700} />
								<Text style={styles.resetAllText}>Reset</Text>
							</Pressable>
							<Pressable
								style={[
									styles.applyButton,
									appliedCount === 0 && styles.applyButtonDisabled,
								]}
								onPress={handleApply}
								disabled={appliedCount === 0}
							>
								{appliedCount > 0 && (
									<LinearGradient
										colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
										style={StyleSheet.absoluteFill}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
									/>
								)}
								<Text
									style={[
										styles.applyButtonText,
										appliedCount === 0 && styles.applyButtonTextDisabled,
									]}
								>
									Apply {appliedCount > 0 ? `(${appliedCount})` : ''}
								</Text>
							</Pressable>
						</View>
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	modal: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopLeftRadius: GIFTYY_THEME.radius['2xl'],
		borderTopRightRadius: GIFTYY_THEME.radius['2xl'],
		maxHeight: SCREEN_HEIGHT * 0.92,
		height: SCREEN_HEIGHT * 0.85,
		...GIFTYY_THEME.shadows.xl,
		overflow: 'hidden',
	},
	headerGradient: {
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingTop: GIFTYY_THEME.spacing.xl,
		paddingBottom: GIFTYY_THEME.spacing.lg,
	},
	resetButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.xs,
		padding: GIFTYY_THEME.spacing.xs,
		paddingHorizontal: GIFTYY_THEME.spacing.sm,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	resetText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	countBadge: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 12,
		minWidth: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	countText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
	},
	closeButton: {
		padding: GIFTYY_THEME.spacing.xs,
	},
	appliedContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	appliedText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.primary,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: GIFTYY_THEME.spacing.lg,
	},
	section: {
		marginBottom: GIFTYY_THEME.spacing['2xl'],
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	dropdownHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	dropdownHeaderContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
		flex: 1,
	},
	sectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
	},
	badge: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: GIFTYY_THEME.radius.full,
		minWidth: 24,
		height: 24,
		paddingHorizontal: GIFTYY_THEME.spacing.xs,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
	dropdownContent: {
		marginTop: GIFTYY_THEME.spacing.md,
		paddingTop: GIFTYY_THEME.spacing.md,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	priceSection: {
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
	},
	categoryList: {
		gap: GIFTYY_THEME.spacing.xs,
	},
	categoryItem: {
		paddingVertical: GIFTYY_THEME.spacing.sm,
		paddingHorizontal: GIFTYY_THEME.spacing.xs,
		borderRadius: GIFTYY_THEME.radius.md,
	},
	categoryItemActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
	},
	categoryItemContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
	},
	categoryCheckbox: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.gray300,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	categoryText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
		flex: 1,
	},
	categoryTextActive: {
		color: GIFTYY_THEME.colors.gray900,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	toggleCard: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		borderWidth: 1.5,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: GIFTYY_THEME.spacing.lg,
	},
	toggleLabelContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
		flex: 1,
	},
	verifiedIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: GIFTYY_THEME.colors.cream,
		alignItems: 'center',
		justifyContent: 'center',
	},
	toggleTextContainer: {
		flex: 1,
	},
	toggleLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 2,
	},
	toggleSubtext: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	vendorList: {
		marginTop: GIFTYY_THEME.spacing.md,
		gap: GIFTYY_THEME.spacing.sm,
	},
	vendorItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.gray200,
		marginBottom: GIFTYY_THEME.spacing.sm,
		...GIFTYY_THEME.shadows.sm,
	},
	vendorItemActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderColor: GIFTYY_THEME.colors.primary,
		...GIFTYY_THEME.shadows.md,
	},
	vendorInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
		flex: 1,
	},
	vendorIconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	vendorIconContainerActive: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	vendorText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
		flex: 1,
	},
	vendorTextActive: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	actionBar: {
		flexDirection: 'row',
		gap: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingTop: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.xl,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.white,
		...GIFTYY_THEME.shadows.lg,
	},
	resetAllButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: GIFTYY_THEME.spacing.xs,
		paddingVertical: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.full,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.gray300,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	resetAllText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
	},
	applyButton: {
		flex: 2,
		paddingVertical: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.md,
	},
	applyButtonDisabled: {
		backgroundColor: GIFTYY_THEME.colors.gray300,
		...GIFTYY_THEME.shadows.sm,
	},
	applyButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
		position: 'relative',
		zIndex: 1,
	},
	applyButtonTextDisabled: {
		color: GIFTYY_THEME.colors.gray500,
	},
	emptyText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
		paddingVertical: GIFTYY_THEME.spacing.lg,
		fontStyle: 'italic',
	},
});

