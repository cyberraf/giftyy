import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

/**
 * OAuth callback handler
 * This route handles the OAuth redirect from Google sign-in
 */
export default function AuthCallbackScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const [processing, setProcessing] = useState(true);
	const [currentUrl, setCurrentUrl] = useState<string | null>(null);

	// Log immediately when component mounts
	console.log('🔵 AuthCallbackScreen component mounted');
	console.log('🔵 Initial params from useLocalSearchParams:', JSON.stringify(params, null, 2));

	// Get the current URL when component mounts
	useEffect(() => {
		Linking.getInitialURL().then((url) => {
			if (url) {
				console.log('🔵 Initial URL in callback screen:', url);
				setCurrentUrl(url);
			}
		});

		// Listen for URL changes
		const subscription = Linking.addEventListener('url', (event) => {
			console.log('🔵 URL event in callback screen:', event.url);
			setCurrentUrl(event.url);
		});

		return () => subscription.remove();
	}, []);

	useEffect(() => {
		console.log('🔵 useEffect triggered in AuthCallbackScreen');
		console.log('🔵 Current URL:', currentUrl);
		console.log('🔵 Params in useEffect:', JSON.stringify(params, null, 2));
		
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
				console.log('Params empty, parsing from URL directly:', currentUrl);
				const parsed = Linking.parse(currentUrl);
				
				// Check for hash fragment (common in OAuth)
				const hashIndex = currentUrl.indexOf('#');
				if (hashIndex !== -1) {
					const hashPart = currentUrl.substring(hashIndex + 1);
					console.log('Hash fragment found:', hashPart);
					const hashParams = new URLSearchParams(hashPart);
					accessToken = hashParams.get('access_token') || undefined;
					refreshToken = hashParams.get('refresh_token') || undefined;
					code = hashParams.get('code') || undefined;
					type = hashParams.get('type') || undefined;
					state = hashParams.get('state') || undefined;
					error = hashParams.get('error') || undefined;
					errorDescription = hashParams.get('error_description') || undefined;
				}
				
				// Fallback to query params
				if (!accessToken && parsed.queryParams) {
					accessToken = parsed.queryParams.access_token as string | undefined;
					refreshToken = parsed.queryParams.refresh_token as string | undefined;
					code = parsed.queryParams.code as string | undefined;
					type = parsed.queryParams.type as string | undefined;
					state = parsed.queryParams.state as string | undefined;
					error = parsed.queryParams.error as string | undefined;
					errorDescription = parsed.queryParams.error_description as string | undefined;
				}
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

		handleCallback().finally(() => {
			setProcessing(false);
		});
	}, [params, router, currentUrl]);

	// Show loading indicator while processing callback
	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
			<ActivityIndicator size="large" color="#f75507" />
			<Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Completing sign-in...</Text>
		</View>
	);
}

