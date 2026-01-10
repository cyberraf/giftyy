/**
 * Vendor Info Card Component
 * Displays vendor avatar, name, rating, and visit store button
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { supabase } from '@/lib/supabase';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';

type VendorInfoCardProps = {
	vendorId: string;
	vendorName?: string;
	profileImageUrl?: string;
	rating?: number;
	reviewCount?: number;
	salesCount?: number;
	onPress?: () => void;
	loading?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VendorInfoCard({
	vendorId,
	vendorName,
	profileImageUrl,
	rating,
	reviewCount,
	salesCount,
	onPress,
	loading = false,
}: VendorInfoCardProps) {
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
		scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};

	const handleImageError = async () => {
		// Try to find the correct image file if the URL fails
		if (currentImageUrl && !imageError && vendorId) {
			const urlMatch = currentImageUrl.match(/\/storage\/v1\/object\/public\/profile_images\/(.+)$/);
			if (urlMatch) {
				const storagePath = urlMatch[1];
				let alternativePath = '';
				let alternativeUrl = '';
				
				// Try alternative path format
				if (storagePath.startsWith('avatars/')) {
					// Try without avatars/ prefix (old format)
					alternativePath = storagePath.replace(/^avatars\//, '');
					const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(alternativePath);
					alternativeUrl = urlData.publicUrl;
				} else {
					// Try with avatars/ prefix (new format)
					const pathParts = storagePath.split('/');
					if (pathParts.length >= 2) {
						alternativePath = `avatars/${storagePath}`;
					} else {
						alternativePath = `avatars/${vendorId}/${storagePath}`;
					}
					const { data: urlData } = supabase.storage.from('profile_images').getPublicUrl(alternativePath);
					alternativeUrl = urlData.publicUrl;
				}
				
				// Try to find actual file in storage
				try {
					const userFolder = storagePath.startsWith('avatars/')
						? storagePath.replace(/^avatars\//, '').split('/')[0]
						: storagePath.split('/')[0] || vendorId;
					
					if (userFolder) {
						const { data: files, error: listError } = await supabase.storage
							.from('profile_images')
							.list(`avatars/${userFolder}`, {
								limit: 10,
								sortBy: { column: 'created_at', order: 'desc' }
							});
						
						if (!listError && files && files.length > 0) {
							const imageFiles = files.filter(file => 
								file.name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)
							);
							
							if (imageFiles.length > 0) {
								const actualFile = imageFiles[0];
								const { data: urlData } = supabase.storage
									.from('profile_images')
									.getPublicUrl(`avatars/${userFolder}/${actualFile.name}`);
								alternativeUrl = urlData.publicUrl;
							}
						}
					}
					
					// Update URL if we found an alternative
					if (alternativeUrl && alternativeUrl !== currentImageUrl) {
						setTimeout(() => {
							setCurrentImageUrl(alternativeUrl);
							setImageError(false);
						}, 100);
						return;
					}
				} catch (err) {
					// Silently handle errors
				}
			}
		}
		
		// If all attempts fail, show placeholder
		setImageError(true);
	};

	if (loading) {
		return (
			<Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
				<View style={styles.content}>
					<View style={styles.imagePlaceholder} />
					<View style={styles.details}>
						<View style={[styles.namePlaceholder, { width: 120, height: 16, borderRadius: 4 }]} />
						<View style={[styles.namePlaceholder, { width: 80, height: 12, borderRadius: 4, marginTop: 8 }]} />
					</View>
				</View>
			</Animated.View>
		);
	}

	return (
		<AnimatedPressable
			entering={FadeInDown.duration(400)}
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.container, animatedStyle]}
			disabled={!onPress}
		>
			<View style={styles.content}>
				{/* Vendor Avatar */}
				<View style={styles.imageContainer}>
					{currentImageUrl && !imageError ? (
						<Image
							key={`vendor-avatar-${currentImageUrl}`}
							source={{ uri: currentImageUrl }}
							style={styles.image}
							resizeMode="cover"
							onError={handleImageError}
							onLoad={() => {
								// Image loaded successfully
							}}
						/>
					) : (
						<View style={styles.imagePlaceholder}>
							<IconSymbol name="storefront.fill" size={28} color={GIFTYY_THEME.colors.primary} />
						</View>
					)}
					{/* Verified Badge */}
					<View style={styles.verifiedBadge}>
						<IconSymbol name="checkmark.circle.fill" size={16} color={GIFTYY_THEME.colors.success} />
					</View>
				</View>

				{/* Vendor Details */}
				<View style={styles.details}>
					<Text style={styles.vendorName}>{vendorName || 'Vendor Store'}</Text>
					{(rating !== undefined || reviewCount !== undefined || salesCount !== undefined) && (
						<View style={styles.ratingRow}>
							{rating !== undefined && (
								<View style={styles.starsContainer}>
									{[1, 2, 3, 4, 5].map((star) => (
										<IconSymbol
											key={star}
											name={star <= Math.round(rating) ? 'star.fill' : 'star'}
											size={12}
											color="#fbbf24"
										/>
									))}
								</View>
							)}
							{rating !== undefined && reviewCount !== undefined && reviewCount > 0 && (
								<Text style={styles.ratingText}>
									{rating.toFixed(1)} ({reviewCount})
								</Text>
							)}
							{salesCount !== undefined && salesCount > 0 && (
								<Text style={styles.salesText}>• {salesCount} sales</Text>
							)}
						</View>
					)}
				</View>

				{/* Visit Store Button */}
				{onPress && (
					<View style={styles.buttonContainer}>
						<View style={styles.button}>
							<Text style={styles.buttonText}>Visit Store</Text>
							<IconSymbol name="chevron.right" size={14} color={GIFTYY_THEME.colors.white} />
						</View>
					</View>
				)}
			</View>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '15',
		padding: GIFTYY_THEME.spacing.lg,
		marginHorizontal: GIFTYY_THEME.spacing.lg,
		marginVertical: GIFTYY_THEME.spacing.md,
		...GIFTYY_THEME.shadows.md,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	imageContainer: {
		position: 'relative',
		marginRight: GIFTYY_THEME.spacing.md,
	},
	image: {
		width: 64,
		height: 64,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
	},
	imagePlaceholder: {
		width: 64,
		height: 64,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: GIFTYY_THEME.colors.cream,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
	},
	verifiedBadge: {
		position: 'absolute',
		bottom: -4,
		right: -4,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: 10,
		padding: 2,
		...GIFTYY_THEME.shadows.sm,
	},
	details: {
		flex: 1,
	},
	vendorName: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 6,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
	},
	starsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 6,
	},
	ratingText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		marginRight: 6,
	},
	salesText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
	},
	buttonContainer: {
		marginLeft: GIFTYY_THEME.spacing.md,
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: GIFTYY_THEME.radius.full,
		gap: 6,
	},
	buttonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
	namePlaceholder: {
		backgroundColor: GIFTYY_THEME.colors.gray200,
	},
});

