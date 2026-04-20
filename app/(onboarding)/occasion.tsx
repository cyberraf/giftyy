import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingOccasionScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const { user } = useAuth();
	const { recipientProfileId, ensureRecipientProfile, refreshStatus } = useOnboarding();

	const [rpId, setRpId] = useState<string | null>(recipientProfileId);
	const [dateYMD, setDateYMD] = useState('2000-01-01');
	const [showPicker, setShowPicker] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(!recipientProfileId);

	useEffect(() => {
		if (recipientProfileId) {
			setRpId(recipientProfileId);
			setLoading(false);
			return;
		}
		ensureRecipientProfile().then((id) => {
			setRpId(id);
			setLoading(false);
		});
	}, [recipientProfileId]);

	const displayDate = (() => {
		const [y, m, d] = dateYMD.split('-').map(Number);
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		return `${months[m - 1]} ${d}, ${y}`;
	})();

	const handleSave = async () => {
		if (!user?.id || !rpId) return;
		setSaving(true);
		setError('');

		try {
			const { error: insertError } = await supabase.from('occasions').insert({
				user_id: user.id,
				recipient_profile_id: rpId,
				title: 'Birthday',
				date: dateYMD,
				type: 'birthday',
				recurring: true,
				recurrence_pattern: 'yearly',
			});

			if (insertError) {
				setError(insertError.message);
				return;
			}

			await refreshStatus();
			router.back();
		} catch (err: any) {
			setError(err.message || 'Failed to save occasion.');
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
		<View style={[styles.container, { paddingTop: Math.max(top, 20) + 20, paddingBottom: Math.max(bottom, 20) }]}>
			<Pressable onPress={() => router.back()} style={styles.backBtn}>
				<MaterialIcons name="arrow-back" size={24} color={GIFTYY_THEME.colors.gray700} />
			</Pressable>

			<View style={styles.content}>
				<Image
					source={require('@/assets/images/giftyy-birthday.png')}
					style={styles.avatar}
					resizeMode="contain"
				/>
				<Text style={styles.title}>When's your birthday?</Text>
				<Text style={styles.subtitle}>
					This helps your circle celebrate you at just the right time!
				</Text>

				<Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
					<MaterialIcons name="cake" size={20} color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.dateBtnText}>{displayDate}</Text>
					<MaterialIcons name="edit" size={16} color={GIFTYY_THEME.colors.gray400} />
				</Pressable>

				{error ? <Text style={styles.errorText}>{error}</Text> : null}
			</View>

			<Pressable
				style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
				onPress={handleSave}
				disabled={saving}
			>
				{saving ? (
					<ActivityIndicator size="small" color="#fff" />
				) : (
					<Text style={styles.saveBtnText}>Save & Continue</Text>
				)}
			</Pressable>

			<DatePickerSheet
				visible={showPicker}
				selectedDate={dateYMD}
				onSelect={(ymd) => setDateYMD(ymd)}
				onClose={() => setShowPicker(false)}
				title="Select your birthday"
				endYear={new Date().getFullYear()}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff5f0', paddingHorizontal: 24 },
	center: { justifyContent: 'center', alignItems: 'center' },
	backBtn: { marginBottom: 8 },
	content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
	avatar: { width: 100, height: 100, marginBottom: 20 },
	title: { fontSize: 26, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
	subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, maxWidth: 300, marginBottom: 32 },
	dateBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: '#fff',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	dateBtnText: { fontSize: 18, fontWeight: '600', color: GIFTYY_THEME.colors.gray900 },
	errorText: { color: GIFTYY_THEME.colors.error, fontSize: 13, marginTop: 12 },
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
});
