/**
 * Photo Memory Modal Component
 * Fullscreen modal for uploading and captioning a photo memory
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	Image,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withRepeat,
	withSequence,
	Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
	visible: boolean;
	onClose: () => void;
	onSave: (photoUri: string, caption: string) => void;
	initialPhotoUri?: string;
	initialCaption?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PhotoMemoryModal({
	visible,
	onClose,
	onSave,
	initialPhotoUri,
	initialCaption = '',
}: Props) {
	const { top, bottom } = useSafeAreaInsets();
	const [photoUri, setPhotoUri] = useState<string | null>(initialPhotoUri || null);
	const [caption, setCaption] = useState(initialCaption);
	const [uploading, setUploading] = useState(false);
	const [captionFocused, setCaptionFocused] = useState(false);
	
	const scale = useSharedValue(0.95);
	const opacity = useSharedValue(0);
	const captionGlow = useSharedValue(0);
	
	useEffect(() => {
		if (visible) {
			scale.value = withSpring(1, { damping: 20, stiffness: 300 });
			opacity.value = withSpring(1, { duration: 300 });
		} else {
			scale.value = 0.95;
			opacity.value = 0;
		}
	}, [visible]);

	useEffect(() => {
		captionGlow.value = withSpring(captionFocused ? 1 : 0, { damping: 15 });
	}, [captionFocused]);
	
	const modalStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));
	
	const backdropStyle = useAnimatedStyle(() => ({
		opacity: opacity.value * 0.5,
	}));

	const captionInputStyle = useAnimatedStyle(() => {
		const opacity = 0.3 + captionGlow.value * 0.5;
		const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
		return {
			borderColor: GIFTYY_THEME.colors.primary + opacityHex,
			shadowColor: GIFTYY_THEME.colors.primary,
			shadowOpacity: captionGlow.value * 0.2,
			shadowRadius: captionGlow.value * 8,
			shadowOffset: { width: 0, height: captionGlow.value * 4 },
			elevation: captionGlow.value * 8,
		};
	});
	
	const handlePickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			alert('Sorry, we need camera roll permissions to upload photos!');
			return;
		}
		
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.8,
		});
		
		if (!result.canceled && result.assets[0]) {
			setPhotoUri(result.assets[0].uri);
		}
	};
	
	const handleTakePhoto = async () => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== 'granted') {
			alert('Sorry, we need camera permissions to take photos!');
			return;
		}
		
		const result = await ImagePicker.launchCameraAsync({
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.8,
		});
		
		if (!result.canceled && result.assets[0]) {
			setPhotoUri(result.assets[0].uri);
		}
	};
	
	const handleSave = () => {
		if (photoUri) {
			onSave(photoUri, caption.trim());
			onClose();
		}
	};
	
	const handleDelete = () => {
		setPhotoUri(null);
		setCaption('');
	};
	
	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Animated.View style={[styles.backdrop, backdropStyle]} />
				<Animated.View
					style={[
						styles.modal,
						{ paddingTop: top + 20, paddingBottom: bottom + 20 },
						modalStyle,
					]}
					onStartShouldSetResponder={() => true}
				>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.headerTitle}>Upload a Photo Memory</Text>
						<Pressable onPress={onClose} style={styles.closeButton}>
							<IconSymbol name="xmark.circle.fill" size={28} color={GIFTYY_THEME.colors.gray500} />
						</Pressable>
					</View>
					
					{/* Photo Preview */}
					<View style={styles.previewContainer}>
						{photoUri ? (
							<>
								<Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
								<Pressable style={styles.replaceButton} onPress={handlePickImage}>
									<IconSymbol name="photo.fill" size={18} color="#fff" />
									<Text style={styles.replaceButtonText}>Replace</Text>
								</Pressable>
								{initialPhotoUri && (
									<Pressable style={styles.deleteButton} onPress={handleDelete}>
										<IconSymbol name="trash" size={18} color={GIFTYY_THEME.colors.error} />
									</Pressable>
								)}
							</>
						) : (
							<View style={styles.emptyPreview}>
								<IconSymbol name="photo" size={64} color={GIFTYY_THEME.colors.gray300} />
								<Text style={styles.emptyPreviewText}>No photo selected</Text>
							</View>
						)}
					</View>
					
					{/* Action Buttons */}
					{!photoUri && (
						<View style={styles.actions}>
							<Pressable style={styles.actionButton} onPress={handlePickImage}>
								<IconSymbol name="photo.fill" size={20} color={GIFTYY_THEME.colors.primary} />
								<Text style={styles.actionButtonText}>Choose from Library</Text>
							</Pressable>
							<Pressable style={[styles.actionButton, styles.actionButtonSecondary]} onPress={handleTakePhoto}>
								<IconSymbol name="camera.fill" size={20} color={GIFTYY_THEME.colors.gray700} />
								<Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Take Photo</Text>
							</Pressable>
						</View>
					)}
					
					{/* Caption Input */}
					{photoUri && (
						<View style={styles.captionContainer}>
							<Text style={styles.captionLabel}>Add a caption (optional)</Text>
							<Animated.View style={[styles.captionInputWrapper, captionInputStyle]}>
								<TextInput
									style={styles.captionInput}
									placeholder="Write a short caption…"
									placeholderTextColor={GIFTYY_THEME.colors.gray400}
									value={caption}
									onChangeText={setCaption}
									onFocus={() => setCaptionFocused(true)}
									onBlur={() => setCaptionFocused(false)}
									multiline
									maxLength={300}
									textAlignVertical="top"
								/>
							</Animated.View>
							<Text style={styles.characterCount}>{caption.length}/300</Text>
						</View>
					)}
					
					{/* Save Button */}
					{photoUri && (
						<AnimatedPressable
							style={styles.saveButton}
							onPress={handleSave}
							entering={FadeInDown.duration(300)}
						>
							<LinearGradient
								colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
								style={styles.saveButtonGradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
							>
								{uploading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<>
										<IconSymbol name="checkmark" size={20} color="#fff" />
										<Text style={styles.saveButtonText}>Save & Continue</Text>
									</>
								)}
							</LinearGradient>
						</AnimatedPressable>
					)}
				</Animated.View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		position: 'relative',
	},
	backdrop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#000',
	},
	modal: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopLeftRadius: GIFTYY_THEME.radius['2xl'],
		borderTopRightRadius: GIFTYY_THEME.radius['2xl'],
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		flex: 1,
		marginTop: 'auto',
		...GIFTYY_THEME.shadows.xl,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	headerTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	closeButton: {
		padding: 4,
	},
	previewContainer: {
		width: '100%',
		aspectRatio: 4 / 3,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		marginBottom: GIFTYY_THEME.spacing.lg,
		position: 'relative',
	},
	previewImage: {
		width: '100%',
		height: '100%',
	},
	emptyPreview: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyPreviewText: {
		marginTop: 12,
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray500,
	},
	replaceButton: {
		position: 'absolute',
		bottom: 16,
		right: 16,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: GIFTYY_THEME.radius.full,
	},
	replaceButtonText: {
		color: '#fff',
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		marginLeft: 6,
	},
	deleteButton: {
		position: 'absolute',
		top: 16,
		right: 16,
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	actions: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	actionButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.cream,
		paddingVertical: 16,
		borderRadius: GIFTYY_THEME.radius.xl,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	actionButtonSecondary: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderColor: GIFTYY_THEME.colors.gray300,
	},
	actionButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
		marginLeft: 8,
	},
	actionButtonTextSecondary: {
		color: GIFTYY_THEME.colors.gray700,
	},
	captionContainer: {
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	captionLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		marginBottom: 8,
	},
	captionInputWrapper: {
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	captionInput: {
		backgroundColor: 'transparent',
		padding: 16,
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray900,
		minHeight: 100,
	},
	characterCount: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray400,
		textAlign: 'right',
		marginTop: 4,
	},
	saveButton: {
		borderRadius: GIFTYY_THEME.radius.full,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
	},
	saveButtonGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 18,
		gap: 8,
	},
	saveButtonText: {
		color: '#fff',
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
});


