/**
 * Global Bottom Navigation Bar
 * Renders the bottom bar for stack screens outside the tabs navigator
 * Uses the same design and functionality as CustomTabBar
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useCart } from '@/contexts/CartContext';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	View
} from 'react-native';
import Animated, {
	Easing,
	Extrapolate,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TabIcon = {
	name: string;
	inactive: string;
	active: string;
	label: string;
	route: string;
};

const TAB_ICONS: TabIcon[] = [
	{
		name: 'home',
		inactive: 'house',
		active: 'house.fill',
		label: 'Home',
		route: '/(buyer)/(tabs)/home',
	},
	{
		name: 'cart',
		inactive: 'cart',
		active: 'cart.fill',
		label: 'Cart',
		route: '/(buyer)/(tabs)/cart',
	},
	{
		name: 'memory',
		inactive: 'play.rectangle.on.rectangle',
		active: 'play.rectangle.on.rectangle.fill',
		label: 'Memories',
		route: '/(buyer)/(tabs)/memory',
	},
	{
		name: 'profile',
		inactive: 'person.fill',
		active: 'person.fill',
		label: 'Profile',
		route: '/(buyer)/(tabs)/profile',
	},
];

interface NavItemProps {
	iconConfig: TabIcon;
	isFocused: boolean;
	onPress: () => void;
	totalQuantity?: number;
}

function NavItem({ iconConfig, isFocused, onPress, totalQuantity = 0 }: NavItemProps) {
	// Animation values
	const scale = useSharedValue(isFocused ? 1.1 : 1);
	const opacity = useSharedValue(isFocused ? 1 : 0.6);
	const sparkleOpacity = useSharedValue(0);
	const sparkleRotation = useSharedValue(0);
	const labelOpacity = useSharedValue(isFocused ? 1 : 0.7);
	const labelScale = useSharedValue(isFocused ? 1 : 0.95);
	const pressScale = useSharedValue(1);

	// Update animations when focus changes
	useEffect(() => {
		if (isFocused) {
			scale.value = withSpring(1.12, {
				damping: 12,
				stiffness: 200,
			});
			opacity.value = withTiming(1, { duration: 200 });
			labelOpacity.value = withTiming(1, { duration: 200 });
			labelScale.value = withSpring(1, {
				damping: 12,
				stiffness: 200,
			});
			
			// Sparkle burst for Memories tab
			if (iconConfig.name === 'memory') {
				sparkleOpacity.value = withSequence(
					withTiming(1, { duration: 200 }),
					withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) })
				);
				sparkleRotation.value = withRepeat(
					withTiming(360, { duration: 1000, easing: Easing.linear }),
					-1
				);
			}
		} else {
			scale.value = withSpring(1, {
				damping: 12,
				stiffness: 200,
			});
			opacity.value = withTiming(0.6, { duration: 200 });
			labelOpacity.value = withTiming(0.7, { duration: 200 });
			labelScale.value = withSpring(0.95, {
				damping: 12,
				stiffness: 200,
			});
			if (iconConfig.name === 'memory') {
				sparkleOpacity.value = withTiming(0, { duration: 200 });
			}
		}
	}, [isFocused, iconConfig.name]);

	const handlePressIn = () => {
		pressScale.value = withSpring(0.92, {
			damping: 15,
			stiffness: 400,
		});
	};

	const handlePressOut = () => {
		pressScale.value = withSpring(1, {
			damping: 15,
			stiffness: 400,
		});
	};

	// Animated styles
	const iconAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value * pressScale.value }],
		opacity: opacity.value,
	}));

	const sparkleAnimatedStyle = useAnimatedStyle(() => ({
		opacity: sparkleOpacity.value,
		transform: [
			{ rotate: `${sparkleRotation.value}deg` },
			{ scale: interpolate(sparkleOpacity.value, [0, 1], [0.8, 1.2], Extrapolate.CLAMP) },
		],
	}));

	const labelAnimatedStyle = useAnimatedStyle(() => ({
		opacity: labelOpacity.value,
		transform: [{ scale: labelScale.value }],
	}));

	const containerAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pressScale.value }],
	}));

	const badgeAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: isFocused ? 1.1 : 1 }],
	}));

	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.navItem, containerAnimatedStyle]}
			accessibilityRole="button"
			accessibilityState={isFocused ? { selected: true } : {}}
		>
			<View style={styles.iconContainer}>
				{/* Sparkle effect for Memories */}
				{iconConfig.name === 'memory' && (
					<Animated.View style={[styles.sparkle, sparkleAnimatedStyle]}>
						<IconSymbol
							name="sparkles"
							size={32}
							color={GIFTYY_THEME.colors.primary + '60'}
						/>
					</Animated.View>
				)}

				{/* Icon */}
				<Animated.View style={iconAnimatedStyle}>
					<IconSymbol
						name={isFocused ? iconConfig.active : iconConfig.inactive}
						size={26}
						color={isFocused ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray500}
					/>
				</Animated.View>

				{/* Cart badge */}
				{iconConfig.name === 'cart' && totalQuantity > 0 && (
					<Animated.View
						style={[styles.badge, badgeAnimatedStyle]}
					>
						<LinearGradient
							colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
							style={styles.badgeGradient}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
						>
							<Text style={styles.badgeText}>
								{Math.min(99, totalQuantity)}
							</Text>
						</LinearGradient>
					</Animated.View>
				)}
			</View>

			{/* Label */}
			<Animated.Text 
				style={[
					styles.label, 
					{ color: isFocused ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray700 },
					labelAnimatedStyle
				]}
			>
				{iconConfig.label}
			</Animated.Text>
		</AnimatedPressable>
	);
}

export default function GlobalBottomBar() {
	const { totalQuantity } = useCart();
	const { visible } = useBottomBarVisibility();
	const { bottom } = useSafeAreaInsets();
	const router = useRouter();
	const pathname = usePathname();
	const bottomInset = Math.max(bottom, 0);
	const barHeight = 76 + bottomInset;

	// Floating animation for the bar
	const floatOffset = useSharedValue(0);
	
	useEffect(() => {
		floatOffset.value = withRepeat(
			withSequence(
				withTiming(-2, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
				withTiming(2, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
				withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
			),
			-1,
			false
		);
	}, []);

	const floatStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: floatOffset.value * 0.5 }],
	}));

	// Determine which tab is active based on pathname
	const getActiveTab = () => {
		if (pathname?.includes('/home')) return 'home';
		if (pathname?.includes('/cart')) return 'cart';
		if (pathname?.includes('/memory')) return 'memory';
		if (pathname?.includes('/profile')) return 'profile';
		return null;
	};

	const activeTab = getActiveTab();

	// Hide if not visible or if we're on a tab route (CustomTabBar handles those)
	if (!visible || pathname?.includes('/(tabs)/')) {
		return null;
	}

	return (
		<Animated.View style={[styles.container, floatStyle, { height: barHeight, paddingBottom: bottomInset }]}>
			{/* Glass effect with gradient overlay */}
			<LinearGradient
				colors={[
					GIFTYY_THEME.colors.white + 'F8',
					GIFTYY_THEME.colors.white + 'F5',
					GIFTYY_THEME.colors.cream + 'F0',
				]}
				style={StyleSheet.absoluteFill}
				start={{ x: 0, y: 0 }}
				end={{ x: 0, y: 1 }}
			/>

			{/* Top border accent */}
			<View style={styles.topBorder} />

			{/* Navigation items */}
			<View style={styles.navItemsContainer}>
				{TAB_ICONS.map((iconConfig) => {
					const isFocused = activeTab === iconConfig.name;

					const onPress = () => {
						router.push(iconConfig.route as any);
					};

					return (
						<NavItem
							key={iconConfig.name}
							iconConfig={iconConfig}
							isFocused={isFocused}
							onPress={onPress}
							totalQuantity={iconConfig.name === 'cart' ? totalQuantity : 0}
						/>
					);
				})}
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		...GIFTYY_THEME.shadows.xl,
		shadowColor: GIFTYY_THEME.colors.primary,
		shadowOpacity: 0.08,
		shadowOffset: { width: 0, height: -8 },
		shadowRadius: 20,
		elevation: 20,
		zIndex: 999,
		overflow: 'hidden',
	},
	topBorder: {
		position: 'absolute',
		top: 0,
		left: '25%',
		right: '25%',
		height: 3,
		backgroundColor: GIFTYY_THEME.colors.primary,
		opacity: 0.3,
		borderRadius: GIFTYY_THEME.radius.full,
	},
	navItemsContainer: {
		flexDirection: 'row',
		flex: 1,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingTop: GIFTYY_THEME.spacing.md,
		justifyContent: 'space-around',
		alignItems: 'flex-start',
	},
	navItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: GIFTYY_THEME.spacing.xs,
		minHeight: 64,
	},
	iconContainer: {
		width: 48,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: GIFTYY_THEME.spacing.xs,
		position: 'relative',
	},
	sparkle: {
		position: 'absolute',
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badge: {
		position: 'absolute',
		top: -4,
		right: -8,
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.white,
		...GIFTYY_THEME.shadows.md,
	},
	badgeGradient: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
	},
	badgeText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.black,
		lineHeight: 12,
	},
	label: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		letterSpacing: 0.2,
		marginTop: 2,
	},
});

