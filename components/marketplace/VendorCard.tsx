/**
 * Vendor Spotlight Card Component
 * Horizontal vendor showcase with logo and featured products
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type VendorCardProps = {
	id: string;
	name: string;
	profileImageUrl?: string;
	featuredProducts: Array<{
		id: string;
		name: string;
		image?: string;
		price: number;
	}>;
	onPress: () => void;
};

export function VendorCard({
	id,
	name,
	profileImageUrl,
	featuredProducts,
	onPress,
}: VendorCardProps) {
	const scale = useSharedValue(1);
	const [imageError, setImageError] = useState(false);
	const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(profileImageUrl);

	// Update image URL when prop changes
	React.useEffect(() => {
		setCurrentImageUrl(profileImageUrl);
		setImageError(false);
	}, [profileImageUrl]);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};

	const handleImageError = () => {
		setImageError(true);
	};
	
	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle, { width: CARD_WIDTH }]}
		>
			<LinearGradient
				colors={[GIFTYY_THEME.colors.cream, GIFTYY_THEME.colors.white]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.gradient}
			>
				{/* Vendor Header */}
				<View style={styles.header}>
					{currentImageUrl && !imageError ? (
						<Image
							key={`vendor-logo-${currentImageUrl}`}
							source={{ uri: currentImageUrl }}
							style={styles.vendorLogo}
							resizeMode="cover"
							onError={handleImageError}
							onLoad={() => {
								// Image loaded successfully
							}}
						/>
					) : (
						<View style={styles.vendorLogoPlaceholder}>
							<IconSymbol name="storefront.fill" size={28} color={GIFTYY_THEME.colors.primary} />
						</View>
					)}
					<View style={styles.vendorInfo}>
						<Text style={styles.vendorName}>{String(name || '')}</Text>
						<Text style={styles.vendorSubtext}>Shop now</Text>
					</View>
					<IconSymbol name="chevron.right" size={20} color={GIFTYY_THEME.colors.gray400} />
				</View>
				
				{/* Featured Products Grid */}
				<View style={styles.productsGrid}>
					{featuredProducts.slice(0, 3).map((product, index) => {
						const productImage = product.image ? (() => {
							try {
								const parsed = JSON.parse(product.image);
								return Array.isArray(parsed) ? parsed[0] : product.image;
							} catch {
								return product.image;
							}
						})() : undefined;
						
						return (
							<View key={product.id} style={styles.productPreview}>
								{productImage ? (
									<Image
										source={{ uri: productImage }}
										style={styles.productImage}
										resizeMode="cover"
									/>
								) : (
									<View style={styles.productPlaceholder}>
										<IconSymbol name="photo" size={20} color={GIFTYY_THEME.colors.gray300} />
									</View>
								)}
								<Text style={styles.productName} numberOfLines={1}>
									{String(product.name || '')}
								</Text>
								<Text style={styles.productPrice}>${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}</Text>
							</View>
						);
					})}
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
		...GIFTYY_THEME.shadows.md,
	},
	gradient: {
		padding: 16,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	vendorLogo: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
	},
	vendorLogoPlaceholder: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
		alignItems: 'center',
		justifyContent: 'center',
	},
	vendorInfo: {
		flex: 1,
		marginLeft: 12,
	},
	vendorName: {
		fontSize: 16,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	vendorSubtext: {
		fontSize: 12,
		color: GIFTYY_THEME.colors.gray500,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		marginTop: 2,
	},
	productsGrid: {
		flexDirection: 'row',
	},
	productPreview: {
		flex: 1,
		alignItems: 'center',
		marginHorizontal: 5,
	},
	productImage: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	productPlaceholder: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	productName: {
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		textAlign: 'center',
		marginTop: 6,
	},
	productPrice: {
		fontSize: 11,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.success,
	},
});
