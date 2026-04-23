import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { supabase } from '@/lib/supabase';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Only GFT-XXXXXXXX style tokens are legal.
const CARD_TOKEN_REGEX = /^[A-Za-z0-9\-_]{1,40}$/;

type CardLookup =
	| { kind: 'loading' }
	| { kind: 'not_found' }
	| { kind: 'pending'; token: string }
	| { kind: 'ready'; orderCode: string }
	| { kind: 'error'; message: string };

/**
 * Deep-link resolver for physical Giftyy card scans.
 *
 * Flow: QR on card → https://giftyy.store/g/<TOKEN> → OS universal link →
 * this screen. We look up the card by public_token, find its linked order,
 * then hand off to the existing gift viewer at /gift/<orderCode>.
 *
 * Auth is intentionally not checked here — the gift viewer screen handles
 * both signed-in and guest cases itself.
 */
export default function CardScanResolver() {
	const { token } = useLocalSearchParams<{ token: string }>();
	const rawToken = Array.isArray(token) ? token[0] : token;
	const insets = useSafeAreaInsets();
	const router = useRouter();

	const [state, setState] = useState<CardLookup>({ kind: 'loading' });

	useEffect(() => {
		let cancelled = false;

		(async () => {
			const trimmed = (rawToken ?? '').trim();
			if (!trimmed || !CARD_TOKEN_REGEX.test(trimmed)) {
				if (!cancelled) setState({ kind: 'not_found' });
				return;
			}

			try {
				const { data: card, error: cardErr } = await supabase
					.from('giftyy_cards')
					.select('id, public_token, status, assigned_order_id')
					.eq('public_token', trimmed)
					.maybeSingle();

				if (cancelled) return;
				if (cardErr) {
					console.error('[CardScan] Lookup error:', cardErr);
					setState({ kind: 'error', message: 'We couldn\'t reach the server. Try again in a moment.' });
					return;
				}
				if (!card) {
					setState({ kind: 'not_found' });
					return;
				}
				if (card.status !== 'active' || !card.assigned_order_id) {
					setState({ kind: 'pending', token: card.public_token });
					return;
				}

				// Fetch the linked order so we can route to /gift/<order_code>.
				const { data: order, error: orderErr } = await supabase
					.from('orders')
					.select('id, order_code')
					.eq('id', card.assigned_order_id)
					.maybeSingle();

				if (cancelled) return;
				if (orderErr || !order) {
					console.error('[CardScan] Order fetch failed:', orderErr);
					setState({ kind: 'not_found' });
					return;
				}

				setState({ kind: 'ready', orderCode: order.order_code || order.id });
			} catch (err: any) {
				if (cancelled) return;
				console.error('[CardScan] Unexpected error:', err);
				setState({ kind: 'error', message: err?.message || 'Something went wrong.' });
			}
		})();

		return () => { cancelled = true; };
	}, [rawToken]);

	if (state.kind === 'ready') {
		return <Redirect href={{ pathname: '/gift/[code]', params: { code: state.orderCode } }} />;
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<Stack.Screen options={{ headerShown: false }} />

			{state.kind === 'loading' && (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
					<Text style={styles.muted}>Unlocking your gift…</Text>
				</View>
			)}

			{state.kind === 'pending' && (
				<View style={styles.center}>
					<View style={styles.emojiBadge}>
						<Text style={styles.emoji}>⏳</Text>
					</View>
					<Text style={styles.title}>Your gift is being prepared</Text>
					<Text style={styles.muted}>The sender hasn't finished setting it up yet. Check back in a moment.</Text>
					<Text style={styles.tokenLabel}>{state.token}</Text>
				</View>
			)}

			{state.kind === 'not_found' && (
				<View style={styles.center}>
					<View style={styles.emojiBadge}>
						<Text style={styles.emoji}>🎁</Text>
					</View>
					<Text style={styles.title}>Card not recognized</Text>
					<Text style={styles.muted}>
						This Giftyy card doesn't match a gift in our system. Double-check the QR or ask the sender to confirm.
					</Text>
					<Pressable style={styles.button} onPress={() => router.replace('/')}>
						<Text style={styles.buttonText}>Go home</Text>
					</Pressable>
				</View>
			)}

			{state.kind === 'error' && (
				<View style={styles.center}>
					<View style={styles.emojiBadge}>
						<Text style={styles.emoji}>⚠️</Text>
					</View>
					<Text style={styles.title}>Couldn't load your gift</Text>
					<Text style={styles.muted}>{state.message}</Text>
					<Pressable style={styles.button} onPress={() => setState({ kind: 'loading' })}>
						<Text style={styles.buttonText}>Try again</Text>
					</Pressable>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fffaf5',
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: scale(24),
		gap: verticalScale(12),
	},
	emojiBadge: {
		width: scale(72),
		height: scale(72),
		borderRadius: scale(20),
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: verticalScale(8),
	},
	emoji: {
		fontSize: responsiveFontSize(36),
	},
	title: {
		fontSize: responsiveFontSize(22),
		fontWeight: '700',
		color: '#23140f',
		textAlign: 'center',
	},
	muted: {
		fontSize: responsiveFontSize(14),
		color: '#7b6a60',
		textAlign: 'center',
		lineHeight: responsiveFontSize(20),
		maxWidth: scale(320),
	},
	tokenLabel: {
		marginTop: verticalScale(12),
		fontFamily: 'Courier',
		fontSize: responsiveFontSize(12),
		color: '#b39b8d',
	},
	button: {
		marginTop: verticalScale(16),
		paddingHorizontal: scale(24),
		paddingVertical: verticalScale(12),
		borderRadius: scale(12),
		backgroundColor: GIFTYY_THEME.colors.primary,
	},
	buttonText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: responsiveFontSize(14),
	},
});
