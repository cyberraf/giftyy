import { supabase } from '@/lib/supabase';

/**
 * Diagnostic function to check Supabase configuration and connectivity
 */
export async function checkSupabaseConnection(): Promise<{
	configured: boolean;
	reachable: boolean;
	error?: string;
}> {
	const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		return {
			configured: false,
			reachable: false,
			error: 'Supabase environment variables are not set',
		};
	}

	try {
		// Try a simple health check by getting the auth session
		// This will fail if Supabase is unreachable, but won't fail if just not authenticated
		const { error } = await supabase.auth.getSession();
		
		// If we get here without a network error, Supabase is reachable
		// The error might be auth-related, but that's fine for a connectivity check
		if (error && error.message?.toLowerCase().includes('network')) {
			return {
				configured: true,
				reachable: false,
				error: error.message,
			};
		}

		return {
			configured: true,
			reachable: true,
		};
	} catch (err: any) {
		const errorMsg = err?.message || String(err);
		return {
			configured: true,
			reachable: false,
			error: errorMsg,
		};
	}
}

