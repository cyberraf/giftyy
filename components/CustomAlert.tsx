import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

type AlertButton = {
	text: string;
	onPress?: () => void;
	style?: 'default' | 'cancel' | 'destructive' | 'primary';
};

type CustomAlertProps = {
	visible: boolean;
	title: string;
	message: string;
	buttons?: AlertButton[];
	onDismiss?: () => void;
};

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function CustomAlert({ visible, title, message, buttons = [], onDismiss }: CustomAlertProps) {
	const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
	const opacityAnim = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					useNativeDriver: true,
					damping: 15,
					stiffness: 150,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(scaleAnim, {
					toValue: 0.9,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible, scaleAnim, opacityAnim]);

	const handleButtonPress = (button: AlertButton) => {
		if (button.onPress) {
			button.onPress();
		}
		if (onDismiss) {
			onDismiss();
		}
	};

	const defaultButtons: AlertButton[] = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onDismiss }];
	const isVerticalLayout = defaultButtons.length > 2;

	// @ts-ignore - access private value for conditional rendering during fade out
	const currentOpacity = opacityAnim._value;
	if (!visible && currentOpacity === 0) return null;

	return (
		<Modal
			visible={visible || currentOpacity > 0}
			transparent
			animationType="none"
			onRequestClose={onDismiss}
		>
			<View style={styles.overlay}>
				<AnimatedPressable
					style={[StyleSheet.absoluteFill, { opacity: opacityAnim, backgroundColor: 'rgba(0,0,0,0.4)' }]}
					onPress={onDismiss}
				>
					<BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
				</AnimatedPressable>

				<Animated.View
					style={[
						styles.alertOuterContainer,
						{
							transform: [{ scale: scaleAnim }],
							opacity: opacityAnim,
						},
					]}
				>
					<BlurView intensity={95} tint="light" style={styles.alertContainer}>
						{/* Icon - show for error/warning titles */}
						{(title.toLowerCase().includes('error') ||
							title.toLowerCase().includes('failed') ||
							title.toLowerCase().includes('warning') ||
							title.toLowerCase().includes('network') ||
							title.toLowerCase().includes('exists')) && (
								<View style={styles.iconContainer}>
									<View style={[
										styles.iconBackground,
										title.toLowerCase().includes('error') && { backgroundColor: '#FEF2F2' },
										title.toLowerCase().includes('warning') && { backgroundColor: '#FFFBEB' },
										title.toLowerCase().includes('exists') && { backgroundColor: '#EFF6FF' },
									]}>
										<MaterialIcons
											name={title.toLowerCase().includes('exists') ? "info" : "error-outline"}
											size={32}
											color={
												title.toLowerCase().includes('exists') ? GIFTYY_THEME.colors.primary :
													title.toLowerCase().includes('warning') ? '#F59E0B' :
														GIFTYY_THEME.colors.error
											}
										/>
									</View>
								</View>
							)}

						{/* Title */}
						<Text style={styles.title}>{title}</Text>

						{/* Message */}
						<Text style={styles.message}>{message}</Text>

						{/* Buttons */}
						<View style={[styles.buttonContainer, isVerticalLayout && styles.buttonContainerVertical]}>
							{defaultButtons.map((button, index) => {
								const isPrimary = button.style === 'primary' || (index === defaultButtons.length - 1 && defaultButtons.length > 1 && button.style !== 'cancel' && button.style !== 'destructive') || (defaultButtons.length === 1 && button.style !== 'cancel' && button.style !== 'destructive');
								const isDestructive = button.style === 'destructive';
								const isCancel = button.style === 'cancel';

								return (
									<Pressable
										key={index}
										style={({ pressed }) => [
											styles.button,
											isPrimary && styles.primaryButton,
											isCancel && styles.cancelButton,
											isDestructive && styles.destructiveButton,
											!isVerticalLayout && defaultButtons.length > 1 && styles.buttonWithMultipleHorizontal,
											isVerticalLayout && styles.buttonVertical,
											pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }
										]}
										onPress={() => handleButtonPress(button)}
									>
										<Text
											style={[
												styles.buttonText,
												isPrimary && styles.primaryButtonText,
												isCancel && styles.cancelButtonText,
												isDestructive && styles.destructiveButtonText,
											]}
										>
											{button.text}
										</Text>
									</Pressable>
								);
							})}
						</View>
					</BlurView>
				</Animated.View>
			</View>
		</Modal>
	);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: GIFTYY_THEME.spacing.xl,
	},
	alertOuterContainer: {
		width: width - 48,
		maxWidth: 380,
		borderRadius: 32,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.xl,
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 24,
		elevation: 15,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.5)',
	},
	alertContainer: {
		padding: GIFTYY_THEME.spacing.xl,
		paddingTop: GIFTYY_THEME.spacing['2xl'],
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.75)',
	},
	iconContainer: {
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	iconBackground: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.8)',
	},
	title: {
		fontSize: 22,
		fontWeight: '900',
		color: '#111827',
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.xs,
		letterSpacing: -0.5,
	},
	message: {
		fontSize: 15,
		color: '#4B5563',
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: GIFTYY_THEME.spacing.xl,
		paddingHorizontal: 10,
	},
	buttonContainer: {
		flexDirection: 'row',
		width: '100%',
		gap: 12,
	},
	buttonContainerVertical: {
		flexDirection: 'column',
		gap: 10,
	},
	button: {
		paddingVertical: 14,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(243, 244, 246, 0.8)',
	},
	buttonWithMultipleHorizontal: {
		flex: 1,
	},
	buttonVertical: {
		width: '100%',
	},
	primaryButton: {
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	cancelButton: {
		backgroundColor: 'transparent',
		borderWidth: 1.5,
		borderColor: '#E5E7EB',
	},
	destructiveButton: {
		backgroundColor: '#FEF2F2',
		borderWidth: 1.5,
		borderColor: '#FEE2E2',
	},
	buttonText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1F2937',
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontWeight: '800',
	},
	cancelButtonText: {
		color: '#6B7280',
	},
	destructiveButtonText: {
		color: '#DC2626',
	},
});

