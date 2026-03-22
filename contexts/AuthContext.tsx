import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getSupabaseErrorMessage, isNetworkError } from '@/utils/supabase-errors';
import { AuthError, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { registerForPushNotifications } from '@/lib/notifications/registerForPush';
import { useNetwork } from '@/contexts/NetworkContext';
import { AppState } from 'react-native';

export type Profile = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	email?: string | null;
	phone: string | null;
	date_of_birth: string | null;
	bio: string | null;
	profile_image_url: string | null;
	store_name?: string | null;
	role: 'buyer';
	created_at: string;
	updated_at: string;
};

type AuthContextType = {
	user: User | null;
	session: Session | null;
	profile: Profile | null;
	loading: boolean;
	isOffline: boolean;
	isOAuthInProgress: boolean;
	syncAuth: () => Promise<void>;
	signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
	signInWithGoogle: () => Promise<{ error: AuthError | null }>;
	checkEmailExists: (email: string) => Promise<{ exists: boolean; error: AuthError | null }>;
	signUp: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<{ error: AuthError | null }>;
	resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
	resetPassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
	signOut: () => Promise<void>;
	updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
	refreshProfile: () => Promise<void>;
	deleteAccount: (password: string) => Promise<{ error: AuthError | Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Module-level flag to coordinate OAuth flow between AuthContext and other components (e.g. index.tsx).
 * Using a module-level variable (instead of React state/ref) ensures the value is always current
 * when read from async callbacks like URL listeners.
 */
let _oauthInProgress = false;
export function isOAuthFlowActive() {
	return _oauthInProgress;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const { isConnected: networkConnected } = useNetwork();
	const isOffline = !networkConnected;

	// Mutex to prevent concurrent syncSessionFromSupabase calls.
	// Multiple triggers (mount, AppState 'active', bootstrap resync) can race
	// and cause "Refresh Token Not Found" due to Supabase's token rotation.
	const syncLockRef = React.useRef(false);

	// Flag to prevent AuthContext listeners from racing with signInWithGoogle.
	// When true, the AppState + linking listeners skip syncSessionFromSupabase
	// because signInWithGoogle is handling the session establishment itself.
	const oauthInProgressRef = React.useRef(false);
	const hasRegisteredPushRef = useRef(false);

	// Auto-retry refs for network failures on initial auth
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const retryCountRef = useRef(0);
	const syncSessionFromSupabaseRef = useRef<((cancelled?: () => boolean) => Promise<void>) | null>(null);
	const MAX_AUTH_RETRIES = 5;
	const AUTH_RETRY_DELAYS = [2000, 4000, 8000, 15000, 30000]; // Exponential backoff

	const isEmailVerified = useCallback((u?: User | null) => {
		const anyUser = u as any;
		// Supabase returns `email_confirmed_at` (commonly) and/or `confirmed_at` depending on provider/version.
		return !!(anyUser?.email_confirmed_at || anyUser?.confirmed_at);
	}, []);

	const extractNamesFromUser = useCallback((u: User) => {
		// For OAuth providers like Google, the name might be in different fields
		let firstName = (u.user_metadata as any)?.first_name ?? null;
		let lastName = (u.user_metadata as any)?.last_name ?? null;

		// If name is in full_name (common for Google OAuth), split it
		if (!firstName && (u.user_metadata as any)?.full_name) {
			const nameParts = String((u.user_metadata as any).full_name).split(' ');
			firstName = nameParts[0] || null;
			lastName = nameParts.slice(1).join(' ') || null;
		}

		// Fallback to name field if available
		if (!firstName && (u.user_metadata as any)?.name) {
			const nameParts = String((u.user_metadata as any).name).split(' ');
			firstName = nameParts[0] || null;
			lastName = nameParts.slice(1).join(' ') || null;
		}

		return { firstName, lastName };
	}, []);

	const fetchProfileForUser = useCallback(async (u: User) => {
		try {
			const { firstName, lastName } = extractNamesFromUser(u);
			const phone = (u.user_metadata as any)?.phone ?? null;

			// 1) Primary: profile id matches auth uid
			const { data: byId, error: byIdError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', u.id)
				.maybeSingle();

			if (byId) {
				const p = byId as Profile;
				setProfile(p);

				// If the profile is missing basic info but we have it in metadata, update it!
				// This fixes users who signed up before triggers were robust or via certain OAuth paths.
				const needsUpdate = (!p.first_name && firstName) || (!p.last_name && lastName) || (!p.phone && phone);
				if (needsUpdate) {
					const updates: any = {};
					if (!p.first_name && firstName) updates.first_name = firstName;
					if (!p.last_name && lastName) updates.last_name = lastName;
					if (!p.phone && phone) updates.phone = phone;

					await supabase.from('profiles').update(updates).eq('id', u.id);
					// Refresh state with merged data
					setProfile({ ...p, ...updates });
				}
				return;
			}

			// 2) Fallback: for some legacy datasets, profile row may be keyed differently.
			const email = u.email?.trim().toLowerCase();
			if (email) {
				const { data: byEmail, error: byEmailError } = await supabase
					.from('profiles')
					.select('*')
					.eq('email', email)
					.maybeSingle();

				if (byEmail) {
					setProfile(byEmail as Profile);
					// Best-effort: ensure there's also a row keyed by auth uid (doesn't block UI).
					(async () => {
						try {
							await supabase
								.from('profiles')
								.upsert(
									{
										id: u.id,
										email,
										first_name: firstName,
										last_name: lastName,
										phone: phone,
										role: (byEmail as any)?.role ?? 'buyer',
									},
									{ onConflict: 'id' }
								);
						} catch (e) {
							// Silent fail for best-effort sync
						}
					})();
					return;
				}
			}

			// 3) Create profile if missing
			const { data: created, error: createError } = await supabase
				.from('profiles')
				.insert({
					id: u.id,
					email: email ?? null,
					first_name: firstName,
					last_name: lastName,
					phone: phone,
					role: 'buyer',
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creating profile:', createError);
				setProfile(null);
				return;
			}

			setProfile(created as Profile);
		} catch (error: any) {
			console.error('Error fetching profile:', error);
			if (isNetworkError(error)) {
				// Retry once after a brief delay — transient network blips happen on Android
				// when returning from Chrome Custom Tabs (Google OAuth).
				console.log('[AuthContext] Profile fetch network error — retrying once after 1s...');
				await new Promise(resolve => setTimeout(resolve, 1000));
				try {
					const { data: retryData } = await supabase
						.from('profiles')
						.select('*')
						.eq('id', u.id)
						.maybeSingle();
					if (retryData) {
						setProfile(retryData as Profile);
						return;
					}
				} catch (_retryErr) {
					// Fall through
				}
				// Network failure — NetworkContext will detect offline state via NetInfo
			}
		}
	}, [extractNamesFromUser]);

	/**
	 * Apply a session to local state + fetch profile.
	 * This is used by:
	 * - initial bootstrap
	 * - onAuthStateChange
	 * - AppState "active" (important for Android OAuth return-to-app)
	 */
	const applySession = useCallback(
		async (nextSession: Session | null, cancelled?: () => boolean) => {
			// Never treat unverified users as authenticated; also clear any tokens if they exist.
			if (nextSession?.user && !isEmailVerified(nextSession.user)) {
				await supabase.auth.signOut();
				if (cancelled?.()) return;
				setSession(null);
				setUser(null);
				setProfile(null);
				setLoading(false);
				// If we know the email, route them to the verify screen.
				if (nextSession.user.email) {
					router.replace(`/(auth)/verify-email?email=${encodeURIComponent(nextSession.user.email)}`);
				}
				return;
			}

			if (cancelled?.()) return;

			setSession(nextSession);
			setUser(nextSession?.user ?? null);
			if (nextSession?.user) {
				await fetchProfileForUser(nextSession.user);

				// Register for push notifications if not already done in this session
				if (!hasRegisteredPushRef.current) {
					hasRegisteredPushRef.current = true;
					// Fire and forget push token registration
					registerForPushNotifications(nextSession.user.id).catch(err => {
						console.error('[AuthContext] Push registration failed:', err);
					});
				}
			} else {
				setProfile(null);
				hasRegisteredPushRef.current = false;
			}
			setLoading(false);
		},
		[fetchProfileForUser, isEmailVerified]
	);

	// Schedule an automatic retry after a network failure with exponential backoff
	const scheduleAuthRetry = useCallback(() => {
		if (retryCountRef.current >= MAX_AUTH_RETRIES) {
			if (__DEV__) console.log(`[AuthContext] Max retries (${MAX_AUTH_RETRIES}) exhausted — giving up auto-retry`);
			return;
		}
		const delay = AUTH_RETRY_DELAYS[Math.min(retryCountRef.current, AUTH_RETRY_DELAYS.length - 1)];
		retryCountRef.current += 1;
		if (__DEV__) console.log(`[AuthContext] Scheduling auto-retry #${retryCountRef.current} in ${delay}ms`);

		if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
		retryTimerRef.current = setTimeout(() => {
			if (__DEV__) console.log(`[AuthContext] Auto-retry #${retryCountRef.current} firing...`);
			syncSessionFromSupabaseRef.current?.();
		}, delay);
	}, []);

	const syncSessionFromSupabase = useCallback(
		async (cancelled?: () => boolean) => {
			// Prevent concurrent sync calls — the main cause of "Refresh Token Not Found".
			// When multiple callers (mount, AppState, resync timer) race, the first consumes
			// the refresh token via rotation and the second fails.
			if (syncLockRef.current) {
				if (__DEV__) console.log('[AuthContext] syncSessionFromSupabase SKIPPED (already in progress)');
				return;
			}
			syncLockRef.current = true;

			if (__DEV__) console.log('[AuthContext] syncSessionFromSupabase starting...');
			try {
				if (__DEV__) console.log('[AuthContext] calling supabase.auth.getSession()...');
				// Use a promise-based timeout for getSession
				const sessionPromise = supabase.auth.getSession();
				const timeoutPromise = new Promise<{ data: { session: null }; error: any }>((_, reject) =>
					setTimeout(() => reject(new Error('Network request timed out')), 10000)
				);

				const {
					data: { session: currentSession },
					error,
				} = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null }; error: AuthError | null };

				retryCountRef.current = 0; // Reset retry count on success
				if (__DEV__) console.log('[AuthContext] getSession returned, session:', !!currentSession, 'error:', error?.message);

				if (error) {
					console.warn('Error getting session:', error.message);
					if (isNetworkError(error)) {
						// Offline state now derived from NetworkContext
						setLoading(false);
						scheduleAuthRetry();
						return;
					}

					const errorMessage = error.message?.toLowerCase() || '';
					if (errorMessage.includes('refresh token') || errorMessage.includes('token not found')) {
						console.log('[AuthContext] Refresh token error — retrying once after 1s...');
						// Wait briefly, then retry. The previous call may have rotated the token
						// and stored a new one, so a fresh getSession() may succeed.
						await new Promise(resolve => setTimeout(resolve, 1000));
						try {
							const { data: retryData, error: retryError } = await supabase.auth.getSession();
							if (!retryError && retryData?.session) {
								console.log('[AuthContext] Retry succeeded — session recovered');
								await applySession(retryData.session, cancelled);
								return;
							}
						} catch {
							// Fall through to sign out
						}
						console.log('[AuthContext] Retry failed — clearing session');
						await supabase.auth.signOut();
						await applySession(null, cancelled);
						return;
					}
				}

				await applySession(currentSession ?? null, cancelled);
			} catch (err: any) {
				const errorMessage = err?.message?.toLowerCase() || '';
				if (isNetworkError(err)) {
					// Offline state now derived from NetworkContext
					setLoading(false);
					scheduleAuthRetry();
					return;
				}
				if (errorMessage.includes('refresh token') || errorMessage.includes('token not found')) {
					console.log('[AuthContext] Refresh token error (catch) — retrying once after 1s...');
					await new Promise(resolve => setTimeout(resolve, 1000));
					try {
						const { data: retryData, error: retryError } = await supabase.auth.getSession();
						if (!retryError && retryData?.session) {
							console.log('[AuthContext] Retry succeeded — session recovered');
							await applySession(retryData.session, cancelled);
							return;
						}
					} catch (_retryErr) {
						// Fall through to sign out
					}
					console.log('[AuthContext] Retry failed — clearing session');
					await supabase.auth.signOut();
				} else {
					console.error('Unexpected error getting session:', err);
				}
				await applySession(null, cancelled);
			} finally {
				syncLockRef.current = false;
			}
		},
		[applySession, scheduleAuthRetry]
	);

	// Keep ref updated so the retry timer always calls the latest version
	syncSessionFromSupabaseRef.current = syncSessionFromSupabase;

	useEffect(() => {
		let cancelled = false;
		const isCancelled = () => cancelled;

		// Get initial session with auto-retry on failure
		const attemptSync = async () => {
			await syncSessionFromSupabase(isCancelled);

			// If we ended up offline and haven't exhausted retries, schedule another attempt
			// We read isOffline indirectly: if user is still null and loading is false after sync,
			// and we haven't been cancelled, it likely failed.
			// The simplest check: if isOffline was set by syncSessionFromSupabase, retry.
		};
		attemptSync();

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (__DEV__) console.log(`[AuthContext] onAuthStateChange: ${event}, session: ${!!session}`);

			if (event === 'SIGNED_OUT') {
				// Explicit cleanup on sign-out: reset retry state and push registration
				retryCountRef.current = 0;
				if (retryTimerRef.current) {
					clearTimeout(retryTimerRef.current);
					retryTimerRef.current = null;
				}
				hasRegisteredPushRef.current = false;
			}

			if (event === 'TOKEN_REFRESHED') {
				// Token was successfully refreshed — reset retry counters
				retryCountRef.current = 0;
			}

			await applySession(session ?? null);
		});

		// IMPORTANT (Android): Returning from the OAuth browser often triggers AppState active
		// before (or instead of) onAuthStateChange firing in time. Sync session on active.
		// Debounce to avoid rapid-fire calls which cause refresh token rotation races.
		let appStateDebounce: ReturnType<typeof setTimeout> | null = null;
		const appStateSub = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active') {
				// Skip if signInWithGoogle is handling the OAuth flow — it will call applySession itself
				if (oauthInProgressRef.current) {
					if (__DEV__) console.log('[AuthContext] AppState active SKIPPED (OAuth in progress)');
					return;
				}
				if (appStateDebounce) clearTimeout(appStateDebounce);
				appStateDebounce = setTimeout(() => {
					// Also reset retry count when app comes to foreground — gives fresh retry budget
					retryCountRef.current = 0;
					syncSessionFromSupabase();
				}, 500);
			}
		});

		// IMPORTANT: In some cold-start + deep-link scenarios, the auth event can be missed
		// if setSession happens before onAuthStateChange subscription is registered.
		// Listening for the deep-link and then syncing session makes this deterministic.
		const linkingSub = Linking.addEventListener('url', (event) => {
			const url = event?.url || '';
			if (!url) return;
			// Skip if signInWithGoogle is handling the OAuth flow
			if (oauthInProgressRef.current) {
				if (__DEV__) console.log('[AuthContext] linkingSub SKIPPED (OAuth in progress)');
				return;
			}
			// Only react to auth-related deep links.
			if (url.includes('auth/callback') || url.includes('access_token') || url.includes('refresh_token')) {
				// Give Supabase a moment to persist tokens, then sync.
				setTimeout(() => {
					syncSessionFromSupabase();
				}, 500);
			}
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
			appStateSub.remove();
			linkingSub.remove();
			if (appStateDebounce) clearTimeout(appStateDebounce);
			if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
		};
	}, [applySession, syncSessionFromSupabase]);

	const signIn = useCallback(async (email: string, password: string) => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				// Extract user-friendly error message
				const errorMessage = getSupabaseErrorMessage(error);
				return {
					error: {
						...error,
						message: errorMessage,
					} as AuthError,
				};
			}

			if (data?.user) {
				// Block unverified users from being authenticated in-app.
				if (!isEmailVerified(data.user)) {
					await supabase.auth.signOut();
					const targetEmail = data.user.email ?? email;
					router.replace(`/(auth)/verify-email?email=${encodeURIComponent(targetEmail)}`);
					return {
						error: {
							name: 'EmailNotVerified',
							message: 'Please verify your email before signing in.',
						} as AuthError,
					};
				}

				// Apply session immediately so the app can hydrate without needing a restart.
				// (onAuthStateChange should also fire, but this avoids races.)
				await applySession(data.session ?? null);
				router.replace('/(buyer)/(tabs)');
			}

			return { error: null };
		} catch (err: any) {
			// Handle unexpected errors
			console.error('Sign in error:', err);
			const errorMessage = getSupabaseErrorMessage(err);
			return {
				error: {
					name: 'SignInError',
					message: errorMessage,
				} as AuthError,
			};
		}
	}, [applySession, isEmailVerified]);

	const signInWithGoogle = useCallback(async () => {
		oauthInProgressRef.current = true;
		_oauthInProgress = true;
		try {
			const { makeRedirectUri } = await import('expo-auth-session');
			const ExpoWebBrowser = await import('expo-web-browser');
			const openBrowserAsync = ExpoWebBrowser.openBrowserAsync;
			const dismissBrowser = ExpoWebBrowser.dismissBrowser;
			const WebBrowserPresentationStyle = (ExpoWebBrowser as any).WebBrowserPresentationStyle;

			// Create the redirect URI
			// Use 'native' scheme to automatically use exp:// in dev and giftyy:// in production
			// Create the redirect URI
			// FORCE 'giftyy://' scheme for stability. 
			// This requires testing on a Development Build (not Expo Go), but eliminates Supabase whitelist issues.
			const redirectUri = 'giftyy://auth/callback';

			console.log('🔵 ========================================');
			console.log('🔵 GOOGLE OAUTH SIGN-IN INITIATED (FORCED SCHEME)');
			console.log('🔵 ========================================');
			console.log('🔵 Redirect URI:', redirectUri);
			console.log('⚠️  IMPORTANT: Ensure this URL is added to Supabase:');
			console.log('    Authentication → URL Configuration → Redirect URLs');
			console.log('    Add: ' + redirectUri);
			console.log('⚠️  NOTE: You MUST use a Development Build or Production Build for this to work.');
			console.log('    (Expo Go does not support custom schemes like giftyy://)');

			// Get Supabase OAuth URL
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: redirectUri,
					skipBrowserRedirect: true,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) {
				console.error('❌ Google OAuth error:', error);
				const errorMessage = getSupabaseErrorMessage(error);
				return {
					error: {
						...error,
						message: errorMessage,
					} as AuthError,
				};
			}

			if (!data?.url) {
				console.error('❌ No OAuth URL returned from Supabase');
				return {
					error: {
						name: 'GoogleSignInError',
						message: 'Failed to initiate Google sign-in. Please try again.',
					} as AuthError,
				};
			}

			console.log('🔵 Opening OAuth URL in browser...');

			// Set up a listener for the callback URL BEFORE opening the browser
			// This ensures we catch the deep link when the browser redirects
			let callbackReceived = false;
			let callbackUrl: string | null = null;

			const Linking = await import('expo-linking');
			const subscription = Linking.addEventListener('url', async (event) => {
				if (event.url && event.url.includes('auth/callback')) {
					console.log('🔵 ========================================');
					console.log('🔵 CALLBACK URL RECEIVED!');
					console.log('🔵 ========================================');
					console.log('🔵 Callback URL:', event.url.substring(0, 200));
					callbackReceived = true;
					callbackUrl = event.url;

					// CRITICAL: Explicitly dismiss the browser when we receive the callback
					// This ensures the app comes back to foreground
					try {
						await dismissBrowser();
						console.log('✅ Browser dismissed successfully');
					} catch (dismissError) {
						console.warn('⚠️  Could not dismiss browser (it may have closed already):', dismissError);
					}

					subscription.remove();
				}
			});

			// Open browser and wait for the result
			// The browser will redirect to giftyy://auth/callback when OAuth completes
			const result = await openBrowserAsync(data.url, {
				...(WebBrowserPresentationStyle?.AUTOMATIC && {
					presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
				}),
				enableBarCollapsing: false,
			});

			console.log('🔵 Browser result type:', result.type);

			if (result.type === 'opened') {
				// Android: openBrowserAsync returned immediately (Chrome Custom Tabs are non-blocking).
				// The user is still in the browser. We MUST keep the URL subscription alive until
				// the user returns to the app, otherwise we miss the giftyy://auth/callback deep link.
				await new Promise<void>((resolve) => {
					const appSub = AppState.addEventListener('change', (nextState) => {
						if (nextState === 'active') {
							appSub.remove();
							resolve();
						}
					});
					// Safety timeout: 2 minutes (user abandoned the flow)
					setTimeout(resolve, 120000);
				});
				// Brief grace period: Android delivers the deep link slightly after AppState fires
				await new Promise(r => setTimeout(r, 600));
			} else {
				// iOS: openBrowserAsync blocks until the browser is dismissed.
				// Brief wait to let any deep link finish delivering.
				await new Promise(r => setTimeout(r, 500));
			}

			// Clean up listener
			subscription.remove();

			// Process the callback if we received it
			if (callbackReceived && callbackUrl) {
				console.log('🔵 Processing callback URL...');
				try {
					const url = callbackUrl as string;
					const parsed = Linking.parse(url);

					// Extract tokens from hash fragment (most common for OAuth)
					let accessToken: string | null = null;
					let refreshToken: string | null = null;
					let code: string | null = null;

					const hashIndex = url.indexOf('#');
					if (hashIndex !== -1) {
						const hashPart = url.substring(hashIndex + 1);
						const hashParams = new URLSearchParams(hashPart);
						accessToken = hashParams.get('access_token');
						refreshToken = hashParams.get('refresh_token');
						code = hashParams.get('code');
					}

					// Fallback to query params
					if (!accessToken && !code) {
						accessToken = parsed.queryParams?.access_token as string | null;
						refreshToken = parsed.queryParams?.refresh_token as string | null;
						code = parsed.queryParams?.code as string | null;
					}

					console.log('🔵 Extracted tokens:', {
						hasAccessToken: !!accessToken,
						hasRefreshToken: !!refreshToken,
						hasCode: !!code,
					});

					// Handle token-based flow (implicit)
					if (accessToken && refreshToken) {
						console.log('🔵 Setting session with tokens...');
						const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

						if (sessionData?.session) {
							console.log('✅ Session established successfully!');
							await applySession(sessionData.session);
							return { error: null };
						} else {
							console.error('❌ Failed to set session:', sessionError);
						}
					}

					// Handle code-based flow (PKCE)
					if (code) {
						console.log('🔵 Exchanging OAuth code for session...');
						const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
						if (!exchangeError && exchanged?.session) {
							console.log('✅ Session established from code exchange!');
							await applySession(exchanged.session);
							return { error: null };
						} else {
							console.error('❌ Code exchange failed:', exchangeError);
						}
					}
				} catch (err) {
					console.error('❌ Error processing callback URL:', err);
				}
			}

			// If we didn't get a callback, poll for session (fallback mechanism)
			console.log('🔵 Polling for session...');
			let attempts = 0;
			const maxAttempts = 10; // 10 attempts * 500ms = 5 seconds (reduced from 10s)

			while (attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 500));
				attempts++;

				const { data: sessionData } = await supabase.auth.getSession();
				if (sessionData?.session) {
					console.log(`✅ Session found after ${attempts * 500}ms`);
					await applySession(sessionData.session);
					return { error: null };
				}

				if (attempts % 2 === 0) {
					console.log(`🔵 Still waiting... (${attempts * 500}ms)`);
				}
			}

			// No session found - provide helpful error message
			console.error('❌ ========================================');
			console.error('❌ GOOGLE SIGN-IN FAILED');
			console.error('❌ ========================================');
			console.error('❌ No session established after OAuth callback');
			console.error('');
			console.error('⚠️  TROUBLESHOOTING STEPS:');
			console.error('1. Check Supabase Dashboard:');
			console.error('   → Authentication → URL Configuration → Redirect URLs');
			console.error('   → Ensure "' + redirectUri + '" is listed');
			console.error('');
			console.error('2. Verify deep linking is working:');
			console.error('   → Check if app.json has scheme: "giftyy"');
			console.error('   → Test deep link: adb shell am start -a android.intent.action.VIEW -d "giftyy://auth/callback"');
			console.error('');
			console.error('3. Check console logs above for:');
			console.error('   → "CALLBACK URL RECEIVED!" (if missing, deep link failed)');
			console.error('   → Any error messages during token exchange');

			return {
				error: {
					name: 'GoogleSignInError',
					message: 'Unable to complete Google sign-in. Please ensure the redirect URL is configured in Supabase (Authentication → URL Configuration → Redirect URLs). If the issue persists, check the console logs for details.',
				} as AuthError,
			};
		} catch (err: any) {
			console.error('❌ Google sign-in error:', err);
			const errorMessage = getSupabaseErrorMessage(err);
			return {
				error: {
					name: 'GoogleSignInError',
					message: errorMessage,
				} as AuthError,
			};
		} finally {
			oauthInProgressRef.current = false;
			_oauthInProgress = false;
		}
	}, [applySession]);

	const checkEmailExists = useCallback(async (email: string) => {
		try {
			const { data: exists, error } = await supabase.rpc('check_email_exists', {
				email_to_check: email.trim().toLowerCase(),
			});

			if (error) {
				console.error('Error checking email existence:', error);
				return {
					exists: false,
					error: {
						name: 'EmailCheckError',
						message: error.message,
						status: error.code ? parseInt(error.code) : 500,
						code: error.code || '500',
						__isAuthError: true
					} as unknown as AuthError
				};
			}

			return { exists: !!exists, error: null };
		} catch (err: any) {
			console.error('Unexpected error checking email:', err);
			return {
				exists: false,
				error: {
					name: 'EmailCheckError',
					message: 'Could not verify email at this time.',
				} as AuthError,
			};
		}
	}, []);

	const signUp = useCallback(async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
		try {
			// Check if Supabase is properly configured
			const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
			const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

			if (!supabaseUrl || !supabaseKey) {
				return {
					error: {
						name: 'ConfigurationError',
						message: 'Supabase is not configured. Please check your environment variables.',
					} as AuthError,
				};
			}

			let data, error;
			try {
				const result = await supabase.auth.signUp({
					email,
					password,
					options: {
						emailRedirectTo: 'https://giftyy.store/auth/confirm',
						data: {
							first_name: firstName,
							last_name: lastName,
							phone: phone,
						},
					},
				});
				data = result.data;
				error = result.error;
			} catch (signUpError: any) {
				// This catches network errors that occur during the fetch
				console.error('SignUp fetch error:', signUpError);

				// Use utility function to get proper error message
				const errorMessage = getSupabaseErrorMessage(signUpError);

				// If it's a network error, provide helpful context
				if (isNetworkError(signUpError)) {
					return {
						error: {
							name: 'SignupError',
							message: 'Network error. This email may already be registered. Please try signing in instead, or check your internet connection.',
						} as AuthError,
					};
				}

				return {
					error: {
						name: 'SignupError',
						message: errorMessage,
					} as AuthError,
				};
			}

			if (error) {
				// Use utility function to extract proper error message
				const errorMessage = getSupabaseErrorMessage(error);

				return {
					error: {
						...error,
						message: errorMessage,
					} as AuthError
				};
			}

			// Supabase may not error for existing emails (to prevent account enumeration).
			// In that case, it commonly returns a user with an empty `identities` array.
			if (data?.user) {
				const anyUser = data.user as any;
				const identities = Array.isArray(anyUser?.identities) ? anyUser.identities : null;
				if (identities && identities.length === 0) {
					return {
						error: {
							name: 'UserAlreadyExists',
							message: 'An account with this email already exists. Please sign in instead.',
						} as AuthError,
					};
				}
			}

			if (data?.user) {
				// Never auto-login after signup. If Supabase returned a session, clear it.
				await supabase.auth.signOut();
			}

			return { error: null };
		} catch (err: any) {
			// Handle any other unexpected errors
			console.error('Unexpected signup error:', err);
			const errorMessage = getSupabaseErrorMessage(err);

			return {
				error: {
					name: 'SignupError',
					message: errorMessage,
				} as AuthError,
			};
		}
	}, []);

	const resetPasswordForEmail = useCallback(async (email: string) => {
		try {
			// Validate email format first
			if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				return {
					error: {
						name: 'ValidationError',
						message: 'Please enter a valid email address.',
					} as AuthError,
				};
			}

			// Check Supabase configuration
			// In React Native, env vars should be available, but let's verify
			const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
			const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

			// Log environment variable status for debugging
			console.log('=== Environment Variables Check ===');
			console.log('EXPO_PUBLIC_SUPABASE_URL exists:', !!supabaseUrl);
			console.log('EXPO_PUBLIC_SUPABASE_URL length:', supabaseUrl?.length || 0);
			console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseKey);
			console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY length:', supabaseKey?.length || 0);

			if (!supabaseUrl || !supabaseKey) {
				console.error('❌ Supabase environment variables are missing!');
				return {
					error: {
						name: 'ConfigurationError',
						message: 'Supabase is not configured. Please check your .env.local file and restart your Expo server.',
					} as AuthError,
				};
			}

			// Verify the Supabase client was created with valid values
			// The client is created at module load, so if env vars weren't available then,
			// it might have been created with empty strings
			if (!isSupabaseConfigured()) {
				console.error('❌ Supabase client is not properly initialized!');
				console.error('   This usually means environment variables are missing or invalid.');
				console.error('   Please check your .env.local file and restart your Expo server.');
				return {
					error: {
						name: 'ConfigurationError',
						message: 'Supabase client is not properly configured. Please check your .env.local file and restart your Expo server.',
					} as AuthError,
				};
			}

			// The web app has a dedicated route at /reset-password that handles
			// parsing the recovery token from the URL hash and updating the password.
			// This avoids deep linking issues where email clients strip custom protocols 
			// like giftyy:// and instead land users on the root marketing page.
			const redirectUrl = 'https://giftyy.store/reset-password';

			let result;
			try {
				console.log('=== Password Reset Email Request ===');
				console.log('Email:', email.trim());
				console.log('Redirect URL being sent:', redirectUrl);

				// Call resetPasswordForEmail with the custom webapp redirect URL
				const options = {
					redirectTo: redirectUrl,
				};
				console.log('Calling supabase.auth.resetPasswordForEmail with options:', JSON.stringify(options, null, 2));

				result = await supabase.auth.resetPasswordForEmail(email.trim(), options);

				console.log('resetPasswordForEmail response received');
				if (result?.error) {
					console.error('❌ Error in resetPasswordForEmail:', result.error);
					console.error('Error details:', JSON.stringify(result.error, null, 2));
				} else {
					console.log('✅ Password reset email sent successfully');
					console.log('📧 Check your email - the link should use:', redirectUrl);
				}
			} catch (fetchError: any) {
				// This catches network-level errors that occur before Supabase processes the request
				console.error('Network error in resetPasswordForEmail:', {
					error: fetchError,
					message: fetchError?.message,
					name: fetchError?.name,
					stack: fetchError?.stack,
				});

				// Check if it's a network error
				const errorMsg = fetchError?.message || String(fetchError);
				const errorName = fetchError?.name || '';

				if (
					errorMsg.toLowerCase().includes('network') ||
					errorMsg.toLowerCase().includes('fetch') ||
					errorMsg.toLowerCase().includes('failed') ||
					errorName.includes('Network') ||
					errorName.includes('Fetch') ||
					errorName.includes('Retryable')
				) {
					return {
						error: {
							name: 'NetworkError',
							message: `Network request failed. This indicates a connectivity issue.\n\nPlease check:\n\n1. Your internet connection\n2. Supabase URL and key are correct in .env.local\n   - URL format: https://xxx.supabase.co\n   - No trailing slashes\n3. Restart your Expo server after changing .env.local\n4. Check Supabase dashboard → Logs for any errors\n\nIf the issue persists, verify your Supabase project is active and not paused.`,
						} as AuthError,
					};
				}

				// Re-throw to be caught by outer catch
				throw fetchError;
			}

			// Check if result exists and has an error
			if (!result) {
				return {
					error: {
						name: 'ResetPasswordError',
						message: 'No response from Supabase. Please check your internet connection and Supabase configuration.',
					} as AuthError,
				};
			}

			const { error, data } = result;

			if (error) {
				// Log the full error for debugging
				console.error('Supabase resetPasswordForEmail error:', {
					name: error.name,
					message: error.message,
					status: (error as any).status,
					code: (error as any).code,
					fullError: error,
				});

				const errorMessage = getSupabaseErrorMessage(error);

				// Check for email sending errors (SMTP configuration issue)
				if (error.status === 500 &&
					(error.message?.toLowerCase().includes('recovery email') ||
						error.message?.toLowerCase().includes('sending') ||
						error.code === 'unexpected_failure')) {
					return {
						error: {
							name: 'EmailError',
							message: 'Unable to send password reset email.\n\nThis is a Supabase configuration issue:\n\n1. Go to your Supabase dashboard\n2. Navigate to Authentication → Settings → Email\n3. Verify SMTP is configured correctly\n4. If using custom SMTP, check your credentials\n5. If using Supabase default, ensure email is enabled\n\nFor development, you can check the email logs in Supabase dashboard.',
						} as AuthError,
					};
				}

				// Check for specific error cases
				let finalMessage = errorMessage;

				// If error mentions redirect URL, provide specific guidance
				if (
					errorMessage.toLowerCase().includes('redirect') ||
					errorMessage.toLowerCase().includes('url') ||
					(error as any).code === 'invalid_request'
				) {
					finalMessage = 'Invalid redirect URL configuration. Please make sure "giftyy://reset-password" is added to your Supabase project\'s allowed redirect URLs in Authentication → URL Configuration.';
				}

				return {
					error: {
						...error,
						message: finalMessage,
					} as AuthError,
				};
			}

			// Success - Supabase will send the email
			// Note: Supabase returns success even if the email doesn't exist (for security reasons)
			// This is expected behavior - we don't want to reveal which emails are registered
			console.log('Password reset email sent successfully');
			return { error: null };
		} catch (err: any) {
			console.error('Unexpected error in resetPasswordForEmail:', err);
			const errorMessage = getSupabaseErrorMessage(err);

			// Provide helpful error message
			let finalMessage = errorMessage;
			if (errorMessage.toLowerCase().includes('network')) {
				finalMessage = 'Network error. Please check your internet connection and verify your Supabase configuration. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set correctly.';
			}

			return {
				error: {
					name: 'ResetPasswordError',
					message: finalMessage,
				} as AuthError,
			};
		}
	}, []);

	const resetPassword = useCallback(async (newPassword: string) => {
		try {
			// First, verify we have a valid session
			const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

			if (sessionError || !currentSession) {
				return {
					error: {
						name: 'ResetPasswordError',
						message: 'No valid session found. Please click the password reset link from your email again.',
					} as AuthError,
				};
			}

			// Update the password
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				const errorMessage = getSupabaseErrorMessage(error);
				return {
					error: {
						...error,
						message: errorMessage,
					} as AuthError,
				};
			}

			return { error: null };
		} catch (err: any) {
			console.error('Reset password error:', err);
			const errorMessage = getSupabaseErrorMessage(err);

			// Provide more specific error message for network errors
			if (isNetworkError(err)) {
				return {
					error: {
						name: 'ResetPasswordError',
						message: 'Network error. Please check your internet connection and try again. If the problem persists, the reset link may have expired. Please request a new one.',
					} as AuthError,
				};
			}

			return {
				error: {
					name: 'ResetPasswordError',
					message: errorMessage,
				} as AuthError,
			};
		}
	}, []);

	const signOut = useCallback(async () => {
		await supabase.auth.signOut();
		setUser(null);
		setSession(null);
		setProfile(null);
		router.replace('/(auth)/login');
	}, []);

	const updateProfile = useCallback(async (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'role'>>) => {
		if (!user) {
			return { error: new Error('No user logged in') };
		}

		console.log('[AuthContext] Starting updateProfile for user:', user.id);
		const startTime = Date.now();

		try {
			// 1. Update the public.profiles table
			console.log('[AuthContext] Executing profiles table update...');
			const { error } = await supabase
				.from('profiles')
				.update(updates)
				.eq('id', user.id);

			console.log('[AuthContext] DB update finished. Error:', error?.message || 'none');

			if (error) {
				return { error };
			}

			// 2. Performance Optimization: Update local state IMMEDIATELY
			setProfile(prev => {
				console.log('[AuthContext] Syncing local profile state...');
				return prev ? { ...prev, ...updates } : null;
			});

			/* 
			   3. BACKGROUND SYNC REMOVED 
			   Removing the auth.updateUser call temporarily to ensure it's not causing 
			   contention or blocking subsequent requests.
			*/

			const duration = Date.now() - startTime;
			console.log(`[AuthContext] updateProfile completed successfully in ${duration}ms`);
			
			return { error: null };
		} catch (err: any) {
			console.error('[AuthContext] CRITICAL Exception in updateProfile:', err);
			return { error: err instanceof Error ? err : new Error(String(err)) };
		}
	}, [user]);

	const refreshProfile = useCallback(async () => {
		if (user) {
			await fetchProfileForUser(user);
		}
	}, [user, fetchProfileForUser]);

	// Auto-resync auth when connectivity is restored
	const prevConnectedRef = useRef(networkConnected);
	useEffect(() => {
		if (networkConnected && !prevConnectedRef.current) {
			console.log('[AuthContext] Network restored — resyncing auth');
			retryCountRef.current = 0;
			syncSessionFromSupabase();
		}
		prevConnectedRef.current = networkConnected;
	}, [networkConnected, syncSessionFromSupabase]);

	// Expose a deterministic "rehydrate now" helper for deep-link flows.
	const syncAuth = useCallback(async () => {
		await syncSessionFromSupabase();
	}, [syncSessionFromSupabase]);

	const deleteAccount = useCallback(async (password: string): Promise<{ error: AuthError | Error | null }> => {
		if (!user || !user.email) {
			return { error: new Error('No user logged in') };
		}

		try {
			// Verify password by attempting to sign in
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: password,
			});

			if (signInError) {
				return { error: signInError };
			}

			// Password is correct, proceed with account deletion
			// Delete user data from database tables (profile, orders, etc.)
			// Note: RLS policies should handle cascade deletions if configured

			// Delete profile
			const { error: deleteProfileError } = await supabase
				.from('profiles')
				.delete()
				.eq('id', user.id);

			if (deleteProfileError) {
				console.error('Error deleting profile:', deleteProfileError);
				// Continue with sign out even if profile deletion fails
			}

			// Call Supabase Edge Function to delete auth user
			// This requires a Supabase Edge Function with service role key
			// For now, we'll sign out and the user can contact support for complete deletion
			// Note: The Edge Function may not exist yet, so we catch any errors gracefully
			try {
				const { error: deleteUserError } = await supabase.functions.invoke('delete-user-account', {
					body: { userId: user.id },
				});

				if (deleteUserError) {
					console.warn('Error calling delete-user-account function (function may not exist):', deleteUserError);
					// If the function doesn't exist or fails, we'll still sign out
					// In production, you should create this Edge Function to fully delete the auth user
				}
			} catch (error: any) {
				// Edge Function might not exist or network error (404, network failure, etc.)
				// This is expected if the function hasn't been deployed yet
				if (error?.message?.includes('Network request failed') || error?.message?.includes('404')) {
					console.warn('delete-user-account function not found or not available. Continuing with profile deletion...');
				} else {
					console.warn('Error calling delete-user-account function:', error);
				}
				// Continue with sign out even if function call fails
			}

			// Sign out the user
			await signOut();

			return { error: null };
		} catch (error) {
			console.error('Error during account deletion:', error);
			return { error: error instanceof Error ? error : new Error('Unknown error during account deletion') };
		}
	}, [user, signOut]);

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				profile,
				loading,
				syncAuth,
				signIn,
				signInWithGoogle,
				checkEmailExists,
				signUp,
				resetPasswordForEmail,
				resetPassword,
				signOut,
				updateProfile,
				refreshProfile,
				deleteAccount,
				isOffline,
				isOAuthInProgress: _oauthInProgress,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}

