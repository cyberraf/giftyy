import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getSupabaseErrorMessage, isNetworkError } from '@/utils/supabase-errors';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Profile = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	phone: string | null;
	date_of_birth: string | null;
	bio: string | null;
	profile_image_url: string | null;
	role: 'buyer';
	created_at: string;
	updated_at: string;
};

type AuthContextType = {
	user: User | null;
	session: Session | null;
	profile: Profile | null;
	loading: boolean;
	signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
	signInWithGoogle: () => Promise<{ error: AuthError | null }>;
	signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: AuthError | null }>;
	resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
	resetPassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
	signOut: () => Promise<void>;
	updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
	refreshProfile: () => Promise<void>;
	deleteAccount: (password: string) => Promise<{ error: AuthError | Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

	const isEmailVerified = useCallback((u?: User | null) => {
		const anyUser = u as any;
		// Supabase returns `email_confirmed_at` (commonly) and/or `confirmed_at` depending on provider/version.
		return !!(anyUser?.email_confirmed_at || anyUser?.confirmed_at);
	}, []);

	const fetchProfile = useCallback(async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', userId)
				.single();

			if (error) {
				// If profile doesn't exist (PGRST116), try to create it
				if (error.code === 'PGRST116') {
					console.log('Profile not found, creating new profile...');
					
					// Get user metadata from auth
					const { data: { user } } = await supabase.auth.getUser();
					if (!user) {
						console.error('No user found when trying to create profile');
						return;
					}

					// Extract name from user metadata
					// For OAuth providers like Google, the name might be in different fields
					let firstName = user.user_metadata?.first_name || null;
					let lastName = user.user_metadata?.last_name || null;
					
					// If name is in full_name (common for Google OAuth), split it
					if (!firstName && user.user_metadata?.full_name) {
						const nameParts = user.user_metadata.full_name.split(' ');
						firstName = nameParts[0] || null;
						lastName = nameParts.slice(1).join(' ') || null;
					}
					
					// Fallback to name field if available
					if (!firstName && user.user_metadata?.name) {
						const nameParts = user.user_metadata.name.split(' ');
						firstName = nameParts[0] || null;
						lastName = nameParts.slice(1).join(' ') || null;
					}

					// Create profile with user metadata
					const { data: newProfile, error: createError } = await supabase
						.from('profiles')
						.insert({
							id: userId,
							first_name: firstName,
							last_name: lastName,
							role: 'buyer',
						})
						.select()
						.single();

					if (createError) {
						console.error('Error creating profile:', createError);
						return;
					}

					setProfile(newProfile as Profile);
				} else {
					// Other errors
					console.error('Error fetching profile:', error);
				}
				return;
			}

			setProfile(data as Profile);
		} catch (error) {
			console.error('Error fetching profile:', error);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;

		// Get initial session
		(async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (cancelled) return;

			// Never treat unverified users as authenticated; also clear any tokens if they exist.
			if (session?.user && !isEmailVerified(session.user)) {
				await supabase.auth.signOut();
				if (cancelled) return;
				setSession(null);
				setUser(null);
				setProfile(null);
				setLoading(false);
				return;
			}

			setSession(session);
			setUser(session?.user ?? null);
			if (session?.user) {
				fetchProfile(session.user.id);
			}
			setLoading(false);
		})();

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
			// Never treat unverified users as authenticated; also clear any tokens if they exist.
			if (session?.user && !isEmailVerified(session.user)) {
				await supabase.auth.signOut();
				setSession(null);
				setUser(null);
				setProfile(null);
				// If we know the email, route them to the verify screen.
				if (session.user.email) {
					router.replace(`/(auth)/verify-email?email=${encodeURIComponent(session.user.email)}`);
				}
				setLoading(false);
				return;
			}

			setSession(session);
			setUser(session?.user ?? null);
			if (session?.user) {
				await fetchProfile(session.user.id);
			} else {
				setProfile(null);
			}
			setLoading(false);
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [fetchProfile, isEmailVerified]);

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

				await fetchProfile(data.user.id);
				router.replace('/(buyer)/(tabs)/home');
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
	}, [fetchProfile, isEmailVerified]);

	const signInWithGoogle = useCallback(async () => {
		try {
			const { makeRedirectUri } = await import('expo-auth-session');
			const { openBrowserAsync, WebBrowserPresentationStyle, WebBrowserResultType } = await import('expo-web-browser');
			
			// Create the redirect URI
			const redirectUri = makeRedirectUri({
				scheme: 'giftyy',
				path: 'auth/callback',
			});
			
			console.log('🔵 Google OAuth - Redirect URI:', redirectUri);
			console.log('🔵 Make sure this URL is added to Supabase redirect URLs:', redirectUri);
			
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

			console.log('🔵 Opening OAuth URL in browser:', data.url);
			
			// Set up a listener for the callback URL BEFORE opening the browser
			// This ensures we catch the deep link when the browser redirects
			let callbackReceived = false;
			let callbackUrl: string | null = null;
			
			const Linking = await import('expo-linking');
			const subscription = Linking.addEventListener('url', (event) => {
				if (event.url && event.url.includes('auth/callback')) {
					console.log('🔵 ========================================');
					console.log('🔵 CALLBACK URL RECEIVED IN AUTHCONTEXT!');
					console.log('🔵 ========================================');
					console.log('🔵 Callback URL:', event.url.substring(0, 200));
					callbackReceived = true;
					callbackUrl = event.url;
					subscription.remove();
				}
			});
			
			// Open browser and wait for the result
			// The browser will redirect to giftyy://auth/callback when OAuth completes
			const result = await openBrowserAsync(data.url, {
				presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
				enableBarCollapsing: false,
			});

			console.log('🔵 Browser closed with result type:', result.type);
			
			// Give a moment for the deep link to be received
			await new Promise(resolve => setTimeout(resolve, 500));
			
			if (callbackReceived && callbackUrl) {
				console.log('🔵 Processing callback URL directly...');
				// Process the callback URL immediately
				try {
					const url = callbackUrl;
					const hashIndex = url.indexOf('#');
					if (hashIndex !== -1) {
						const hashPart = url.substring(hashIndex + 1);
						const hashParams = new URLSearchParams(hashPart);
						const accessToken = hashParams.get('access_token');
						const refreshToken = hashParams.get('refresh_token');
						
						if (accessToken && refreshToken) {
							console.log('🔵 Setting session with tokens from callback...');
							const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
								access_token: accessToken,
								refresh_token: refreshToken,
							});
							
							if (sessionData?.session) {
								console.log('✅ Session established from callback URL');
								await fetchProfile(sessionData.session.user.id);
								return { error: null };
							}
						}
					}
				} catch (err) {
					console.error('❌ Error processing callback URL:', err);
				}
			}
			
			// Clean up listener if still active
			subscription.remove();
			
			// After browser closes, wait for the deep link callback to be processed
			// The browser redirects to giftyy://auth/callback which triggers the deep link handler
			// We need to wait for the session to be established
			console.log('🔵 Waiting for OAuth callback to be processed...');
			
			// Poll for session establishment (up to 10 seconds)
			let attempts = 0;
			const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds
			
			while (attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 500));
				attempts++;
				
				const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
				if (sessionData?.session) {
					console.log(`✅ Session found after ${attempts * 500}ms`);
					await fetchProfile(sessionData.session.user.id);
					return { error: null };
				}
				
				if (attempts % 4 === 0) {
					console.log(`🔵 Still waiting for session... (${attempts * 500}ms elapsed)`);
				}
			}
			
			// Final check
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
			if (sessionData?.session) {
				console.log('✅ Session found on final check');
				await fetchProfile(sessionData.session.user.id);
				return { error: null };
			}
			
			console.error('❌ No session found after OAuth callback');
			console.error('Session error:', sessionError);
			console.error('⚠️ Make sure the redirect URL "giftyy://auth/callback" is added to Supabase redirect URLs');
			return {
				error: {
					name: 'GoogleSignInError',
					message: 'Session not established. Please check that the redirect URL is properly configured and try again.',
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
		}
	}, [fetchProfile]);

	const signUp = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
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
						data: {
							first_name: firstName,
							last_name: lastName,
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

			// For React Native, try different redirect URL formats
			// The Supabase URL should be the base URL (e.g., https://xxx.supabase.co)
			let redirectUrl = 'giftyy://reset-password';
			
			// Clean up the Supabase URL to get the base URL
			let baseUrl = supabaseUrl;
			if (baseUrl.includes('/rest/v1')) {
				baseUrl = baseUrl.replace('/rest/v1', '');
			}
			// Remove trailing slash
			baseUrl = baseUrl.replace(/\/$/, '');
			
			// Try using the app scheme directly first (simplest approach)
			// If this doesn't work, Supabase might need it whitelisted

			// Log the request for debugging
			console.log('=== Password Reset Request Debug ===');
			console.log('Email:', email.trim());
			console.log('Supabase URL:', supabaseUrl);
			console.log('Supabase base URL:', baseUrl);
			console.log('Redirect URL:', redirectUrl);
			console.log('Supabase client configured:', !!supabase);

			// Test Supabase connection first
			try {
				const { error: testError } = await supabase.auth.getSession();
				if (testError && !testError.message.includes('session')) {
					console.warn('Supabase connection test warning:', testError.message);
				} else {
					console.log('Supabase connection: OK');
				}
			} catch (testErr) {
				console.error('Supabase connection test failed:', testErr);
			}

			let result;
			try {
				console.log('=== Password Reset Email Request ===');
				console.log('Email:', email.trim());
				console.log('Redirect URL being sent:', redirectUrl);
				console.log('⚠️ IMPORTANT: Make sure "giftyy://reset-password" is in Supabase Redirect URLs');
				console.log('⚠️ IMPORTANT: Update Site URL in Supabase to "giftyy://" (not localhost:3000)');
				
				// Call resetPasswordForEmail with the custom redirect URL
				// This ensures the email link uses the deep link scheme (giftyy://reset-password)
				// instead of defaulting to localhost:3000
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
					console.log('📧 If the email shows redirect_to=giftyy:// instead, Supabase may be using Site URL');
					console.log('📧 Our deep link handler will still work with giftyy://#access_token=...&type=recovery');
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

		const { error } = await supabase
			.from('profiles')
			.update(updates)
			.eq('id', user.id);

		if (!error) {
			await fetchProfile(user.id);
		}

		return { error };
	}, [user, fetchProfile]);

	const refreshProfile = useCallback(async () => {
		if (user) {
			await fetchProfile(user.id);
		}
	}, [user, fetchProfile]);

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
				signIn,
				signInWithGoogle,
				signUp,
				resetPasswordForEmail,
				resetPassword,
				signOut,
				updateProfile,
				refreshProfile,
				deleteAccount,
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

