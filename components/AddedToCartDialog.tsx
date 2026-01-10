import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
	visible: boolean;
	onClose: () => void;
	onViewCart: () => void;
	title?: string;
	imageUri?: string;
	autoDismissMs?: number;
};

export default function AddedToCartDialog({
	visible,
	onClose,
	onViewCart,
	title = 'Added to cart',
	imageUri,
	autoDismissMs = 2500,
}: Props) {
	const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
	const fadeAnim = React.useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					useNativeDriver: true,
					damping: 12,
					stiffness: 300,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();

			const t = setTimeout(onClose, autoDismissMs);
			return () => clearTimeout(t);
		} else {
			Animated.parallel([
				Animated.timing(scaleAnim, {
					toValue: 0.8,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible, autoDismissMs, onClose, scaleAnim, fadeAnim]);

	return (
		<Modal 
			transparent 
			visible={visible} 
			animationType="none" 
			onRequestClose={onClose}
			presentationStyle="overFullScreen"
		>
			<Pressable style={styles.overlay} onPress={onClose} activeOpacity={1}>
				<Animated.View
					style={[
						styles.container,
						{
							opacity: fadeAnim,
							transform: [{ scale: scaleAnim }],
						},
				 ]}
				>
					<Pressable onPress={(e) => e.stopPropagation()} style={styles.card}>
						{/* Success Icon with Animation */}
						<View style={styles.iconContainer}>
							<View style={styles.iconCircle}>
								<IconSymbol name="checkmark.circle.fill" size={32} color={GIFTYY_THEME.colors.success} />
							</View>
						</View>

						{/* Product Image */}
						{imageUri && (
							<View style={styles.imageContainer}>
								<Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
							</View>
						)}

						{/* Title */}
						<Text style={styles.title}>{title}!</Text>

						{/* Subtitle */}
						<Text style={styles.subtitle}>Item added successfully to your cart</Text>

						{/* Action Buttons */}
						<View style={styles.buttonsContainer}>
							<Pressable onPress={onClose} style={styles.continueButton}>
								<Text style={styles.continueButtonText}>Continue Shopping</Text>
							</Pressable>
							<Pressable onPress={onViewCart} style={styles.viewCartButton}>
								<Text style={styles.viewCartButtonText}>View Cart</Text>
							</Pressable>
						</View>
					</Pressable>
				</Animated.View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
		elevation: 1000,
	},
	container: {
		width: '100%',
		maxWidth: 400,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		zIndex: 1001,
		elevation: 1001,
	},
	card: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		paddingTop: GIFTYY_THEME.spacing['2xl'],
		paddingBottom: GIFTYY_THEME.spacing.xl,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		alignItems: 'center',
		...GIFTYY_THEME.shadows.xl,
		zIndex: 1002,
		elevation: 1002,
	},
	iconContainer: {
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	iconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: GIFTYY_THEME.colors.cream,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 3,
		borderColor: GIFTYY_THEME.colors.success + '20',
	},
	imageContainer: {
		marginBottom: GIFTYY_THEME.spacing.md,
		width: 80,
		height: 80,
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
	},
	productImage: {
		width: '100%',
		height: '100%',
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.xs,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	buttonsContainer: {
		width: '100%',
		gap: GIFTYY_THEME.spacing.md,
	},
	continueButton: {
		width: '100%',
		paddingVertical: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		borderRadius: GIFTYY_THEME.radius.full,
		borderWidth: 1.5,
		borderColor: GIFTYY_THEME.colors.gray300,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
	},
	continueButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	viewCartButton: {
		width: '100%',
		paddingVertical: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	viewCartButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
	},
});


