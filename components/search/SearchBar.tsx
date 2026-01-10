/**
 * Enhanced Search Bar Component
 * Includes search input, suggestions dropdown, and animations
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect, useRef, useState } from 'react';
import {
	Dimensions,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableWithoutFeedback,
	View,
} from 'react-native';
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SearchBarProps = {
	value: string;
	onChangeText: (text: string) => void;
	onFocus?: () => void;
	onBlur?: () => void;
	showSuggestions?: boolean;
	onSuggestionPress?: (suggestion: string) => void;
};

const TRENDING_SEARCHES = [
	'Birthday Gifts',
	'Anniversary Presents',
	'Valentine\'s Day',
	'Mother\'s Day',
	'Handmade Items',
	'Luxury Gifts',
];

export function SearchBar({
	value,
	onChangeText,
	onFocus,
	onBlur,
	showSuggestions = false,
	onSuggestionPress,
}: SearchBarProps) {
	const [isFocused, setIsFocused] = useState(false);
	const [searchBarLayout, setSearchBarLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
	const searchIconScale = useSharedValue(1);
	const inputRef = useRef<TextInput>(null);
	const containerRef = useRef<View>(null);

	const iconAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: searchIconScale.value }],
	}));

	useEffect(() => {
		if (isFocused) {
			searchIconScale.value = withSpring(1.1, { damping: 10 });
		} else {
			searchIconScale.value = withSpring(1, { damping: 10 });
		}
	}, [isFocused, searchIconScale]);

	const handleFocus = () => {
		setIsFocused(true);
		setShowSearchSuggestions(true);
		onFocus?.();
	};

	const handleBlur = () => {
		setIsFocused(false);
		// Delay hiding suggestions to allow for suggestion press
		setTimeout(() => {
			setShowSearchSuggestions(false);
		}, 200);
		onBlur?.();
	};

	const handleSearchBarLayout = (event: any) => {
		const { x, y, width, height } = event.nativeEvent.layout;
		containerRef.current?.measure((fx, fy, fwidth, fheight, pageX, pageY) => {
			setSearchBarLayout({ x: pageX, y: pageY, width: fwidth || width, height: fheight || height });
		});
	};

	return (
		<>
		<View 
			ref={containerRef}
			style={styles.container}
			onLayout={handleSearchBarLayout}
		>
			<Pressable 
				style={[styles.searchBox, isFocused && styles.searchBoxFocused]}
				onPress={() => inputRef.current?.focus()}
			>
				<Animated.View style={iconAnimatedStyle}>
					<IconSymbol
						name="magnifyingglass"
						size={20}
						color={isFocused ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray400}
					/>
				</Animated.View>
				<TextInput
					ref={inputRef}
					style={styles.input}
					placeholder="Search gifts, vendors, categories..."
					placeholderTextColor={GIFTYY_THEME.colors.gray400}
					value={value}
					onChangeText={onChangeText}
					onFocus={handleFocus}
					onBlur={handleBlur}
					returnKeyType="search"
				/>
				{value.length > 0 && (
					<Pressable 
						onPress={() => {
							onChangeText('');
							inputRef.current?.focus();
						}} 
						style={styles.clearButton}
					>
						<IconSymbol name="xmark.circle.fill" size={20} color={GIFTYY_THEME.colors.gray400} />
					</Pressable>
				)}
			</Pressable>

		</View>
		
		{/* Suggestions Dropdown - Using Modal to ensure it appears above everything */}
		<Modal
			visible={showSuggestions || showSearchSuggestions}
			transparent={true}
			animationType="fade"
			onRequestClose={() => {
				setShowSearchSuggestions(false);
				onBlur?.();
			}}
		>
			<TouchableWithoutFeedback onPress={() => {
				setShowSearchSuggestions(false);
				onBlur?.();
			}}>
				<View style={styles.modalOverlay}>
					<TouchableWithoutFeedback>
						<Animated.View 
							entering={FadeInDown.duration(300)} 
							style={[
								styles.suggestionsContainer,
								{
									position: 'absolute',
									top: searchBarLayout.y + searchBarLayout.height + 8,
									left: searchBarLayout.x,
									width: searchBarLayout.width,
								}
							]}
						>
							<ScrollView
								style={styles.suggestionsScroll}
								contentContainerStyle={styles.suggestionsScrollContent}
								keyboardShouldPersistTaps="handled"
								nestedScrollEnabled
							>
								{value.trim().length === 0 && (
									<>
										<Text style={styles.suggestionSectionTitle}>Trending Searches</Text>
										{TRENDING_SEARCHES.map((search, index) => (
											<Pressable
												key={index}
												style={styles.suggestionItem}
												onPress={() => {
													onSuggestionPress?.(search);
													onChangeText(search);
													inputRef.current?.blur();
													setShowSearchSuggestions(false);
												}}
											>
												<IconSymbol name="flame.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.suggestionText}>{search}</Text>
											</Pressable>
										))}
									</>
								)}
								{/* Add recent searches here if needed */}
							</ScrollView>
						</Animated.View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		zIndex: 9999,
		elevation: 9999,
		overflow: 'visible',
	},
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: GIFTYY_THEME.radius.xl,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		borderWidth: 2,
		borderColor: 'transparent',
		gap: GIFTYY_THEME.spacing.sm,
	},
	searchBoxFocused: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderColor: GIFTYY_THEME.colors.primary,
		...GIFTYY_THEME.shadows.md,
	},
	input: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray900,
		padding: 0,
	},
	clearButton: {
		padding: GIFTYY_THEME.spacing.xs,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'transparent',
	},
	suggestionsContainer: {
		backgroundColor: '#FFFFFF',
		borderRadius: GIFTYY_THEME.radius.lg,
		maxHeight: 300,
		...GIFTYY_THEME.shadows.xl,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		overflow: 'hidden',
		opacity: 1,
	},
	suggestionsScroll: {
		maxHeight: 300,
	},
	suggestionsScrollContent: {
		paddingBottom: GIFTYY_THEME.spacing.sm,
	},
	suggestionSectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray500,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingTop: GIFTYY_THEME.spacing.md,
		paddingBottom: GIFTYY_THEME.spacing.sm,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	suggestionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.md,
		gap: GIFTYY_THEME.spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray100,
	},
	suggestionText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray900,
		flex: 1,
	},
});

