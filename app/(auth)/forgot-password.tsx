import { BRAND_COLOR } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const { resetPasswordForEmail } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const handleResetPassword = async () => {
		if (!email.trim()) {
			alert('Error', 'Please enter your email address');
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}

		setLoading(true);
		const { error } = await resetPasswordForEmail(email.trim());
		setLoading(false);

		if (error) {
			alert('Error', error.message || 'Unable to send password reset email. Please try again.');
		} else {
			setEmailSent(true);
		}
	};

	if (emailSent) {
		return (
			<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* Logo */}
					<View style={styles.header}>
						<Image
							source={require('@/assets/images/logo.png')}
							style={styles.logo}
							resizeMode="contain"
						/>
					</View>

					{/* Success Icon */}
					<View style={styles.successIconContainer}>
						<MaterialIcons name="check-circle" size={80} color={BRAND_COLOR} />
					</View>

					{/* Success Message */}
					<Text style={styles.successTitle}>Check your email</Text>
					<Text style={styles.successMessage}>
						We've sent a password reset link to{'\n'}
						<Text style={styles.emailText}>{email}</Text>
					</Text>
					<Text style={styles.instructions}>
						Click the link in the email to reset your password. The link will expire in 1 hour.
					</Text>

					{/* Back to Login Button */}
					<Pressable
						style={styles.primaryButton}
						onPress={() => router.replace('/(auth)/login')}
					>
						<Text style={styles.primaryButtonText}>Back to Sign In</Text>
					</Pressable>

					{/* Resend Email */}
					<Pressable
						style={styles.resendButton}
						onPress={() => {
							setEmailSent(false);
							handleResetPassword();
						}}
					>
						<Text style={styles.resendText}>Didn't receive the email? Resend</Text>
					</Pressable>
				</ScrollView>
			</View>
		);
	}

	return (
		<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* Logo and Header */}
				<View style={styles.header}>
					<Image
						source={require('@/assets/images/logo.png')}
						style={styles.logo}
						resizeMode="contain"
					/>
					<Text style={styles.welcomeText}>Reset your password</Text>
					<Text style={styles.subtitleText}>
						Enter your email address and we'll send you a link to reset your password
					</Text>
				</View>

				{/* Email Input */}
				<View style={styles.inputContainer}>
					<MaterialIcons name="email" size={20} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Email address"
						placeholderTextColor="#9ba1a6"
						autoCapitalize="none"
						keyboardType="email-address"
						value={email}
						onChangeText={setEmail}
						editable={!loading}
						style={styles.input}
					/>
				</View>

				{/* Send Reset Link Button */}
				<Pressable
					style={[styles.primaryButton, loading && styles.buttonDisabled]}
					onPress={handleResetPassword}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.primaryButtonText}>Send Reset Link</Text>
					)}
				</Pressable>

				{/* Back to Login Link */}
				<Pressable
					style={styles.backButton}
					onPress={() => router.back()}
					disabled={loading}
				>
					<MaterialIcons name="arrow-back" size={20} color={BRAND_COLOR} style={{ marginRight: 8 }} />
					<Text style={styles.backText}>Back to Sign In</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 32,
	},
	header: {
		alignItems: 'center',
		marginBottom: 32,
	},
	logo: {
		width: 100,
		height: 100,
		marginBottom: 24,
	},
	welcomeText: {
		fontSize: 28,
		fontWeight: '800',
		color: '#1F2937',
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitleText: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 24,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 12,
		paddingHorizontal: 16,
		marginBottom: 24,
	},
	inputIcon: {
		marginRight: 12,
	},
	input: {
		flex: 1,
		paddingVertical: 14,
		fontSize: 16,
		color: '#1F2937',
	},
	primaryButton: {
		backgroundColor: BRAND_COLOR,
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
		shadowColor: BRAND_COLOR,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
	},
	backText: {
		fontSize: 14,
		color: BRAND_COLOR,
		fontWeight: '600',
	},
	successIconContainer: {
		alignItems: 'center',
		marginBottom: 24,
	},
	successTitle: {
		fontSize: 28,
		fontWeight: '800',
		color: '#1F2937',
		textAlign: 'center',
		marginBottom: 16,
	},
	successMessage: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 12,
	},
	emailText: {
		fontWeight: '700',
		color: '#1F2937',
	},
	instructions: {
		fontSize: 14,
		color: '#9BA1A6',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 32,
	},
	resendButton: {
		alignItems: 'center',
		paddingVertical: 12,
	},
	resendText: {
		fontSize: 14,
		color: BRAND_COLOR,
		fontWeight: '600',
	},
});

