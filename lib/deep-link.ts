import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { InteractionManager } from 'react-native';

/**
 * Deep link handler for Giftyy.
 *
 * Handles two types of deep links:
 *   1. Password reset (type=recovery)
 *   2. OAuth callback (auth/callback with tokens or code)
 */

export type DeepLinkResult =
	| { type: 'password_reset'; url: string }
	| { type: 'oauth_success' }
	| { type: 'oauth_error'; message: string }
	| { type: 'ignored' }
	| { type: 'error'; message: string };

type ParsedTokens = {
	accessToken?: string;
	refreshToken?: string;
	code?: string;
	type?: string;
};

/**
 * Parse OAuth/recovery tokens from a deep link URL.
 * Tokens can appear in hash fragments (#) or query params (?).
 */
function parseTokens(url: string, parsed: Linking.ParsedURL): ParsedTokens {
	let accessToken: string | undefined;
	let refreshToken: string | undefined;
	let code: string | undefined;
	let type: string | undefined;

	// Try hash fragment first (common for OAuth implicit flow)
	const hashIndex = url.indexOf('#');
	if (hashIndex !== -1) {
		try {
			const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
			accessToken = hashParams.get('access_token') || undefined;
			refreshToken = hashParams.get('refresh_token') || undefined;
			code = hashParams.get('code') || undefined;
			type = hashParams.get('type') || undefined;
		} catch {
			// Fall through to query params
		}
	}

	// Fallback to query params
	if (!accessToken && parsed.queryParams) {
		accessToken = parsed.queryParams.access_token as string;
		refreshToken = parsed.queryParams.refresh_token as string;
		code = parsed.queryParams.code as string;
		type = parsed.queryParams.type as string;
	}

	return { accessToken, refreshToken, code, type };
}

/**
 * Check if a URL is a password reset deep link.
 */
function isPasswordResetLink(url: string, path: string | null, type?: string, accessToken?: string, code?: string): boolean {
	const urlLower = url.toLowerCase();
	const hasRecoveryHint = urlLower.includes('recovery') || urlLower.includes('reset');

	return (
		path === 'reset-password' ||
		type === 'recovery' ||
		(!!accessToken && type === 'recovery') ||
		(!!accessToken && hasRecoveryHint && !code)
	);
}

/**
 * Handle a password reset deep link by setting the session and returning a redirect target.
 */
async function handlePasswordReset(accessToken: string, refreshToken?: string): Promise<DeepLinkResult & { type: 'password_reset' | 'error' }> {
	try {
		const { data, error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken || accessToken,
		});

		if (error || !data?.session) {
			console.error('[DeepLink] Password reset session error:', error?.message);
			return { type: 'error', message: 'Failed to establish password reset session' };
		}

		// Verify session persistence
		const { data: verify } = await supabase.auth.getSession();
		if (!verify?.session) {
			console.warn('[DeepLink] Session verification failed after password reset');
		}

		// Allow auth state to propagate
		await new Promise((r) => setTimeout(r, 500));

		return { type: 'password_reset', url: '' };
	} catch (err) {
		console.error('[DeepLink] Password reset error:', err);
		return { type: 'error', message: 'Password reset link processing failed' };
	}
}

/**
 * Handle an OAuth callback by exchanging tokens/code for a session.
 */
async function handleOAuth(tokens: ParsedTokens, syncAuth: () => Promise<void>): Promise<DeepLinkResult> {
	try {
		if (tokens.accessToken && tokens.refreshToken) {
			const { data, error } = await supabase.auth.setSession({
				access_token: tokens.accessToken,
				refresh_token: tokens.refreshToken,
			});

			if (error || !data?.session) {
				console.error('[DeepLink] OAuth session error:', error?.message);
				return { type: 'oauth_error', message: error?.message || 'Session creation failed' };
			}

			await syncAuth();
			await new Promise((r) => InteractionManager.runAfterInteractions(() => r(undefined)));
			return { type: 'oauth_success' };
		}

		if (tokens.code) {
			const { data, error } = await supabase.auth.exchangeCodeForSession(tokens.code);

			if (error || !data?.session) {
				console.error('[DeepLink] Code exchange error:', error?.message);
				return { type: 'oauth_error', message: error?.message || 'Code exchange failed' };
			}

			await syncAuth();
			await new Promise((r) => InteractionManager.runAfterInteractions(() => r(undefined)));
			return { type: 'oauth_success' };
		}

		return { type: 'oauth_error', message: 'OAuth callback missing tokens or code' };
	} catch (err) {
		console.error('[DeepLink] OAuth error:', err);
		return { type: 'oauth_error', message: 'OAuth processing failed' };
	}
}

/**
 * Process a deep link URL and return what action was taken.
 */
export async function processDeepLink(
	url: string,
	syncAuth: () => Promise<void>,
): Promise<DeepLinkResult> {
	if (!url || url.includes('expo-development-client')) {
		return { type: 'ignored' };
	}

	const parsed = Linking.parse(url);
	const tokens = parseTokens(url, parsed);

	if (__DEV__) {
		console.log('[DeepLink] Processing:', {
			path: parsed.path,
			hasAccessToken: !!tokens.accessToken,
			hasCode: !!tokens.code,
			type: tokens.type,
		});
	}

	// 1. Password reset
	if (isPasswordResetLink(url, parsed.path ?? null, tokens.type, tokens.accessToken, tokens.code)) {
		if (!tokens.accessToken) {
			return { type: 'error', message: 'Password reset link missing access token' };
		}
		return handlePasswordReset(tokens.accessToken, tokens.refreshToken);
	}

	// 2. OAuth callback
	const isOAuth = parsed.path === 'auth/callback' || tokens.accessToken || tokens.code;
	if (isOAuth && (tokens.accessToken || tokens.code)) {
		return handleOAuth(tokens, syncAuth);
	}

	return { type: 'ignored' };
}
