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

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn('[Supabase] ⚠️ Environment variables not set!');
	console.warn('[Supabase] Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local');
	console.warn('[Supabase] Make sure to restart your Expo server after adding them.');
}

// Create client with fallback empty strings (will fail gracefully if env vars are missing)
export const supabase: SupabaseClient = createClient(
	supabaseUrl ?? '', 
	supabaseAnonKey ?? '', 
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

// Export a function to verify the client is properly configured
export function isSupabaseConfigured(): boolean {
	return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10 && supabaseAnonKey.length > 10);
}


