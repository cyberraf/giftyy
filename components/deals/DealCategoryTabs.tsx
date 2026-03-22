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

const CATEGORIES: { id: DealCategory; label: string }[] = [
	{ id: 'flash', label: 'Flash Deals' },
	{ id: 'top-picks', label: 'Top Picks' },
	{ id: 'seasonal', label: 'Seasonal' },
	{ id: 'vendor-specials', label: 'Vendors' },
	{ id: 'under-20', label: 'Under $20' },
	{ id: 'last-chance', label: 'Last Chance' },
];

type Props = {
	activeCategory: DealCategory;
	onCategoryChange: (category: DealCategory) => void;
};

export function DealCategoryTabs({ activeCategory, onCategoryChange }: Props) {
	const activeIndex = CATEGORIES.findIndex(cat => cat.id === activeCategory);
	const indicatorPosition = useSharedValue(0);
	const indicatorWidth = useSharedValue(0);
	
	// Track tab widths for accurate indicator positioning
	const [tabWidths, setTabWidths] = React.useState<number[]>(new Array(CATEGORIES.length).fill(0));
	
	useEffect(() => {
		if (tabWidths[activeIndex] > 0) {
			let offset = 0;
			for (let i = 0; i < activeIndex; i++) {
				offset += tabWidths[i] + 16; // 16 is the marginRight
			}
			
			indicatorPosition.value = withSpring(offset, {
				damping: 20,
				stiffness: 150,
			});
			indicatorWidth.value = withSpring(tabWidths[activeIndex], {
				damping: 20,
				stiffness: 150,
			});
		}
	}, [activeCategory, activeIndex, tabWidths]);
	
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
							onLayout={(e) => {
								const { width } = e.nativeEvent.layout;
								const newWidths = [...tabWidths];
								newWidths[index] = width;
								setTabWidths(newWidths);
							}}
							style={styles.tab}
						>
							<Text style={[styles.tabText, isActive && styles.tabTextActive]}>
								{category.label}
							</Text>
						</Pressable>
					);
				})}
				{/* Animated Underline inside the ScrollView to move with tabs */}
				<Animated.View style={[styles.animatedUnderline, indicatorStyle]} />
			</ScrollView>
			<View style={styles.separator} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	scrollContent: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: 12,
		position: 'relative',
	},
	tab: {
		marginRight: 24,
		paddingVertical: 8,
	},
	tabText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray500,
		letterSpacing: 0.2,
	},
	tabTextActive: {
		color: GIFTYY_THEME.colors.primary,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	animatedUnderline: {
		height: 3,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 1.5,
		position: 'absolute',
		bottom: 8,
		left: GIFTYY_THEME.spacing.lg,
	},
	separator: {
		height: 1,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		marginHorizontal: GIFTYY_THEME.spacing.lg,
	},
});

