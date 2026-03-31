import type { RecipientPreferences } from '@/types/recipient-preferences';

export const PREFERENCE_THRESHOLD = 0.6;

/**
 * 10 core preference categories. Each category check returns true
 * if any of its representative fields are non-empty.
 */
const CORE_CATEGORIES: { name: string; check: (p: RecipientPreferences) => boolean }[] = [
	{ name: 'Demographics', check: p => hasValue(p.ageRange) },
	{ name: 'Gender', check: p => hasValue(p.genderIdentity) },
	{ name: 'Interests', check: p => hasArrayValue(p.sportsActivities) || hasArrayValue(p.creativeHobbies) || hasArrayValue(p.techInterests) },
	{ name: 'Entertainment', check: p => hasArrayValue(p.favoriteMusicGenres) || hasArrayValue(p.favoriteMoviesGenres) },
	{ name: 'Lifestyle', check: p => hasValue(p.lifestyleType) },
	{ name: 'Style', check: p => hasArrayValue(p.fashionStyle) },
	{ name: 'Food', check: p => hasArrayValue(p.dietaryPreferences) },
	{ name: 'Gifts', check: p => hasArrayValue(p.giftTypePreference) },
	{ name: 'Life Context', check: p => hasValue(p.currentLifeStage) },
	{ name: 'Personality', check: p => hasArrayValue(p.personalityTraits) },
];

function hasValue(val: any): boolean {
	return val != null && val !== '';
}

function hasArrayValue(val: any[] | undefined): boolean {
	return Array.isArray(val) && val.length > 0;
}

export function calculatePreferenceCompletion(prefs: RecipientPreferences | null | undefined): {
	filled: number;
	total: number;
	percentage: number;
} {
	if (!prefs) return { filled: 0, total: CORE_CATEGORIES.length, percentage: 0 };

	const filled = CORE_CATEGORIES.filter(c => c.check(prefs)).length;
	return {
		filled,
		total: CORE_CATEGORIES.length,
		percentage: filled / CORE_CATEGORIES.length,
	};
}

export function isPreferenceComplete(prefs: RecipientPreferences | null | undefined): boolean {
	return calculatePreferenceCompletion(prefs).percentage >= PREFERENCE_THRESHOLD;
}
