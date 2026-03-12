import { ConversationalFormWizard } from '@/components/forms/ConversationalFormWizard';
import { ConversationalStep } from '@/components/forms/ConversationalStep';
import { BRAND_COLOR } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SocialFooter() {
	return (
		<View style={styles.footer}>
			<Text style={styles.socialText}>Follow us</Text>
			<View style={styles.socialIcons}>
				<Pressable
					style={styles.socialButton}
					onPress={() => Linking.openURL('https://www.instagram.com/giftyy_llc')}
				>
					<FontAwesome5 name="instagram" size={18} color="#E4405F" />
				</Pressable>
				<Pressable
					style={styles.socialButton}
					onPress={() => Linking.openURL('https://www.tiktok.com/@giftyy_llc')}
				>
					<FontAwesome5 name="tiktok" size={18} color="#000000" />
				</Pressable>
				<Pressable
					style={styles.socialButton}
					onPress={() => Linking.openURL('https://linkedin.com/company/giftyy-store')}
				>
					<FontAwesome5 name="linkedin" size={18} color="#0A66C2" />
				</Pressable>
			</View>
		</View>
	);
}

function ForgotPasswordStep({ formData, updateFormData, onNext, onBack, loading }: any) {
	const { alert } = useAlert();

	const handleNext = () => {
		const email = formData.email?.trim() || '';
		if (!email) {
			alert('Error', 'Please enter your email address');
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}
		onNext();
	};

	return (
		<ConversationalStep
			question="Reset your password"
			description="Enter your email address and we'll send you a link to reset your password"
			avatarSource={require('@/assets/images/giftyy.png')}
			onNext={handleNext}
			onBack={onBack}
			loading={loading}
			nextLabel="Send Reset Link"
		>
			<View style={styles.inputWrapper}>
				<View style={styles.inputContainer}>
					<MaterialIcons name="email" size={24} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Email address"
						placeholderTextColor="#9ba1a6"
						autoCapitalize="none"
						keyboardType="email-address"
						value={formData.email || ''}
						onChangeText={(text) => updateFormData({ email: text })}
						style={styles.input}
						editable={!loading}
						autoFocus
					/>
				</View>
			</View>

			<SocialFooter />
		</ConversationalStep>
	);
}

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const { resetPasswordForEmail } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const handleResetPassword = async (dataOrEmail: any) => {
		const resetEmail = (typeof dataOrEmail === 'string' ? dataOrEmail : dataOrEmail.email)?.trim();
		setEmail(resetEmail); // Save in case of resend

		setLoading(true);
		const { error } = await resetPasswordForEmail(resetEmail);
		setLoading(false);

		if (error) {
			alert('Error', error.message || 'Unable to send password reset email. Please try again.');
		} else {
			setEmailSent(true);
		}
	};

	const handleCancel = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace('/(auth)/login');
		}
	};

	if (emailSent) {
		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<ScrollView
					contentContainerStyle={styles.successContainer}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.successCard}>
						<View style={styles.successIconWrapper}>
							<View style={styles.successIconInner}>
								<MaterialIcons name="mark-email-read" size={40} color="#10B981" />
							</View>
						</View>

						<Text style={styles.successTitle}>Check your email</Text>

						<Text style={styles.successDescription}>
							We've sent a password reset link to{'\n'}
							<Text style={styles.highlightText}>{email}</Text>
						</Text>

						<View style={styles.infoBox}>
							<MaterialIcons name="info-outline" size={20} color="#F59E0B" style={{ marginTop: 2 }} />
							<Text style={styles.infoText}>
								Click the link in the email to reset your password. The link will expire in 1 hour.
							</Text>
						</View>

						<Pressable
							style={styles.primaryButton}
							onPress={() => router.replace('/(auth)/login')}
						>
							<Text style={styles.primaryButtonText}>Back to Sign In</Text>
						</Pressable>

						<Pressable
							style={styles.resendButtonInline}
							onPress={() => handleResetPassword(email)}
						>
							<Text style={styles.resendTextInline}>Didn't receive the email? Resend</Text>
						</Pressable>
					</View>

					<SocialFooter />
				</ScrollView>
			</View>
		);
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ConversationalFormWizard
				onComplete={handleResetPassword}
				onCancel={handleCancel}
				hideProgress
			>
				<ForgotPasswordStep loading={loading} />
			</ConversationalFormWizard>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8F9FA',
	},
	inputWrapper: {
		marginTop: 10,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 2,
		borderColor: '#E5E7EB',
		borderRadius: 16,
		paddingHorizontal: 16,
		paddingVertical: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 4,
		elevation: 1,
	},
	inputIcon: {
		marginRight: 12,
	},
	input: {
		flex: 1,
		paddingVertical: 14,
		fontSize: 18,
		color: '#1F2937',
		fontWeight: '500',
	},
	footer: {
		alignItems: 'center',
		paddingTop: 32,
		paddingBottom: 24,
		backgroundColor: 'transparent',
	},
	socialText: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 16,
		fontWeight: '500',
	},
	socialIcons: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 20,
	},
	socialButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	resendContainer: {
		marginTop: 16,
		alignItems: 'flex-start',
	},
	resendButton: {
		paddingVertical: 8,
		paddingHorizontal: 8,
	},
	resendText: {
		fontSize: 15,
		color: 'transparent', // Used to exist but not in new UI
		fontWeight: '600',
	},
	successContainer: {
		flex: 1,
		paddingHorizontal: 24,
		justifyContent: 'center',
		paddingBottom: 40,
	},
	successCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 24,
		padding: 32,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.05,
		shadowRadius: 20,
		elevation: 4,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.03)',
		marginBottom: 32,
	},
	successIconWrapper: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#ECFDF5',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
		shadowColor: '#10B981',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 2,
	},
	successIconInner: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: '#D1FAE5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	successTitle: {
		fontSize: 28,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 12,
		letterSpacing: -0.5,
		textAlign: 'center',
	},
	successDescription: {
		fontSize: 16,
		color: '#4B5563',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 24,
	},
	highlightText: {
		color: '#111827',
		fontWeight: '700',
	},
	infoBox: {
		flexDirection: 'row',
		backgroundColor: '#FEF3C7',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		marginBottom: 32,
		borderWidth: 1,
		borderColor: '#FDE68A',
	},
	infoText: {
		flex: 1,
		marginLeft: 12,
		fontSize: 14,
		color: '#92400E',
		lineHeight: 20,
		fontWeight: '500',
	},
	primaryButton: {
		width: '100%',
		height: 56,
		backgroundColor: BRAND_COLOR,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: BRAND_COLOR,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 3,
		marginBottom: 24,
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
	resendButtonInline: {
		paddingVertical: 8,
	},
	resendTextInline: {
		fontSize: 15,
		color: BRAND_COLOR,
		fontWeight: '600',
	},
});
