/**
 * Product Variants Selector Component
 * Minimalistic, user-friendly variant selector with unselect capability
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';

type VariantOption = {
	value: string;
	price?: number;
	isAvailable?: boolean;
	image?: string;
};

type VariantAttribute = {
	name: string;
	options: VariantOption[];
};

type ProductVariantsSelectorProps = {
	attributes: VariantAttribute[];
	selected: Record<string, string>;
	onSelect: (attributeName: string, value: string | null) => void; // Allow null to unselect
	disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function VariantChip({
	value,
	price,
	isSelected,
	isAvailable = true,
	onPress,
	delay = 0,
}: {
	value: string;
	price?: number;
	isSelected: boolean;
	isAvailable?: boolean;
	onPress: () => void;
	delay?: number;
}) {
	const scale = useSharedValue(1);
	const opacity = useSharedValue(isSelected ? 1 : 0.85);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 20, stiffness: 400 });
	};

	React.useEffect(() => {
		opacity.value = withSpring(isSelected ? 1 : 0.85, { damping: 15 });
	}, [isSelected]);

	return (
		<AnimatedPressable
			entering={FadeInDown.duration(250).delay(delay)}
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			disabled={!isAvailable}
			style={[
				styles.chip,
				isSelected && styles.chipSelected,
				!isAvailable && styles.chipDisabled,
				animatedStyle,
			]}
		>
			<Text
				style={[
					styles.chipText,
					isSelected && styles.chipTextSelected,
					!isAvailable && styles.chipTextDisabled,
				]}
			>
				{value}
			</Text>
			{price !== undefined && price !== 0 && (
				<Text
					style={[
						styles.chipPrice,
						isSelected && styles.chipPriceSelected,
						!isAvailable && styles.chipPriceDisabled,
					]}
				>
					{price > 0 ? `+$${price.toFixed(2)}` : price < 0 ? `-$${Math.abs(price).toFixed(2)}` : ''}
				</Text>
			)}
			{isSelected && (
				<View style={styles.checkmarkContainer}>
					<IconSymbol name="checkmark" size={14} color={GIFTYY_THEME.colors.white} />
				</View>
			)}
		</AnimatedPressable>
	);
}

export function ProductVariantsSelector({
	attributes,
	selected,
	onSelect,
	disabled = false,
}: ProductVariantsSelectorProps) {
	if (!attributes || attributes.length === 0) {
		return null;
	}

	return (
		<View style={styles.container}>
			{attributes.map((attribute, attrIndex) => {
				const hasSelection = !!selected[attribute.name];
				
				return (
					<View key={attribute.name} style={styles.attributeContainer}>
						<View style={styles.attributeHeader}>
							<Text style={styles.attributeLabel}>{attribute.name}</Text>
							{hasSelection && (
								<Pressable
									onPress={() => onSelect(attribute.name, null)}
									style={styles.clearButton}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Text style={styles.clearButtonText}>Clear</Text>
								</Pressable>
							)}
						</View>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chipsContainer}
						>
							{attribute.options.map((option, optIndex) => {
								const isSelected = selected[attribute.name] === option.value;
								const isAvailable = option.isAvailable !== false;

								return (
									<VariantChip
										key={option.value}
										value={option.value}
										price={option.price}
										isSelected={isSelected}
										isAvailable={isAvailable && !disabled}
										onPress={() => {
											// Toggle: if already selected, unselect it
											if (isSelected) {
												onSelect(attribute.name, null);
											} else {
												onSelect(attribute.name, option.value);
											}
										}}
										delay={attrIndex * 40 + optIndex * 20}
									/>
								);
							})}
						</ScrollView>
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	attributeContainer: {
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	attributeHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	attributeLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		letterSpacing: 0.2,
	},
	clearButton: {
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	clearButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray500,
	},
	chipsContainer: {
		flexDirection: 'row',
		gap: GIFTYY_THEME.spacing.sm,
		paddingRight: GIFTYY_THEME.spacing.lg,
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 1.5,
		borderColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.white,
		minHeight: 40,
		position: 'relative',
		...GIFTYY_THEME.shadows.xs,
	},
	chipSelected: {
		borderColor: GIFTYY_THEME.colors.primary,
		backgroundColor: GIFTYY_THEME.colors.primary + '08',
		borderWidth: 2,
		shadowColor: GIFTYY_THEME.colors.primary,
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
		elevation: 2,
	},
	chipDisabled: {
		opacity: 0.35,
		borderColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	checkmarkContainer: {
		position: 'absolute',
		top: -8,
		right: -8,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: GIFTYY_THEME.colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2.5,
		borderColor: GIFTYY_THEME.colors.white,
		...GIFTYY_THEME.shadows.md,
	},
	chipText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		letterSpacing: 0.1,
	},
	chipTextSelected: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	chipTextDisabled: {
		color: GIFTYY_THEME.colors.gray400,
	},
	chipPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray500,
		marginLeft: 6,
	},
	chipPriceSelected: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	chipPriceDisabled: {
		color: GIFTYY_THEME.colors.gray400,
	},
});

