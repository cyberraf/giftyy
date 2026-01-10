import { BRAND_COLOR } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { isDuplicateUserError } from '@/utils/supabase-errors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignupScreen() {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);
	const { signUp, signInWithGoogle } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const handleSignup = async () => {
		if (!firstName.trim() || !lastName.trim()) {
			alert('Error', 'Please enter both first and last name');
			return;
		}

		if (!email.trim() || !password.trim()) {
			alert('Error', 'Please enter both email and password');
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}

		if (password.length < 6) {
			alert('Error', 'Password must be at least 6 characters long');
			return;
		}

		setLoading(true);
		try {
			const { error } = await signUp(email.trim(), password, firstName.trim(), lastName.trim());
			
			if (error) {
				const errorMessage = error.message || 'Unable to create account. Please try again.';
				const errorMessageLower = errorMessage.toLowerCase();
				
				// Check if it's a duplicate user error using the utility function
				if (
					isDuplicateUserError(error) ||
					errorMessageLower.includes('already exists') ||
					errorMessageLower.includes('already registered') ||
					errorMessageLower.includes('account with this email')
				) {
					alert(
						'Account Already Exists',
						'An account with this email already exists.\n\nWould you like to sign in instead?',
						[
							{ text: 'Cancel', style: 'cancel' },
							{
								text: 'Sign In',
								onPress: () => {
									router.replace('/(auth)/login');
								},
							},
						]
					);
				} else if (errorMessage.toLowerCase().includes('network')) {
					// For network errors, suggest it might be a duplicate account
					alert(
						'Signup Failed',
						errorMessage + '\n\nIf this email is already registered, please try signing in instead.',
						[
							{ text: 'OK', style: 'cancel' },
							{
								text: 'Try Sign In',
								onPress: () => {
									router.replace('/(auth)/login');
								},
							},
						]
					);
				} else {
					alert('Signup Failed', errorMessage);
				}
				return;
			}

			// Signup succeeded: prompt user to verify email (do not auto-login)
			router.replace(`/(auth)/verify-email?email=${encodeURIComponent(email.trim())}`);
		} catch (err: any) {
			console.error('Unexpected signup error:', err);
			const errorMsg = err?.message || 'An unexpected error occurred. Please try again.';
			
			// Check if it's a network error
			if (errorMsg.toLowerCase().includes('network')) {
				alert(
					'Network Error',
					'Unable to connect. This email may already be registered.\n\nWould you like to try signing in instead?',
					[
						{ text: 'Cancel', style: 'cancel' },
						{
							text: 'Sign In',
							onPress: () => {
								router.replace('/(auth)/login');
							},
						},
					]
				);
			} else {
				alert('Signup Failed', errorMsg);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setGoogleLoading(true);
		const { error } = await signInWithGoogle();
		setGoogleLoading(false);

		if (error) {
			alert('Google Sign-In Failed', error.message || 'Unable to sign up with Google. Please try again.');
		}
	};

	return (
		<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* Logo and Welcome Section */}
				<View style={styles.header}>
					<Image
						source={require('@/assets/images/logo.png')}
						style={styles.logo}
						resizeMode="contain"
					/>
					<Text style={styles.welcomeText}>Create your account</Text>
					<Text style={styles.subtitleText}>Join Giftyy and start giving amazing gifts</Text>
				</View>

				{/* First Name Input */}
				<View style={styles.inputContainer}>
					<MaterialIcons name="person" size={20} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="First name"
						placeholderTextColor="#9ba1a6"
						value={firstName}
						onChangeText={setFirstName}
						editable={!loading}
						autoCapitalize="words"
						style={styles.input}
					/>
				</View>

				{/* Last Name Input */}
				<View style={styles.inputContainer}>
					<MaterialIcons name="person" size={20} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Last name"
						placeholderTextColor="#9ba1a6"
						value={lastName}
						onChangeText={setLastName}
						editable={!loading}
						autoCapitalize="words"
						style={styles.input}
					/>
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

				{/* Password Input */}
				<View style={styles.inputContainer}>
					<MaterialIcons name="lock" size={20} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Password (min. 6 characters)"
						placeholderTextColor="#9ba1a6"
						secureTextEntry
						value={password}
						onChangeText={setPassword}
						editable={!loading}
						style={styles.input}
					/>
				</View>

				{/* Sign Up Button */}
				<Pressable
					style={[styles.primaryButton, (loading || googleLoading) && styles.buttonDisabled]}
					onPress={handleSignup}
					disabled={loading || googleLoading}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.primaryButtonText}>Create Account</Text>
					)}
				</Pressable>

				{/* Divider */}
				<View style={styles.dividerContainer}>
					<View style={styles.dividerLine} />
					<Text style={styles.dividerText}>OR</Text>
					<View style={styles.dividerLine} />
				</View>

				{/* Google Sign In Button */}
				<Pressable
					style={[styles.googleButton, (loading || googleLoading) && styles.buttonDisabled]}
					onPress={handleGoogleSignIn}
					disabled={loading || googleLoading}
				>
					{googleLoading ? (
						<ActivityIndicator color="#4285F4" />
					) : (
						<>
							<View style={styles.googleIconContainer}>
								<Image
									source={require('@/assets/images/google-icon.png')}
									style={styles.googleIcon}
									resizeMode="contain"
								/>
							</View>
							<Text style={styles.googleButtonText}>Continue with Google</Text>
						</>
					)}
				</Pressable>

				{/* Terms and Privacy */}
				<Text style={styles.termsText}>
					By signing up, you agree to our Terms of Service and Privacy Policy
				</Text>

				{/* Login Link */}
				<View style={styles.loginContainer}>
					<Text style={styles.loginText}>Already have an account? </Text>
					<Link href="/(auth)/login" asChild>
						<Pressable disabled={loading || googleLoading}>
							<Text style={styles.loginLink}>Sign in</Text>
						</Pressable>
					</Link>
				</View>
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
	},
	subtitleText: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 12,
		paddingHorizontal: 16,
		marginBottom: 16,
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
		marginTop: 8,
		marginBottom: 16,
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
	dividerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 24,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: '#E5E7EB',
	},
	dividerText: {
		marginHorizontal: 16,
		fontSize: 14,
		color: '#9CA3AF',
		fontWeight: '500',
	},
	googleButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 12,
		paddingVertical: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	googleIconContainer: {
		marginRight: 12,
		width: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 2,
	},
	googleIcon: {
		width: 20,
		height: 20,
	},
	googleButtonText: {
		color: '#1F2937',
		fontSize: 16,
		fontWeight: '600',
	},
	termsText: {
		fontSize: 12,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 18,
		marginBottom: 24,
	},
	loginContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	loginText: {
		fontSize: 14,
		color: '#6B7280',
	},
	loginLink: {
		fontSize: 14,
		color: BRAND_COLOR,
		fontWeight: '700',
	},
});
