import { COMMON_COUNTRIES, Country } from '@/constants/countries';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneField } from '@/lib/utils/phone';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Image,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingPhoneScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { profile: authProfile, updateProfile: updateAuthProfile, user, checkPhoneExists } = useAuth();

	const [phone, setPhone] = useState('');
	const [selectedCountry, setSelectedCountry] = useState<Country>(COMMON_COUNTRIES[0]);
	const [showCountryPicker, setShowCountryPicker] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (authProfile?.phone) {
			let digits = authProfile.phone.replace(/\D/g, '');
			const sortedCountries = [...COMMON_COUNTRIES].sort((a, b) => b.dial_code.length - a.dial_code.length);
			for (const c of sortedCountries) {
				const dial = c.dial_code.replace('+', '');
				if (digits.startsWith(dial)) {
					setSelectedCountry(c);
					digits = digits.slice(dial.length);
					break;
				}
			}
			setPhone(digits);
		}
	}, [authProfile]);

	const handleSave = async () => {
		const digits = phone.replace(/\D/g, '');
		if (!digits || digits.length < 7) {
			setError('Please enter a valid phone number.');
			return;
		}

		setSaving(true);
		setError('');
		try {
			const fullPhone = `${selectedCountry.dial_code.replace('+', '')}${digits}`;

			// Check if phone is already taken by another user
			const { exists } = await checkPhoneExists(fullPhone);
			if (exists) {
				const currentPhone = authProfile?.phone?.replace(/\D/g, '');
				if (currentPhone !== fullPhone) {
					setError('This phone number is already registered to another account.');
					setSaving(false);
					return;
				}
			}

			const { error: saveError } = await updateAuthProfile({ phone: fullPhone });
			if (saveError) {
				setError(saveError.message);
			} else {
				router.back();
			}
		} catch (err: any) {
			setError(err.message || 'Failed to save phone number.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<View style={[styles.container, { paddingTop: Math.max(top, 20) + 20, paddingBottom: Math.max(bottom, 20) }]}>
			{/* Back button */}
			<Pressable onPress={() => router.back()} style={styles.backBtn}>
				<MaterialIcons name="arrow-back" size={24} color={GIFTYY_THEME.colors.gray700} />
			</Pressable>

			<View style={styles.content}>
				<Image
					source={require('@/assets/images/giftyy.png')}
					style={styles.avatar}
					resizeMode="contain"
				/>
				<Text style={styles.title}>What's your number?</Text>
				<Text style={styles.subtitle}>
					Your phone number helps your circle find and gift you on Giftyy.
				</Text>

				<View style={styles.phoneRow}>
					<Pressable style={styles.countryBtn} onPress={() => setShowCountryPicker(true)}>
						<Text style={styles.countryText}>{selectedCountry.flag} {selectedCountry.dial_code}</Text>
						<MaterialIcons name="arrow-drop-down" size={20} color={GIFTYY_THEME.colors.gray600} />
					</Pressable>
					<TextInput
						style={styles.phoneInput}
						value={phone}
						onChangeText={(t) => {
							setError('');
							const parsed = formatPhoneField(t, selectedCountry.dial_code);
							setPhone(parsed.replace(/\+/g, ''));
						}}
						placeholder="555-000-0000"
						keyboardType="phone-pad"
						placeholderTextColor={GIFTYY_THEME.colors.gray400}
						autoFocus
					/>
				</View>

				{error ? <Text style={styles.errorText}>{error}</Text> : null}
			</View>

			<Pressable
				style={[styles.saveBtn, (!phone.trim() || saving) && styles.saveBtnDisabled]}
				onPress={handleSave}
				disabled={!phone.trim() || saving}
			>
				{saving ? (
					<ActivityIndicator size="small" color="#fff" />
				) : (
					<Text style={styles.saveBtnText}>Save & Continue</Text>
				)}
			</Pressable>

			{/* Country picker modal */}
			<Modal visible={showCountryPicker} animationType="slide" transparent onRequestClose={() => setShowCountryPicker(false)}>
				<View style={styles.modalOverlay}>
					<Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCountryPicker(false)} />
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Select Country</Text>
							<Pressable onPress={() => setShowCountryPicker(false)}>
								<MaterialIcons name="close" size={24} color={GIFTYY_THEME.colors.gray900} />
							</Pressable>
						</View>
						<FlatList
							data={COMMON_COUNTRIES}
							keyExtractor={(item) => item.code}
							renderItem={({ item }) => (
								<Pressable
									style={styles.countryItem}
									onPress={() => {
										setSelectedCountry(item);
										setShowCountryPicker(false);
									}}
								>
									<Text style={styles.countryItemText}>
										{item.flag} {item.name} ({item.dial_code})
									</Text>
								</Pressable>
							)}
						/>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff5f0', paddingHorizontal: 24 },
	backBtn: { marginBottom: 8 },
	content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
	avatar: { width: 100, height: 100, marginBottom: 20 },
	title: { fontSize: 26, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
	subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, maxWidth: 300, marginBottom: 32 },
	phoneRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		width: '100%',
		maxWidth: 340,
	},
	countryBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 16,
		borderRightWidth: 1,
		borderRightColor: '#e5e7eb',
	},
	countryText: { fontSize: 15, fontWeight: '600', color: GIFTYY_THEME.colors.gray900, marginRight: 4 },
	phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 16, fontSize: 16, color: GIFTYY_THEME.colors.gray900 },
	errorText: { color: GIFTYY_THEME.colors.error, fontSize: 13, marginTop: 8 },
	saveBtn: {
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: 14,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: GIFTYY_THEME.colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
	modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 20 },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
	modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
	countryItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
	countryItemText: { fontSize: 15, color: '#1f2937' },
});
