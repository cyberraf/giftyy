import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

/**
 * OAuth callback handler
 * This route handles the OAuth redirect from Google sign-in
 */
export default function AuthCallbackScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const { user, syncAuth } = useAuth();
	const [processing, setProcessing] = useState(true);
	const [currentUrl, setCurrentUrl] = useState<string | null>(null);
	const hasProcessedRef = useRef(false);

	// Log immediately when component mounts
	console.log('🔵 AuthCallbackScreen component mounted');
	console.log('🔵 Initial params from useLocalSearchParams:', JSON.stringify(params, null, 2));

	// Get the current URL when component mounts
	useEffect(() => {
		let resolved = false;
		
		const processUrl = (url: string | null) => {
			if (url && !resolved) {
				console.log('🔵 ========================================');
				console.log('🔵 URL RECEIVED IN CALLBACK SCREEN!');
				console.log('🔵 ========================================');
				console.log('🔵 Full URL:', url);
				console.log('🔵 URL length:', url.length);
				setCurrentUrl(url);
				resolved = true;
			}
		};

		// Check if URL is in params first (from navigation)
		if (params && typeof params === 'object') {
			// Try to reconstruct URL from params if possible
			const urlFromParams = Object.keys(params).length > 0 ? JSON.stringify(params) : null;
			if (urlFromParams && urlFromParams !== '{}') {
				console.log('🔵 Found params in route:', urlFromParams);
			}
		}

		// Try to get initial URL immediately
		Linking.getInitialURL().then((url) => {
			console.log('🔵 getInitialURL result:', url || '(null)');
			if (url) {
				processUrl(url);
			}
		}).catch(err => {
			console.error('🔵 Error getting initial URL:', err);
		});

		// Listen for URL changes (CRITICAL when app is already open)
		const subscription = Linking.addEventListener('url', (event) => {
			console.log('🔵 ========================================');
			console.log('🔵 URL EVENT IN CALLBACK SCREEN!');
			console.log('🔵 ========================================');
			console.log('🔵 Event URL:', event.url);
			console.log('🔵 Full event:', JSON.stringify(event, null, 2));
			processUrl(event.url);
		});

		// Keep checking for URL (it might arrive after component mounts)
		let checkCount = 0;
		const maxChecks = 10;
		const checkInterval = setInterval(() => {
			if (!resolved && checkCount < maxChecks) {
				checkCount++;
				console.log(`🔵 Checking for URL (attempt ${checkCount}/${maxChecks})...`);
				Linking.getInitialURL().then((url) => {
					if (url) {
						console.log('🔵 URL found on check', checkCount, ':', url.substring(0, 100));
						processUrl(url);
					}
				});
			} else if (checkCount >= maxChecks) {
				console.error('❌ No URL received after', maxChecks, 'checks');
				clearInterval(checkInterval);
			}
		}, 500);

		return () => {
			subscription.remove();
			clearInterval(checkInterval);
		};
	}, [params]);

	// Listen for auth state changes - Supabase might process the callback automatically
	useEffect(() => {
		if (user && !hasProcessedRef.current) {
			console.log('✅ User authenticated via auth state change!');
			hasProcessedRef.current = true;
			setProcessing(false);
			router.replace('/(buyer)/(tabs)/home');
		}
	}, [user, router]);

	useEffect(() => {
		console.log('🔵 useEffect triggered in AuthCallbackScreen');
		console.log('🔵 Current URL:', currentUrl || '(not set)');
		console.log('🔵 Params in useEffect:', JSON.stringify(params, null, 2));
		console.log('🔵 User from auth context:', user ? 'Present' : 'None');
		
		const handleCallback = async () => {
			console.log('=== OAuth Callback Route Handler ===');
			
			// Try to extract params from both useLocalSearchParams and the URL directly
			let accessToken: string | undefined;
			let refreshToken: string | undefined;
			let code: string | undefined;
			let type: string | undefined;
			let state: string | undefined;
			let error: string | undefined;
			let errorDescription: string | undefined;
			
			// First, try to get from useLocalSearchParams
			accessToken = params.access_token as string | undefined;
			refreshToken = params.refresh_token as string | undefined;
			code = params.code as string | undefined;
			type = params.type as string | undefined;
			state = params.state as string | undefined;
			error = params.error as string | undefined;
			errorDescription = params.error_description as string | undefined;
			
			// If params are empty, try parsing from URL directly
			if (!accessToken && currentUrl) {
				console.log('🔵 ========================================');
				console.log('🔵 Parsing URL in callback screen');
				console.log('🔵 ========================================');
				console.log('🔵 Full URL:', currentUrl);
				console.log('🔵 URL length:', currentUrl.length);
				console.log('🔵 Has #:', currentUrl.includes('#'));
				console.log('🔵 Has ?:', currentUrl.includes('?'));
				
				const parsed = Linking.parse(currentUrl);
				console.log('🔵 Parsed path:', parsed.path || '(empty)');
				console.log('🔵 Parsed queryParams:', JSON.stringify(parsed.queryParams, null, 2));
				
				// Check for hash fragment (common in OAuth)
				const hashIndex = currentUrl.indexOf('#');
				if (hashIndex !== -1) {
					const hashPart = currentUrl.substring(hashIndex + 1);
					console.log('🔵 Hash fragment found, length:', hashPart.length);
					console.log('🔵 Hash fragment preview (first 200 chars):', hashPart.substring(0, 200));
					
					try {
						const hashParams = new URLSearchParams(hashPart);
						accessToken = hashParams.get('access_token') || undefined;
						refreshToken = hashParams.get('refresh_token') || undefined;
						code = hashParams.get('code') || undefined;
						type = hashParams.get('type') || undefined;
						state = hashParams.get('state') || undefined;
						error = hashParams.get('error') || undefined;
						errorDescription = hashParams.get('error_description') || undefined;
						
						console.log('🔵 Extracted from hash:', {
							hasAccessToken: !!accessToken,
							hasRefreshToken: !!refreshToken,
							hasCode: !!code,
							type,
						});
					} catch (err) {
						console.error('🔵 Error parsing hash fragment:', err);
					}
				}
				
				// Fallback to query params
				if (!accessToken && parsed.queryParams) {
					console.log('🔵 Trying query params...');
					accessToken = parsed.queryParams.access_token as string | undefined;
					refreshToken = parsed.queryParams.refresh_token as string | undefined;
					code = parsed.queryParams.code as string | undefined;
					type = parsed.queryParams.type as string | undefined;
					state = parsed.queryParams.state as string | undefined;
					error = parsed.queryParams.error as string | undefined;
					errorDescription = parsed.queryParams.error_description as string | undefined;
					
					console.log('🔵 Extracted from query params:', {
						hasAccessToken: !!accessToken,
						hasRefreshToken: !!refreshToken,
						hasCode: !!code,
						type,
					});
				}
			} else if (!currentUrl) {
				console.log('⚠️ No current URL available to parse');
			}
			
			console.log('Final extracted values:', {
				hasAccessToken: !!accessToken,
				hasRefreshToken: !!refreshToken,
				hasCode: !!code,
				type,
				state: state ? 'Present' : 'Missing',
				error,
			});

			console.log('Extracted from params:', {
				hasAccessToken: !!accessToken,
				hasRefreshToken: !!refreshToken,
				hasCode: !!code,
				type,
				error,
			});

			// Handle OAuth errors
			if (error) {
				console.error('OAuth error received:', error, errorDescription);
				// Redirect to login with error
				router.replace('/(auth)/login');
				return;
			}

			// Handle password reset (recovery type)
			if (type === 'recovery' && accessToken) {
				try {
					const { error: sessionError } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken || '',
					});

					if (!sessionError) {
						console.log('Password reset session established');
						router.replace('/(auth)/reset-password');
						return;
					} else {
						console.error('Error setting password reset session:', sessionError);
						router.replace('/(auth)/login');
						return;
					}
				} catch (err) {
					console.error('Error handling password reset callback:', err);
					router.replace('/(auth)/login');
					return;
				}
			}

			// Handle OAuth callback (Google sign-in)
			if (accessToken && refreshToken) {
				try {
					console.log('Setting OAuth session with tokens...');
					const { data, error: sessionError } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken,
					});

					if (!sessionError && data?.session) {
						console.log('✅ OAuth session established successfully');
						console.log('User ID:', data.session.user.id);
						console.log('Email:', data.session.user.email);
						
						// Verify session was saved
						const { data: verifySession } = await supabase.auth.getSession();
						if (verifySession?.session) {
							console.log('✅ Session verified and saved');
							// Ensure AuthContext picks up the new session + profile immediately
							await syncAuth();
							// Navigate to home - the auth state change will handle profile loading
							router.replace('/(buyer)/(tabs)/home');
							return;
						} else {
							console.error('❌ Session not found after setting');
							router.replace('/(auth)/login');
							return;
						}
					} else {
						console.error('❌ Error setting OAuth session:', sessionError);
						router.replace('/(auth)/login');
						return;
					}
				} catch (err) {
					console.error('❌ Error handling OAuth callback:', err);
					router.replace('/(auth)/login');
					return;
				}
			} else if (code) {
				// Code exchange flow
				console.log('OAuth code received, checking for session...');
				const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
				if (!sessionError && sessionData?.session) {
					console.log('✅ Session found after code exchange');
					router.replace('/(buyer)/(tabs)/home');
					return;
				} else {
					console.error('❌ No session found after code exchange:', sessionError);
					router.replace('/(auth)/login');
					return;
				}
			} else {
				console.error('❌ OAuth callback missing required tokens');
				console.error('Access token:', !!accessToken);
				console.error('Refresh token:', !!refreshToken);
				console.error('Code:', !!code);
				router.replace('/(auth)/login');
				return;
			}
		};

		// If we have a URL, process it immediately
		if (currentUrl) {
			console.log('🔵 Processing callback with URL');
			handleCallback().finally(() => {
				setProcessing(false);
			});
			return;
		}

		// If no URL yet, wait and check for session
		// Supabase might have processed the callback automatically
		console.log('🔵 No URL yet, will check for session after delay...');
		
		// Poll for session establishment (Supabase might process it automatically)
		let attempts = 0;
		const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds
		
		const pollInterval = setInterval(async () => {
			attempts++;
			
			// Check if user was set by auth state change
			if (user && !hasProcessedRef.current) {
				console.log('✅ User authenticated during polling!');
				hasProcessedRef.current = true;
				clearInterval(pollInterval);
				setProcessing(false);
				router.replace('/(buyer)/(tabs)/home');
				return;
			}
			
			// Check session directly
			const { data: { session }, error } = await supabase.auth.getSession();
			
			if (session && !hasProcessedRef.current) {
				console.log(`✅ Session found after ${attempts * 500}ms - OAuth was successful!`);
				hasProcessedRef.current = true;
				clearInterval(pollInterval);
				setProcessing(false);
				router.replace('/(buyer)/(tabs)/home');
				return;
			}
			
			if (attempts >= maxAttempts) {
				clearInterval(pollInterval);
				console.error('❌ No session found after polling');
				console.error('Attempts:', attempts);
				console.error('Error:', error);
				console.error('⚠️ Make sure "giftyy://auth/callback" is in Supabase Redirect URLs');
				setProcessing(false);
				router.replace('/(auth)/login');
			} else if (attempts % 4 === 0) {
				console.log(`🔵 Still polling for session... (${attempts * 500}ms elapsed)`);
			}
		}, 500);

		return () => clearInterval(pollInterval);
	}, [params, router, currentUrl, user]);

	// Show loading indicator while processing callback
	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
			<ActivityIndicator size="large" color="#f75507" />
			<Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Completing sign-in...</Text>
		</View>
	);
}

