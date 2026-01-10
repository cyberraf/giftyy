import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Platform-specific storage adapter
// Use a factory function to avoid importing AsyncStorage on web during build
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
		// Use AsyncStorage for React Native (iOS/Android)
		// Use require to avoid bundling on web
		try {
			const AsyncStorage = require('@react-native-async-storage/async-storage').default;
			return AsyncStorage;
		} catch (error) {
			console.warn('AsyncStorage not available, using in-memory storage');
			// Fallback to in-memory storage if AsyncStorage fails
			const memoryStorage: Record<string, string> = {};
			return {
				getItem: (key: string) => Promise.resolve(memoryStorage[key] || null),
				setItem: (key: string, value: string) => {
					memoryStorage[key] = value;
					return Promise.resolve();
				},
				removeItem: (key: string) => {
					delete memoryStorage[key];
					return Promise.resolve();
				},
			};
		}
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


