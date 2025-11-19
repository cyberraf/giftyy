import { BRAND_COLOR } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen() {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);
	const [hasValidSession, setHasValidSession] = useState(false);
	const [passwordReset, setPasswordReset] = useState(false);
	const { resetPassword, session } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams();

	// Check if we have a valid session (user clicked the reset link)
	useEffect(() => {
		const checkSession = async () => {
			try {
				// Check for deep link with access token
				const initialUrl = await Linking.getInitialURL();
				let urlToProcess = initialUrl;

				// Also listen for URL changes (in case app is already open)
				const subscription = Linking.addEventListener('url', async (event) => {
					urlToProcess = event.url;
					await processUrl(event.url);
				});

				// Process initial URL if exists
				if (urlToProcess) {
					await processUrl(urlToProcess);
				} else {
					// Check if we already have a session
					const { data: { session: currentSession } } = await supabase.auth.getSession();
					if (currentSession) {
						setHasValidSession(true);
						setCheckingSession(false);
					} else {
						// Wait a bit and check again (in case session is being established)
						setTimeout(async () => {
							const { data: { session: delayedSession } } = await supabase.auth.getSession();
							if (delayedSession) {
								setHasValidSession(true);
							} else {
								setHasValidSession(false);
							}
							setCheckingSession(false);
						}, 2000);
					}
				}

				async function processUrl(url: string) {
					try {
						const parsed = Linking.parse(url);
						
						// Check if this is a password reset link
						if (parsed.queryParams?.access_token && parsed.queryParams?.type === 'recovery') {
							// Extract the access token and refresh token from URL
							const accessToken = parsed.queryParams.access_token as string;
							const refreshToken = parsed.queryParams.refresh_token as string;
							
							if (accessToken) {
								// Set the session using the tokens from the URL
								const { data, error } = await supabase.auth.setSession({
									access_token: accessToken,
									refresh_token: refreshToken || '',
								});

								if (error) {
									console.error('Error setting session from URL:', error);
									setHasValidSession(false);
								} else if (data.session) {
									setHasValidSession(true);
								} else {
									setHasValidSession(false);
								}
							} else {
								setHasValidSession(false);
							}
						} else {
							// Check if we have a session anyway
							const { data: { session: currentSession } } = await supabase.auth.getSession();
							setHasValidSession(!!currentSession);
						}
					} catch (error) {
						console.error('Error processing URL:', error);
						setHasValidSession(false);
					} finally {
						setCheckingSession(false);
					}
				}

				return () => subscription.remove();
			} catch (error) {
				console.error('Error checking session:', error);
				setHasValidSession(false);
				setCheckingSession(false);
			}
		};

		checkSession();
	}, []);

	// Also check when session changes
	useEffect(() => {
		if (session) {
			setHasValidSession(true);
			setCheckingSession(false);
		}
	}, [session]);

	const handleResetPassword = async () => {
		// Double-check session before proceeding
		const { data: { session: currentSession } } = await supabase.auth.getSession();
		if (!currentSession) {
			alert(
				'Invalid Reset Link',
				'This password reset link is invalid or has expired. Please request a new password reset link.',
				[
					{
						text: 'Request New Link',
						onPress: () => router.replace('/(auth)/forgot-password'),
					},
					{
						text: 'Cancel',
						style: 'cancel',
						onPress: () => router.replace('/(auth)/login'),
					},
				]
			);
			return;
		}

		if (!password.trim() || !confirmPassword.trim()) {
			alert('Error', 'Please enter both password fields');
			return;
		}

		if (password.length < 6) {
			alert('Error', 'Password must be at least 6 characters long');
			return;
		}

		if (password !== confirmPassword) {
			alert('Error', 'Passwords do not match');
			return;
		}

		setLoading(true);
		const { error } = await resetPassword(password);
		setLoading(false);

		if (error) {
			alert('Error', error.message || 'Unable to reset password. Please try again.');
		} else {
			setPasswordReset(true);
		}
	};

	// Show loading while checking session
	if (checkingSession) {
		return (
			<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
				<View style={styles.loadingContainer}>
					<Image
						source={require('@/assets/images/logo.png')}
						style={styles.logo}
						resizeMode="contain"
					/>
					<ActivityIndicator size="large" color={BRAND_COLOR} style={{ marginTop: 24 }} />
					<Text style={styles.loadingText}>Verifying reset link...</Text>
				</View>
			</View>
		);
	}

	// Show error if no valid session
	if (!hasValidSession) {
		return (
			<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.header}>
						<Image
							source={require('@/assets/images/logo.png')}
							style={styles.logo}
							resizeMode="contain"
						/>
					</View>

					<View style={styles.errorIconContainer}>
						<MaterialIcons name="error-outline" size={80} color="#EF4444" />
					</View>

					<Text style={styles.errorTitle}>Invalid Reset Link</Text>
					<Text style={styles.errorMessage}>
						This password reset link is invalid or has expired. Please request a new password reset link.
					</Text>

					<Pressable
						style={styles.primaryButton}
						onPress={() => router.replace('/(auth)/forgot-password')}
					>
						<Text style={styles.primaryButtonText}>Request New Link</Text>
					</Pressable>

					<Pressable
						style={styles.backButton}
						onPress={() => router.replace('/(auth)/login')}
					>
						<Text style={styles.backText}>Back to Sign In</Text>
					</Pressable>
				</ScrollView>
			</View>
		);
	}

	if (passwordReset) {
		return (
			<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
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
					<Text style={styles.successTitle}>Password Reset Successful!</Text>
					<Text style={styles.successMessage}>
						Your password has been successfully reset. You can now sign in with your new password.
					</Text>

					{/* Sign In Button */}
					<Pressable
						style={styles.primaryButton}
						onPress={() => router.replace('/(auth)/login')}
					>
						<Text style={styles.primaryButtonText}>Sign In</Text>
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
					<Text style={styles.welcomeText}>Create new password</Text>
					<Text style={styles.subtitleText}>
						Enter your new password below
					</Text>
				</View>

				{/* Password Input */}
				<View style={styles.inputContainer}>
					<MaterialIcons name="lock" size={20} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="New password (min. 6 characters)"
						placeholderTextColor="#9ba1a6"
						secureTextEntry
						value={password}
						onChangeText={setPassword}
						editable={!loading}
						style={styles.input}
					/>
				</View>

				{/* Confirm Password Input */}
				<View style={styles.inputContainer}>
					<MaterialIcons name="lock-outline" size={20} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Confirm new password"
						placeholderTextColor="#9ba1a6"
						secureTextEntry
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						editable={!loading}
						style={styles.input}
					/>
				</View>

				{/* Reset Password Button */}
				<Pressable
					style={[styles.primaryButton, loading && styles.buttonDisabled]}
					onPress={handleResetPassword}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.primaryButtonText}>Reset Password</Text>
					)}
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
		marginBottom: 32,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
	},
	errorIconContainer: {
		alignItems: 'center',
		marginBottom: 24,
	},
	errorTitle: {
		fontSize: 28,
		fontWeight: '800',
		color: '#1F2937',
		textAlign: 'center',
		marginBottom: 16,
	},
	errorMessage: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 32,
	},
	backButton: {
		alignItems: 'center',
		paddingVertical: 12,
	},
	backText: {
		fontSize: 14,
		color: BRAND_COLOR,
		fontWeight: '600',
	},
});

