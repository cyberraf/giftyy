import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { checkThrottle, resetThrottle } from '@/lib/auth/throttle';
import { hapticMedium, hapticSuccess, hapticError } from '@/lib/utils/haptics';
import { scale, normalizeFont } from '@/utils/responsive';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const T = GIFTYY_THEME;

export default function ForgotPasswordScreen() {
	const { resetPasswordForEmail } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const cooldownRef = useRef<ReturnType<typeof setInterval>>();

	useEffect(() => {
		return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
	}, []);

	const startCooldown = (seconds: number) => {
		setResendCooldown(seconds);
		if (cooldownRef.current) clearInterval(cooldownRef.current);
		cooldownRef.current = setInterval(() => {
			setResendCooldown(prev => {
				if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
				return prev - 1;
			});
		}, 1000);
	};

	const handleResetPassword = async () => {
		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			alert('Error', 'Please enter your email address');
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}

		const throttle = checkThrottle('password_reset');
		if (!throttle.allowed) {
			alert('Too Many Attempts', `Please wait ${throttle.retryAfterSeconds} seconds before trying again.`);
			return;
		}

		hapticMedium();
		setLoading(true);
		const { error } = await resetPasswordForEmail(trimmedEmail);
		setLoading(false);

		if (error) {
			hapticError();
			alert('Error', error.message || 'Unable to send password reset email. Please try again.');
		} else {
			hapticSuccess();
			resetThrottle('password_reset');
			setEmailSent(true);
			startCooldown(60);
		}
	};

	const handleBack = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace('/(auth)/login');
		}
	};

	// Success state — email sent
	if (emailSent) {
		return (
			<View style={styles.container}>
				<LinearGradient
					colors={['#fff5f0', '#ffffff', '#ffffff']}
					locations={[0, 0.35, 1]}
					style={StyleSheet.absoluteFill}
				/>
				<ScrollView
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingTop: insets.top + scale(40), paddingBottom: insets.bottom + scale(24) },
					]}
					showsVerticalScrollIndicator={false}
				>
					{/* Logo & Brand */}
					<View style={styles.brandSection}>
						<Image
							source={require('@/assets/images/giftyy.png')}
							style={styles.logo}
							resizeMode="contain"
						/>
						<Text style={styles.tagline}>Giftyy</Text>
					</View>

					{/* Success Card */}
					<View style={styles.card}>
						<View style={styles.successIconWrapper}>
							<Ionicons name="mail-open-outline" size={scale(36)} color={T.colors.success} />
						</View>

						<Text style={styles.cardTitle}>Check your email</Text>
						<Text style={styles.cardSubtitle}>
							We've sent a password reset link to{'\n'}
							<Text style={styles.emailHighlight}>{email.trim()}</Text>
						</Text>

						<View style={styles.infoBox}>
							<Ionicons name="information-circle-outline" size={scale(20)} color="#92400E" />
							<Text style={styles.infoText}>
								Click the link in the email to reset your password. The link will expire in 1 hour.
							</Text>
						</View>

						{/* Back to Sign In */}
						<Pressable
							style={({ pressed }) => [
								styles.primaryButton,
								pressed && styles.primaryButtonPressed,
							]}
							onPress={() => router.replace('/(auth)/login')}
						>
							<Text style={styles.primaryButtonText}>Back to Sign In</Text>
						</Pressable>

						{/* Resend */}
						<Pressable
							onPress={() => {
								if (resendCooldown > 0) return;
								setEmailSent(false);
								handleResetPassword();
							}}
							hitSlop={8}
							disabled={resendCooldown > 0}
						>
							<Text style={[styles.resendText, resendCooldown > 0 && { color: T.colors.gray400 }]}>
								{resendCooldown > 0
									? `Resend available in ${resendCooldown}s`
									: "Didn't receive the email? Resend"}
							</Text>
						</Pressable>
					</View>

					{/* Social Links */}
					<View style={styles.socialSection}>
						<Text style={styles.socialLabel}>Follow us</Text>
						<View style={styles.socialIcons}>
							<Pressable
								style={styles.socialButton}
								onPress={() => Linking.openURL('https://www.instagram.com/giftyy_llc')}
							>
								<FontAwesome5 name="instagram" size={scale(16)} color="#E4405F" />
							</Pressable>
							<Pressable
								style={styles.socialButton}
								onPress={() => Linking.openURL('https://www.tiktok.com/@giftyy_llc')}
							>
								<FontAwesome5 name="tiktok" size={scale(16)} color="#000000" />
							</Pressable>
							<Pressable
								style={styles.socialButton}
								onPress={() => Linking.openURL('https://linkedin.com/company/giftyy-store')}
							>
								<FontAwesome5 name="linkedin" size={scale(16)} color="#0A66C2" />
							</Pressable>
						</View>
					</View>
				</ScrollView>
			</View>
		);
	}

	// Default state — enter email
	return (
		<View style={styles.container}>
			<LinearGradient
				colors={['#fff5f0', '#ffffff', '#ffffff']}
				locations={[0, 0.35, 1]}
				style={StyleSheet.absoluteFill}
			/>

			<KeyboardAvoidingView
				style={styles.flex}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<ScrollView
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingTop: insets.top + scale(40), paddingBottom: insets.bottom + scale(24) },
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Logo & Brand */}
					<View style={styles.brandSection}>
						<Image
							source={require('@/assets/images/giftyy.png')}
							style={styles.logo}
							resizeMode="contain"
						/>
						<Text style={styles.tagline}>Giftyy</Text>
					</View>

					{/* Form Card */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Reset your password</Text>
						<Text style={styles.cardSubtitle}>
							Enter your email address and we'll send you a link to reset your password
						</Text>

						{/* Email */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Email</Text>
							<View style={[styles.inputContainer, loading && styles.inputDisabled]}>
								<Ionicons name="mail-outline" size={scale(20)} color={T.colors.gray400} />
								<TextInput
									placeholder="you@example.com"
									placeholderTextColor={T.colors.gray400}
									autoCapitalize="none"
									keyboardType="email-address"
									autoComplete="email"
									textContentType="emailAddress"
									returnKeyType="go"
									value={email}
									onChangeText={setEmail}
									onSubmitEditing={handleResetPassword}
									style={styles.input}
									editable={!loading}
									autoFocus
									accessibilityLabel="Email address"
								/>
							</View>
						</View>

						{/* Send Reset Link Button */}
						<Pressable
							style={({ pressed }) => [
								styles.primaryButton,
								pressed && styles.primaryButtonPressed,
								loading && styles.primaryButtonDisabled,
							]}
							onPress={handleResetPassword}
							disabled={loading}
							accessibilityRole="button"
							accessibilityLabel="Send password reset link"
							accessibilityState={{ disabled: loading, busy: loading }}
						>
							{loading ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<Text style={styles.primaryButtonText}>Send Reset Link</Text>
							)}
						</Pressable>
					</View>

					{/* Back to Sign In */}
					<View style={styles.backRow}>
						<Pressable onPress={handleBack} hitSlop={8}>
							<Text style={styles.backLink}>Back to Sign In</Text>
						</Pressable>
					</View>

					{/* Social Links */}
					<View style={styles.socialSection}>
						<Text style={styles.socialLabel}>Follow us</Text>
						<View style={styles.socialIcons}>
							<Pressable
								style={styles.socialButton}
								onPress={() => Linking.openURL('https://www.instagram.com/giftyy_llc')}
							>
								<FontAwesome5 name="instagram" size={scale(16)} color="#E4405F" />
							</Pressable>
							<Pressable
								style={styles.socialButton}
								onPress={() => Linking.openURL('https://www.tiktok.com/@giftyy_llc')}
							>
								<FontAwesome5 name="tiktok" size={scale(16)} color="#000000" />
							</Pressable>
							<Pressable
								style={styles.socialButton}
								onPress={() => Linking.openURL('https://linkedin.com/company/giftyy-store')}
							>
								<FontAwesome5 name="linkedin" size={scale(16)} color="#0A66C2" />
							</Pressable>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	flex: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: T.spacing['2xl'],
	},

	// Brand
	brandSection: {
		alignItems: 'center',
		marginBottom: T.spacing['3xl'],
	},
	logo: {
		width: scale(100),
		height: scale(100),
	},
	tagline: {
		marginTop: scale(6),
		fontSize: T.typography.sizes['2xl'],
		color: T.colors.primary,
		fontWeight: T.typography.weights.extrabold,
	},

	// Card
	card: {
		backgroundColor: '#ffffff',
		borderRadius: T.radius.xl,
		padding: T.spacing['2xl'],
		borderWidth: 1,
		borderColor: T.colors.gray200,
		...T.shadows.md,
	},
	cardTitle: {
		fontSize: T.typography.sizes['2xl'],
		fontWeight: T.typography.weights.bold,
		color: T.colors.gray900,
		marginBottom: T.spacing.xs,
	},
	cardSubtitle: {
		fontSize: normalizeFont(15),
		color: T.colors.gray500,
		marginBottom: T.spacing['2xl'],
		lineHeight: normalizeFont(22),
	},

	// Fields
	fieldGroup: {
		marginBottom: scale(18),
	},
	label: {
		fontSize: T.typography.sizes.base,
		fontWeight: T.typography.weights.semibold,
		color: T.colors.gray700,
		marginBottom: T.spacing.sm,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: T.colors.gray50,
		borderWidth: 1.5,
		borderColor: T.colors.gray200,
		borderRadius: scale(14),
		paddingHorizontal: scale(14),
		gap: scale(10),
	},
	inputDisabled: {
		opacity: 0.6,
	},
	input: {
		flex: 1,
		paddingVertical: scale(14),
		fontSize: T.typography.sizes.md,
		color: T.colors.gray900,
		fontWeight: T.typography.weights.normal,
	},

	// Primary Button
	primaryButton: {
		backgroundColor: T.colors.primary,
		borderRadius: scale(14),
		paddingVertical: T.spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: scale(6),
		...T.shadows.sm,
	},
	primaryButtonPressed: {
		backgroundColor: T.colors.primaryDark,
	},
	primaryButtonDisabled: {
		opacity: 0.7,
	},
	primaryButtonText: {
		color: '#ffffff',
		fontSize: T.typography.sizes.md,
		fontWeight: T.typography.weights.bold,
		letterSpacing: 0.3,
	},

	// Back link
	backRow: {
		alignItems: 'center',
		marginTop: scale(28),
	},
	backLink: {
		fontSize: normalizeFont(15),
		fontWeight: T.typography.weights.bold,
		color: T.colors.primary,
	},

	// Success state
	successIconWrapper: {
		width: scale(72),
		height: scale(72),
		borderRadius: scale(36),
		backgroundColor: '#ecfdf5',
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		marginBottom: T.spacing.xl,
	},
	emailHighlight: {
		color: T.colors.gray900,
		fontWeight: T.typography.weights.bold,
	},
	infoBox: {
		flexDirection: 'row',
		backgroundColor: '#fef3c7',
		padding: scale(14),
		borderRadius: T.radius.md,
		alignItems: 'center',
		gap: scale(10),
		marginBottom: T.spacing['2xl'],
		borderWidth: 1,
		borderColor: '#fde68a',
	},
	infoText: {
		flex: 1,
		fontSize: T.typography.sizes.sm,
		color: '#92400E',
		lineHeight: normalizeFont(19),
		fontWeight: T.typography.weights.medium,
	},
	resendText: {
		fontSize: T.typography.sizes.base,
		fontWeight: T.typography.weights.semibold,
		color: T.colors.primary,
		textAlign: 'center',
	},

	// Socials
	socialSection: {
		alignItems: 'center',
		marginTop: T.spacing['3xl'],
		paddingBottom: T.spacing.sm,
	},
	socialLabel: {
		fontSize: T.typography.sizes.sm,
		color: T.colors.gray400,
		fontWeight: T.typography.weights.medium,
		marginBottom: T.spacing.md,
	},
	socialIcons: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: T.spacing.lg,
	},
	socialButton: {
		width: scale(38),
		height: scale(38),
		borderRadius: scale(19),
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: T.colors.gray200,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
