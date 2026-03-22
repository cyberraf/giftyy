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
	
	// Brand palette: Giftyy Orange
	const gradientColors: [string, string] = [GIFTYY_THEME.colors.primary, '#ff7a3d'];
	const accentColor = '#FFFFFF'; 
	
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
				<View style={styles.topRow}>
					{/* Vendor Logo */}
					{vendor.profileImageUrl ? (
						<Image
							source={{ uri: vendor.profileImageUrl }}
							style={styles.vendorLogo}
							resizeMode="cover"
						/>
					) : (
						<View style={styles.vendorLogoPlaceholder}>
							<IconSymbol name="storefront" size={24} color={accentColor} />
						</View>
					)}
					
					{/* Discount Badge - Brand White Accent */}
					<View style={[styles.discountBadge, { borderColor: 'rgba(255,255,255,0.4)' }]}>
						<Text style={[styles.discountText, { color: accentColor }]}>
							{discount}% OFF
						</Text>
					</View>
				</View>
				
				{/* Vendor Info */}
				<View style={styles.vendorInfo}>
					<Text style={styles.vendorName} numberOfLines={1}>
						{vendor.storeName || 'Vendor'}
					</Text>
					<Text style={styles.promotionText}>
						Brand Deals & Specials
					</Text>
					<View style={styles.footer}>
						<Text style={styles.productCountText}>
							{productCount} {productCount === 1 ? 'PIECE' : 'PIECES'} ON SALE
						</Text>
						<View style={styles.arrowContainer}>
							<IconSymbol name="chevron.right" size={16} color="white" />
						</View>
					</View>
				</View>
			</LinearGradient>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		marginRight: 16,
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.05)',
	},
	gradient: {
		padding: 24,
		minHeight: 200,
		justifyContent: 'space-between',
	},
	topRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	vendorLogo: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.1)',
	},
	vendorLogoPlaceholder: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.1)',
	},
	discountBadge: {
		borderWidth: 1,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 40,
		backgroundColor: 'rgba(212, 175, 55, 0.05)',
	},
	discountText: {
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		letterSpacing: 1,
	},
	vendorInfo: {
		marginTop: 20,
	},
	vendorName: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: '#fff',
		marginBottom: 4,
		letterSpacing: 0.3,
	},
	promotionText: {
		fontSize: 13,
		color: 'rgba(255, 255, 255, 0.6)',
		marginBottom: 16,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	productCountText: {
		fontSize: 10,
		color: 'rgba(255, 255, 255, 0.4)',
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		letterSpacing: 1.2,
	},
	arrowContainer: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		alignItems: 'center',
		justifyContent: 'center',
	},
});

