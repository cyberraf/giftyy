import { ConversationalFormWizard } from '@/components/forms/ConversationalFormWizard';
import { ConversationalStep } from '@/components/forms/ConversationalStep';
import { BRAND_COLOR } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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

function LoginEmailStep({ formData, updateFormData, onNext, onBack }: any) {
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
			question="Welcome back! What's your email?"
			avatarSource={require('@/assets/images/giftyy.png')}
			onNext={handleNext}
			onBack={onBack}
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
						autoFocus
					/>
				</View>
			</View>

			<View style={styles.helperContainer}>
				<Text style={styles.helperText}>Don't have an account? </Text>
				<Link href="/(auth)/signup" asChild>
					<Pressable>
						<Text style={styles.linkText}>Sign up</Text>
					</Pressable>
				</Link>
			</View>

			<SocialFooter />
		</ConversationalStep>
	);
}

function LoginPasswordStep({ formData, updateFormData, onNext, onBack, loading }: any) {
	const { alert } = useAlert();
	const router = useRouter();

	const handleNext = () => {
		const password = formData.password || '';
		if (!password) {
			alert('Error', 'Please enter your password');
			return;
		}
		onNext();
	};

	return (
		<ConversationalStep
			question="Great. Now let's get your password."
			avatarSource={require('@/assets/images/giftyy.png')}
			onNext={handleNext}
			onBack={onBack}
			loading={loading}
			nextLabel="Sign In"
		>
			<View style={styles.inputWrapper}>
				<View style={styles.inputContainer}>
					<MaterialIcons name="lock" size={24} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Password"
						placeholderTextColor="#9ba1a6"
						secureTextEntry
						editable={!loading}
						value={formData.password || ''}
						onChangeText={(text) => updateFormData({ password: text })}
						style={styles.input}
						autoFocus
					/>
				</View>
			</View>

			<View style={styles.helperContainer}>
				<Pressable onPress={() => router.push('/(auth)/forgot-password')} disabled={loading}>
					<Text style={styles.linkText}>Forgot password?</Text>
				</Pressable>
			</View>

			<SocialFooter />
		</ConversationalStep>
	);
}

export default function LoginScreen() {
	const { signIn } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [loading, setLoading] = useState(false);

	const handleLogin = async (data: any) => {
		const { email, password } = data;
		setLoading(true);
		const { error } = await signIn(email.trim(), password);
		setLoading(false);

		if (error && error.name !== 'EmailNotVerified') {
			alert('Login Failed', error.message || 'Invalid email or password');
		}
	};

	const handleCancel = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace('/(auth)/onboarding'); // Replace with your actual onboarding screen if exists
		}
	};

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ConversationalFormWizard
				onComplete={handleLogin}
				onCancel={handleCancel}
				hideProgress
			>
				{/* Notice: cloneElement in Wizard injects props, so don't pass them explicitly here unless they are custom. */}
				{/* We pass 'loading' to the password step specifically as a custom prop */}
				<LoginEmailStep />
				<LoginPasswordStep loading={loading} />
			</ConversationalFormWizard>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8F9FA', // Matching ConversationalStep background
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
	helperContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 24,
		paddingHorizontal: 8,
	},
	helperText: {
		fontSize: 15,
		color: '#6B7280',
	},
	linkText: {
		fontSize: 15,
		color: BRAND_COLOR,
		fontWeight: '700',
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
});
