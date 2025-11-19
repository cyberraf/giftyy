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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

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
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setUser(session?.user ?? null);
			if (session?.user) {
				fetchProfile(session.user.id);
			}
			setLoading(false);
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
			setSession(session);
			setUser(session?.user ?? null);
			if (session?.user) {
				await fetchProfile(session.user.id);
			} else {
				setProfile(null);
			}
			setLoading(false);
		});

		return () => subscription.unsubscribe();
	}, [fetchProfile]);

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
	}, [fetchProfile]);

	const signInWithGoogle = useCallback(async () => {
		try {
			// For React Native, use expo-auth-session which properly handles OAuth state
			// This prevents "invalid state" errors
			const { makeRedirectUri } = await import('expo-auth-session');
			
			// Create the redirect URI using makeRedirectUri
			// In development, this might return exp:// format, but we need giftyy://
			// So we'll construct it manually to ensure consistency
			const redirectUri = __DEV__ 
				? 'giftyy://auth/callback'  // Use giftyy:// in development too
				: makeRedirectUri({
					scheme: 'giftyy',
					path: 'auth/callback',
				});
			
			console.log('OAuth redirect URI:', redirectUri);
			console.log('Environment:', __DEV__ ? 'Development' : 'Production');
			console.log('Make sure this exact URL is added to Supabase redirect URLs:', redirectUri);
			
			// Use Supabase's OAuth flow
			// Get the OAuth URL and open it manually to ensure proper deep link handling
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: redirectUri,
					skipBrowserRedirect: true, // Get URL without opening browser (we'll open it ourselves)
					// Query parameters to help identify OAuth flow
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) {
				console.error('Google OAuth error:', error);
				const errorMessage = getSupabaseErrorMessage(error);
				return {
					error: {
						...error,
						message: errorMessage,
					} as AuthError,
				};
			}

			// Open the OAuth URL using expo-web-browser
			// The browser will redirect to giftyy://auth/callback when OAuth completes
			if (data?.url) {
				console.log('Opening OAuth URL in browser:', data.url);
				
				const { openBrowserAsync, WebBrowserPresentationStyle } = await import('expo-web-browser');
				
				// Open browser - it will redirect to giftyy://auth/callback when OAuth completes
				// The deep link handler in app/index.tsx will catch the callback
				await openBrowserAsync(data.url, {
					presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
					enableBarCollapsing: false,
				});
				
				console.log('Browser opened. Complete OAuth in browser, then the app will receive the callback.');
			} else {
				console.error('No OAuth URL returned from Supabase');
				return {
					error: {
						name: 'GoogleSignInError',
						message: 'Failed to initiate Google sign-in. Please try again.',
					} as AuthError,
				};
			}

			// Note: signInWithOAuth doesn't return a session immediately
			// The session will be established when the OAuth callback is handled
			// The deep link handler in app/index.tsx will process the callback
			return { error: null };
		} catch (err: any) {
			console.error('Google sign-in error:', err);
			const errorMessage = getSupabaseErrorMessage(err);
			return {
				error: {
					name: 'GoogleSignInError',
					message: errorMessage,
				} as AuthError,
			};
		}
	}, []);

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

			if (data?.user) {
				// Profile is created automatically by trigger, but we can fetch it
				await fetchProfile(data.user.id);
				router.replace('/(buyer)/(tabs)/home');
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
	}, [fetchProfile]);

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
				console.log('Calling resetPasswordForEmail...');
				
				// For React Native, the redirect URL might be causing the network error
				// Let's try without redirectTo first to test basic connectivity
				// If this works, the issue is with the redirect URL format
				// If this fails, there's a more fundamental connectivity issue
				
				// Try WITHOUT redirectTo first to isolate the issue
				console.log('Testing password reset WITHOUT redirectTo...');
				result = await supabase.auth.resetPasswordForEmail(email.trim());
				
				// If successful, log that basic connectivity works
				if (result && !result.error) {
					console.log('✓ Basic request succeeded! The issue is likely with redirectTo format.');
					console.log('Note: Email sent without custom redirect. User will need to use default Supabase link.');
				}
				
				console.log('resetPasswordForEmail response received');
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

