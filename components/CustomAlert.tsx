import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { BRAND_COLOR } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

type AlertButton = {
	text: string;
	onPress?: () => void;
	style?: 'default' | 'cancel' | 'destructive';
};

type CustomAlertProps = {
	visible: boolean;
	title: string;
	message: string;
	buttons?: AlertButton[];
	onDismiss?: () => void;
};

export default function CustomAlert({ visible, title, message, buttons = [], onDismiss }: CustomAlertProps) {
	const scaleAnim = React.useRef(new Animated.Value(0)).current;
	const opacityAnim = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					useNativeDriver: true,
					tension: 50,
					friction: 7,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			scaleAnim.setValue(0);
			opacityAnim.setValue(0);
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

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onDismiss}
		>
			<View style={styles.overlay}>
				<Animated.View
					style={[
						styles.overlayBackground,
						{
							opacity: opacityAnim,
						},
					]}
				/>
				<Animated.View
					style={[
						styles.alertContainer,
						{
							transform: [{ scale: scaleAnim }],
							opacity: opacityAnim,
						},
					]}
				>
					{/* Icon - show for error/warning titles */}
					{(title.toLowerCase().includes('error') || 
					  title.toLowerCase().includes('failed') || 
					  title.toLowerCase().includes('warning') ||
					  title.toLowerCase().includes('network')) && (
						<View style={styles.iconContainer}>
							<MaterialIcons name="error-outline" size={48} color={BRAND_COLOR} />
						</View>
					)}

					{/* Title */}
					<Text style={styles.title}>{title}</Text>

					{/* Message */}
					<Text style={styles.message}>{message}</Text>

					{/* Buttons */}
					<View style={styles.buttonContainer}>
						{defaultButtons.map((button, index) => {
							const isPrimary = index === defaultButtons.length - 1 && defaultButtons.length > 1;
							const isDestructive = button.style === 'destructive';
							const isCancel = button.style === 'cancel';

							return (
								<Pressable
									key={index}
									style={[
										styles.button,
										isPrimary && styles.primaryButton,
										isCancel && styles.cancelButton,
										isDestructive && styles.destructiveButton,
										defaultButtons.length > 1 && styles.buttonWithMultiple,
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
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	overlayBackground: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	alertContainer: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 24,
		width: width - 40,
		maxWidth: 400,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 16,
		elevation: 8,
	},
	iconContainer: {
		marginBottom: 16,
	},
	title: {
		fontSize: 22,
		fontWeight: '800',
		color: '#1F2937',
		textAlign: 'center',
		marginBottom: 12,
	},
	message: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 24,
	},
	buttonContainer: {
		flexDirection: 'row',
		width: '100%',
		gap: 12,
	},
	button: {
		flex: 1,
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	buttonWithMultiple: {
		flex: 1,
	},
	primaryButton: {
		backgroundColor: BRAND_COLOR,
		borderColor: BRAND_COLOR,
		shadowColor: BRAND_COLOR,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	cancelButton: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E5E7EB',
	},
	destructiveButton: {
		backgroundColor: '#FFFFFF',
		borderColor: '#EF4444',
	},
	buttonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	cancelButtonText: {
		color: '#6B7280',
	},
	destructiveButtonText: {
		color: '#EF4444',
		fontWeight: '700',
	},
});

