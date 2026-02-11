import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Redirect, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, InteractionManager, Text, View } from 'react-native';

const HAS_SEEN_GUIDE_KEY = 'giftyy_has_seen_guide_v1';

export default function Index() {
	const { user, loading, syncAuth } = useAuth();
	const router = useRouter();
	const segments = useSegments();
	const [isHandlingDeepLink, setIsHandlingDeepLink] = React.useState(false);
	const [hasCheckedInitialUrl, setHasCheckedInitialUrl] = React.useState(false);
	const [hasSeenGuide, setHasSeenGuide] = React.useState<boolean | null>(null);
	const [bypassGuide, setBypassGuide] = React.useState(false);

	// Load onboarding/guide completion flag
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const v = await AsyncStorage.getItem(HAS_SEEN_GUIDE_KEY);
				if (cancelled) return;
				setHasSeenGuide(v === '1');
			} catch {
				// If storage fails, do not block users.
				if (cancelled) return;
				setHasSeenGuide(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// Log component render for debugging
	React.useEffect(() => {
		if (__DEV__) {
			console.log('🔵 ========================================');
			console.log('🔵 Index component rendered');
			console.log('🔵 User:', user ? 'Present' : 'None');
			console.log('🔵 Loading:', loading);
			console.log('🔵 isHandlingDeepLink:', isHandlingDeepLink);
			console.log('🔵 hasCheckedInitialUrl:', hasCheckedInitialUrl);
			console.log('🔵 ========================================');
		}
	});

	useEffect(() => {
		if (__DEV__) {
			console.log('🔵 useEffect for deep links initialized');
		}
		
		// Handle deep links for password reset and OAuth callbacks
		const handleDeepLink = async (url: string) => {
			// If the app was opened via deep link, do not interrupt with onboarding.
			setBypassGuide(true);
			if (__DEV__) {
				console.log('🔵 ========================================');
				console.log('🔵 handleDeepLink called with URL:', url);
				console.log('🔵 ========================================');
				console.log('=== Deep Link Received ===');
				console.log('Full URL:', url);
				console.log('URL length:', url.length);
				console.log('Has #:', url.includes('#'));
				console.log('Has ?:', url.includes('?'));
			}
			setIsHandlingDeepLink(true);
			
			const parsed = Linking.parse(url);
			if (__DEV__) {
				console.log('🔵 Parsed path:', parsed.path || '(empty)');
				console.log('🔵 Parsed hostname:', parsed.hostname || '(none)');
				console.log('🔵 Parsed scheme:', parsed.scheme || '(none)');
				console.log('🔵 Parsed queryParams keys:', Object.keys(parsed.queryParams || {}));
				console.log('🔵 Parsed queryParams:', JSON.stringify(parsed.queryParams, null, 2));
			}
			
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
				if (__DEV__) {
					console.log('🔴 Hash fragment found, length:', hashPart.length);
					console.log('🔴 Hash fragment preview (first 200 chars):', hashPart.substring(0, 200));
				}
				
				// Parse hash fragment as query string
				try {
					const hashParams = new URLSearchParams(hashPart);
					accessToken = hashParams.get('access_token') || undefined;
					refreshToken = hashParams.get('refresh_token') || undefined;
					code = hashParams.get('code') || undefined;
					type = hashParams.get('type') || undefined;
					state = hashParams.get('state') || undefined;
					
					if (__DEV__) {
						console.log('🔴 Tokens from hash:', {
							hasAccessToken: !!accessToken,
							hasRefreshToken: !!refreshToken,
							hasCode: !!code,
							type,
							accessTokenLength: accessToken?.length || 0,
							refreshTokenLength: refreshToken?.length || 0,
						});
					}
				} catch (err) {
					if (__DEV__) {
						console.error('🔴 Error parsing hash fragment:', err);
					}
				}
			}
			
			// Fallback to query params if hash parsing didn't work
			if (!accessToken && parsed.queryParams) {
				if (__DEV__) {
					console.log('🔴 Trying query params...');
				}
				accessToken = parsed.queryParams?.access_token as string;
				refreshToken = parsed.queryParams?.refresh_token as string;
				code = parsed.queryParams?.code as string;
				type = parsed.queryParams?.type as string;
				state = parsed.queryParams?.state as string;
				
				if (__DEV__) {
					console.log('🔴 Tokens from query params:', {
						hasAccessToken: !!accessToken,
						hasRefreshToken: !!refreshToken,
						hasCode: !!code,
						type,
					});
				}
			}
			
			if (__DEV__) {
				console.log('🔴 Final extracted tokens:', {
					hasAccessToken: !!accessToken,
					hasRefreshToken: !!refreshToken,
					hasCode: !!code,
					type,
					state: state ? 'Present' : 'Missing',
				});
			}
			
			// Check if this is a password reset link
			// Password reset links can have:
			// - path === 'reset-password'
			// - type === 'recovery' in query params or hash
			// - access_token with type=recovery
			// - Empty path but type=recovery (when redirect_to is just giftyy://)
			// - URL contains "recovery" anywhere (fallback check)
			const urlLower = url.toLowerCase();
			const hasRecoveryInUrl = urlLower.includes('recovery') || urlLower.includes('reset');
			const isPasswordReset = 
				parsed.path === 'reset-password' || 
				type === 'recovery' ||
				(accessToken && type === 'recovery') ||
				(accessToken && parsed.queryParams?.type === 'recovery') ||
				(accessToken && !parsed.path && type === 'recovery') || // Handle empty path with type=recovery
				(accessToken && hasRecoveryInUrl && !code); // Fallback: if URL has "recovery" and access token but no OAuth code
			
			if (isPasswordReset) {
				if (__DEV__) {
					console.log('🔵 ========================================');
					console.log('🔵 PASSWORD RESET LINK DETECTED!');
					console.log('🔵 ========================================');
					console.log('🔵 Path:', parsed.path || '(empty)');
					console.log('🔵 Type:', type);
					console.log('🔵 Has access token:', !!accessToken);
					console.log('🔵 Access token length:', accessToken?.length || 0);
					console.log('🔵 Has refresh token:', !!refreshToken);
				}
				
				if (accessToken) {
					try {
						if (__DEV__) {
							console.log('🔵 Handling password reset deep link...');
						}
						// Set the session using the tokens from the URL
						const { data, error } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken || '',
						});

						if (!error && data?.session) {
							if (__DEV__) {
								console.log('✅ Password reset session established');
								console.log('✅ Session user ID:', data.session.user.id);
							}
							
							// Verify the session was actually saved
							const { data: verifyData, error: verifyError } = await supabase.auth.getSession();
							if (verifyError || !verifyData?.session) {
								if (__DEV__) {
									console.error('❌ Session verification failed:', verifyError);
								}
								// Still try to navigate - the reset password page will handle it
							} else {
								if (__DEV__) {
									console.log('✅ Session verified and saved');
								}
							}
							
							// Wait a moment for auth state to update in AuthContext
							await new Promise(resolve => setTimeout(resolve, 1000));
							
							// Navigate to reset password screen with URL as param so it can also process it
							if (__DEV__) {
								console.log('🔵 Navigating to reset password page...');
							}
							router.replace({
								pathname: '/(auth)/reset-password',
								params: { deepLinkUrl: url }, // Pass URL so reset page can also process it
							});
							return;
						} else {
							if (__DEV__) {
								console.error('❌ Error setting password reset session:', error);
								console.error('❌ Session data:', data);
							}
							setIsHandlingDeepLink(false);
						}
					} catch (error) {
						if (__DEV__) {
							console.error('❌ Error handling password reset deep link:', error);
						}
						setIsHandlingDeepLink(false);
					}
				} else {
					if (__DEV__) {
						console.error('❌ Password reset link missing access token');
					}
					setIsHandlingDeepLink(false);
				}
			}
			
			// Check if this is an OAuth callback (Google sign-in)
			// OAuth callbacks can come from giftyy:// or giftyy://auth/callback
			// They typically have access_token and refresh_token in the URL
			const isOAuthCallback = parsed.path === 'auth/callback' || parsed.path === '' || accessToken || code;
			
			// If it's an OAuth callback with path 'auth/callback', handle it directly here
			// This ensures we have access to the full URL with all parameters
			if (parsed.path === 'auth/callback') {
				if (__DEV__) {
					console.log('🔴 ========================================');
					console.log('🔴 GOOGLE OAUTH CALLBACK DETECTED!');
					console.log('🔴 ========================================');
					console.log('🔴 Full URL:', url);
					console.log('🔴 Parsed path:', parsed.path);
					console.log('🔴 Access token from hash:', !!accessToken);
					console.log('🔴 Refresh token from hash:', !!refreshToken);
					console.log('🔴 Access token from query:', !!parsed.queryParams?.access_token);
					console.log('🔴 Code from query:', !!code);
				}
				
				// Handle OAuth callback directly here
				if (accessToken && refreshToken) {
					if (__DEV__) {
						console.log('🔴 Processing OAuth callback with tokens...');
					}
					try {
						const { data, error: sessionError } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

						if (!sessionError && data?.session) {
							if (__DEV__) {
								console.log('✅ OAuth session established successfully');
								console.log('User ID:', data.session.user.id);
								console.log('Email:', data.session.user.email);
							}
							
							// Verify session was saved
							const { data: verifySession } = await supabase.auth.getSession();
							if (verifySession?.session) {
								if (__DEV__) {
									console.log('✅ Session verified and saved');
								}
								await syncAuth();
								// Wait for interactions and state to propagate, then navigate
								await new Promise(resolve => InteractionManager.runAfterInteractions(() => resolve(undefined)));
								await new Promise(resolve => setTimeout(resolve, 300));
								router.push('/(buyer)/(tabs)');
								setTimeout(() => {
									router.replace('/(buyer)/(tabs)');
								}, 100);
								return;
							} else {
								if (__DEV__) {
									console.error('❌ Session not found after setting');
								}
								router.replace('/(auth)/login');
								return;
							}
						} else {
							if (__DEV__) {
								console.error('❌ Error setting OAuth session:', sessionError);
							}
							router.replace('/(auth)/login');
							return;
						}
					} catch (err) {
						if (__DEV__) {
							console.error('❌ Error handling OAuth callback:', err);
						}
						router.replace('/(auth)/login');
						return;
					}
				} else if (code) {
					// Code exchange flow
					if (__DEV__) {
						console.log('🔴 OAuth code received, exchanging for session...');
					}
					try {
						const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
						if (!exchangeError && exchanged?.session) {
							if (__DEV__) {
								console.log('✅ Session established from code exchange');
							}
							await syncAuth();
							// Wait for interactions and state to propagate, then navigate
							await new Promise(resolve => InteractionManager.runAfterInteractions(() => resolve(undefined)));
							await new Promise(resolve => setTimeout(resolve, 300));
							router.push('/(buyer)/(tabs)');
							setTimeout(() => {
								router.replace('/(buyer)/(tabs)');
							}, 100);
							return;
						}
						if (__DEV__) {
							console.error('❌ Code exchange failed:', exchangeError);
						}
						router.replace('/(auth)/login');
						return;
					} catch (err) {
						if (__DEV__) {
							console.error('❌ Error exchanging code:', err);
						}
						router.replace('/(auth)/login');
						return;
					}
				} else {
					if (__DEV__) {
						console.error('❌ OAuth callback missing required tokens');
						console.error('Access token:', !!accessToken);
						console.error('Refresh token:', !!refreshToken);
						console.error('Code:', !!code);
					}
					// Still route to callback screen to show error
					router.replace('/(auth)/auth/callback');
					return;
				}
			}
			
			if (isOAuthCallback && (accessToken || code)) {
				try {
					if (__DEV__) {
						console.log('Handling OAuth callback...');
					}
					
					if (accessToken && refreshToken) {
						// Direct token exchange (most common for OAuth)
						if (__DEV__) {
							console.log('Setting OAuth session with tokens...');
						}
						const { data, error } = await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

						if (!error && data?.session) {
							if (__DEV__) {
								console.log('✅ OAuth session established successfully');
								console.log('User ID:', data.session.user.id);
								console.log('Email:', data.session.user.email);
							}
							
							// Verify the session was actually saved
							const { data: verifySession, error: verifyError } = await supabase.auth.getSession();
							if (verifyError || !verifySession?.session) {
								if (__DEV__) {
									console.error('❌ Session verification failed:', verifyError);
								}
							} else {
								if (__DEV__) {
									console.log('✅ Session verified and saved');
								}
							}
							
							// Ensure AuthContext picks up the session
							await syncAuth();
							// Wait for interactions and state to propagate, then navigate
							await new Promise(resolve => InteractionManager.runAfterInteractions(() => resolve(undefined)));
							await new Promise(resolve => setTimeout(resolve, 300));
							// Navigate to home - force a refresh
							router.push('/(buyer)/(tabs)');
							setTimeout(() => {
								router.replace('/(buyer)/(tabs)');
							}, 100);
							return;
						} else if (error) {
							if (__DEV__) {
								console.error('❌ Error setting OAuth session:', error);
								console.error('Error details:', JSON.stringify(error, null, 2));
							}
						} else {
							if (__DEV__) {
								console.error('❌ No session returned from setSession');
							}
						}
					} else if (code) {
						// Code exchange (alternative OAuth flow)
						// Try to exchange the code for a session
						if (__DEV__) {
							console.log('OAuth code received, exchanging for session...');
						}
						try {
							const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
							if (!exchangeError && exchanged?.session) {
								if (__DEV__) console.log('✅ Session established from code exchange');
								await syncAuth();
								router.replace('/(buyer)/(tabs)/home');
								return;
							}
							if (__DEV__) console.error('❌ Code exchange failed:', exchangeError);
						} catch (err) {
							if (__DEV__) console.error('❌ Error exchanging code:', err);
						}
					} else {
						if (__DEV__) {
							console.error('❌ OAuth callback missing required tokens');
							console.error('Access token:', !!accessToken);
							console.error('Refresh token:', !!refreshToken);
							console.error('Code:', !!code);
						}
					}
				} catch (error) {
					if (__DEV__) {
						console.error('❌ Error handling OAuth deep link:', error);
					}
				}
			} else {
				if (__DEV__) {
					console.log('⚠️ Deep link does not contain OAuth or password reset tokens');
				}
				setIsHandlingDeepLink(false);
			}
		};

		// Check for initial URL (when app is opened via deep link)
		if (__DEV__) {
			console.log('🔵 Checking for initial URL...');
		}
		
		// Use a timeout to ensure we always set hasCheckedInitialUrl
		const urlCheckTimeout = setTimeout(() => {
			if (!hasCheckedInitialUrl) {
				if (__DEV__) {
					console.log('⚠️ URL check timeout - proceeding with normal flow');
				}
				setHasCheckedInitialUrl(true);
				setIsHandlingDeepLink(false);
			}
		}, 5000); // Increased timeout to 5 seconds

		Linking.getInitialURL()
			.then((url) => {
				if (__DEV__) {
					console.log('🔵 getInitialURL promise resolved');
					console.log('🔵 URL received:', url || '(null)');
				}
				clearTimeout(urlCheckTimeout);
				setHasCheckedInitialUrl(true);
				if (url) {
					if (__DEV__) {
						console.log('🔴 ========================================');
						console.log('🔴 INITIAL URL DETECTED!');
						console.log('🔴 ========================================');
						console.log('🔴 Initial URL:', url);
						console.log('🔴 Full URL string:', JSON.stringify(url));
						console.log('🔴 URL length:', url.length);
					}
					
					// Show alert in dev mode to verify URL is received
					if (__DEV__) {
						// Use setTimeout to avoid blocking
						setTimeout(() => {
							Alert.alert('Deep Link Received', `URL: ${url.substring(0, 100)}...`);
						}, 100);
					}
					
					// Only handle if it's not the Expo dev client URL
					if (url && !url.includes('expo-development-client')) {
						setBypassGuide(true);
						if (__DEV__) {
							console.log('🔴 Processing deep link...');
						}
						handleDeepLink(url);
					} else {
						if (__DEV__) {
							console.log('🔴 Ignoring Expo dev client URL');
						}
						setIsHandlingDeepLink(false);
					}
				} else {
					if (__DEV__) {
						console.log('🔴 No initial URL found - app opened normally');
					}
					setIsHandlingDeepLink(false);
				}
			})
			.catch((err) => {
				if (__DEV__) {
					console.error('🔴 ========================================');
					console.error('🔴 ERROR getting initial URL');
					console.error('🔴 ========================================');
					console.error('🔴 Error:', err);
				}
				clearTimeout(urlCheckTimeout);
				setHasCheckedInitialUrl(true);
				setIsHandlingDeepLink(false);
			});

		// Listen for URL changes (when app is already open)
		// This is the key listener that should catch the OAuth callback
		if (__DEV__) {
			console.log('🔵 Setting up URL event listener...');
		}
		const subscription = Linking.addEventListener('url', (event) => {
			if (__DEV__) {
				console.log('🔴 ========================================');
				console.log('🔴 URL EVENT RECEIVED!');
				console.log('🔴 ========================================');
				console.log('🔴 URL event received in app/index.tsx:', event.url);
			}
			if (__DEV__) {
				console.log('🔴 Full event object:', JSON.stringify(event, null, 2));
			}
			
			// Only handle if it's not the Expo dev client URL
			if (event.url && !event.url.includes('expo-development-client')) {
				setBypassGuide(true);
				if (__DEV__) {
					console.log('🔴 Processing URL event...');
				}
				handleDeepLink(event.url);
			} else {
				if (__DEV__) {
					console.log('🔴 Ignoring Expo dev client URL event');
				}
				setIsHandlingDeepLink(false);
			}
		});

		return () => {
			subscription.remove();
		};
	}, [router, hasCheckedInitialUrl]);

	// Show loading while checking initial URL or handling deep link
	if (loading || isHandlingDeepLink || !hasCheckedInitialUrl || hasSeenGuide === null) {
		if (__DEV__) {
		console.log('🔵 Showing loading screen - loading:', loading, 'isHandlingDeepLink:', isHandlingDeepLink, 'hasCheckedInitialUrl:', hasCheckedInitialUrl);
	}
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
				<ActivityIndicator size="large" color="#f75507" />
				{__DEV__ && (
					<View style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
						<Text style={{ fontSize: 12, color: '#666' }}>
							Loading: {loading ? 'Auth loading' : ''} {isHandlingDeepLink ? 'Deep link' : ''} {!hasCheckedInitialUrl ? 'Checking URL' : ''}
						</Text>
					</View>
				)}
			</View>
		);
	}

	// First-time users: show guide slides after splash (unless app was opened via deep link).
	if (!bypassGuide && hasSeenGuide === false) {
		return <Redirect href="/guide" />;
	}

	if (__DEV__) {
		console.log('🔵 About to redirect - user:', user ? 'Present' : 'None');
	}
	if (user) {
		if (__DEV__) {
			console.log('🔵 Redirecting to home');
		}
		return <Redirect href="/(buyer)/(tabs)" />;
	}

	if (__DEV__) {
		console.log('🔵 Redirecting to login');
	}
	return <Redirect href="/(auth)/login" />;
}

