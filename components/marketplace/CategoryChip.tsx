/**
 * Category Chip Component
 * Circular/rounded category cards with icons for horizontal scrolling
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CategoryChipProps = {
	id: string;
	name: string;
	icon?: string;
	image?: string;
	isSelected?: boolean;
	onPress: () => void;
};

const CATEGORY_ICONS: Record<string, string> = {
	'Birthday': 'gift.fill',
	'Valentine': 'heart.fill',
	'Mother': 'heart.circle.fill',
	'Father': 'person.fill',
	'Christmas': 'tree.fill',
	'Recommended': 'sparkles',
	'Couples': 'heart.2.fill',
	'Kids': 'face.smiling.fill',
	'Luxury': 'star.fill',
	'Handmade': 'paintbrush.fill',
	// Fallback for any category name variations
	'birthday': 'gift.fill',
	'valentine': 'heart.fill',
	'mother': 'heart.circle.fill',
	'father': 'person.fill',
	'christmas': 'tree.fill',
	'recommended': 'sparkles',
	'couples': 'heart.2.fill',
	'kids': 'face.smiling.fill',
	'luxury': 'star.fill',
	'handmade': 'paintbrush.fill',
};

export function CategoryChip({
	id,
	name,
	icon,
	image,
	isSelected = false,
	onPress,
}: CategoryChipProps) {
	const scale = useSharedValue(1);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};
	
	// Ensure we always have an icon - use provided icon, or lookup by name, or default to sparkles
	// Ensure we always have an icon - use provided icon, or lookup by name (case-insensitive), or default to sparkles
	const iconName = (icon && typeof icon === 'string' && icon.trim()) 
		? icon.trim()
		: (CATEGORY_ICONS[name] || CATEGORY_ICONS[name.toLowerCase()] || CATEGORY_ICONS[name.toUpperCase()] || 'sparkles');
	
	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle]}
		>
			<View style={[
				styles.chip,
				isSelected && styles.chipSelected
			]}>
				{image ? (
					<View style={styles.imageContainer}>
						{/* Image implementation if needed */}
					</View>
				) : (
					<View style={[
						styles.iconContainer,
						isSelected && styles.iconContainerSelected
					]}>
						<IconSymbol 
							name={iconName as any} 
							size={24} 
							color={isSelected ? GIFTYY_THEME.colors.white : GIFTYY_THEME.colors.primary} 
						/>
					</View>
				)}
				<Text style={[
					styles.label,
					isSelected && styles.labelSelected
				]}>
					{String(name || '')}
				</Text>
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		// margin handled by parent
	},
	chip: {
		alignItems: 'center',
		minWidth: 80,
	},
	chipSelected: {
		// Additional styling if needed
	},
	iconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: GIFTYY_THEME.colors.cream,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
	},
	iconContainerSelected: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	imageContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		overflow: 'hidden',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	label: {
		fontSize: 12,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		textAlign: 'center',
		marginTop: 8,
	},
	labelSelected: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
});
