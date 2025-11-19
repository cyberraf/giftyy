import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Log environment variable status at module load (for debugging)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
	console.log('[Supabase] Environment check:');
	console.log('  URL exists:', !!supabaseUrl);
	console.log('  URL length:', supabaseUrl?.length || 0);
	console.log('  Key exists:', !!supabaseAnonKey);
	console.log('  Key length:', supabaseAnonKey?.length || 0);
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
			storage: AsyncStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
			// For React Native, we handle URL detection manually
			// Note: PKCE flow requires WebCrypto API which React Native doesn't support
			// So we let it default to implicit flow for React Native
		},
	}
);

// Export a function to verify the client is properly configured
export function isSupabaseConfigured(): boolean {
	return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10 && supabaseAnonKey.length > 10);
}


