import { ConversationalFormWizard } from '@/components/forms/ConversationalFormWizard';
import { ConversationalStep } from '@/components/forms/ConversationalStep';
import { COUNTRY_CODES, CountryCode } from '@/constants/country-codes';
import { BRAND_COLOR } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhoneInput } from '@/lib/utils/phone';
import { isDuplicateUserError } from '@/utils/supabase-errors';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, useRouter } from 'expo-router';
import { AsYouType, CountryCode as LibPhoneNumberCountryCode, isValidPhoneNumber } from 'libphonenumber-js';
import React, { useState } from 'react';
import { FlatList, Linking, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

function SignupNameStep({ formData, updateFormData, onNext, onBack }: any) {
	const { alert } = useAlert();

	const handleNext = () => {
		if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
			alert('Error', 'Please enter your first and last name');
			return;
		}
		onNext();
	};

	return (
		<ConversationalStep
			question="Welcome to Giftyy! What's your name?"
			avatarSource={require('@/assets/images/giftyy.png')}
			onNext={handleNext}
			onBack={onBack}
		>
			<View style={styles.inputWrapper}>
				<View style={[styles.inputContainer, { marginBottom: 12 }]}>
					<MaterialIcons name="person" size={24} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="First name"
						placeholderTextColor="#9ba1a6"
						autoCapitalize="words"
						value={formData.firstName || ''}
						onChangeText={(text) => updateFormData({ firstName: text })}
						style={styles.input}
						autoFocus
					/>
				</View>
				<View style={styles.inputContainer}>
					<MaterialIcons name="person" size={24} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Last name"
						placeholderTextColor="#9ba1a6"
						autoCapitalize="words"
						value={formData.lastName || ''}
						onChangeText={(text) => updateFormData({ lastName: text })}
						style={styles.input}
					/>
				</View>
			</View>

			<View style={styles.helperContainer}>
				<Text style={styles.helperText}>Already have an account? </Text>
				<Link href="/(auth)/login" asChild>
					<Pressable>
						<Text style={styles.linkText}>Sign in</Text>
					</Pressable>
				</Link>
			</View>

			<SocialFooter />
		</ConversationalStep>
	);
}

function SignupEmailStep({ formData, updateFormData, onNext, onBack }: any) {
	const { alert } = useAlert();
	const { checkEmailExists } = useAuth();
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleNext = async () => {
		const email = formData.email?.trim() || '';
		if (!email) {
			alert('Error', 'Please enter your email address');
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			alert('Error', 'Please enter a valid email address');
			return;
		}

		setLoading(true);
		try {
			const { exists, error } = await checkEmailExists(email);
			if (error) {
				alert('Error', error.message || 'Could not verify your email at this time.');
				return;
			}
			if (exists) {
				alert(
					'Account Exists',
					'An account with this email already exists.\nPlease sign in instead.',
					[
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Sign In', style: 'primary', onPress: () => router.replace('/(auth)/login') }
					]
				);
				return;
			}
			onNext(); // Advance to phone step if email is valid and available
		} finally {
			setLoading(false);
		}
	};

	return (
		<ConversationalStep
			question={`Nice to meet you, ${formData.firstName || 'friend'}! What's your email?`}
			avatarSource={require('@/assets/images/giftyy.png')}
			onNext={handleNext}
			onBack={onBack}
			loading={loading}
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

function SignupPhoneStep({ formData, updateFormData, onNext, onBack }: any) {
	const { alert } = useAlert();
	const [country, setCountry] = useState<CountryCode>(
		COUNTRY_CODES.find(c => c.code === (formData.countryCode || '+1')) || COUNTRY_CODES[0]
	);
	const [showCountryPicker, setShowCountryPicker] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const filteredCountries = COUNTRY_CODES.filter(c =>
		c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
		c.code.includes(searchQuery)
	);

	const handlePhoneChange = (text: string) => {
		const formatter = new AsYouType(country.iso as LibPhoneNumberCountryCode);
		const formatted = formatter.input(text);

		const currentPhone = formData.phone || '';
		const currentNormalized = normalizePhoneInput(currentPhone);
		const nextNormalized = normalizePhoneInput(text);

		// If user is adding a digit (next is longer than current)
		if (nextNormalized.length > currentNormalized.length) {
			// Check if the current value (before this change) was already valid
			const dialCode = country.code;
			const numberPart = currentNormalized.startsWith(dialCode) ? currentNormalized.slice(dialCode.length) : currentNormalized;
			const fullNumber = dialCode + numberPart;

			if (isValidPhoneNumber(fullNumber, country.iso as LibPhoneNumberCountryCode)) {
				// It was already valid, so don't allow adding more digits
				return;
			}
		}

		updateFormData({ phone: formatted });
	};

	const isValid = (() => {
		const phone = formData.phone || '';
		const normalized = normalizePhoneInput(phone);
		if (!normalized) return false;

		// Ensure we check with the full international prefix for isValidPhoneNumber
		const dialCode = country.code; // e.g. +1 or +355
		const numberPart = normalized.startsWith(dialCode) ? normalized.slice(dialCode.length) : normalized;
		const fullNumber = dialCode + numberPart;

		return isValidPhoneNumber(fullNumber, country.iso as LibPhoneNumberCountryCode);
	})();

	const handleNext = () => {
		if (!isValid) {
			alert('Invalid Number', `The mobile number provided is not valid for ${country.country}.`);
			return;
		}

		updateFormData({ countryCode: country.code });
		onNext();
	};

	return (
		<ConversationalStep
			question="What's your mobile number?"
			description="Your phone number connects you to your gifting circle."
			avatarSource={require('@/assets/images/giftyy.png')}
			onNext={handleNext}
			onBack={onBack}
		>
			<View style={styles.inputWrapper}>
				<View style={[
					styles.phoneInputContainer,
					formData.phone && !isValid && { borderColor: '#ffa500' },
					formData.phone && isValid && { borderColor: '#4CAF50' }
				]}>
					<TouchableOpacity
						style={styles.countryCodeButton}
						onPress={() => setShowCountryPicker(true)}
					>
						<Text style={styles.countryCodeFlag}>{country.flag}</Text>
						<Text style={styles.countryCodeText}>{country.code}</Text>
						<Text style={styles.dropdownArrow}>▼</Text>
					</TouchableOpacity>

					<TextInput
						style={[styles.input, { flex: 1 }]}
						value={formData.phone || ''}
						onChangeText={handlePhoneChange}
						placeholder="(555) 000-0000"
						placeholderTextColor="#9ba1a6"
						keyboardType="phone-pad"
						autoFocus
					/>
				</View>
				{formData.phone && !isValid && (
					<Text style={styles.validationText}>Enter a valid {country.country} number</Text>
				)}
			</View>

			<SocialFooter />

			<Modal
				visible={showCountryPicker}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setShowCountryPicker(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.pickerModal}>
						<View style={styles.dragHandle} />
						<View style={styles.pickerHeader}>
							<Text style={styles.pickerTitle}>Select Country</Text>
							<TouchableOpacity onPress={() => setShowCountryPicker(false)}>
								<Text style={styles.closeButton}>×</Text>
							</TouchableOpacity>
						</View>

						<TextInput
							style={styles.searchInput}
							placeholder="Search country..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>

						<FlatList
							data={filteredCountries}
							keyExtractor={(item) => item.country}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.countryOption}
									onPress={() => {
										setCountry(item);
										// Re-format existing number with new country context
										handlePhoneChange(formData.phone || '');
										setShowCountryPicker(false);
										setSearchQuery('');
									}}
								>
									<Text style={styles.countryFlag}>{item.flag}</Text>
									<View style={{ flex: 1 }}>
										<Text style={styles.countryName}>{item.country}</Text>
									</View>
									<Text style={styles.countryCodeBadge}>{item.code}</Text>
								</TouchableOpacity>
							)}
							contentContainerStyle={styles.countryList}
						/>
					</View>
				</View>
			</Modal>
		</ConversationalStep>
	);
}

function SignupPasswordStep({ formData, updateFormData, onNext, onBack, loading }: any) {
	const { alert } = useAlert();

	const handleNext = () => {
		const password = formData.password || '';
		if (!password || password.length < 6) {
			alert('Error', 'Password must be at least 6 characters long');
			return;
		}
		onNext();
	};

	return (
		<ConversationalStep
			question="Almost done! Let's secure your account with a password."
			avatarSource={require('@/assets/images/giftyy.png')}
			onNext={handleNext}
			onBack={onBack}
			loading={loading}
			nextLabel="Create Account"
		>
			<View style={styles.inputWrapper}>
				<View style={styles.inputContainer}>
					<MaterialIcons name="lock" size={24} color="#9ba1a6" style={styles.inputIcon} />
					<TextInput
						placeholder="Password (min. 6 chars)"
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

			<View style={[styles.helperContainer, { marginTop: 16 }]}>
				<Text style={styles.termsText}>
					By signing up, you agree to our Terms of Service and Privacy Policy
				</Text>
			</View>

			<SocialFooter />
		</ConversationalStep>
	);
}

export default function SignupScreen() {
	const { signUp } = useAuth();
	const { alert } = useAlert();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [loading, setLoading] = useState(false);

	const handleSignup = async (data: any) => {
		const { email, password, firstName, lastName, phone, countryCode } = data;
		setLoading(true);
		try {
			// Normalize phone number: combine country code + phone digits
			const rawPhone = phone || '';
			const dialCode = countryCode || '+1';
			const normalizedPhone = normalizePhoneInput(rawPhone.startsWith(dialCode) ? rawPhone : `${dialCode}${rawPhone}`);

			const { error } = await signUp(
				email.trim(),
				password,
				firstName.trim(),
				lastName.trim(),
				normalizedPhone
			);

			if (error) {
				const errorMessage = error.message || 'Unable to create account. Please try again.';
				// Simple duplicate check logic
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

			// Route to verification immediately
			router.replace(`/(auth)/verify-email?email=${encodeURIComponent(email.trim())}`);
		} catch (err: any) {
			console.error('Unexpected signup error:', err);
			const errorMsg = err?.message || 'An unexpected error occurred. Please try again.';
			alert('Signup Failed', errorMsg);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace('/(auth)/onboarding'); // Fallback route
		}
	};

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ConversationalFormWizard
				onComplete={handleSignup}
				onCancel={handleCancel}
				hideProgress
			>
				<SignupNameStep />
				<SignupEmailStep />
				<SignupPhoneStep />
				<SignupPasswordStep loading={loading} />
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
	helperContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
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
	termsText: {
		fontSize: 14,
		color: '#9CA3AF',
		lineHeight: 20,
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
	phoneInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 2,
		borderColor: '#E5E7EB',
		borderRadius: 16,
		paddingHorizontal: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 4,
		elevation: 1,
	},
	countryCodeButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingRight: 12,
		borderRightWidth: 1,
		borderRightColor: '#E5E7EB',
		marginRight: 12,
	},
	countryCodeFlag: {
		fontSize: 20,
		marginRight: 6,
	},
	countryCodeText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
	},
	dropdownArrow: {
		fontSize: 10,
		color: '#9CA3AF',
		marginLeft: 4,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	pickerModal: {
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: '80%',
		paddingBottom: 40,
	},
	dragHandle: {
		width: 40,
		height: 4,
		backgroundColor: '#E5E7EB',
		borderRadius: 2,
		alignSelf: 'center',
		marginTop: 12,
	},
	pickerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	pickerTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1F2937',
	},
	closeButton: {
		fontSize: 24,
		color: '#9CA3AF',
	},
	searchInput: {
		backgroundColor: '#F3F4F6',
		margin: 16,
		padding: 12,
		borderRadius: 12,
		fontSize: 16,
	},
	countryList: {
		paddingHorizontal: 16,
	},
	countryOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	countryFlag: {
		fontSize: 24,
		marginRight: 16,
	},
	countryName: {
		flex: 1,
		fontSize: 16,
		color: '#1F2937',
	},
	countryCodeBadge: {
		fontSize: 14,
		color: '#6B7280',
		fontWeight: '600',
	},
	validationText: {
		fontSize: 12,
		color: '#ffa500',
		marginTop: 8,
		marginLeft: 4,
		fontWeight: '500',
	},
});
