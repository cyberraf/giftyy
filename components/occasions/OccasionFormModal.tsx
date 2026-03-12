import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { supabase } from '@/lib/supabase';
import { formatOccasionDate } from '@/lib/utils/date-formatter';
import { DEFAULT_HOLIDAYS } from '@/lib/utils/occasion-seeding';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View
} from 'react-native';

type OccasionTypeOption = { value: string; label: string; defaultTitle: string; defaultRecurring: boolean };

const OCCASION_TYPES: OccasionTypeOption[] = [
	{ value: 'birthday', label: 'Birthday', defaultTitle: 'Birthday', defaultRecurring: true },
	{ value: 'anniversary', label: 'Anniversary', defaultTitle: 'Anniversary', defaultRecurring: true },
	{ value: 'graduation', label: 'Graduation', defaultTitle: 'Graduation', defaultRecurring: false },
	{ value: 'baby_shower', label: 'Baby shower', defaultTitle: 'Baby shower', defaultRecurring: false },
	{ value: 'wedding', label: 'Wedding', defaultTitle: 'Wedding', defaultRecurring: false },
	{ value: 'holiday', label: 'Holiday', defaultTitle: 'Holiday', defaultRecurring: true },
	{ value: 'other', label: 'Other', defaultTitle: 'Occasion', defaultRecurring: false },
];

function formatYMD(d: Date) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function isValidYMD(s: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
	if (!y || !m || !d) return false;
	const dt = new Date();
	dt.setFullYear(y, m - 1, d);
	return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}



const SENTINEL_YEAR = 4; // Using 4 (0004) for leap year support when year is omitted



function SelectSheet({
	visible,
	title,
	options,
	selectedValue,
	onSelect,
	onClose,
}: {
	visible: boolean;
	title: string;
	options: { value: string; label: string }[];
	selectedValue: string | null;
	onSelect: (value: string) => void;
	onClose: () => void;
}) {
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.sheetOverlay}>
				<Pressable style={styles.sheetBackdrop} onPress={onClose} />
				<View style={styles.sheetCard}>
					<View style={styles.sheetHeader}>
						<Text style={styles.sheetTitle}>{title}</Text>
						<Pressable onPress={onClose} hitSlop={10} style={styles.sheetCloseBtn}>
							<IconSymbol name="xmark" size={16} color={GIFTYY_THEME.colors.gray700} />
						</Pressable>
					</View>
					<ScrollView showsVerticalScrollIndicator={false}>
						{options.map((opt) => {
							const selected = opt.value === selectedValue;
							return (
								<Pressable
									key={opt.value}
									onPress={() => onSelect(opt.value)}
									style={({ pressed }) => [
										styles.sheetRow,
										selected && styles.sheetRowSelected,
										pressed && { opacity: 0.85 },
									]}
								>
									<Text style={[styles.sheetRowText, selected && styles.sheetRowTextSelected]}>
										{opt.label}
									</Text>
									{selected ? (
										<IconSymbol name="checkmark" size={18} color={GIFTYY_THEME.colors.primary} />
									) : null}
								</Pressable>
							);
						})}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

export function OccasionFormModal({
	visible,
	defaultRecipientId,
	editingOccasionId,
	onClose,
	onSaved,
	isSelf = false,
}: {
	visible: boolean;
	defaultRecipientId?: string | null;
	editingOccasionId?: string | null;
	onClose: () => void;
	onSaved?: () => void | Promise<void>;
	isSelf?: boolean;
}) {
	const { user } = useAuth();
	const { recipients } = useRecipients();

	const [recipientId, setRecipientId] = useState<string | null>(null);
	const [type, setType] = useState<string>('birthday');
	const [title, setTitle] = useState<string>('Birthday');
	const [date, setDate] = useState<string>(formatYMD(new Date()));
	const [recurring, setRecurring] = useState<boolean>(true);
	const [recurrencePattern, setRecurrencePattern] = useState<'one_time' | 'yearly' | 'holiday'>('yearly');

	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(false);
	const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
	const [typePickerOpen, setTypePickerOpen] = useState(false);
	const [holidayPickerOpen, setHolidayPickerOpen] = useState(false);

	const recipientOptions = useMemo(
		() =>
			recipients.map((r) => ({
				value: r.id,
				label: `${r.firstName}${r.lastName ? ` ${r.lastName}` : ''}`,
			})),
		[recipients]
	);

	const selectedRecipientLabel = useMemo(() => {
		const found = recipientOptions.find((o) => o.value === recipientId);
		return found?.label ?? '';
	}, [recipientOptions, recipientId]);

	const displayDate = useMemo(() => {
		const isRecurring = recurrencePattern === 'yearly' || recurrencePattern === 'holiday';
		return formatOccasionDate(date, { hideYear: isRecurring });
	}, [date, recurrencePattern]);

	const selectedType = useMemo(
		() => OCCASION_TYPES.find((t) => t.value === type) ?? OCCASION_TYPES[OCCASION_TYPES.length - 1],
		[type]
	);

	useEffect(() => {
		if (!visible) return;

		if (editingOccasionId) {
			setLoading(true);
			supabase
				.from('occasions')
				.select('*')
				.eq('id', editingOccasionId)
				.single()
				.then(({ data, error }) => {
					if (data && !error) {
						setRecipientId(data.recipient_profile_id);
						setType(data.type || 'other');
						setTitle(data.title || '');
						setDate(data.date || formatYMD(new Date()));
						setRecurring(data.recurring ?? false);
						setRecurrencePattern(data.recurrence_pattern || (data.recurring ? 'yearly' : 'one_time'));
					}
					setLoading(false);
				});
		} else {
			setRecipientId(defaultRecipientId ?? null);
			setType('birthday');
			setTitle('Birthday');
			setDate(formatYMD(new Date()));
			setRecurring(true);
			setRecurrencePattern('yearly');
			setLoading(false);
		}

		setSaving(false);
	}, [visible, defaultRecipientId, editingOccasionId]);

	const [datePickerOpen, setDatePickerOpen] = useState(false);

	const handleSelectType = useCallback(
		(nextType: string) => {
			setType(nextType);
			const next = OCCASION_TYPES.find((t) => t.value === nextType);
			if (next) {
				// Only auto-fill if the user hasn't customized the title yet or if it's the default for another type.
				const isDefaultTitle = OCCASION_TYPES.some(ot => ot.defaultTitle === title);
				if (!title.trim() || isDefaultTitle) {
					setTitle(next.defaultTitle);
				}
				setRecurring(next.defaultRecurring);
			}
			setTypePickerOpen(false);
		},
		[title]
	);

	const handleSelectRecipient = useCallback((id: string) => {
		setRecipientId(id);
		setRecipientPickerOpen(false);
	}, []);

	const handleSelectHoliday = useCallback((holidayTitle: string) => {
		const h = DEFAULT_HOLIDAYS.find(opt => opt.title === holidayTitle);
		if (h) {
			setTitle(h.title);
			setDate(h.date);
			setType('holiday');
		}
		setHolidayPickerOpen(false);
	}, []);

	const handleSave = useCallback(async () => {
		if (saving) return;
		if (!user?.id) {
			Alert.alert('Sign in required', 'Please sign in to add occasions.');
			return;
		}
		if (!recipientId) {
			Alert.alert('Recipient', 'Please select a recipient.');
			return;
		}
		if (!title.trim()) {
			Alert.alert('Title', 'Please enter an occasion title.');
			return;
		}
		if (!isValidYMD(date.trim())) {
			Alert.alert('Date', 'Please enter a valid date in YYYY-MM-DD format.');
			return;
		}

		setSaving(true);
		try {
			const payload = {
				user_id: user.id,
				recipient_profile_id: isSelf ? defaultRecipientId : recipientId,
				title: title.trim(),
				date: date.trim(),
				type: type || 'other',
				recurring: recurrencePattern !== 'one_time',
				recurrence_pattern: recurrencePattern,
			};

			let error;
			if (editingOccasionId) {
				const { error: err } = await supabase
					.from('occasions')
					.update(payload)
					.eq('id', editingOccasionId);
				error = err;
			} else {
				const { error: err } = await supabase
					.from('occasions')
					.insert(payload);
				error = err;
			}

			if (error) {
				Alert.alert('Error', error.message);
				return;
			}

			try {
				await onSaved?.();
			} catch {
				// ignore
			}
		} finally {
			setSaving(false);
		}
	}, [saving, user?.id, recipientId, title, date, type, recurrencePattern, editingOccasionId, onClose, onSaved, isSelf, defaultRecipientId]);

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<Pressable style={styles.backdrop} onPress={saving ? undefined : onClose} />
				<View style={styles.card}>
					<View style={styles.header}>
						<View>
							<Text style={styles.headerTitle}>{editingOccasionId ? 'Edit occasion' : 'Add occasion'}</Text>
							<Text style={styles.headerSubtitle}>
								{editingOccasionId ? 'Update this celebration.' : 'Create a celebration for a recipient.'}
							</Text>
						</View>
						<Pressable onPress={saving ? undefined : onClose} hitSlop={10} style={styles.closeBtn}>
							<IconSymbol name="xmark" size={18} color={GIFTYY_THEME.colors.gray700} />
						</Pressable>
					</View>

					<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
						{loading ? (
							<View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
								<ActivityIndicator color={GIFTYY_THEME.colors.primary} />
							</View>
						) : (
							<>
								{!isSelf && (
									<View style={styles.field}>
										<Text style={styles.label}>Recipient</Text>
										<Pressable
											onPress={() => setRecipientPickerOpen(true)}
											style={({ pressed }) => [styles.picker, pressed && { opacity: 0.9 }]}
										>
											<Text style={[styles.pickerText, !recipientId && styles.pickerPlaceholder]}>
												{recipientId ? selectedRecipientLabel : 'Select recipient'}
											</Text>
											<IconSymbol name="chevron.down" size={16} color={GIFTYY_THEME.colors.gray500} />
										</Pressable>
									</View>
								)}


								{type === 'holiday' && (
									<View style={styles.field}>
										<Text style={styles.label}>Pick a Holiday</Text>
										<Pressable
											onPress={() => setHolidayPickerOpen(true)}
											style={({ pressed }) => [styles.picker, pressed && { opacity: 0.9 }]}
										>
											<Text style={[styles.pickerText, !title && styles.pickerPlaceholder]}>
												{title || 'Select holiday'}
											</Text>
											<IconSymbol name="chevron.down" size={16} color={GIFTYY_THEME.colors.gray500} />
										</Pressable>
									</View>
								)}

								<View style={styles.field}>
									<Text style={styles.label}>Type</Text>
									<Pressable
										onPress={() => setTypePickerOpen(true)}
										style={({ pressed }) => [styles.picker, pressed && { opacity: 0.9 }]}
									>
										<Text style={styles.pickerText}>{selectedType.label}</Text>
										<IconSymbol name="chevron.down" size={16} color={GIFTYY_THEME.colors.gray500} />
									</Pressable>
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Title</Text>
									<TextInput
										value={title}
										onChangeText={setTitle}
										style={styles.input}
										placeholder={selectedType.defaultTitle}
										placeholderTextColor={GIFTYY_THEME.colors.gray400}
										returnKeyType="done"
										editable={!saving}
									/>
								</View>

								<View style={[styles.field, styles.toggleRow]}>
									<Text style={styles.label}>Repeat Every Year</Text>
									<Switch
										value={recurrencePattern === 'yearly' || recurrencePattern === 'holiday'}
										onValueChange={(val) => {
											if (val) {
												setRecurrencePattern('yearly');
												// If we toggle ON, ensure we keep the month/day but use sentinel year
												const parts = date.split('-');
												if (parts.length === 3) {
													const yStr = String(SENTINEL_YEAR).padStart(4, '0');
													setDate(`${yStr}-${parts[1]}-${parts[2]}`);
												}
											} else {
												setRecurrencePattern('one_time');
												// If we toggle OFF, ensure we have a real year
												const parts = date.split('-');
												if (parts.length === 3 && parseInt(parts[0], 10) === SENTINEL_YEAR) {
													setDate(`${new Date().getFullYear()}-${parts[1]}-${parts[2]}`);
												}
											}
										}}
										trackColor={{ false: GIFTYY_THEME.colors.gray200, true: GIFTYY_THEME.colors.primary }}
										thumbColor={GIFTYY_THEME.colors.white}
									/>
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Date</Text>
									<Pressable
										onPress={() => setDatePickerOpen(true)}
										disabled={saving}
										style={({ pressed }) => [styles.picker, pressed && { opacity: 0.9 }]}
									>
										<Text style={styles.pickerText}>{displayDate}</Text>
										<IconSymbol name="calendar" size={16} color={GIFTYY_THEME.colors.gray500} />
									</Pressable>
								</View>

								<Pressable
									onPress={handleSave}
									disabled={saving}
									style={({ pressed }) => [
										styles.primaryBtn,
										pressed && { opacity: 0.9 },
										saving && { opacity: 0.7 },
									]}
								>
									{saving ? (
										<ActivityIndicator color={GIFTYY_THEME.colors.white} />
									) : (
										<Text style={styles.primaryBtnText}>
											{editingOccasionId ? 'Update occasion' : 'Save occasion'}
										</Text>
									)}
								</Pressable>
							</>
						)}
					</ScrollView>
				</View>

				<SelectSheet
					visible={recipientPickerOpen}
					title="Select recipient"
					options={recipientOptions}
					selectedValue={recipientId}
					onClose={() => setRecipientPickerOpen(false)}
					onSelect={handleSelectRecipient}
				/>

				<DatePickerSheet
					visible={datePickerOpen}
					selectedDate={date}
					onClose={() => setDatePickerOpen(false)}
					onSelect={setDate}
				/>

				<SelectSheet
					visible={typePickerOpen}
					title="Select type"
					options={OCCASION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
					selectedValue={type}
					onClose={() => setTypePickerOpen(false)}
					onSelect={handleSelectType}
				/>

				<SelectSheet
					visible={holidayPickerOpen}
					title="Select Holiday"
					options={DEFAULT_HOLIDAYS.map((h) => ({ value: h.title, label: h.title }))}
					selectedValue={title}
					onClose={() => setHolidayPickerOpen(false)}
					onSelect={handleSelectHoliday}
				/>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.35)' },
	backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
	card: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: 18,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	header: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerTitle: { fontSize: 18, fontWeight: '900', color: GIFTYY_THEME.colors.gray900 },
	headerSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '700', color: GIFTYY_THEME.colors.gray500 },
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	content: { padding: 16, gap: 12 },
	field: { gap: 6 },
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	label: { fontSize: 12, fontWeight: '800', color: GIFTYY_THEME.colors.gray700 },
	helpText: { marginTop: 2, fontSize: 12, color: GIFTYY_THEME.colors.gray500, fontWeight: '600' },
	input: {
		height: 46,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		paddingHorizontal: 12,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		color: GIFTYY_THEME.colors.gray900,
		fontWeight: '700',
	},
	picker: {
		height: 46,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		paddingHorizontal: 12,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	pickerText: { color: GIFTYY_THEME.colors.gray900, fontWeight: '800' },
	pickerPlaceholder: { color: GIFTYY_THEME.colors.gray400 },
	toggleKnobOff: { alignSelf: 'flex-start' },

	frequencyContainer: {
		flexDirection: 'row',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: 12,
		padding: 4,
		marginTop: 4,
	},
	frequencyChip: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		borderRadius: 8,
	},
	frequencyChipActive: {
		backgroundColor: '#FFF',
		...GIFTYY_THEME.shadows.sm,
	},
	frequencyText: {
		fontSize: 13,
		fontWeight: '600',
		color: GIFTYY_THEME.colors.gray500,
	},
	frequencyTextActive: {
		color: GIFTYY_THEME.colors.gray900,
		fontWeight: '700',
	},

	primaryBtn: {
		marginTop: 12,
		height: 52,
		borderRadius: 16,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	primaryBtnText: { color: GIFTYY_THEME.colors.white, fontWeight: '900', fontSize: 16 },

	// Select sheet
	sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
	sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
	sheetCard: {
		backgroundColor: 'white',
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		paddingBottom: 10,
		maxHeight: '70%',
	},
	sheetHeader: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sheetTitle: { fontSize: 16, fontWeight: '900', color: GIFTYY_THEME.colors.gray900 },
	sheetCloseBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	confirmBtnText: {
		color: 'white',
		fontWeight: '800',
		fontSize: 14,
	},
	pickerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		height: 220,
	},
	flexPicker: {
		flex: 1.5,
	},
	fixedPickerSmall: {
		flex: 0.8,
	},
	fixedPickerMedium: {
		flex: 1.2,
	},
	pickerItem: {
		fontSize: 18,
		fontWeight: '700',
		color: GIFTYY_THEME.colors.gray900,
	},
	sheetRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	sheetRowSelected: { backgroundColor: 'rgba(0,0,0,0.03)' },
	sheetRowText: { fontSize: 14, fontWeight: '800', color: GIFTYY_THEME.colors.gray900 },
	sheetRowTextSelected: { color: GIFTYY_THEME.colors.primary },

	// Dialog
	dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', padding: 18 },
	dialogBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
	dialogCard: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray200 },
	dialogTitle: { fontSize: 16, fontWeight: '900', color: GIFTYY_THEME.colors.gray900, marginBottom: 8 },
	dialogMessage: { fontSize: 13, fontWeight: '600', color: GIFTYY_THEME.colors.gray600, lineHeight: 18 },
	dialogBtn: { marginTop: 12, alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: GIFTYY_THEME.colors.gray100 },
	dialogBtnText: { fontWeight: '900', color: GIFTYY_THEME.colors.primary },
});

