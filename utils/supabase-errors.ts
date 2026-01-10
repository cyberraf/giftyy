import { AuthError } from '@supabase/supabase-js';

/**
 * Common Supabase Auth error codes
 * Reference: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
export enum SupabaseAuthErrorCode {
	// Sign up errors
	USER_ALREADY_REGISTERED = 'signup_disabled',
	EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
	INVALID_EMAIL = 'invalid_email',
	WEAK_PASSWORD = 'weak_password',
	
	// Sign in errors
	INVALID_CREDENTIALS = 'invalid_credentials',
	INVALID_PASSWORD = 'invalid_password',
	TOO_MANY_REQUESTS = 'too_many_requests',
	
	// General errors
	NETWORK_ERROR = 'network_error',
	UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Extracts a user-friendly error message from a Supabase error
 */
export function getSupabaseErrorMessage(error: AuthError | Error | null | undefined): string {
	if (!error) {
		return 'An unexpected error occurred. Please try again.';
	}

	// Log the full error for debugging
	console.error('Supabase error:', {
		name: error.name,
		message: error.message,
		status: (error as any).status,
		code: (error as any).code,
		fullError: error,
	});

	// Handle AuthError from Supabase
	if ('status' in error || 'code' in error) {
		const authError = error as AuthError;
		const status = authError.status;
		const code = authError.code || '';
		const message = authError.message || '';

		// Handle by status code
		if (status === 400) {
			if (code === 'invalid_credentials' || code === 'invalid_password' || message.toLowerCase().includes('invalid login credentials')) {
				return 'Invalid email or password. Please try again.';
			}
			// Supabase can represent "email already registered" in multiple ways depending on project settings/version.
			if (
				code === 'signup_disabled' ||
				code === 'user_already_registered' ||
				code === 'user_already_exists' ||
				code === 'email_exists' ||
				message.toLowerCase().includes('already registered') ||
				message.toLowerCase().includes('already exists') ||
				message.toLowerCase().includes('email already') ||
				message.toLowerCase().includes('user already')
			) {
				return 'An account with this email already exists. Please sign in instead.';
			}
			if (message.toLowerCase().includes('invalid email')) {
				return 'Please enter a valid email address.';
			}
			if (message.toLowerCase().includes('password') || code === 'weak_password') {
				return 'Password does not meet requirements. Please use a stronger password.';
			}
			return message || 'Invalid request. Please check your input and try again.';
		}

		if (status === 401) {
			if (code === 'invalid_credentials' || message.toLowerCase().includes('invalid')) {
				return 'Invalid email or password. Please try again.';
			}
			return 'Authentication failed. Please check your credentials and try again.';
		}

		if (status === 422) {
			// 422 is often used for validation errors, including duplicate users
			if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')) {
				return 'An account with this email already exists. Please sign in instead.';
			}
			return message || 'Validation error. Please check your input and try again.';
		}

		if (status === 429) {
			return 'Too many requests. Please wait a moment and try again.';
		}

		if (status === 500 || status === 502 || status === 503) {
			// Check if it's an email sending error
			if (message.toLowerCase().includes('recovery email') || 
			    message.toLowerCase().includes('sending') ||
			    code === 'unexpected_failure') {
				return 'Unable to send password reset email. This is usually due to SMTP configuration in Supabase. Please check your Supabase project settings → Authentication → Email settings.';
			}
			return 'Server error. Please try again in a moment.';
		}

		if (status === 0) {
			// Status 0 usually indicates a network error or CORS issue
			return 'Network error. Please check your internet connection and verify your Supabase configuration.';
		}

		// Handle by error code
		if (code === 'signup_disabled' || code === 'user_already_registered' || code === 'user_already_exists' || code === 'email_exists') {
			return 'An account with this email already exists. Please sign in instead.';
		}

		if (code === 'email_not_confirmed') {
			return 'Please confirm your email address before signing in.';
		}

		if (code === 'invalid_credentials' || code === 'invalid_password') {
			return 'Invalid email or password. Please try again.';
		}

		if (code === 'too_many_requests') {
			return 'Too many requests. Please wait a moment and try again.';
		}

		// Return the message if it exists and is meaningful
		if (message && message.length > 0) {
			return message;
		}
	}

	// Handle network errors
	const errorMessage = error.message || String(error);
	const errorMsgLower = errorMessage.toLowerCase();

	if (
		errorMsgLower.includes('network') ||
		errorMsgLower.includes('fetch') ||
		errorMsgLower.includes('failed to fetch') ||
		errorMsgLower.includes('network request failed')
	) {
		return 'Network error. Please check your internet connection and try again.';
	}

	// Handle generic errors
	if (errorMessage && errorMessage.length > 0) {
		return errorMessage;
	}

	return 'An unexpected error occurred. Please try again.';
}

/**
 * Checks if an error indicates a duplicate user/email already exists
 */
export function isDuplicateUserError(error: AuthError | Error | null | undefined): boolean {
	if (!error) return false;

	const authError = error as AuthError;
	const status = authError.status;
	const code = authError.code || '';
	const message = (authError.message || '').toLowerCase();

	const duplicateCodes = new Set([
		'signup_disabled', // sometimes returned when an email is already registered (depending on settings)
		'user_already_registered',
		'user_already_exists',
		'email_exists',
	]);

	const messageLooksDuplicate =
		message.includes('already registered') ||
		message.includes('already exists') ||
		message.includes('email already') ||
		message.includes('user already') ||
		message.includes('has already been registered') ||
		message.includes('duplicate') ||
		message.includes('unique constraint');

	// Only treat 400/422 as duplicate when we have supporting signal from code/message.
	if (status === 400 || status === 422) {
		return duplicateCodes.has(code) || messageLooksDuplicate;
	}

	return duplicateCodes.has(code) || messageLooksDuplicate;
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: AuthError | Error | null | undefined): boolean {
	if (!error) return false;

	const errorMessage = (error.message || String(error)).toLowerCase();

	return (
		errorMessage.includes('network') ||
		errorMessage.includes('fetch') ||
		errorMessage.includes('failed to fetch') ||
		errorMessage.includes('network request failed')
	);
}

/**
 * Checks if an error is an invalid credentials error
 */
export function isInvalidCredentialsError(error: AuthError | Error | null | undefined): boolean {
	if (!error) return false;

	const authError = error as AuthError;
	const status = authError.status;
	const code = authError.code || '';
	const message = (authError.message || '').toLowerCase();

	return (
		status === 400 ||
		status === 401 ||
		code === 'invalid_credentials' ||
		code === 'invalid_password' ||
		message.includes('invalid') ||
		message.includes('incorrect')
	);
}

