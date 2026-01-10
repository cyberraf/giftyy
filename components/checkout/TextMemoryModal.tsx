/**
 * Text Memory Modal Component
 * Modal for writing a special note/memory
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect, useState } from 'react';
import {
	Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
	visible: boolean;
	onClose: () => void;
	onSave: (text: string) => void;
	initialText?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TextMemoryModal({
	visible,
	onClose,
	onSave,
	initialText = '',
}: Props) {
	const { top, bottom } = useSafeAreaInsets();
	const [text, setText] = useState(initialText);
	
	const scale = useSharedValue(0.95);
	const opacity = useSharedValue(0);
	const sparkle1 = useSharedValue(0);
	const sparkle2 = useSharedValue(0);
	const sparkle3 = useSharedValue(0);
	
	useEffect(() => {
		if (visible) {
			scale.value = withSpring(1, { damping: 20, stiffness: 300 });
			opacity.value = withSpring(1, { duration: 300 });
			// Animate sparkles
			sparkle1.value = withRepeat(
				withSequence(
					withSpring(1, { damping: 10 }),
					withSpring(0.3, { damping: 10 })
				),
				-1,
				false
			);
			sparkle2.value = withRepeat(
				withSequence(
					withSpring(0.5, { damping: 10 }),
					withSpring(1, { damping: 10 }),
					withSpring(0.3, { damping: 10 })
				),
				-1,
				false
			);
			sparkle3.value = withRepeat(
				withSequence(
					withSpring(0.3, { damping: 10 }),
					withSpring(1, { damping: 10 }),
					withSpring(0.5, { damping: 10 })
				),
				-1,
				false
			);
		} else {
			scale.value = 0.95;
			opacity.value = 0;
			sparkle1.value = 0;
			sparkle2.value = 0;
			sparkle3.value = 0;
		}
	}, [visible]);
	
	const modalStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));
	
	const backdropStyle = useAnimatedStyle(() => ({
		opacity: opacity.value * 0.5,
	}));
	
	const sparkle1Style = useAnimatedStyle(() => ({
		opacity: sparkle1.value * 0.6,
		transform: [{ scale: sparkle1.value }],
	}));
	
	const sparkle2Style = useAnimatedStyle(() => ({
		opacity: sparkle2.value * 0.6,
		transform: [{ scale: sparkle2.value }],
	}));
	
	const sparkle3Style = useAnimatedStyle(() => ({
		opacity: sparkle3.value * 0.6,
		transform: [{ scale: sparkle3.value }],
	}));
	
	const handleSave = () => {
		if (text.trim()) {
			onSave(text.trim());
			onClose();
		}
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
					{/* Sparkles decoration */}
					<Animated.View style={[styles.sparkle, { top: 40, left: 40 }, sparkle1Style]}>
						<IconSymbol name="sparkles" size={24} color={GIFTYY_THEME.colors.primary} />
					</Animated.View>
					<Animated.View style={[styles.sparkle, { top: 60, right: 60 }, sparkle2Style]}>
						<IconSymbol name="sparkles" size={20} color={GIFTYY_THEME.colors.peach} />
					</Animated.View>
					<Animated.View style={[styles.sparkle, { top: 100, left: SCREEN_WIDTH / 2 }, sparkle3Style]}>
						<IconSymbol name="sparkles" size={18} color={GIFTYY_THEME.colors.primaryLight} />
					</Animated.View>
					
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.headerTitle}>Write a Special Note</Text>
						<Pressable onPress={onClose} style={styles.closeButton}>
							<IconSymbol name="xmark.circle.fill" size={28} color={GIFTYY_THEME.colors.gray500} />
						</Pressable>
					</View>
					
					{/* Text Input Container */}
					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Describe a moment you both cherish...</Text>
						<View style={styles.inputWrapper}>
							<TextInput
								style={styles.textInput}
								placeholder="Write your special memory here..."
								placeholderTextColor={GIFTYY_THEME.colors.gray400}
								value={text}
								onChangeText={setText}
								multiline
								maxLength={300}
								textAlignVertical="top"
								autoFocus
							/>
							<Text style={styles.characterCount}>{text.length}/300</Text>
						</View>
					</View>
					
					{/* Save Button */}
					{text.trim() && (
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
								<IconSymbol name="checkmark" size={20} color="#fff" />
								<Text style={styles.saveButtonText}>Save & Continue</Text>
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
		position: 'relative',
	},
	sparkle: {
		position: 'absolute',
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
	inputContainer: {
		flex: 1,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	inputLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	inputWrapper: {
		flex: 1,
		borderRadius: GIFTYY_THEME.radius.xl,
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.primary + '30',
		padding: GIFTYY_THEME.spacing.lg,
		position: 'relative',
	},
	textInput: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		color: GIFTYY_THEME.colors.gray900,
		lineHeight: GIFTYY_THEME.typography.sizes.lg * 1.5,
	},
	characterCount: {
		position: 'absolute',
		bottom: GIFTYY_THEME.spacing.md,
		right: GIFTYY_THEME.spacing.md,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray400,
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

