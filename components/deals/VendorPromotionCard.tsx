/**
 * Vendor Promotion Card Component
 * Vendor-branded tile with logo, discount, and gradient background
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { VendorInfo } from '@/lib/vendor-utils';
import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

type Props = {
	vendor: VendorInfo;
	discount: number;
	productCount: number;
	onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VendorPromotionCard({ vendor, discount, productCount, onPress }: Props) {
	const scale = useSharedValue(1);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};
	
	// Generate gradient colors based on discount
	const gradientColors = discount > 30
		? [GIFTYY_THEME.colors.primary, '#ff7a3d']
		: [GIFTYY_THEME.colors.primaryLight, GIFTYY_THEME.colors.peach];
	
	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle, { width: CARD_WIDTH }]}
		>
			<LinearGradient
				colors={gradientColors}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.gradient}
			>
				{/* Vendor Logo */}
				{vendor.profileImageUrl ? (
					<Image
						source={{ uri: vendor.profileImageUrl }}
						style={styles.vendorLogo}
						resizeMode="cover"
					/>
				) : (
					<View style={styles.vendorLogoPlaceholder}>
						<IconSymbol name="storefront.fill" size={32} color="#fff" />
					</View>
				)}
				
				{/* Vendor Info */}
				<View style={styles.vendorInfo}>
					<Text style={styles.vendorName} numberOfLines={1}>
						{vendor.storeName || 'Vendor'}
					</Text>
					<Text style={styles.promotionText}>
						Save on Handmade Gifts
					</Text>
					<View style={styles.discountContainer}>
						<Text style={styles.discountText}>
							{discount}% Off
						</Text>
					</View>
					<Text style={styles.productCountText}>
						{productCount} {productCount === 1 ? 'product' : 'products'} on sale
					</Text>
				</View>
				
				{/* Arrow Icon */}
				<View style={styles.arrowContainer}>
					<IconSymbol name="arrow.right" size={20} color="rgba(255, 255, 255, 0.8)" />
				</View>
			</LinearGradient>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		marginRight: 16,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
	},
	gradient: {
		padding: 20,
		minHeight: 180,
		justifyContent: 'space-between',
	},
	vendorLogo: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		marginBottom: 16,
		borderWidth: 2,
		borderColor: 'rgba(255, 255, 255, 0.3)',
	},
	vendorLogoPlaceholder: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		marginBottom: 16,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: 'rgba(255, 255, 255, 0.3)',
	},
	vendorInfo: {
		flex: 1,
	},
	vendorName: {
		fontSize: 18,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: '#fff',
		marginBottom: 6,
	},
	promotionText: {
		fontSize: 13,
		color: 'rgba(255, 255, 255, 0.9)',
		marginBottom: 12,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	discountContainer: {
		alignSelf: 'flex-start',
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: GIFTYY_THEME.radius.full,
		marginBottom: 8,
	},
	discountText: {
		fontSize: 16,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: '#fff',
	},
	productCountText: {
		fontSize: 11,
		color: 'rgba(255, 255, 255, 0.8)',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	arrowContainer: {
		position: 'absolute',
		bottom: 20,
		right: 20,
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
});

