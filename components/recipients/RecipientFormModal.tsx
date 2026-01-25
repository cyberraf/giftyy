import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { useRecipients, type Recipient as RecipientType } from '@/contexts/RecipientsContext';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Dimensions,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';

type Recipient = RecipientType;
export type RecipientFormMode = 'add' | 'edit';

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage = 'Request timed out') {
	return new Promise<T>((resolve, reject) => {
		const t = setTimeout(() => reject(new Error(timeoutMessage)), ms);
		promise.then(
			(v) => {
				clearTimeout(t);
				resolve(v);
			},
			(e) => {
				clearTimeout(t);
				reject(e);
			}
		);
	});
}

type RecipientFormState = {
	firstName: string;
	lastName: string;
	relationship: string;
	email: string;
	phone: string;
	birthDay: string;
	birthMonth: string;
	birthYear: string;
	address: string;
	apartment: string;
	city: string;
	state: string;
	country: string;
	zip: string;
	sports: string;
	hobbies: string;
	favoriteColors: string;
	favoriteArtists: string;
	stylePreferences: string;
	favoriteGenres: string;
	personalityLifestyle: string;
	giftTypePreference: string;
	dietaryPreferences: string;
	allergies: string;
	recentLifeEvents: string;
	ageRange: string;
	notes: string;
};

const palette = {
	background: GIFTYY_THEME.colors.background,
	card: GIFTYY_THEME.colors.cardBackground,
	cardAlt: GIFTYY_THEME.colors.gray50,
	textPrimary: GIFTYY_THEME.colors.text,
	textSecondary: GIFTYY_THEME.colors.textSecondary,
	border: GIFTYY_THEME.colors.border,
	accentSoft: GIFTYY_THEME.colors.cream,
	neutralSoft: GIFTYY_THEME.colors.gray100,
	success: GIFTYY_THEME.colors.success,
};

export const COUNTRY_LIST = [
	'Afghanistan',
	'Albania',
	'Algeria',
	'Andorra',
	'Angola',
	'Antigua and Barbuda',
	'Argentina',
	'Armenia',
	'Australia',
	'Austria',
	'Azerbaijan',
	'Bahamas',
	'Bahrain',
	'Bangladesh',
	'Barbados',
	'Belarus',
	'Belgium',
	'Belize',
	'Benin',
	'Bhutan',
	'Bolivia',
	'Bosnia and Herzegovina',
	'Botswana',
	'Brazil',
	'Brunei',
	'Bulgaria',
	'Burkina Faso',
	'Burundi',
	'Cabo Verde',
	'Cambodia',
	'Cameroon',
	'Canada',
	'Central African Republic',
	'Chad',
	'Chile',
	'China',
	'Colombia',
	'Comoros',
	'Congo',
	'Costa Rica',
	"Cote d'Ivoire",
	'Croatia',
	'Cuba',
	'Cyprus',
	'Czech Republic',
	'Denmark',
	'Djibouti',
	'Dominica',
	'Dominican Republic',
	'Ecuador',
	'Egypt',
	'El Salvador',
	'Equatorial Guinea',
	'Eritrea',
	'Estonia',
	'Eswatini',
	'Ethiopia',
	'Fiji',
	'Finland',
	'France',
	'Gabon',
	'Gambia',
	'Georgia',
	'Germany',
	'Ghana',
	'Greece',
	'Grenada',
	'Guatemala',
	'Guinea',
	'Guinea-Bissau',
	'Guyana',
	'Haiti',
	'Honduras',
	'Hungary',
	'Iceland',
	'India',
	'Indonesia',
	'Iran',
	'Iraq',
	'Ireland',
	'Israel',
	'Italy',
	'Jamaica',
	'Japan',
	'Jordan',
	'Kazakhstan',
	'Kenya',
	'Kiribati',
	'Kuwait',
	'Kyrgyzstan',
	'Laos',
	'Latvia',
	'Lebanon',
	'Lesotho',
	'Liberia',
	'Libya',
	'Liechtenstein',
	'Lithuania',
	'Luxembourg',
	'Madagascar',
	'Malawi',
	'Malaysia',
	'Maldives',
	'Mali',
	'Malta',
	'Marshall Islands',
	'Mauritania',
	'Mauritius',
	'Mexico',
	'Micronesia',
	'Moldova',
	'Monaco',
	'Mongolia',
	'Montenegro',
	'Morocco',
	'Mozambique',
	'Myanmar',
	'Namibia',
	'Nauru',
	'Nepal',
	'Netherlands',
	'New Zealand',
	'Nicaragua',
	'Niger',
	'Nigeria',
	'North Korea',
	'North Macedonia',
	'Norway',
	'Oman',
	'Pakistan',
	'Palau',
	'Panama',
	'Papua New Guinea',
	'Paraguay',
	'Peru',
	'Philippines',
	'Poland',
	'Portugal',
	'Qatar',
	'Romania',
	'Russia',
	'Rwanda',
	'Saint Kitts and Nevis',
	'Saint Lucia',
	'Saint Vincent and the Grenadines',
	'Samoa',
	'San Marino',
	'Sao Tome and Principe',
	'Saudi Arabia',
	'Senegal',
	'Serbia',
	'Seychelles',
	'Sierra Leone',
	'Singapore',
	'Slovakia',
	'Slovenia',
	'Solomon Islands',
	'Somalia',
	'South Africa',
	'South Korea',
	'South Sudan',
	'Spain',
	'Sri Lanka',
	'Sudan',
	'Suriname',
	'Sweden',
	'Switzerland',
	'Syria',
	'Taiwan',
	'Tajikistan',
	'Tanzania',
	'Thailand',
	'Timor-Leste',
	'Togo',
	'Tonga',
	'Trinidad and Tobago',
	'Tunisia',
	'Turkey',
	'Turkmenistan',
	'Tuvalu',
	'Uganda',
	'Ukraine',
	'United Arab Emirates',
	'United Kingdom',
	'United States',
	'Uruguay',
	'Uzbekistan',
	'Vanuatu',
	'Vatican City',
	'Venezuela',
	'Vietnam',
	'Yemen',
	'Zambia',
	'Zimbabwe',
];

const US_STATES = [
	'Alabama',
	'Alaska',
	'Arizona',
	'Arkansas',
	'California',
	'Colorado',
	'Connecticut',
	'Delaware',
	'District of Columbia',
	'Florida',
	'Georgia',
	'Hawaii',
	'Idaho',
	'Illinois',
	'Indiana',
	'Iowa',
	'Kansas',
	'Kentucky',
	'Louisiana',
	'Maine',
	'Maryland',
	'Massachusetts',
	'Michigan',
	'Minnesota',
	'Mississippi',
	'Missouri',
	'Montana',
	'Nebraska',
	'Nevada',
	'New Hampshire',
	'New Jersey',
	'New Mexico',
	'New York',
	'North Carolina',
	'North Dakota',
	'Ohio',
	'Oklahoma',
	'Oregon',
	'Pennsylvania',
	'Rhode Island',
	'South Carolina',
	'South Dakota',
	'Tennessee',
	'Texas',
	'Utah',
	'Vermont',
	'Virginia',
	'Washington',
	'West Virginia',
	'Wisconsin',
	'Wyoming',
	'American Samoa',
	'Guam',
	'Northern Mariana Islands',
	'Puerto Rico',
	'U.S. Virgin Islands',
];

const CANADA_PROVINCES = [
	'Alberta',
	'British Columbia',
	'Manitoba',
	'New Brunswick',
	'Newfoundland and Labrador',
	'Northwest Territories',
	'Nova Scotia',
	'Nunavut',
	'Ontario',
	'Prince Edward Island',
	'Quebec',
	'Saskatchewan',
	'Yukon',
];

const AUSTRALIA_STATES = [
	'Australian Capital Territory',
	'New South Wales',
	'Northern Territory',
	'Queensland',
	'South Australia',
	'Tasmania',
	'Victoria',
	'Western Australia',
];

const INDIA_STATES = [
	'Andhra Pradesh',
	'Arunachal Pradesh',
	'Assam',
	'Bihar',
	'Chhattisgarh',
	'Goa',
	'Gujarat',
	'Haryana',
	'Himachal Pradesh',
	'Jharkhand',
	'Karnataka',
	'Kerala',
	'Madhya Pradesh',
	'Maharashtra',
	'Manipur',
	'Meghalaya',
	'Mizoram',
	'Nagaland',
	'Odisha',
	'Punjab',
	'Rajasthan',
	'Sikkim',
	'Tamil Nadu',
	'Telangana',
	'Tripura',
	'Uttar Pradesh',
	'Uttarakhand',
	'West Bengal',
	'Andaman and Nicobar Islands',
	'Chandigarh',
	'Dadra and Nagar Haveli and Daman and Diu',
	'Delhi',
	'Jammu and Kashmir',
	'Ladakh',
	'Lakshadweep',
	'Puducherry',
];

const normalizeCountry = (country: string) => country.trim().toUpperCase();

const COUNTRY_STATE_OPTIONS: Record<string, string[]> = {
	'UNITED STATES': US_STATES,
	'UNITED STATES OF AMERICA': US_STATES,
	'USA': US_STATES,
	'CANADA': CANADA_PROVINCES,
	'AUSTRALIA': AUSTRALIA_STATES,
	'INDIA': INDIA_STATES,
};

const getStateOptionsForCountry = (country: string) => {
	const normalized = normalizeCountry(country);
	return COUNTRY_STATE_OPTIONS[normalized] ?? [];
};

const requiresStateField = (country: string) => getStateOptionsForCountry(country).length > 0;

export function SelectListModal({
	visible,
	title,
	options,
	selectedValue,
	onSelect,
	onClose,
	searchable = false,
	searchPlaceholder = 'Search…',
}: {
	visible: boolean;
	title: string;
	options: string[];
	selectedValue: string;
	onSelect: (value: string) => void;
	onClose: () => void;
	searchable?: boolean;
	searchPlaceholder?: string;
}) {
	const [query, setQuery] = useState('');

	const filtered = useMemo(() => {
		if (!searchable) return options;
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter((o) => o.toLowerCase().includes(q));
	}, [options, query, searchable]);

	useEffect(() => {
		if (!visible) setQuery('');
	}, [visible]);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			presentationStyle="overFullScreen"
			onRequestClose={onClose}
		>
			<View style={styles.selectModalOverlay}>
				<Pressable style={styles.selectModalBackdrop} onPress={onClose} />
				<View style={styles.selectModalCard}>
					<Text style={styles.selectModalTitle}>{title}</Text>
					{searchable ? (
						<TextInput
							value={query}
							onChangeText={setQuery}
							placeholder={searchPlaceholder}
							placeholderTextColor="rgba(47,35,24,0.4)"
							style={styles.selectModalSearch}
							autoCapitalize="none"
							autoCorrect={false}
						/>
					) : null}
					<ScrollView keyboardShouldPersistTaps="handled" style={styles.selectModalList}>
						{filtered.map((opt) => {
							const isSelected = opt === selectedValue;
							return (
								<Pressable
									key={opt}
									onPress={() => onSelect(opt)}
									style={[styles.selectModalOptionRow, isSelected && styles.selectModalOptionRowSelected]}
								>
									<Text style={[styles.selectModalOptionText, isSelected && styles.selectModalOptionTextSelected]}>
										{opt}
									</Text>
									{isSelected ? <IconSymbol name="checkmark" size={16} color={BRAND_COLOR} /> : null}
								</Pressable>
							);
						})}
					</ScrollView>
					<Pressable style={styles.selectModalCloseButton} onPress={onClose}>
						<Text style={styles.selectModalCloseText}>Close</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

function RecipientFormFields({
	form,
	onChange,
}: {
	form: RecipientFormState;
	onChange: (patch: Partial<RecipientFormState>) => void;
}) {
	const stateOptions = useMemo(() => getStateOptionsForCountry(form.country), [form.country]);
	const showStateField = stateOptions.length > 0;
	const [countryModalOpen, setCountryModalOpen] = useState(false);
	const [stateModalOpen, setStateModalOpen] = useState(false);
	const [birthDayModalOpen, setBirthDayModalOpen] = useState(false);
	const [birthMonthModalOpen, setBirthMonthModalOpen] = useState(false);

	const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1)), []);
	const monthOptions = useMemo(
		() => [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		],
		[]
	);
	const selectedMonthName = useMemo(() => {
		const m = parseInt(form.birthMonth || '', 10);
		if (!Number.isFinite(m) || m < 1 || m > 12) return '';
		return monthOptions[m - 1] || '';
	}, [form.birthMonth, monthOptions]);
	return (
		<View style={styles.formFields}>
			<View style={styles.formRow}>
				<View style={[styles.inputGroup, styles.formColumn]}>
					<Text style={styles.inputLabel}>
						First name<Text style={styles.requiredStar}>*</Text>
					</Text>
					<TextInput
						value={form.firstName}
						onChangeText={(text) => onChange({ firstName: text })}
						style={styles.textInput}
						placeholder="Jordan"
						placeholderTextColor="rgba(47,35,24,0.4)"
						autoCapitalize="words"
						returnKeyType="next"
					/>
				</View>
				<View style={[styles.inputGroup, styles.formColumn]}>
					<Text style={styles.inputLabel}>Last name (optional)</Text>
					<TextInput
						value={form.lastName}
						onChangeText={(text) => onChange({ lastName: text })}
						style={styles.textInput}
						placeholder="Miles"
						placeholderTextColor="rgba(47,35,24,0.4)"
						autoCapitalize="words"
						returnKeyType="next"
					/>
				</View>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Relationship</Text>
				<TextInput
					value={form.relationship}
					onChangeText={(text) => onChange({ relationship: text })}
					style={styles.textInput}
					placeholder="e.g. Sister, coworker"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Email (optional)</Text>
				<TextInput
					value={form.email}
					onChangeText={(text) => onChange({ email: text })}
					style={styles.textInput}
					placeholder="name@example.com"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="none"
					keyboardType="email-address"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Phone</Text>
				<TextInput
					value={form.phone}
					onChangeText={(text) => onChange({ phone: text.replace(/\D+/g, '') })}
					style={styles.textInput}
					placeholder="(555) 123-4567"
					placeholderTextColor="rgba(47,35,24,0.4)"
					keyboardType="phone-pad"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Birth date (optional)</Text>
				<View style={styles.birthRow}>
					<Pressable
						style={[styles.pickerContainer, styles.pickerPressable, styles.birthPicker]}
						onPress={() => setBirthDayModalOpen(true)}
					>
						<Text style={form.birthDay ? styles.pickerValueText : styles.pickerPlaceholderText}>
							{form.birthDay || 'DD'}
						</Text>
						<IconSymbol name="chevron.down" size={16} color={palette.textSecondary} />
					</Pressable>
					<Pressable
						style={[styles.pickerContainer, styles.pickerPressable, styles.birthPicker]}
						onPress={() => setBirthMonthModalOpen(true)}
					>
						<Text style={form.birthMonth ? styles.pickerValueText : styles.pickerPlaceholderText}>
							{selectedMonthName || 'MM'}
						</Text>
						<IconSymbol name="chevron.down" size={16} color={palette.textSecondary} />
					</Pressable>
					<TextInput
						value={form.birthYear ?? ''}
						onChangeText={(text) => onChange({ birthYear: text.replace(/\D+/g, '').slice(0, 4) })}
						style={[styles.textInput, styles.birthInput]}
						placeholder="YYYY"
						placeholderTextColor="rgba(47,35,24,0.4)"
						keyboardType="number-pad"
						maxLength={4}
						returnKeyType="next"
					/>
				</View>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>
					Street address<Text style={styles.requiredStar}>*</Text>
				</Text>
				<TextInput
					value={form.address}
					onChangeText={(text) => onChange({ address: text })}
					style={styles.textInput}
					placeholder="238 Market Street"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Apartment / unit (optional)</Text>
				<TextInput
					value={form.apartment}
					onChangeText={(text) => onChange({ apartment: text })}
					style={styles.textInput}
					placeholder="Apt 5B"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="characters"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>
					Country<Text style={styles.requiredStar}>*</Text>
				</Text>
				<Pressable style={[styles.pickerContainer, styles.pickerPressable]} onPress={() => setCountryModalOpen(true)}>
					<Text style={form.country ? styles.pickerValueText : styles.pickerPlaceholderText}>
						{form.country || 'Select country'}
					</Text>
					<IconSymbol name="chevron.down" size={16} color={palette.textSecondary} />
				</Pressable>
			</View>
			<View style={styles.formRow}>
				<View style={[styles.inputGroup, styles.formColumn]}>
					<Text style={styles.inputLabel}>
						ZIP / Postal code<Text style={styles.requiredStar}>*</Text>
					</Text>
					<TextInput
						value={form.zip}
						onChangeText={(text) => onChange({ zip: text })}
						style={styles.textInput}
						placeholder="94107"
						placeholderTextColor="rgba(47,35,24,0.4)"
						autoCapitalize="characters"
						returnKeyType={showStateField ? 'next' : 'done'}
					/>
				</View>
				<View style={[styles.inputGroup, styles.formColumn]}>
					<Text style={styles.inputLabel}>
						City<Text style={styles.requiredStar}>*</Text>
					</Text>
					<TextInput
						value={form.city}
						onChangeText={(text) => onChange({ city: text })}
						style={styles.textInput}
						placeholder="San Francisco"
						placeholderTextColor="rgba(47,35,24,0.4)"
						autoCapitalize="words"
						returnKeyType={showStateField ? 'next' : 'done'}
					/>
				</View>
			</View>
			<View style={styles.formRow}>
				{showStateField ? (
					<View style={[styles.inputGroup, styles.formColumn]}>
						<Text style={styles.inputLabel}>
							State / Province<Text style={styles.requiredStar}>*</Text>
						</Text>
						<Pressable style={[styles.pickerContainer, styles.pickerPressable]} onPress={() => setStateModalOpen(true)}>
							<Text style={form.state ? styles.pickerValueText : styles.pickerPlaceholderText}>
								{form.state || 'Select state / province'}
							</Text>
							<IconSymbol name="chevron.down" size={16} color={palette.textSecondary} />
						</Pressable>
					</View>
				) : null}
			</View>

			<SelectListModal
				visible={countryModalOpen}
				title="Select country"
				options={COUNTRY_LIST}
				selectedValue={form.country}
				searchable
				searchPlaceholder="Search countries…"
				onClose={() => setCountryModalOpen(false)}
				onSelect={(value) => {
					onChange({ country: value, state: '' });
					setCountryModalOpen(false);
				}}
			/>
			<SelectListModal
				visible={stateModalOpen}
				title="Select state / province"
				options={stateOptions}
				selectedValue={form.state}
				onClose={() => setStateModalOpen(false)}
				onSelect={(value) => {
					onChange({ state: value });
					setStateModalOpen(false);
				}}
			/>
			<SelectListModal
				visible={birthDayModalOpen}
				title="Select day"
				options={dayOptions}
				selectedValue={form.birthDay}
				onClose={() => setBirthDayModalOpen(false)}
				onSelect={(value) => {
					onChange({ birthDay: value });
					setBirthDayModalOpen(false);
				}}
			/>
			<SelectListModal
				visible={birthMonthModalOpen}
				title="Select month"
				options={monthOptions}
				selectedValue={selectedMonthName}
				onClose={() => setBirthMonthModalOpen(false)}
				onSelect={(value) => {
					const idx = monthOptions.indexOf(value);
					onChange({ birthMonth: idx >= 0 ? String(idx + 1) : '' });
					setBirthMonthModalOpen(false);
				}}
			/>
		</View>
	);
}

function RecipientPreferenceFields({
	form,
	onChange,
}: {
	form: RecipientFormState;
	onChange: (patch: Partial<RecipientFormState>) => void;
}) {
	return (
		<View style={styles.formFields}>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Sports (optional)</Text>
				<TextInput
					value={form.sports}
					onChangeText={(text) => onChange({ sports: text })}
					style={styles.textInput}
					placeholder="Running, tennis"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Hobbies (optional)</Text>
				<TextInput
					value={form.hobbies}
					onChangeText={(text) => onChange({ hobbies: text })}
					style={styles.textInput}
					placeholder="Photography, hiking"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="sentences"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Favorite colors (optional)</Text>
				<TextInput
					value={form.favoriteColors}
					onChangeText={(text) => onChange({ favoriteColors: text })}
					style={styles.textInput}
					placeholder="Terracotta, sage"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Favorite artists (optional)</Text>
				<TextInput
					value={form.favoriteArtists}
					onChangeText={(text) => onChange({ favoriteArtists: text })}
					style={styles.textInput}
					placeholder="Taylor Swift, Norah Jones"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Style preferences (optional)</Text>
				<TextInput
					value={form.stylePreferences}
					onChangeText={(text) => onChange({ stylePreferences: text })}
					style={styles.textInput}
					placeholder="Minimalist, bold, vintage, modern, bohemian"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Favorite genres (optional)</Text>
				<TextInput
					value={form.favoriteGenres}
					onChangeText={(text) => onChange({ favoriteGenres: text })}
					style={styles.textInput}
					placeholder="Books, movies, TV shows, music genres"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Personality & lifestyle (optional)</Text>
				<TextInput
					value={form.personalityLifestyle}
					onChangeText={(text) => onChange({ personalityLifestyle: text })}
					style={styles.textInput}
					placeholder="Introverted, adventurous, homebody, active"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Gift type preference (optional)</Text>
				<TextInput
					value={form.giftTypePreference}
					onChangeText={(text) => onChange({ giftTypePreference: text })}
					style={styles.textInput}
					placeholder="Practical, sentimental, experiential, luxury"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Dietary preferences (optional)</Text>
				<TextInput
					value={form.dietaryPreferences}
					onChangeText={(text) => onChange({ dietaryPreferences: text })}
					style={styles.textInput}
					placeholder="Vegetarian, vegan, gluten-free, foodie"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Allergies & sensitivities (optional)</Text>
				<TextInput
					value={form.allergies}
					onChangeText={(text) => onChange({ allergies: text })}
					style={styles.textInput}
					placeholder="Food, fragrances, materials"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Recent life events (optional)</Text>
				<TextInput
					value={form.recentLifeEvents}
					onChangeText={(text) => onChange({ recentLifeEvents: text })}
					style={styles.textInput}
					placeholder="New job, moved, had a baby, retired"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="words"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Age range (optional)</Text>
				<TextInput
					value={form.ageRange}
					onChangeText={(text) => onChange({ ageRange: text })}
					style={styles.textInput}
					placeholder="e.g. 25-30, 40s, 60+"
					placeholderTextColor="rgba(47,35,24,0.4)"
					autoCapitalize="none"
					returnKeyType="next"
				/>
			</View>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Anything else? (optional)</Text>
				<TextInput
					value={form.notes}
					onChangeText={(text) => onChange({ notes: text })}
					style={[styles.textInput, styles.textInputMultiline]}
					placeholder="Additional notes, preferences, or gift ideas..."
					placeholderTextColor="rgba(47,35,24,0.4)"
					multiline
					numberOfLines={4}
					textAlignVertical="top"
				/>
			</View>
		</View>
	);
}

export function RecipientFormModal({
	visible,
	mode,
	editingRecipient,
	onClose,
	onSaved,
}: {
	visible: boolean;
	mode: RecipientFormMode;
	editingRecipient?: Recipient | null;
	onClose: () => void;
	onSaved?: () => void | Promise<void>;
}) {
	const emptyForm: RecipientFormState = useMemo(
		() => ({
			firstName: '',
			lastName: '',
			relationship: '',
			email: '',
			phone: '',
			birthDay: '',
			birthMonth: '',
			birthYear: '',
			address: '',
			apartment: '',
			city: '',
			state: '',
			country: '',
			zip: '',
			sports: '',
			hobbies: '',
			favoriteColors: '',
			favoriteArtists: '',
			stylePreferences: '',
			favoriteGenres: '',
			personalityLifestyle: '',
			giftTypePreference: '',
			dietaryPreferences: '',
			allergies: '',
			recentLifeEvents: '',
			ageRange: '',
			notes: '',
		}),
		[]
	);

	const { addRecipient, updateRecipient } = useRecipients();
	const [form, setForm] = useState<RecipientFormState>(emptyForm);
	const [formPage, setFormPage] = useState(0);
	const [isSaving, setIsSaving] = useState(false);
	const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

	const showDialog = useCallback((title: string, message: string) => {
		setDialog({ title, message });
	}, []);

	// Keep modal height stable when Android keyboard opens (window height shrinks on focus).
	const stableScreenHeightRef = useRef(Dimensions.get('screen').height);
	const stableModalCardHeight = useMemo(() => {
		const h = stableScreenHeightRef.current;
		return Math.min(Math.round(h * 0.8), 720);
	}, []);

	useEffect(() => {
		if (!visible) return;
		setFormPage(0);
		if (mode === 'edit' && editingRecipient) {
			const dob = (editingRecipient.birthDate || '').trim();
			const [yyyy, mm, dd] = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob.split('-') : ['', '', ''];
			setForm({
				firstName: editingRecipient.firstName,
				lastName: editingRecipient.lastName ?? '',
				relationship: editingRecipient.relationship,
				email: editingRecipient.email ?? '',
				phone: editingRecipient.phone,
				birthDay: dd || '',
				birthMonth: mm || '',
				birthYear: yyyy || '',
				address: editingRecipient.address,
				apartment: editingRecipient.apartment ?? '',
				city: editingRecipient.city,
				state: editingRecipient.state ?? '',
				country: editingRecipient.country,
				zip: editingRecipient.zip,
				sports: editingRecipient.sports ?? '',
				hobbies: editingRecipient.hobbies ?? '',
				favoriteColors: editingRecipient.favoriteColors ?? '',
				favoriteArtists: editingRecipient.favoriteArtists ?? '',
				stylePreferences: editingRecipient.stylePreferences ?? '',
				favoriteGenres: editingRecipient.favoriteGenres ?? '',
				personalityLifestyle: editingRecipient.personalityLifestyle ?? '',
				giftTypePreference: editingRecipient.giftTypePreference ?? '',
				dietaryPreferences: editingRecipient.dietaryPreferences ?? '',
				allergies: editingRecipient.allergies ?? '',
				recentLifeEvents: editingRecipient.recentLifeEvents ?? '',
				ageRange: editingRecipient.ageRange ?? '',
				notes: editingRecipient.notes ?? '',
			});
		} else {
			setForm(emptyForm);
		}
	}, [visible, mode, editingRecipient, emptyForm]);

	const updateForm = useCallback((patch: Partial<RecipientFormState>) => {
		setForm((prev) => ({ ...prev, ...patch }));
	}, []);

	const handleSave = useCallback(async () => {
		if (isSaving) return;

		const trimmed: RecipientFormState = {
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			relationship: form.relationship.trim(),
			email: form.email.trim(),
			phone: form.phone.trim(),
			birthDay: (form.birthDay ?? '').trim(),
			birthMonth: (form.birthMonth ?? '').trim(),
			birthYear: (form.birthYear ?? '').trim(),
			address: form.address.trim(),
			apartment: form.apartment?.trim() ?? '',
			city: form.city.trim(),
			state: form.state.trim(),
			country: form.country.trim(),
			zip: form.zip.trim(),
			sports: form.sports.trim(),
			hobbies: form.hobbies.trim(),
			favoriteColors: form.favoriteColors.trim(),
			favoriteArtists: form.favoriteArtists.trim(),
			stylePreferences: form.stylePreferences.trim(),
			favoriteGenres: form.favoriteGenres.trim(),
			personalityLifestyle: form.personalityLifestyle.trim(),
			giftTypePreference: form.giftTypePreference.trim(),
			dietaryPreferences: form.dietaryPreferences.trim(),
			allergies: form.allergies.trim(),
			recentLifeEvents: form.recentLifeEvents.trim(),
			ageRange: form.ageRange.trim(),
			notes: form.notes.trim(),
		};

		if (!trimmed.firstName || !trimmed.address || !trimmed.city || !trimmed.country || !trimmed.zip) {
			showDialog('Missing details', 'First name, address, city, country, and ZIP are required.');
			return;
		}

		const anyBirth = !!trimmed.birthDay || !!trimmed.birthMonth || !!trimmed.birthYear;
		let birthDate: string | undefined = undefined;
		if (anyBirth) {
			const day = parseInt(trimmed.birthDay || '', 10);
			const month = parseInt(trimmed.birthMonth || '', 10);
			const year = parseInt(trimmed.birthYear || '', 10);
			const currentYear = new Date().getFullYear();

			if (!trimmed.birthDay || !trimmed.birthMonth || !trimmed.birthYear) {
				showDialog('Birth date', 'Please enter day, month, and year (or leave all three blank).');
				return;
			}
			if (!Number.isFinite(day) || day < 1 || day > 31) {
				showDialog('Birth date', 'Day must be between 1 and 31.');
				return;
			}
			if (!Number.isFinite(month) || month < 1 || month > 12) {
				showDialog('Birth date', 'Month must be between 1 and 12.');
				return;
			}
			if (!Number.isFinite(year) || year < 1900 || year > currentYear) {
				showDialog('Birth date', `Year must be between 1900 and ${currentYear}.`);
				return;
			}

			// Validate actual date (e.g. no Feb 31), then store ISO for DB (YYYY-MM-DD).
			const dt = new Date(Date.UTC(year, month - 1, day));
			if (
				dt.getUTCFullYear() !== year ||
				dt.getUTCMonth() !== month - 1 ||
				dt.getUTCDate() !== day
			) {
				showDialog('Birth date', 'Please enter a valid date.');
				return;
			}
			birthDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		} else {
			birthDate = undefined;
		}

		const stateIsRequired = requiresStateField(trimmed.country);
		if (stateIsRequired && !trimmed.state) {
			showDialog('Missing details', 'State / province is required for the selected country.');
			return;
		}

		if (!stateIsRequired) {
			trimmed.state = '';
		}

		setIsSaving(true);
		try {
			let error: Error | null = null;
			try {
				if (mode === 'edit') {
					if (!editingRecipient?.id) {
						showDialog('Error', 'Unable to update this recipient right now.');
						return;
					}
					const result = await withTimeout(
						updateRecipient(editingRecipient.id, { ...trimmed, birthDate }),
						20000,
						'Saving took too long'
					);
					error = result.error;
				} else {
					const result = await withTimeout(
						addRecipient({ ...trimmed, birthDate }),
						20000,
						'Saving took too long'
					);
					error = result.error;
				}
			} catch (e: any) {
				const message =
					e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
				showDialog(
					'Network issue',
					`Saving is taking too long. Please check your connection and try again.\n\n${message}`
				);
				return;
			}

			if (error) {
				showDialog('Error', `Failed to save recipient: ${error.message}`);
				return;
			}

			// Close immediately for responsiveness; any refresh can run after.
			onClose();
			try {
				void onSaved?.();
			} catch {
				// ignore
			}
		} finally {
			setIsSaving(false);
		}
	}, [form, mode, editingRecipient, addRecipient, updateRecipient, onClose, onSaved, isSaving, showDialog]);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
			presentationStyle="overFullScreen"
		>
			{dialog ? (
				<Modal
					visible={true}
					transparent
					animationType="fade"
					presentationStyle="overFullScreen"
					onRequestClose={() => setDialog(null)}
				>
					<View style={styles.dialogOverlay}>
						<Pressable style={styles.dialogBackdrop} onPress={() => setDialog(null)} />
						<View style={styles.dialogCard}>
							<Text style={styles.dialogTitle}>{dialog.title}</Text>
							<Text style={styles.dialogMessage}>{dialog.message}</Text>
							<Pressable style={styles.dialogButton} onPress={() => setDialog(null)} accessibilityRole="button">
								<Text style={styles.dialogButtonText}>OK</Text>
							</Pressable>
						</View>
					</View>
				</Modal>
			) : null}

			<View style={styles.modalOverlay}>
				<Pressable style={styles.modalBackdrop} onPress={isSaving ? undefined : onClose} />
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
					style={styles.modalCardWrapper}
				>
					<View style={[styles.modalCard, { height: stableModalCardHeight }]}>
						<View style={styles.modalHeader}>
							<View style={{ flex: 1 }}>
								<Text style={styles.modalTitle}>{mode === 'edit' ? 'Edit recipient' : 'New recipient'}</Text>
								<Text style={styles.modalSubtitle}>
									{formPage === 0 ? 'Contact & shipping details' : 'Optional preferences'}
								</Text>
							</View>
							<Pressable
								style={[styles.modalCloseButton, isSaving && styles.modalButtonDisabled]}
								onPress={isSaving ? undefined : onClose}
								accessibilityRole="button"
								hitSlop={10}
							>
								<IconSymbol name="xmark" size={16} color={palette.textSecondary} />
							</Pressable>
						</View>
						<View style={styles.modalFormContainer}>
							<ScrollView
								keyboardShouldPersistTaps="handled"
								contentContainerStyle={styles.modalFormContent}
								showsVerticalScrollIndicator={true}
								nestedScrollEnabled={true}
							>
								{formPage === 0 ? (
									<RecipientFormFields form={form} onChange={updateForm} />
								) : (
									<RecipientPreferenceFields form={form} onChange={updateForm} />
								)}
							</ScrollView>
						</View>
						<View style={styles.modalStepperRow}>
							{[0, 1].map((index) => (
								<View key={index} style={[styles.modalStepDot, index === formPage && styles.modalStepDotActive]} />
							))}
						</View>
						<View style={styles.modalButtonRow}>
							<Pressable
								style={[styles.modalSecondaryButton, isSaving && styles.modalButtonDisabled]}
								onPress={isSaving ? undefined : onClose}
								accessibilityRole="button"
							>
								<Text style={styles.modalSecondaryLabel}>Cancel</Text>
							</Pressable>
							{formPage === 0 ? (
								<Pressable
									style={[styles.modalPrimaryButton, isSaving && styles.modalButtonDisabled]}
									onPress={isSaving ? undefined : () => setFormPage(1)}
									accessibilityRole="button"
								>
									<Text style={styles.modalPrimaryLabel}>Next</Text>
								</Pressable>
							) : (
								<View style={styles.modalPagerActions}>
									<Pressable
										style={[styles.modalSecondaryButton, isSaving && styles.modalButtonDisabled]}
										onPress={isSaving ? undefined : () => setFormPage(0)}
										accessibilityRole="button"
									>
										<Text style={styles.modalSecondaryLabel}>Back</Text>
									</Pressable>
									<Pressable
										style={[styles.modalPrimaryButton, isSaving && styles.modalButtonDisabled]}
										onPress={isSaving ? undefined : handleSave}
										accessibilityRole="button"
										hitSlop={8}
									>
										<Text style={styles.modalPrimaryLabel}>{isSaving ? 'Saving…' : 'Save'}</Text>
									</Pressable>
								</View>
							)}
						</View>
					</View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	inputGroup: {
		gap: 6,
	},
	inputLabel: {
		color: palette.textSecondary,
		fontSize: 12,
		fontWeight: '700',
	},
	requiredStar: {
		color: BRAND_COLOR,
		fontWeight: '900',
	},
	textInput: {
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: 14,
		backgroundColor: palette.cardAlt,
		paddingVertical: 12,
		paddingHorizontal: 16,
		color: palette.textPrimary,
		fontSize: 14,
	},
	textInputMultiline: {
		minHeight: 96,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	modalBackdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'transparent',
	},
	modalCardWrapper: {
		flex: 1,
		justifyContent: 'center',
	},
	modalCard: {
		width: '100%',
		maxWidth: 420,
		backgroundColor: palette.card,
		borderRadius: 24,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: palette.border,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 5,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
		backgroundColor: palette.accentSoft,
	},
	modalTitle: {
		fontFamily: BRAND_FONT,
		fontSize: 22,
		color: palette.textPrimary,
	},
	modalSubtitle: {
		marginTop: 4,
		color: palette.textSecondary,
		fontSize: 12,
		fontWeight: '700',
	},
	modalCloseButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.card,
		borderWidth: 1,
		borderColor: palette.border,
	},
	modalFormContainer: {
		flex: 1,
	},
	modalFormContent: {
		paddingHorizontal: 20,
		paddingVertical: 20,
		gap: 14,
	},
	modalStepperRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 12,
	},
	modalStepDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: 'rgba(47,35,24,0.25)',
	},
	modalStepDotActive: {
		backgroundColor: BRAND_COLOR,
	},
	modalButtonRow: {
		flexDirection: 'row',
		gap: 12,
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: 'rgba(230,222,214,0.65)',
	},
	modalSecondaryButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
		backgroundColor: palette.cardAlt,
	},
	modalSecondaryLabel: {
		color: palette.textPrimary,
		fontWeight: '700',
	},
	modalPrimaryButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 999,
		alignItems: 'center',
		backgroundColor: BRAND_COLOR,
	},
	modalPrimaryLabel: {
		color: '#FFFFFF',
		fontWeight: '800',
	},
	modalButtonDisabled: {
		opacity: 0.6,
	},
	modalPagerActions: {
		flexDirection: 'row',
		gap: 12,
		flex: 1,
	},
	formFields: {
		gap: 14,
	},
	formRow: {
		flexDirection: 'row',
		gap: 12,
		width: '100%',
	},
	formColumn: {
		flex: 1,
	},
	birthRow: {
		flexDirection: 'row',
		gap: 12,
	},
	birthInput: {
		flex: 1,
		textAlign: 'center',
	},
	birthPicker: {
		flex: 1,
	},
	pickerContainer: {
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: 14,
		backgroundColor: palette.cardAlt,
		overflow: 'hidden',
	},
	pickerPressable: {
		height: 48,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	pickerPlaceholderText: {
		color: 'rgba(47,35,24,0.45)',
		fontWeight: '600',
	},
	pickerValueText: {
		color: palette.textPrimary,
		fontWeight: '700',
	},
	selectModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.55)',
		justifyContent: 'flex-end',
		padding: 16,
	},
	selectModalBackdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'transparent',
	},
	selectModalCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		padding: 14,
		maxHeight: '78%',
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 20,
		elevation: 6,
	},
	selectModalTitle: {
		fontFamily: BRAND_FONT,
		fontSize: 16,
		fontWeight: '900',
		color: palette.textPrimary,
		paddingHorizontal: 4,
		paddingBottom: 10,
	},
	selectModalSearch: {
		height: 44,
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		backgroundColor: palette.cardAlt,
		color: palette.textPrimary,
		marginBottom: 10,
	},
	selectModalList: {
		borderTopWidth: 1,
		borderTopColor: 'rgba(230,222,214,0.65)',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(230,222,214,0.65)',
	},
	selectModalOptionRow: {
		paddingVertical: 12,
		paddingHorizontal: 6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(230,222,214,0.4)',
	},
	selectModalOptionRowSelected: {
		backgroundColor: palette.accentSoft,
	},
	selectModalOptionText: {
		color: palette.textPrimary,
		fontWeight: '700',
		flex: 1,
		paddingRight: 10,
	},
	selectModalOptionTextSelected: {
		color: palette.textPrimary,
	},
	selectModalCloseButton: {
		marginTop: 10,
		paddingVertical: 10,
		alignItems: 'center',
		borderRadius: 12,
		backgroundColor: palette.cardAlt,
		borderWidth: 1,
		borderColor: palette.border,
	},
	selectModalCloseText: {
		color: BRAND_COLOR,
		fontWeight: '900',
	},
	dialogOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 18,
	},
	dialogBackdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'transparent',
	},
	dialogCard: {
		width: '100%',
		maxWidth: 420,
		backgroundColor: palette.card,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: palette.border,
		padding: 16,
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 18,
		elevation: 6,
	},
	dialogTitle: {
		fontFamily: BRAND_FONT,
		fontSize: 18,
		fontWeight: '900',
		color: palette.textPrimary,
		marginBottom: 8,
	},
	dialogMessage: {
		color: palette.textSecondary,
		fontSize: 14,
		fontWeight: '600',
		lineHeight: 20,
	},
	dialogButton: {
		marginTop: 14,
		alignSelf: 'flex-end',
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 999,
		backgroundColor: palette.accentSoft,
		borderWidth: 1,
		borderColor: BRAND_COLOR,
	},
	dialogButtonText: {
		color: BRAND_COLOR,
		fontWeight: '900',
	},
});

