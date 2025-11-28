import { BRAND_COLOR } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);
	const { signIn, signInWithGoogle } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const handleLogin = async () => {
		if (!email.trim() || !password.trim()) {
			alert('Error', 'Please enter both email and password');
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}

		setLoading(true);
		const { error } = await signIn(email.trim(), password);
		setLoading(false);

		if (error) {
			alert('Login Failed', error.message || 'Invalid email or password');
		}
	};

	const handleGoogleSignIn = async () => {
		setGoogleLoading(true);
		const { error } = await signInWithGoogle();
		setGoogleLoading(false);

		if (error) {
			alert('Google Sign-In Failed', error.message || 'Unable to sign in with Google. Please try again.');
		}
	};

	return (
		<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
			<ScrollView 
				style={styles.scrollView}
				contentContainerStyle={styles.content}
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
					<Text style={styles.welcomeText}>Welcome back!</Text>
					<Text style={styles.subtitleText}>Sign in to continue to Giftyy</Text>
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
						placeholder="Password"
						placeholderTextColor="#9ba1a6"
						secureTextEntry
						value={password}
						onChangeText={setPassword}
						editable={!loading}
						style={styles.input}
					/>
				</View>

				{/* Login Button */}
				<Pressable
					style={[styles.primaryButton, loading && styles.buttonDisabled]}
					onPress={handleLogin}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.primaryButtonText}>Sign In</Text>
					)}
				</Pressable>

				{/* Forgot Password Link */}
				<Pressable
					style={styles.forgotPasswordButton}
					onPress={() => router.push('/(auth)/forgot-password')}
					disabled={loading || googleLoading}
				>
					<Text style={styles.forgotPasswordText}>Forgot password?</Text>
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
								<Text style={styles.googleIconText}>G</Text>
							</View>
							<Text style={styles.googleButtonText}>Continue with Google</Text>
						</>
					)}
				</Pressable>

				{/* Sign Up Link */}
				<View style={styles.signupContainer}>
					<Text style={styles.signupText}>Don't have an account? </Text>
					<Link href="/(auth)/signup" asChild>
						<Pressable disabled={loading || googleLoading}>
							<Text style={styles.signupLink}>Sign up</Text>
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
	scrollView: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 40,
		paddingBottom: 32,
	},
	header: {
		alignItems: 'center',
		marginBottom: 40,
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
	forgotPasswordButton: {
		alignSelf: 'center',
		marginTop: 8,
		marginBottom: 16,
	},
	forgotPasswordText: {
		fontSize: 14,
		color: BRAND_COLOR,
		fontWeight: '600',
	},
	signupContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 16,
		marginBottom: 16,
	},
	signupText: {
		fontSize: 14,
		color: '#6B7280',
	},
	signupLink: {
		fontSize: 14,
		color: BRAND_COLOR,
		fontWeight: '700',
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
	googleIconText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#4285F4',
		fontFamily: 'Roboto',
	},
	googleButtonText: {
		color: '#1F2937',
		fontSize: 16,
		fontWeight: '600',
	},
});
