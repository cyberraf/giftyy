/**
 * Deal Category Tabs Component
 * Horizontal scrollable tabs with animated underline
 */

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DealCategory = 'flash' | 'top-picks' | 'seasonal' | 'vendor-specials' | 'under-20' | 'last-chance';

const CATEGORIES: { id: DealCategory; label: string; icon: string }[] = [
	{ id: 'flash', label: 'Flash Deals', icon: 'bolt.fill' },
	{ id: 'top-picks', label: 'Top Picks', icon: 'star.fill' },
	{ id: 'seasonal', label: 'Seasonal Gifts', icon: 'snowflake' },
	{ id: 'vendor-specials', label: 'Vendor Specials', icon: 'storefront.fill' },
	{ id: 'under-20', label: 'Under $20', icon: 'dollarsign.circle.fill' },
	{ id: 'last-chance', label: 'Last Chance', icon: 'clock.fill' },
];

type Props = {
	activeCategory: DealCategory;
	onCategoryChange: (category: DealCategory) => void;
};

export function DealCategoryTabs({ activeCategory, onCategoryChange }: Props) {
	const activeIndex = CATEGORIES.findIndex(cat => cat.id === activeCategory);
	const indicatorPosition = useSharedValue(0);
	const indicatorWidth = useSharedValue(0);
	
	useEffect(() => {
		// Calculate indicator position based on active tab
		const tabWidth = SCREEN_WIDTH / 3; // Approximate width for each tab
		indicatorPosition.value = withSpring(activeIndex * tabWidth, {
			damping: 20,
			stiffness: 150,
		});
		indicatorWidth.value = withSpring(tabWidth * 0.9, {
			damping: 20,
			stiffness: 150,
		});
	}, [activeCategory, activeIndex]);
	
	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indicatorPosition.value }],
		width: indicatorWidth.value,
	}));
	
	return (
		<View style={styles.container}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{CATEGORIES.map((category, index) => {
					const isActive = category.id === activeCategory;
					return (
						<Pressable
							key={category.id}
							onPress={() => onCategoryChange(category.id)}
							style={[styles.tab, isActive && styles.tabActive]}
						>
							<Text style={[styles.tabText, isActive && styles.tabTextActive]}>
								{category.label}
							</Text>
							{isActive && <View style={styles.activeIndicator} />}
						</Pressable>
					);
				})}
			</ScrollView>
			{/* Animated Underline */}
			<View style={styles.underlineContainer}>
				<Animated.View style={[styles.animatedUnderline, indicatorStyle]} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	scrollContent: {
		paddingHorizontal: GIFTYY_THEME.spacing.md,
	},
	tab: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		marginRight: 8,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	tabActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
	},
	tabText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray600,
	},
	tabTextActive: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	activeIndicator: {
		position: 'absolute',
		bottom: -2,
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 1,
	},
	underlineContainer: {
		height: 2,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		marginTop: 4,
		position: 'relative',
	},
	animatedUnderline: {
		height: 2,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 1,
		position: 'absolute',
	},
});

