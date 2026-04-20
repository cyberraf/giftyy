import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { Announcement, AnnouncementCTA } from '@/types/announcement';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
	Animated,
	Dimensions,
	Image,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';

const { width } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnnouncementPopupProps {
	announcement: Announcement | null;
	onDismiss: () => void;
	onCTA: (cta: AnnouncementCTA) => void;
}

export default function AnnouncementPopup({ announcement, onDismiss, onCTA }: AnnouncementPopupProps) {
	const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
	const opacityAnim = React.useRef(new Animated.Value(0)).current;
	const [modalVisible, setModalVisible] = React.useState(false);

	const { width: windowWidth } = useWindowDimensions();
	const contentWidth = Math.min(windowWidth - 48, 400) - 48; // card width minus padding

	const visible = announcement !== null;

	React.useEffect(() => {
		if (visible) {
			setModalVisible(true);
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
			]).start(({ finished }) => {
				if (finished) {
					setModalVisible(false);
				}
			});
		}
	}, [visible, scaleAnim, opacityAnim]);

	if (!modalVisible || !announcement) return null;

	const ctaButtons = announcement.cta_buttons || [];
	const hasImage = !!announcement.image_url;

	return (
		<Modal
			visible={modalVisible}
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
						styles.cardOuter,
						{
							transform: [{ scale: scaleAnim }],
							opacity: opacityAnim,
						},
					]}
				>
					<BlurView intensity={95} tint="light" style={styles.card}>
						{/* Close button */}
						<Pressable
							style={styles.closeBtn}
							onPress={onDismiss}
							hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
						>
							<MaterialIcons name="close" size={20} color="#9CA3AF" />
						</Pressable>

						{/* Title */}
						<Text style={styles.title}>{announcement.title}</Text>

						{/* Body */}
						<ScrollView
							style={styles.bodyScroll}
							showsVerticalScrollIndicator={false}
						>
							{announcement.body.startsWith('<') ? (
								<RenderHtml
									contentWidth={contentWidth}
									source={{ html: announcement.body }}
									baseStyle={styles.body}
									tagsStyles={{
										p: { marginTop: 0, marginBottom: 4, textAlign: 'center' },
										strong: { fontWeight: '700' },
										em: { fontStyle: 'italic' },
										u: { textDecorationLine: 'underline' },
										h2: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
										h3: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
										ul: { paddingLeft: 16 },
										ol: { paddingLeft: 16 },
									}}
								/>
							) : (
								<Text style={styles.body}>{announcement.body}</Text>
							)}
						</ScrollView>

						{/* Hero image */}
						{hasImage && (
							<View style={styles.heroImageContainer}>
								<Image
									source={{ uri: announcement.image_url! }}
									style={styles.heroImage}
									resizeMode="contain"
								/>
							</View>
						)}

						{/* CTA Buttons */}
						{ctaButtons.length > 0 && (
							<View style={[
								styles.buttonContainer,
								ctaButtons.length > 2 && styles.buttonContainerVertical,
							]}>
								{ctaButtons.map((cta, index) => {
									const isPrimary = index === 0 && cta.action !== 'dismiss';
									const isDismiss = cta.action === 'dismiss';

									return (
										<Pressable
											key={index}
											style={({ pressed }) => [
												styles.button,
												isPrimary && styles.primaryButton,
												isDismiss && styles.dismissButton,
												ctaButtons.length <= 2 && ctaButtons.length > 1 && styles.buttonFlex,
												ctaButtons.length > 2 && styles.buttonFull,
												pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
											]}
											onPress={() => onCTA(cta)}
										>
											<Text
												style={[
													styles.buttonText,
													isPrimary && styles.primaryButtonText,
													isDismiss && styles.dismissButtonText,
												]}
											>
												{cta.label}
											</Text>
										</Pressable>
									);
								})}
							</View>
						)}

						{/* Fallback dismiss if no CTA buttons */}
						{ctaButtons.length === 0 && (
							<Pressable
								style={({ pressed }) => [
									styles.button,
									styles.primaryButton,
									styles.buttonFull,
									pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
								]}
								onPress={onDismiss}
							>
								<Text style={[styles.buttonText, styles.primaryButtonText]}>Got it</Text>
							</Pressable>
						)}
					</BlurView>
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
		padding: GIFTYY_THEME.spacing.xl,
	},
	cardOuter: {
		width: width - 48,
		maxWidth: 400,
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
	card: {
		padding: GIFTYY_THEME.spacing.xl,
		paddingTop: GIFTYY_THEME.spacing['2xl'],
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.75)',
	},
	closeBtn: {
		position: 'absolute',
		top: 16,
		right: 16,
		zIndex: 10,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(243, 244, 246, 0.8)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	heroImageContainer: {
		width: '100%',
		maxHeight: 220,
		borderRadius: 16,
		overflow: 'hidden',
		marginBottom: GIFTYY_THEME.spacing.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	heroImage: {
		width: '100%',
		height: undefined,
		aspectRatio: 1,
		maxHeight: 220,
		borderRadius: 16,
	},
	title: {
		fontSize: 22,
		fontWeight: '900',
		color: '#111827',
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.xs,
		letterSpacing: -0.5,
	},
	bodyScroll: {
		maxHeight: 200,
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	body: {
		fontSize: 15,
		color: '#4B5563',
		textAlign: 'center',
		lineHeight: 22,
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
	buttonFlex: {
		flex: 1,
	},
	buttonFull: {
		width: '100%',
	},
	primaryButton: {
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	dismissButton: {
		backgroundColor: 'transparent',
		borderWidth: 1.5,
		borderColor: '#E5E7EB',
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
	dismissButtonText: {
		color: '#6B7280',
	},
});
