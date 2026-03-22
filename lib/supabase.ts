import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific storage adapter with error handling.
// AsyncStorage can fail silently (permissions, full disk, corruption),
// which causes refresh tokens to be lost and users to be logged out.
function getStorageAdapter() {
	if (Platform.OS === 'web') {
		// Use localStorage for web
		return {
			getItem: (key: string) => {
				if (typeof window !== 'undefined' && window.localStorage) {
					return Promise.resolve(window.localStorage.getItem(key));
				}
				return Promise.resolve(null);
			},
			setItem: (key: string, value: string) => {
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.setItem(key, value);
				}
				return Promise.resolve();
			},
			removeItem: (key: string) => {
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.removeItem(key);
				}
				return Promise.resolve();
			},
		};
	} else {
		// Wrap AsyncStorage with error handling so storage failures
		// don't silently lose auth tokens.
		return {
			getItem: async (key: string): Promise<string | null> => {
				try {
					return await AsyncStorage.getItem(key);
				} catch (e) {
					console.warn('[Storage] getItem failed for', key, e);
					return null;
				}
			},
			setItem: async (key: string, value: string): Promise<void> => {
				try {
					await AsyncStorage.setItem(key, value);
				} catch (e) {
					console.error('[Storage] setItem failed for', key, e);
				}
			},
			removeItem: async (key: string): Promise<void> => {
				try {
					await AsyncStorage.removeItem(key);
				} catch (e) {
					console.warn('[Storage] removeItem failed for', key, e);
				}
			},
		};
	}
}

const storage = getStorageAdapter();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Log environment variable status at module load (for debugging)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
	console.log('[Supabase] Environment check:');
	console.log('  URL exists:', !!supabaseUrl);
	console.log('  URL length:', supabaseUrl?.length || 0);
	console.log('  Key exists:', !!supabaseAnonKey);
	console.log('  Key length:', supabaseAnonKey?.length || 0);
	console.log('  Platform:', Platform.OS);
}

// Validate environment variables
const hasValidConfig = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10 && supabaseAnonKey.length > 10);

let supabase: SupabaseClient;

if (!hasValidConfig) {
	const errorMessage =
		'\n' +
		'═══════════════════════════════════════════════════════════════\n' +
		'⚠️  SUPABASE ENVIRONMENT VARIABLES NOT CONFIGURED  ⚠️\n' +
		'═══════════════════════════════════════════════════════════════\n' +
		'\n' +
		'Please create a .env.local file in the root directory with:\n' +
		'\n' +
		'  EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
		'  EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n' +
		'\n' +
		'After adding these variables:\n' +
		'  1. Stop your Expo server (Ctrl+C)\n' +
		'  2. Clear the cache: npx expo start --clear\n' +
		'  3. Restart the server\n' +
		'\n' +
		'═══════════════════════════════════════════════════════════════\n';

	console.error(errorMessage);

	// Use placeholder values that have valid format but won't work
	// This prevents the app from crashing at startup
	const placeholderUrl = supabaseUrl || 'https://placeholder.supabase.co';
	const placeholderKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder';

	supabase = createClient(placeholderUrl, placeholderKey, {
		auth: {
			storage: storage,
			autoRefreshToken: false,
			persistSession: false,
			detectSessionInUrl: false,
		},
	});
} else {
	// Create client with actual credentials
	supabase = createClient(
		supabaseUrl,
		supabaseAnonKey,
		{
			auth: {
				storage: storage,
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: Platform.OS === 'web',
				// For React Native, we handle URL detection manually
				// For web, enable URL detection for OAuth flows
				// Note: PKCE flow requires WebCrypto API which React Native doesn't support
				// So we let it default to implicit flow for React Native
			},
		}
	);
}

export { supabase };

// Export a function to verify the client is properly configured
export function isSupabaseConfigured(): boolean {
	return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10 && supabaseAnonKey.length > 10);
}


