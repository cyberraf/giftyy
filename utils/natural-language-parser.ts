/**
 * Natural Language Parser
 * Extracts structured data from free-form text input
 */

import {
    BOOK_GENRES_OPTIONS,
    COLLECTING_INTERESTS_OPTIONS,
    COLOR_PREFERENCES_OPTIONS,
    CREATIVE_HOBBIES_OPTIONS,
    CUISINE_OPTIONS,
    DIETARY_PREFERENCES_OPTIONS,
    FASHION_STYLE_OPTIONS,
    FOOD_ALLERGIES_OPTIONS,
    INDOOR_ACTIVITIES_OPTIONS,
    MOVIE_GENRES_OPTIONS,
    MUSIC_GENRES_OPTIONS,
    OUTDOOR_ACTIVITIES_OPTIONS,
    SPORTS_ACTIVITIES_OPTIONS,
    TECH_INTERESTS_OPTIONS,
} from '@/constants/preference-options';

type ParsedPreferences = {
    sportsActivities?: string[];
    creativeHobbies?: string[];
    collectingInterests?: string[];
    techInterests?: string[];
    outdoorActivities?: string[];
    indoorActivities?: string[];
    favoriteMusicGenres?: string[];
    favoriteBooksGenres?: string[];
    favoriteMoviesGenres?: string[];
    dietaryPreferences?: string[];
    foodAllergies?: string[];
    favoriteCuisines?: string[];
    fashionStyle?: string[];
    colorPreferences?: string[];
    customEntries?: string[];
};

/**
 * Parse natural language input and extract preferences
 */
export function parseNaturalLanguage(text: string): ParsedPreferences {
    const lower = text.toLowerCase();
    const result: ParsedPreferences = {
        customEntries: [],
    };

    // Helper to check if text contains option
    const containsOption = (option: string | { value: string; label: string }) => {
        const optionText = typeof option === 'string' ? option : option.label;
        return lower.includes(optionText.toLowerCase());
    };

    // Parse sports activities
    const sports = SPORTS_ACTIVITIES_OPTIONS.filter(containsOption);
    if (sports.length > 0) result.sportsActivities = sports as string[];

    // Parse creative hobbies
    const hobbies = CREATIVE_HOBBIES_OPTIONS.filter(containsOption);
    if (hobbies.length > 0) result.creativeHobbies = hobbies as string[];

    // Parse collecting interests
    const collecting = COLLECTING_INTERESTS_OPTIONS.filter(containsOption);
    if (collecting.length > 0) result.collectingInterests = collecting as string[];

    // Parse tech interests
    const tech = TECH_INTERESTS_OPTIONS.filter(containsOption);
    if (tech.length > 0) result.techInterests = tech as string[];

    // Parse outdoor activities
    const outdoor = OUTDOOR_ACTIVITIES_OPTIONS.filter(containsOption);
    if (outdoor.length > 0) result.outdoorActivities = outdoor as string[];

    // Parse indoor activities
    const indoor = INDOOR_ACTIVITIES_OPTIONS.filter(containsOption);
    if (indoor.length > 0) result.indoorActivities = indoor as string[];

    // Parse music genres
    const music = MUSIC_GENRES_OPTIONS.filter(containsOption);
    if (music.length > 0) result.favoriteMusicGenres = music as string[];

    // Parse book genres
    const books = BOOK_GENRES_OPTIONS.filter(containsOption);
    if (books.length > 0) result.favoriteBooksGenres = books as string[];

    // Parse movie genres
    const movies = MOVIE_GENRES_OPTIONS.filter(containsOption);
    if (movies.length > 0) result.favoriteMoviesGenres = movies as string[];

    // Parse dietary preferences
    const dietary = DIETARY_PREFERENCES_OPTIONS.filter(containsOption);
    if (dietary.length > 0) result.dietaryPreferences = dietary as string[];

    // Parse food allergies
    const allergies = FOOD_ALLERGIES_OPTIONS.filter(containsOption);
    if (allergies.length > 0) result.foodAllergies = allergies as string[];

    // Parse cuisines
    const cuisines = CUISINE_OPTIONS.filter(containsOption);
    if (cuisines.length > 0) result.favoriteCuisines = cuisines as string[];

    // Parse fashion styles
    const fashion = FASHION_STYLE_OPTIONS.filter(containsOption);
    if (fashion.length > 0) result.fashionStyle = fashion as string[];

    // Parse color preferences
    const colors = COLOR_PREFERENCES_OPTIONS.filter(containsOption);
    if (colors.length > 0) result.colorPreferences = colors as string[];

    // If no matches found, treat as custom entry
    const hasMatches = Object.keys(result).some(
        key => key !== 'customEntries' && result[key as keyof ParsedPreferences]?.length
    );

    if (!hasMatches) {
        // Split by common delimiters and add as custom entries
        const entries = text
            .split(/[,;&]/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        result.customEntries = entries;
    }

    return result;
}

/**
 * Merge parsed preferences with existing form data
 */
export function mergePreferences(
    existing: any,
    parsed: ParsedPreferences
): any {
    const merged = { ...existing };

    Object.entries(parsed).forEach(([key, values]) => {
        if (key === 'customEntries') {
            // Handle custom entries separately
            return;
        }

        if (values && values.length > 0) {
            // Merge with existing values, avoiding duplicates
            const existingValues = merged[key] || [];
            merged[key] = [...new Set([...existingValues, ...values])];
        }
    });

    return merged;
}

/**
 * Example usage:
 * 
 * const text = "loves yoga and photography, vegan";
 * const parsed = parseNaturalLanguage(text);
 * // Result: {
 * //   sportsActivities: ["Yoga"],
 * //   creativeHobbies: ["Photography"],
 * //   dietaryPreferences: ["Vegan"]
 * // }
 */
