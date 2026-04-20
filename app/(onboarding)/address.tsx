import { SelectListModal } from '@/components/recipients/RecipientFormModal';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { COUNTRY_LIST, getStateOptionsForCountry, countryHasStates } from '@/constants/location-options';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
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

export default function OnboardingAddressScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { recipientProfileId, ensureRecipientProfile, refreshStatus } = useOnboarding();

	const [rpId, setRpId] = useState<string | null>(recipientProfileId);
	const [address, setAddress] = useState('');
	const [apartment, setApartment] = useState('');
	const [city, setCity] = useState('');
	const [state, setState] = useState('');
	const [zip, setZip] = useState('');
	const [country, setCountry] = useState('United States');
	const [countryModalOpen, setCountryModalOpen] = useState(false);
	const [stateModalOpen, setStateModalOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);

	const stateOptions = useMemo(() => getStateOptionsForCountry(country), [country]);
	const hasStateList = stateOptions.length > 0;
	const showStateField = countryHasStates(country);

	useEffect(() => {
		(async () => {
			try {
				let id = recipientProfileId;
				if (!id) {
					id = await ensureRecipientProfile();
				}
				setRpId(id);

				if (id) {
					const { data } = await supabase
						.from('recipient_profiles')
						.select('address, apartment, city, state, country, zip')
						.eq('id', id)
						.maybeSingle();

					if (data) {
						if (data.address) setAddress(data.address);
						if (data.apartment) setApartment(data.apartment);
						if (data.city) setCity(data.city);
						if (data.state) setState(data.state);
						if (data.zip) setZip(data.zip);
						if (data.country) setCountry(data.country);
					}
				}
			} catch (err) {
				console.error('[OnboardingAddress] Error loading:', err);
			} finally {
				setLoading(false);
			}
		})();
	}, [recipientProfileId]);

	const isValid = address.trim() && city.trim() && zip.trim() && (!showStateField || state.trim());

	const handleSave = async () => {
		if (!rpId || !isValid) return;
		setSaving(true);
		setError('');

		try {
			const { error: updateError } = await supabase
				.from('recipient_profiles')
				.update({
					address: address.trim(),
					apartment: apartment.trim() || null,
					city: city.trim(),
					state: state.trim(),
					zip: zip.trim(),
					country,
				})
				.eq('id', rpId);

			if (updateError) {
				setError(updateError.message);
				return;
			}

			await refreshStatus();
			router.back();
		} catch (err: any) {
			setError(err.message || 'Failed to save address.');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<View style={[styles.container, styles.center, { paddingTop: top }]}>
				<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<View style={[styles.container, { paddingTop: Math.max(top, 20) + 20, paddingBottom: Math.max(bottom, 20) }]}>
				<Pressable onPress={() => router.back()} style={styles.backBtn}>
					<MaterialIcons name="arrow-back" size={24} color={GIFTYY_THEME.colors.gray700} />
				</Pressable>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.header}>
						<Image
							source={require('@/assets/images/giftyy.png')}
							style={styles.avatar}
							resizeMode="contain"
						/>
						<Text style={styles.title}>Where should we send your gifts?</Text>
						<Text style={styles.subtitle}>
							Adding a mailing address helps your friends send gifts directly to you.
						</Text>
					</View>

					<View style={styles.form}>
						<View style={styles.inputGroup}>
							<Text style={styles.label}>STREET ADDRESS</Text>
							<TextInput
								value={address}
								onChangeText={setAddress}
								style={styles.input}
								placeholder="238 Market Street"
								placeholderTextColor={GIFTYY_THEME.colors.gray400}
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>APARTMENT / UNIT (OPTIONAL)</Text>
							<TextInput
								value={apartment}
								onChangeText={setApartment}
								style={styles.input}
								placeholder="Apt 4B"
								placeholderTextColor={GIFTYY_THEME.colors.gray400}
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>COUNTRY</Text>
							<TouchableOpacity
								onPress={() => setCountryModalOpen(true)}
								style={[styles.input, { justifyContent: 'center' }]}
							>
								<Text style={{ color: country ? GIFTYY_THEME.colors.gray900 : GIFTYY_THEME.colors.gray400 }}>
									{country}
								</Text>
							</TouchableOpacity>
						</View>

						<View style={{ flexDirection: 'row', gap: 12 }}>
							<View style={[styles.inputGroup, { flex: 1 }]}>
								<Text style={styles.label}>CITY</Text>
								<TextInput
									value={city}
									onChangeText={setCity}
									style={styles.input}
									placeholder="San Francisco"
									placeholderTextColor={GIFTYY_THEME.colors.gray400}
								/>
							</View>
							<View style={[styles.inputGroup, { flex: 1 }]}>
								<Text style={styles.label}>ZIP / POSTAL CODE</Text>
								<TextInput
									value={zip}
									onChangeText={setZip}
									style={styles.input}
									placeholder="94103"
									placeholderTextColor={GIFTYY_THEME.colors.gray400}
									keyboardType="number-pad"
								/>
							</View>
						</View>

						{showStateField && (
						<View style={styles.inputGroup}>
							<Text style={styles.label}>STATE / PROVINCE</Text>
							{hasStateList ? (
								<TouchableOpacity
									onPress={() => setStateModalOpen(true)}
									style={[styles.input, { justifyContent: 'center' }]}
								>
									<Text style={{ color: state ? GIFTYY_THEME.colors.gray900 : GIFTYY_THEME.colors.gray400 }}>
										{state || 'Select state / province'}
									</Text>
								</TouchableOpacity>
							) : (
								<TextInput
									value={state}
									onChangeText={setState}
									style={styles.input}
									placeholder="Enter state / province"
									placeholderTextColor={GIFTYY_THEME.colors.gray400}
								/>
							)}
						</View>
					)}

						{error ? <Text style={styles.errorText}>{error}</Text> : null}
					</View>
				</ScrollView>

				<Pressable
					style={[styles.saveBtn, (!isValid || saving) && styles.saveBtnDisabled]}
					onPress={handleSave}
					disabled={!isValid || saving}
				>
					{saving ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<Text style={styles.saveBtnText}>Save & Continue</Text>
					)}
				</Pressable>

				<SelectListModal
					visible={countryModalOpen}
					title="Select country"
					options={COUNTRY_LIST}
					selectedValue={country}
					searchable
					searchPlaceholder="Search countries..."
					onClose={() => setCountryModalOpen(false)}
					onSelect={(value: string) => {
						setCountry(value);
						setState('');
						setCountryModalOpen(false);
					}}
				/>

				<SelectListModal
					visible={stateModalOpen}
					title="Select state / province"
					options={stateOptions}
					selectedValue={state}
					onClose={() => setStateModalOpen(false)}
					onSelect={(value: string) => {
						setState(value);
						setStateModalOpen(false);
					}}
				/>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff5f0', paddingHorizontal: 24 },
	center: { justifyContent: 'center', alignItems: 'center' },
	backBtn: { marginBottom: 8 },
	scrollView: { flex: 1 },
	scrollContent: { paddingBottom: 20 },
	header: { alignItems: 'center', marginBottom: 24 },
	avatar: { width: 80, height: 80, marginBottom: 16 },
	title: { fontSize: 24, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
	subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, maxWidth: 300 },
	form: { gap: 16 },
	inputGroup: { gap: 4 },
	label: { fontSize: 11, fontWeight: '700', color: GIFTYY_THEME.colors.gray500, letterSpacing: 0.5 },
	input: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		paddingHorizontal: 14,
		paddingVertical: 14,
		fontSize: 15,
		color: GIFTYY_THEME.colors.gray900,
	},
	errorText: { color: GIFTYY_THEME.colors.error, fontSize: 13, marginTop: 4 },
	saveBtn: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 14,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
		shadowColor: GIFTYY_THEME.colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
