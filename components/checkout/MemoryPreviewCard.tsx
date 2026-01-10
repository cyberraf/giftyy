/**
 * Memory Preview Card Component
 * Shows a preview of the selected memory (photo or text)
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import {
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
	type: 'photo' | 'text';
	photoUri?: string;
	photoCaption?: string;
	text?: string;
	onEdit: () => void;
	onDelete: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MemoryPreviewCard({
	type,
	photoUri,
	photoCaption,
	text,
	onEdit,
	onDelete,
}: Props) {
	const scale = useSharedValue(1);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const handlePressIn = () => {
		scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
	};
	
	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	};
	
	return (
		<AnimatedPressable
			style={[styles.container, animatedStyle]}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			entering={FadeInDown.duration(400)}
		>
			<LinearGradient
				colors={[GIFTYY_THEME.colors.cream, GIFTYY_THEME.colors.white]}
				style={styles.gradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			>
				{type === 'photo' && photoUri ? (
					<>
						<View style={styles.photoContainer}>
							<Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
							<View style={styles.photoOverlay}>
								<View style={styles.badge}>
									<IconSymbol name="photo.fill" size={16} color={GIFTYY_THEME.colors.primary} />
									<Text style={styles.badgeText}>Photo Memory</Text>
								</View>
							</View>
						</View>
						{photoCaption && (
							<Text style={styles.caption} numberOfLines={2}>
								{photoCaption}
							</Text>
						)}
					</>
				) : (
					<>
						<View style={styles.textContainer}>
							<View style={styles.textIconContainer}>
								<IconSymbol name="sparkles" size={32} color={GIFTYY_THEME.colors.primary} />
							</View>
							<Text style={styles.textPreview} numberOfLines={3}>
								{text}
							</Text>
						</View>
						<View style={styles.badge}>
							<IconSymbol name="sparkles" size={14} color={GIFTYY_THEME.colors.primary} />
							<Text style={styles.badgeText}>Written Memory</Text>
						</View>
					</>
				)}
				
				{/* Actions */}
				<View style={styles.actions}>
					<Pressable style={styles.actionButton} onPress={onEdit}>
						<IconSymbol name="square.and.pencil" size={18} color={GIFTYY_THEME.colors.primary} />
						<Text style={styles.actionButtonText}>Edit</Text>
					</Pressable>
					<Pressable style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
						<IconSymbol name="trash" size={18} color={GIFTYY_THEME.colors.error} />
						<Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
					</Pressable>
				</View>
				
				{/* Confirmation Text */}
				<View style={styles.confirmationContainer}>
					<IconSymbol name="checkmark.circle.fill" size={16} color={GIFTYY_THEME.colors.success} />
					<Text style={styles.confirmationText}>
						This memory will appear on their Celebration Wall.
					</Text>
				</View>
			</LinearGradient>
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: GIFTYY_THEME.spacing.xl,
		borderRadius: GIFTYY_THEME.radius['2xl'],
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
	},
	gradient: {
		padding: GIFTYY_THEME.spacing.lg,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '20',
		borderRadius: GIFTYY_THEME.radius['2xl'],
	},
	photoContainer: {
		width: '100%',
		aspectRatio: 16 / 9,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		marginBottom: GIFTYY_THEME.spacing.md,
		position: 'relative',
	},
	photo: {
		width: '100%',
		height: '100%',
	},
	photoOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.1)',
		justifyContent: 'flex-start',
		alignItems: 'flex-end',
		padding: GIFTYY_THEME.spacing.md,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: GIFTYY_THEME.colors.white,
		paddingHorizontal: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.sm,
		borderRadius: GIFTYY_THEME.radius.full,
		...GIFTYY_THEME.shadows.sm,
	},
	badgeText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	caption: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: GIFTYY_THEME.typography.sizes.base * 1.4,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	textContainer: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.md,
		minHeight: 120,
		justifyContent: 'center',
	},
	textIconContainer: {
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	textPreview: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: GIFTYY_THEME.typography.sizes.base * 1.5,
		textAlign: 'center',
	},
	actions: {
		flexDirection: 'row',
		gap: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	actionButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.lg,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
	},
	deleteButton: {
		borderColor: GIFTYY_THEME.colors.error + '30',
	},
	actionButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
	},
	deleteButtonText: {
		color: GIFTYY_THEME.colors.error,
	},
	confirmationContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
		paddingTop: GIFTYY_THEME.spacing.md,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	confirmationText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
		flex: 1,
	},
});

