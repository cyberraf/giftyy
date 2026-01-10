import { BRAND_COLOR } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerifyEmailScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { alert } = useAlert();
	const params = useLocalSearchParams<{ email?: string }>();

	const email = useMemo(() => (params?.email ? String(params.email) : ''), [params?.email]);
	const [resending, setResending] = useState(false);

	const handleOpenEmail = async () => {
		try {
			await Linking.openURL('mailto:');
		} catch {
			alert('Unable to Open Email', 'Please open your email app and look for the verification message.');
		}
	};

	const handleResend = async () => {
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			alert('Missing Email', 'Please go back and enter your email address again.');
			return;
		}

		setResending(true);
		try {
			const { error } = await supabase.auth.resend({
				type: 'signup',
				email,
			});

			if (error) {
				alert('Could Not Resend', error.message || 'Please try again in a moment.');
				return;
			}

			alert('Verification Sent', `We sent a new verification email to:\n\n${email}`);
		} catch (err: any) {
			alert('Could Not Resend', err?.message || 'Please try again in a moment.');
		} finally {
			setResending(false);
		}
	};

	return (
		<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.header}>
					<Image source={require('@/assets/images/giftyy.png')} style={styles.logo} resizeMode="contain" />
					<Text style={styles.title}>Verify your email</Text>
					<Text style={styles.subtitle}>
						We’ve sent a verification link to{email ? '\n' : ' your email address.'}
						{email ? <Text style={styles.emailText}>{email}</Text> : null}
						{'\n\n'}Open your inbox (and spam/junk), then tap the link to verify your account.
					</Text>
				</View>

				<View style={styles.tipCard}>
					<View style={styles.tipRow}>
						<MaterialIcons name="info" size={18} color={BRAND_COLOR} style={styles.tipIcon} />
						<Text style={styles.tipText}>
							After you verify, come back here and sign in — we don’t log you in automatically.
						</Text>
					</View>
				</View>

				<Pressable style={styles.primaryButton} onPress={handleOpenEmail}>
					<MaterialIcons name="email" size={18} color="white" style={styles.buttonIcon} />
					<Text style={styles.primaryButtonText}>Open email app</Text>
				</Pressable>

				<Pressable
					style={[styles.secondaryButton, resending && styles.buttonDisabled]}
					onPress={handleResend}
					disabled={resending}
				>
					{resending ? (
						<ActivityIndicator color={BRAND_COLOR} />
					) : (
						<>
							<MaterialIcons name="refresh" size={18} color={BRAND_COLOR} style={styles.buttonIcon} />
							<Text style={styles.secondaryButtonText}>Resend verification email</Text>
						</>
					)}
				</Pressable>

				<Pressable
					style={styles.linkButton}
					onPress={() => router.replace('/(auth)/login')}
					disabled={resending}
				>
					<Text style={styles.linkText}>Back to Sign In</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 32,
	},
	header: {
		alignItems: 'center',
		marginBottom: 20,
	},
	logo: {
		width: 130,
		height: 130,
		marginBottom: 18,
	},
	title: {
		fontSize: 28,
		fontWeight: '800',
		color: '#1F2937',
		marginBottom: 10,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 15,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 22,
	},
	emailText: {
		fontWeight: '700',
		color: '#111827',
	},
	tipCard: {
		backgroundColor: '#FFF7ED',
		borderWidth: 1,
		borderColor: '#FED7AA',
		borderRadius: 12,
		padding: 14,
		marginBottom: 18,
	},
	tipRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	tipIcon: {
		marginTop: 2,
		marginRight: 10,
	},
	tipText: {
		flex: 1,
		color: '#7C2D12',
		fontSize: 13,
		lineHeight: 18,
	},
	primaryButton: {
		backgroundColor: BRAND_COLOR,
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		marginTop: 8,
		marginBottom: 12,
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
	secondaryButton: {
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		marginBottom: 16,
	},
	buttonIcon: {
		marginRight: 10,
	},
	secondaryButtonText: {
		color: BRAND_COLOR,
		fontSize: 16,
		fontWeight: '700',
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	linkButton: {
		alignSelf: 'center',
		paddingVertical: 10,
	},
	linkText: {
		color: BRAND_COLOR,
		fontSize: 14,
		fontWeight: '700',
	},
});

