/**
 * Normalizes phone input by removing spaces, parentheses, and hyphens.
 * Returns E.164-like string starting with '+'.
 */
export const normalizePhoneInput = (input: string): string => {
    if (!input) return '';

    // Remove all non-digit characters except '+'
    // We allow '+' so that if a user pastes a full number, it's preserved,
    // but we won't FORCE it anymore.
    let normalized = input.replace(/[^\d+]/g, '');

    // Handle multiple '+' or prefixes (e.g., +1+1...)
    if (normalized.includes('+')) {
        const parts = normalized.split('+');
        // Keep only the first + and subsequent digits
        normalized = '+' + parts.join('');
    }

    return normalized;
};

/**
 * Strips the matching country code prefix from the phone input if the user pastes a full number.
 * Ensures the input doesn't double up on the country prefix (like +1 1919...)
 */
export const formatPhoneField = (input: string, countryCode: string): string => {
    let clean = normalizePhoneInput(input);
    if (!clean) return '';

    // If it starts with the exact + prefixed country code, strip it
    if (clean.startsWith(countryCode)) {
        clean = clean.substring(countryCode.length);
    }
    // If it's the US (+1) and the user pasted a 1-prefixed 10-digit number
    else if (countryCode === '+1' && clean.startsWith('1') && clean.length > 10) {
        clean = clean.substring(1);
    }

    return clean;
};
