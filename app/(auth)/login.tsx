import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { checkThrottle, resetThrottle } from '@/lib/auth/throttle';
import { hapticMedium, hapticSuccess, hapticError } from '@/lib/utils/haptics';
import { scale, normalizeFont } from '@/utils/responsive';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

export default function LoginScreen() {
	const { signIn } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const passwordRef = useRef<TextInput>(null);

	const handleLogin = async () => {
		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			alert('Error', 'Please enter your email address');
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}
		if (!password) {
			alert('Error', 'Please enter your password');
			return;
		}

		const throttle = checkThrottle('login');
		if (!throttle.allowed) {
			alert('Too Many Attempts', `Please wait ${throttle.retryAfterSeconds} seconds before trying again.`);
			return;
		}

		hapticMedium();
		setLoading(true);
		const { error } = await signIn(trimmedEmail, password);
		setLoading(false);

		if (error && error.name !== 'EmailNotVerified') {
			hapticError();
			alert('Login Failed', error.message || 'Invalid email or password');
		} else if (!error) {
			hapticSuccess();
			resetThrottle('login');
		}
	};

	const isLoading = loading;

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
						<Text style={styles.cardTitle}>Welcome back</Text>
						<Text style={styles.cardSubtitle}>Sign in to your account</Text>

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
									returnKeyType="next"
									value={email}
									onChangeText={setEmail}
									onSubmitEditing={() => passwordRef.current?.focus()}
									style={styles.input}
									editable={!isLoading}
									accessibilityLabel="Email address"
								/>
							</View>
						</View>

						{/* Password */}
						<View style={styles.fieldGroup}>
							<View style={styles.labelRow}>
								<Text style={styles.label}>Password</Text>
								<Pressable
									onPress={() => router.push('/(auth)/forgot-password')}
									disabled={isLoading}
									hitSlop={8}
								>
									<Text style={styles.forgotText}>Forgot?</Text>
								</Pressable>
							</View>
							<View style={[styles.inputContainer, loading && styles.inputDisabled]}>
								<Ionicons name="lock-closed-outline" size={scale(20)} color={T.colors.gray400} />
								<TextInput
									ref={passwordRef}
									placeholder="Enter your password"
									placeholderTextColor={T.colors.gray400}
									secureTextEntry={!showPassword}
									autoComplete="password"
									textContentType="password"
									returnKeyType="go"
									value={password}
									onChangeText={setPassword}
									onSubmitEditing={handleLogin}
									style={styles.input}
									editable={!isLoading}
									accessibilityLabel="Password"
								/>
								<Pressable
									onPress={() => setShowPassword(!showPassword)}
									hitSlop={8}
									accessibilityRole="button"
									accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
								>
									<Ionicons
										name={showPassword ? 'eye-off-outline' : 'eye-outline'}
										size={scale(20)}
										color={T.colors.gray400}
									/>
								</Pressable>
							</View>
						</View>

						{/* Sign In Button */}
						<Pressable
							style={({ pressed }) => [
								styles.signInButton,
								pressed && styles.signInButtonPressed,
								isLoading && styles.signInButtonDisabled,
							]}
							onPress={handleLogin}
							disabled={isLoading}
							accessibilityRole="button"
							accessibilityLabel="Sign in"
							accessibilityState={{ disabled: isLoading, busy: loading }}
						>
							{loading ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<Text style={styles.signInButtonText}>Sign In</Text>
							)}
						</Pressable>
					</View>

					{/* Sign Up Link */}
					<View style={styles.signUpRow}>
						<Text style={styles.signUpText}>Don't have an account? </Text>
						<Link href="/(auth)/signup" asChild>
							<Pressable hitSlop={8}>
								<Text style={styles.signUpLink}>Sign up</Text>
							</Pressable>
						</Link>
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
	},

	// Fields
	fieldGroup: {
		marginBottom: scale(18),
	},
	labelRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	label: {
		fontSize: T.typography.sizes.base,
		fontWeight: T.typography.weights.semibold,
		color: T.colors.gray700,
		marginBottom: T.spacing.sm,
	},
	forgotText: {
		fontSize: T.typography.sizes.sm,
		fontWeight: T.typography.weights.semibold,
		color: T.colors.primary,
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

	// Sign In Button
	signInButton: {
		backgroundColor: T.colors.primary,
		borderRadius: scale(14),
		paddingVertical: T.spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: scale(6),
		...T.shadows.sm,
	},
	signInButtonPressed: {
		backgroundColor: T.colors.primaryDark,
	},
	signInButtonDisabled: {
		opacity: 0.7,
	},
	signInButtonText: {
		color: '#ffffff',
		fontSize: T.typography.sizes.md,
		fontWeight: T.typography.weights.bold,
		letterSpacing: 0.3,
	},

	// Sign Up
	signUpRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: scale(28),
	},
	signUpText: {
		fontSize: normalizeFont(15),
		color: T.colors.gray500,
	},
	signUpLink: {
		fontSize: normalizeFont(15),
		fontWeight: T.typography.weights.bold,
		color: T.colors.primary,
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
