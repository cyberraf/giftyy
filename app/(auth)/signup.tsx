import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { COUNTRY_CODES, CountryCode } from '@/constants/country-codes';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhoneInput } from '@/lib/utils/phone';
import { isDuplicateUserError } from '@/utils/supabase-errors';
import { checkThrottle, resetThrottle } from '@/lib/auth/throttle';
import { trackFunnel } from '@/lib/analytics';
import { hapticMedium, hapticSuccess, hapticError } from '@/lib/utils/haptics';
import { scale, normalizeFont } from '@/utils/responsive';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { AsYouType, CountryCode as LibPhoneNumberCountryCode, isValidPhoneNumber } from 'libphonenumber-js/min';
import React, { useRef, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Image,
	KeyboardAvoidingView,
	Linking,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const T = GIFTYY_THEME;

export default function SignupScreen() {
	const { signUp, checkEmailExists, checkPhoneExists } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const [country, setCountry] = useState<CountryCode>(
		COUNTRY_CODES.find(c => c.code === '+1') || COUNTRY_CODES[0]
	);
	const [showCountryPicker, setShowCountryPicker] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const lastNameRef = useRef<TextInput>(null);
	const emailRef = useRef<TextInput>(null);
	const phoneRef = useRef<TextInput>(null);
	const passwordRef = useRef<TextInput>(null);

	const filteredCountries = COUNTRY_CODES.filter(c =>
		c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
		c.code.includes(searchQuery)
	);

	const handlePhoneChange = (text: string) => {
		const formatter = new AsYouType(country.iso as LibPhoneNumberCountryCode);
		const formatted = formatter.input(text);

		const currentNormalized = normalizePhoneInput(phone);
		const nextNormalized = normalizePhoneInput(text);

		if (nextNormalized.length > currentNormalized.length) {
			const dialCode = country.code;
			const numberPart = currentNormalized.startsWith(dialCode) ? currentNormalized.slice(dialCode.length) : currentNormalized;
			const fullNumber = dialCode + numberPart;
			if (isValidPhoneNumber(fullNumber, country.iso as LibPhoneNumberCountryCode)) {
				return;
			}
		}

		setPhone(formatted);
	};

	const isPhoneValid = (() => {
		const normalized = normalizePhoneInput(phone);
		if (!normalized) return false;
		const dialCode = country.code;
		const numberPart = normalized.startsWith(dialCode) ? normalized.slice(dialCode.length) : normalized;
		const fullNumber = dialCode + numberPart;
		return isValidPhoneNumber(fullNumber, country.iso as LibPhoneNumberCountryCode);
	})();

	const handleSignup = async () => {
		if (!firstName.trim() || !lastName.trim()) {
			alert('Error', 'Please enter your first and last name');
			return;
		}

		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			alert('Error', 'Please enter your email address');
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}

		if (!isPhoneValid) {
			alert('Error', `Please enter a valid ${country.country} phone number`);
			return;
		}

		if (!password || password.length < 6) {
			alert('Error', 'Password must be at least 6 characters');
			return;
		}

		hapticMedium();
		setLoading(true);
		try {
			// Check if email already exists
			const { exists, error: checkError } = await checkEmailExists(trimmedEmail);
			if (checkError) {
				alert('Error', checkError.message || 'Could not verify your email at this time.');
				return;
			}
			if (exists) {
				alert(
					'Account Exists',
					'An account with this email already exists.\nPlease sign in instead.',
					[
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Sign In', style: 'primary', onPress: () => router.replace('/(auth)/login') },
					]
				);
				return;
			}

			// Normalize phone
			const normalizedPhone = normalizePhoneInput(
				phone.startsWith(country.code) ? phone : `${country.code}${phone}`
			);

			// Check if phone already exists
			const { exists: phoneExists, error: phoneCheckError } = await checkPhoneExists(normalizedPhone);
			if (phoneCheckError) {
				alert('Error', 'Could not verify your phone number at this time.');
				return;
			}
			if (phoneExists) {
				alert(
					'Phone Already Registered',
					'An account with this phone number already exists.\nPlease use a different number or sign in.',
					[
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Sign In', style: 'primary', onPress: () => router.replace('/(auth)/login') },
					]
				);
				return;
			}

			const throttle = checkThrottle('signup');
			if (!throttle.allowed) {
				alert('Too Many Attempts', `Please wait ${throttle.retryAfterSeconds} seconds before trying again.`);
				return;
			}

			const { error } = await signUp(
				trimmedEmail,
				password,
				firstName.trim(),
				lastName.trim(),
				normalizedPhone
			);

			if (error) {
				hapticError();
				const errorMessage = error.message || 'Unable to create account. Please try again.';
				if (
					isDuplicateUserError?.(error) ||
					errorMessage.toLowerCase().includes('already exists') ||
					errorMessage.toLowerCase().includes('already registered') ||
					errorMessage.toLowerCase().includes('account with this email') ||
					errorMessage.toLowerCase().includes('network')
				) {
					alert(
						'Account Already Exists',
						'This email may already be registered.\n\nWould you like to try signing in instead?',
						[
							{ text: 'Cancel', style: 'cancel' },
							{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
						]
					);
				} else {
					alert('Signup Failed', errorMessage);
				}
				return;
			}

			hapticSuccess();
			resetThrottle('signup');
			trackFunnel('signup_complete');
			router.replace(`/(auth)/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
		} catch (err: any) {
			console.error('Unexpected signup error:', err);
			alert('Signup Failed', err?.message || 'An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

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
						{ paddingTop: insets.top + scale(20), paddingBottom: insets.bottom + scale(32) },
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
						<Text style={styles.cardTitle}>Create your account</Text>
						<Text style={styles.cardSubtitle}>Join the gifting community</Text>

						{/* First & Last Name — side by side */}
						<View style={styles.nameRow}>
							<View style={[styles.fieldGroup, styles.nameField]}>
								<Text style={styles.label}>First name</Text>
								<View style={[styles.inputContainer, loading && styles.inputDisabled]}>
									<Ionicons name="person-outline" size={scale(18)} color={T.colors.gray400} />
									<TextInput
										placeholder="First"
										placeholderTextColor={T.colors.gray400}
										autoCapitalize="words"
										autoComplete="given-name"
										textContentType="givenName"
										returnKeyType="next"
										value={firstName}
										onChangeText={setFirstName}
										onSubmitEditing={() => lastNameRef.current?.focus()}
										style={styles.input}
										editable={!loading}
										accessibilityLabel="First name"
									/>
								</View>
							</View>

							<View style={[styles.fieldGroup, styles.nameField]}>
								<Text style={styles.label}>Last name</Text>
								<View style={[styles.inputContainer, loading && styles.inputDisabled]}>
									<Ionicons name="person-outline" size={scale(18)} color={T.colors.gray400} />
									<TextInput
										ref={lastNameRef}
										placeholder="Last"
										placeholderTextColor={T.colors.gray400}
										autoCapitalize="words"
										autoComplete="family-name"
										textContentType="familyName"
										returnKeyType="next"
										value={lastName}
										onChangeText={setLastName}
										onSubmitEditing={() => emailRef.current?.focus()}
										style={styles.input}
										editable={!loading}
										accessibilityLabel="Last name"
									/>
								</View>
							</View>
						</View>

						{/* Email */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Email</Text>
							<View style={[styles.inputContainer, loading && styles.inputDisabled]}>
								<Ionicons name="mail-outline" size={scale(20)} color={T.colors.gray400} />
								<TextInput
									ref={emailRef}
									placeholder="you@example.com"
									placeholderTextColor={T.colors.gray400}
									autoCapitalize="none"
									keyboardType="email-address"
									autoComplete="email"
									textContentType="emailAddress"
									returnKeyType="next"
									value={email}
									onChangeText={setEmail}
									onSubmitEditing={() => phoneRef.current?.focus()}
									style={styles.input}
									editable={!loading}
									accessibilityLabel="Email address"
								/>
							</View>
						</View>

						{/* Phone */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Phone number</Text>
							<View style={[
								styles.phoneRow,
								loading && styles.inputDisabled,
								phone && !isPhoneValid && styles.phoneInvalid,
								phone && isPhoneValid && styles.phoneValid,
							]}>
								<TouchableOpacity
									style={styles.countryPicker}
									onPress={() => setShowCountryPicker(true)}
									disabled={loading}
								>
									<Text style={styles.countryFlag}>{country.flag}</Text>
									<Text style={styles.countryCode}>{country.code}</Text>
									<Ionicons name="chevron-down" size={scale(14)} color={T.colors.gray400} />
								</TouchableOpacity>
								<View style={styles.phoneDivider} />
								<TextInput
									ref={phoneRef}
									placeholder="(555) 000-0000"
									placeholderTextColor={T.colors.gray400}
									keyboardType="phone-pad"
									value={phone}
									onChangeText={handlePhoneChange}
									style={[styles.input, styles.phoneInput]}
									editable={!loading}
									accessibilityLabel="Phone number"
								/>
							</View>
							{phone && !isPhoneValid && (
								<Text style={styles.validationHint}>Enter a valid {country.country} number</Text>
							)}
						</View>

						{/* Password */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Password</Text>
							<View style={[styles.inputContainer, loading && styles.inputDisabled]}>
								<Ionicons name="lock-closed-outline" size={scale(20)} color={T.colors.gray400} />
								<TextInput
									ref={passwordRef}
									placeholder="Min. 6 characters"
									placeholderTextColor={T.colors.gray400}
									secureTextEntry={!showPassword}
									autoComplete="new-password"
									textContentType="newPassword"
									returnKeyType="go"
									value={password}
									onChangeText={setPassword}
									onSubmitEditing={handleSignup}
									style={styles.input}
									editable={!loading}
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

						{/* Terms */}
						<Text style={styles.termsText}>
							By signing up, you agree to our Terms of Service and Privacy Policy
						</Text>

						{/* Create Account Button */}
						<Pressable
							style={({ pressed }) => [
								styles.primaryButton,
								pressed && styles.primaryButtonPressed,
								loading && styles.primaryButtonDisabled,
							]}
							onPress={handleSignup}
							disabled={loading}
							accessibilityRole="button"
							accessibilityLabel="Create account"
							accessibilityState={{ disabled: loading, busy: loading }}
						>
							{loading ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<Text style={styles.primaryButtonText}>Create Account</Text>
							)}
						</Pressable>
					</View>

					{/* Sign In Link */}
					<View style={styles.signInRow}>
						<Text style={styles.signInText}>Already have an account? </Text>
						<Link href="/(auth)/login" asChild>
							<Pressable hitSlop={8}>
								<Text style={styles.signInLink}>Sign in</Text>
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

			{/* Country Picker Modal */}
			<Modal
				visible={showCountryPicker}
				animationType="slide"
				transparent
				onRequestClose={() => setShowCountryPicker(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.pickerModal}>
						<View style={styles.dragHandle} />
						<View style={styles.pickerHeader}>
							<Text style={styles.pickerTitle}>Select Country</Text>
							<Pressable onPress={() => setShowCountryPicker(false)} hitSlop={8}>
								<Ionicons name="close" size={scale(24)} color={T.colors.gray400} />
							</Pressable>
						</View>

						<View style={styles.searchContainer}>
							<Ionicons name="search-outline" size={scale(18)} color={T.colors.gray400} />
							<TextInput
								style={styles.searchInput}
								placeholder="Search country..."
								placeholderTextColor={T.colors.gray400}
								value={searchQuery}
								onChangeText={setSearchQuery}
							/>
						</View>

						<FlatList
							data={filteredCountries}
							keyExtractor={(item) => item.country}
							renderItem={({ item }) => (
								<Pressable
									style={({ pressed }) => [
										styles.countryOption,
										pressed && styles.countryOptionPressed,
									]}
									onPress={() => {
										setCountry(item);
										handlePhoneChange(phone);
										setShowCountryPicker(false);
										setSearchQuery('');
									}}
								>
									<Text style={styles.countryOptionFlag}>{item.flag}</Text>
									<Text style={styles.countryName} numberOfLines={1}>{item.country}</Text>
									<Text style={styles.countryCodeBadge}>{item.code}</Text>
								</Pressable>
							)}
							contentContainerStyle={styles.countryList}
						/>
					</View>
				</View>
			</Modal>
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
		marginBottom: T.spacing.lg,
	},
	logo: {
		width: scale(72),
		height: scale(72),
	},
	tagline: {
		marginTop: scale(2),
		fontSize: T.typography.sizes.lg,
		color: T.colors.primary,
		fontWeight: T.typography.weights.extrabold,
	},

	// Card
	card: {
		backgroundColor: '#ffffff',
		borderRadius: T.radius.xl,
		padding: T.spacing.xl,
		borderWidth: 1,
		borderColor: T.colors.gray200,
		...T.shadows.md,
	},
	cardTitle: {
		fontSize: T.typography.sizes['2xl'],
		fontWeight: T.typography.weights.bold,
		color: T.colors.gray900,
		marginBottom: scale(2),
	},
	cardSubtitle: {
		fontSize: T.typography.sizes.base,
		color: T.colors.gray500,
		marginBottom: T.spacing.lg,
	},

	// Fields
	fieldGroup: {
		marginBottom: T.spacing.md,
	},
	nameRow: {
		flexDirection: 'row',
		gap: T.spacing.md,
	},
	nameField: {
		flex: 1,
	},
	label: {
		fontSize: T.typography.sizes.sm,
		fontWeight: T.typography.weights.semibold,
		color: T.colors.gray700,
		marginBottom: scale(5),
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: T.colors.gray50,
		borderWidth: 1.5,
		borderColor: T.colors.gray200,
		borderRadius: scale(14),
		paddingHorizontal: T.spacing.md,
		gap: T.spacing.sm,
	},
	inputDisabled: {
		opacity: 0.6,
	},
	input: {
		flex: 1,
		paddingVertical: scale(11),
		fontSize: normalizeFont(15),
		color: T.colors.gray900,
		fontWeight: T.typography.weights.normal,
	},

	// Phone
	phoneRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: T.colors.gray50,
		borderWidth: 1.5,
		borderColor: T.colors.gray200,
		borderRadius: scale(14),
		paddingLeft: T.spacing.md,
	},
	phoneInvalid: {
		borderColor: '#f59e0b',
	},
	phoneValid: {
		borderColor: T.colors.success,
	},
	countryPicker: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: T.spacing.xs,
		paddingVertical: scale(11),
	},
	countryFlag: {
		fontSize: T.typography.sizes.lg,
	},
	countryCode: {
		fontSize: normalizeFont(15),
		fontWeight: T.typography.weights.semibold,
		color: T.colors.gray700,
	},
	phoneDivider: {
		width: 1,
		height: scale(24),
		backgroundColor: T.colors.gray200,
		marginHorizontal: scale(10),
	},
	phoneInput: {
		paddingLeft: 0,
	},
	validationHint: {
		fontSize: T.typography.sizes.xs,
		color: '#f59e0b',
		marginTop: scale(6),
		marginLeft: T.spacing.xs,
		fontWeight: T.typography.weights.medium,
	},

	// Terms
	termsText: {
		fontSize: T.typography.sizes.xs,
		color: T.colors.gray400,
		lineHeight: normalizeFont(17),
		marginBottom: scale(14),
	},

	// Primary Button
	primaryButton: {
		backgroundColor: T.colors.primary,
		borderRadius: scale(14),
		paddingVertical: scale(14),
		alignItems: 'center',
		justifyContent: 'center',
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

	// Sign In link
	signInRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: T.spacing.xl,
	},
	signInText: {
		fontSize: normalizeFont(15),
		color: T.colors.gray500,
	},
	signInLink: {
		fontSize: normalizeFont(15),
		fontWeight: T.typography.weights.bold,
		color: T.colors.primary,
	},

	// Socials
	socialSection: {
		alignItems: 'center',
		marginTop: T.spacing['2xl'],
		paddingBottom: T.spacing.md,
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

	// Country Picker Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
		justifyContent: 'flex-end',
	},
	pickerModal: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: T.radius['2xl'],
		borderTopRightRadius: T.radius['2xl'],
		maxHeight: '75%',
		paddingBottom: T.spacing['4xl'],
	},
	dragHandle: {
		width: scale(40),
		height: scale(4),
		backgroundColor: T.colors.gray200,
		borderRadius: scale(2),
		alignSelf: 'center',
		marginTop: T.spacing.md,
	},
	pickerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: T.spacing.xl,
		paddingVertical: T.spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: T.colors.gray100,
	},
	pickerTitle: {
		fontSize: T.typography.sizes.lg,
		fontWeight: T.typography.weights.bold,
		color: T.colors.gray900,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: T.colors.gray50,
		borderRadius: T.radius.md,
		marginHorizontal: T.spacing.lg,
		marginVertical: T.spacing.md,
		paddingHorizontal: T.spacing.md,
		gap: T.spacing.sm,
		borderWidth: 1,
		borderColor: T.colors.gray200,
	},
	searchInput: {
		flex: 1,
		paddingVertical: scale(10),
		fontSize: normalizeFont(15),
		color: T.colors.gray900,
	},
	countryList: {
		paddingHorizontal: T.spacing.lg,
	},
	countryOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: scale(14),
		borderBottomWidth: 1,
		borderBottomColor: T.colors.gray100,
		gap: T.spacing.md,
	},
	countryOptionPressed: {
		backgroundColor: T.colors.gray50,
	},
	countryOptionFlag: {
		fontSize: T.typography.sizes['2xl'],
	},
	countryName: {
		flex: 1,
		fontSize: normalizeFont(15),
		color: T.colors.gray900,
	},
	countryCodeBadge: {
		fontSize: T.typography.sizes.base,
		color: T.colors.gray500,
		fontWeight: T.typography.weights.semibold,
	},
});
