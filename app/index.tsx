import { Redirect, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export default function Index() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const segments = useSegments();

	useEffect(() => {
		// Handle deep links for password reset and OAuth callbacks
		const handleDeepLink = async (url: string) => {
			console.log('=== Deep Link Received ===');
			console.log('Full URL:', url);
			console.log('URL length:', url.length);
			console.log('Has #:', url.includes('#'));
			console.log('Has ?:', url.includes('?'));
			
			const parsed = Linking.parse(url);
			console.log('Parsed path:', parsed.path);
			console.log('Parsed queryParams keys:', Object.keys(parsed.queryParams || {}));
			
			// Supabase OAuth URLs can have tokens in queryParams (?) or hash fragments (#)
			// We need to manually parse hash fragments if present
			let accessToken: string | undefined;
			let refreshToken: string | undefined;
			let code: string | undefined;
			let type: string | undefined;
			let state: string | undefined;
			
			// Check if URL has hash fragment (common for OAuth)
			const hashIndex = url.indexOf('#');
			if (hashIndex !== -1) {
				const hashPart = url.substring(hashIndex + 1);
				console.log('🔴 Hash fragment found, length:', hashPart.length);
				console.log('🔴 Hash fragment preview (first 200 chars):', hashPart.substring(0, 200));
				
				// Parse hash fragment as query string
				try {
					const hashParams = new URLSearchParams(hashPart);
					accessToken = hashParams.get('access_token') || undefined;
					refreshToken = hashParams.get('refresh_token') || undefined;
					code = hashParams.get('code') || undefined;
					type = hashParams.get('type') || undefined;
					state = hashParams.get('state') || undefined;
					
					console.log('🔴 Tokens from hash:', {
						hasAccessToken: !!accessToken,
						hasRefreshToken: !!refreshToken,
						hasCode: !!code,
						type,
						accessTokenLength: accessToken?.length || 0,
						refreshTokenLength: refreshToken?.length || 0,
					});
				} catch (err) {
					console.error('🔴 Error parsing hash fragment:', err);
				}
			}
			
			// Fallback to query params if hash parsing didn't work
			if (!accessToken && parsed.queryParams) {
				console.log('🔴 Trying query params...');
				accessToken = parsed.queryParams?.access_token as string;
				refreshToken = parsed.queryParams?.refresh_token as string;
				code = parsed.queryParams?.code as string;
				type = parsed.queryParams?.type as string;
				state = parsed.queryParams?.state as string;
				
				console.log('🔴 Tokens from query params:', {
					hasAccessToken: !!accessToken,
					hasRefreshToken: !!refreshToken,
					hasCode: !!code,
					type,
				});
			}
			
			console.log('🔴 Final extracted tokens:', {
				hasAccessToken: !!accessToken,
				hasRefreshToken: !!refreshToken,
				hasCode: !!code,
				type,
				state: state ? 'Present' : 'Missing',
			});
			
			// Check if this is a password reset link
			if (parsed.path === 'reset-password' || type === 'recovery') {
				if (accessToken) {
					try {
						console.log('Handling password reset deep link...');
						// Set the session using the tokens from the URL
						const { error } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken || '',
						});

						if (!error) {
							console.log('Password reset session established');
							// Navigate to reset password screen
							router.replace('/(auth)/reset-password');
							return;
						} else {
							console.error('Error setting password reset session:', error);
						}
					} catch (error) {
						console.error('Error handling password reset deep link:', error);
					}
				}
			}
			
			// Check if this is an OAuth callback (Google sign-in)
			// OAuth callbacks can come from giftyy:// or giftyy://auth/callback
			// They typically have access_token and refresh_token in the URL
			const isOAuthCallback = parsed.path === 'auth/callback' || parsed.path === '' || accessToken || code;
			
			// If it's an OAuth callback with path 'auth/callback', handle it directly here
			// This ensures we have access to the full URL with all parameters
			if (parsed.path === 'auth/callback') {
				console.log('🔴 OAuth callback detected with path "auth/callback"');
				console.log('🔴 Full URL:', url);
				console.log('🔴 Access token from hash:', !!accessToken);
				console.log('🔴 Refresh token from hash:', !!refreshToken);
				console.log('🔴 Access token from query:', !!parsed.queryParams?.access_token);
				
				// Handle OAuth callback directly here
				if (accessToken && refreshToken) {
					console.log('🔴 Processing OAuth callback with tokens...');
					try {
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
					console.log('🔴 OAuth code received, checking for session...');
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
					// Still route to callback screen to show error
					router.replace('/(auth)/auth/callback');
					return;
				}
			}
			
			if (isOAuthCallback && (accessToken || code)) {
				try {
					console.log('Handling OAuth callback...');
					
					if (accessToken && refreshToken) {
						// Direct token exchange (most common for OAuth)
						console.log('Setting OAuth session with tokens...');
						const { data, error } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

						if (!error && data?.session) {
							console.log('✅ OAuth session established successfully');
							console.log('User ID:', data.session.user.id);
							console.log('Email:', data.session.user.email);
							
							// Verify the session was actually saved
							const { data: verifySession, error: verifyError } = await supabase.auth.getSession();
							if (verifyError || !verifySession?.session) {
								console.error('❌ Session verification failed:', verifyError);
							} else {
								console.log('✅ Session verified and saved');
							}
							
							// Force a small delay to ensure auth state updates
							// The AuthContext's onAuthStateChange should fire automatically
							await new Promise(resolve => setTimeout(resolve, 1000));
							
							// Navigate to home
							router.replace('/(buyer)/(tabs)/home');
							return;
						} else if (error) {
							console.error('❌ Error setting OAuth session:', error);
							console.error('Error details:', JSON.stringify(error, null, 2));
						} else {
							console.error('❌ No session returned from setSession');
						}
					} else if (code) {
						// Code exchange (alternative OAuth flow)
						// Try to exchange the code for a session
						console.log('OAuth code received, attempting code exchange...');
						// Note: Supabase might handle this automatically via getSession
						// But we can try to get the session
						const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
						if (!sessionError && sessionData?.session) {
							console.log('✅ Session found after code exchange');
							router.replace('/(buyer)/(tabs)/home');
							return;
						} else {
							console.error('❌ No session found after code exchange:', sessionError);
						}
					} else {
						console.error('❌ OAuth callback missing required tokens');
						console.error('Access token:', !!accessToken);
						console.error('Refresh token:', !!refreshToken);
						console.error('Code:', !!code);
					}
				} catch (error) {
					console.error('❌ Error handling OAuth deep link:', error);
				}
			} else {
				console.log('⚠️ Deep link does not contain OAuth or password reset tokens');
			}
		};

		// Check for initial URL (when app is opened via deep link)
		Linking.getInitialURL().then((url) => {
			if (url) {
				console.log('🔴 Initial URL detected:', url);
				// Only handle if it's not the Expo dev client URL
				if (url && !url.includes('expo-development-client')) {
					handleDeepLink(url);
				} else {
					console.log('🔴 Ignoring Expo dev client URL');
				}
			} else {
				console.log('🔴 No initial URL found');
			}
		}).catch((err) => {
			console.error('🔴 Error getting initial URL:', err);
		});

		// Listen for URL changes (when app is already open)
		// This is the key listener that should catch the OAuth callback
		const subscription = Linking.addEventListener('url', (event) => {
			console.log('🔴 URL event received in app/index.tsx:', event.url);
			console.log('🔴 Full event object:', JSON.stringify(event, null, 2));
			
			// Only handle if it's not the Expo dev client URL
			if (event.url && !event.url.includes('expo-development-client')) {
				handleDeepLink(event.url);
			} else {
				console.log('🔴 Ignoring Expo dev client URL event');
			}
		});

		return () => {
			subscription.remove();
		};
	}, [router]);

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
				<ActivityIndicator size="large" color="#f75507" />
			</View>
		);
	}

	if (user) {
		return <Redirect href="/(buyer)/(tabs)/home" />;
	}

	return <Redirect href="/(auth)/login" />;
}

