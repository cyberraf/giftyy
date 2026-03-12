// Comprehensive Recipient Preferences Types
// Aligned with database schema for AI-powered gift recommendations

export type AgeRange = '0-12' | '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type LifestyleType = 'minimalist' | 'maximalist' | 'eco-conscious' | 'luxury' | 'practical' | 'adventurous' | 'homebody';
export type EnvironmentalConsciousness = 'very_important' | 'somewhat_important' | 'not_priority';
export type BudgetSensitivity = 'price_conscious' | 'moderate' | 'luxury_preferred';
export type LifeStage = 'student' | 'young_professional' | 'parent' | 'empty_nester' | 'retired';
export type SocialPreferences = 'very_social' | 'moderately_social' | 'prefers_solitude';
export type RiskTolerance = 'adventurous' | 'moderate' | 'cautious';

/**
 * Comprehensive recipient preferences for AI-powered gift recommendations
 */
export type RecipientPreferences = {
    // Demographics & Identity
    ageRange?: AgeRange;
    genderIdentity?: string;
    pronouns?: string;
    culturalBackground?: string[];
    languagesSpoken?: string[];

    // Interests & Hobbies
    sportsActivities?: string[];
    creativeHobbies?: string[];
    collectingInterests?: string[];
    techInterests?: string[];
    outdoorActivities?: string[];
    indoorActivities?: string[];

    // Entertainment & Media
    favoriteMusicGenres?: string[];
    favoriteArtists?: string;
    favoriteBooksGenres?: string[];
    favoriteMoviesGenres?: string[];
    favoriteTvShows?: string[];
    podcastInterests?: string[];

    // Lifestyle & Values
    lifestyleType?: LifestyleType;
    coreValues?: string[];
    causesTheySupport?: string[];
    environmentalConsciousness?: EnvironmentalConsciousness;

    // Style & Aesthetics
    fashionStyle?: string[];
    colorPreferences?: string[];
    homeDecorStyle?: string[];
    designPreferences?: string;

    // Food & Wellness
    dietaryPreferences?: string[];
    foodAllergies?: string[];
    favoriteCuisines?: string[];
    beveragePreferences?: string[];
    wellnessInterests?: string[];

    // Gift Preferences & Constraints
    giftTypePreference?: string[];
    giftDislikes?: string[];
    sizeConstraints?: string;
    sizeTshirt?: string;
    sizeShoes?: string;
    sizePants?: string;
    sizeDress?: string;
    sizeHat?: string;
    sizeRing?: string;
    budgetSensitivity?: BudgetSensitivity;
    prefersExperiencesOverThings?: boolean;

    // Life Context
    currentLifeStage?: LifeStage;
    recentLifeEvents?: string[];
    upcomingMilestones?: string[];
    livingSituation?: string;
    hasPets?: string[];

    // Behavioral & Personality
    personalityTraits?: string[];
    socialPreferences?: SocialPreferences;
    riskTolerance?: RiskTolerance;
    learningStyle?: string[];

    // Practical Constraints
    physicalLimitations?: string;
    scentSensitivities?: string[];
    materialSensitivities?: string[];
    spaceConstraints?: string;

    // Address Information
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;

    // Free-Form & AI Learning
    additionalNotes?: string;
    giftHistoryFeedback?: Array<{
        giftId?: string;
        feedback: 'loved' | 'liked' | 'neutral' | 'disliked';
        notes?: string;
        date: string;
    }>;
    aiLearningData?: Record<string, any>;
};

/**
 * Helper to convert camelCase preferences to snake_case database row
 */
export function preferencesToDbRow(prefs: Partial<RecipientPreferences>): any {
    const row: any = {};

    // Demographics & Identity
    if (prefs.ageRange !== undefined) row.age_range = prefs.ageRange;
    if (prefs.genderIdentity !== undefined) row.gender_identity = prefs.genderIdentity;
    if (prefs.pronouns !== undefined) row.pronouns = prefs.pronouns;
    if (prefs.culturalBackground !== undefined) row.cultural_background = prefs.culturalBackground;
    if (prefs.languagesSpoken !== undefined) row.languages_spoken = prefs.languagesSpoken;

    // Interests & Hobbies
    if (prefs.sportsActivities !== undefined) row.sports_activities = prefs.sportsActivities;
    if (prefs.creativeHobbies !== undefined) row.creative_hobbies = prefs.creativeHobbies;
    if (prefs.collectingInterests !== undefined) row.collecting_interests = prefs.collectingInterests;
    if (prefs.techInterests !== undefined) row.tech_interests = prefs.techInterests;
    if (prefs.outdoorActivities !== undefined) row.outdoor_activities = prefs.outdoorActivities;
    if (prefs.indoorActivities !== undefined) row.indoor_activities = prefs.indoorActivities;

    // Entertainment & Media
    if (prefs.favoriteMusicGenres !== undefined) row.favorite_music_genres = prefs.favoriteMusicGenres;
    if (prefs.favoriteArtists !== undefined) row.favorite_artists = prefs.favoriteArtists;
    if (prefs.favoriteBooksGenres !== undefined) row.favorite_books_genres = prefs.favoriteBooksGenres;
    if (prefs.favoriteMoviesGenres !== undefined) row.favorite_movies_genres = prefs.favoriteMoviesGenres;
    if (prefs.favoriteTvShows !== undefined) row.favorite_tv_shows = prefs.favoriteTvShows;
    if (prefs.podcastInterests !== undefined) row.podcast_interests = prefs.podcastInterests;

    // Lifestyle & Values
    if (prefs.lifestyleType !== undefined) row.lifestyle_type = prefs.lifestyleType;
    if (prefs.coreValues !== undefined) row.core_values = prefs.coreValues;
    if (prefs.causesTheySupport !== undefined) row.causes_they_support = prefs.causesTheySupport;
    if (prefs.environmentalConsciousness !== undefined) row.environmental_consciousness = prefs.environmentalConsciousness;

    // Style & Aesthetics
    if (prefs.fashionStyle !== undefined) row.fashion_style = prefs.fashionStyle;
    if (prefs.colorPreferences !== undefined) row.color_preferences = prefs.colorPreferences;
    if (prefs.homeDecorStyle !== undefined) row.home_decor_style = prefs.homeDecorStyle;
    if (prefs.designPreferences !== undefined) row.design_preferences = prefs.designPreferences;

    // Food & Wellness
    if (prefs.dietaryPreferences !== undefined) row.dietary_preferences = prefs.dietaryPreferences;
    if (prefs.foodAllergies !== undefined) row.food_allergies = prefs.foodAllergies;
    if (prefs.favoriteCuisines !== undefined) row.favorite_cuisines = prefs.favoriteCuisines;
    if (prefs.beveragePreferences !== undefined) row.beverage_preferences = prefs.beveragePreferences;
    if (prefs.wellnessInterests !== undefined) row.wellness_interests = prefs.wellnessInterests;

    // Gift Preferences & Constraints
    if (prefs.giftTypePreference !== undefined) row.gift_type_preference = prefs.giftTypePreference;
    if (prefs.giftDislikes !== undefined) row.gift_dislikes = prefs.giftDislikes;
    if (prefs.sizeConstraints !== undefined) row.size_constraints = prefs.sizeConstraints;
    if (prefs.sizeTshirt !== undefined) row.size_tshirt = prefs.sizeTshirt;
    if (prefs.sizeShoes !== undefined) row.size_shoes = prefs.sizeShoes;
    if (prefs.sizePants !== undefined) row.size_pants = prefs.sizePants;
    if (prefs.sizeDress !== undefined) row.size_dress = prefs.sizeDress;
    if (prefs.sizeHat !== undefined) row.size_hat = prefs.sizeHat;
    if (prefs.sizeRing !== undefined) row.size_ring = prefs.sizeRing;
    if (prefs.budgetSensitivity !== undefined) row.budget_sensitivity = prefs.budgetSensitivity;
    if (prefs.prefersExperiencesOverThings !== undefined) row.prefers_experiences_over_things = prefs.prefersExperiencesOverThings;

    // Life Context
    if (prefs.currentLifeStage !== undefined) row.current_life_stage = prefs.currentLifeStage;
    if (prefs.recentLifeEvents !== undefined) row.recent_life_events = prefs.recentLifeEvents;
    if (prefs.upcomingMilestones !== undefined) row.upcoming_milestones = prefs.upcomingMilestones;
    if (prefs.livingSituation !== undefined) row.living_situation = prefs.livingSituation;
    if (prefs.hasPets !== undefined) row.has_pets = prefs.hasPets;

    // Behavioral & Personality
    if (prefs.personalityTraits !== undefined) row.personality_traits = prefs.personalityTraits;
    if (prefs.socialPreferences !== undefined) row.social_preferences = prefs.socialPreferences;
    if (prefs.riskTolerance !== undefined) row.risk_tolerance = prefs.riskTolerance;
    if (prefs.learningStyle !== undefined) row.learning_style = prefs.learningStyle;

    // Practical Constraints
    if (prefs.physicalLimitations !== undefined) row.physical_limitations = prefs.physicalLimitations;
    if (prefs.scentSensitivities !== undefined) row.scent_sensitivities = prefs.scentSensitivities;
    if (prefs.materialSensitivities !== undefined) row.material_sensitivities = prefs.materialSensitivities;
    if (prefs.spaceConstraints !== undefined) row.space_constraints = prefs.spaceConstraints;

    // Address fields are EXCLUDED here because they belong to recipient_profiles, not recipient_preferences
    /*
    if (prefs.address !== undefined) row.address = prefs.address;
    if (prefs.apartment !== undefined) row.apartment = prefs.apartment;
    if (prefs.city !== undefined) row.city = prefs.city;
    if (prefs.state !== undefined) row.state = prefs.state;
    if (prefs.country !== undefined) row.country = prefs.country;
    if (prefs.zip !== undefined) row.zip = prefs.zip;
    */

    // Free-Form & AI Learning
    if (prefs.additionalNotes !== undefined) row.additional_notes = prefs.additionalNotes;
    if (prefs.giftHistoryFeedback !== undefined) row.gift_history_feedback = prefs.giftHistoryFeedback;
    if (prefs.aiLearningData !== undefined) row.ai_learning_data = prefs.aiLearningData;

    return row;
}

/**
 * Helper to convert snake_case database row to camelCase preferences
 */
export function dbRowToPreferences(row: any): RecipientPreferences {
    const parseJsonSafe = (value: any): any => {
        if (!value) return undefined;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return undefined;
            }
        }
        return value;
    };

    return {
        // Demographics & Identity
        ageRange: row.age_range,
        genderIdentity: row.gender_identity,
        pronouns: row.pronouns,
        culturalBackground: parseJsonSafe(row.cultural_background),
        languagesSpoken: parseJsonSafe(row.languages_spoken),

        // Interests & Hobbies
        sportsActivities: parseJsonSafe(row.sports_activities),
        creativeHobbies: parseJsonSafe(row.creative_hobbies),
        collectingInterests: parseJsonSafe(row.collecting_interests),
        techInterests: parseJsonSafe(row.tech_interests),
        outdoorActivities: parseJsonSafe(row.outdoor_activities),
        indoorActivities: parseJsonSafe(row.indoor_activities),

        // Entertainment & Media
        favoriteMusicGenres: parseJsonSafe(row.favorite_music_genres),
        favoriteArtists: row.favorite_artists,
        favoriteBooksGenres: parseJsonSafe(row.favorite_books_genres),
        favoriteMoviesGenres: parseJsonSafe(row.favorite_movies_genres),
        favoriteTvShows: parseJsonSafe(row.favorite_tv_shows),
        podcastInterests: parseJsonSafe(row.podcast_interests),

        // Lifestyle & Values
        lifestyleType: row.lifestyle_type,
        coreValues: parseJsonSafe(row.core_values),
        causesTheySupport: parseJsonSafe(row.causes_they_support),
        environmentalConsciousness: row.environmental_consciousness,

        // Style & Aesthetics
        fashionStyle: parseJsonSafe(row.fashion_style),
        colorPreferences: parseJsonSafe(row.color_preferences),
        homeDecorStyle: parseJsonSafe(row.home_decor_style),
        designPreferences: row.design_preferences,

        // Food & Wellness
        dietaryPreferences: parseJsonSafe(row.dietary_preferences),
        foodAllergies: parseJsonSafe(row.food_allergies),
        favoriteCuisines: parseJsonSafe(row.favorite_cuisines),
        beveragePreferences: parseJsonSafe(row.beverage_preferences),
        wellnessInterests: parseJsonSafe(row.wellness_interests),

        // Gift Preferences & Constraints
        giftTypePreference: parseJsonSafe(row.gift_type_preference),
        giftDislikes: parseJsonSafe(row.gift_dislikes),
        sizeConstraints: row.size_constraints,
        sizeTshirt: row.size_tshirt,
        sizeShoes: row.size_shoes,
        sizePants: row.size_pants,
        sizeDress: row.size_dress,
        sizeHat: row.size_hat,
        sizeRing: row.size_ring,
        budgetSensitivity: row.budget_sensitivity,
        prefersExperiencesOverThings: row.prefers_experiences_over_things,

        // Life Context
        currentLifeStage: row.current_life_stage,
        recentLifeEvents: parseJsonSafe(row.recent_life_events),
        upcomingMilestones: parseJsonSafe(row.upcoming_milestones),
        livingSituation: row.living_situation,
        hasPets: parseJsonSafe(row.has_pets),

        // Behavioral & Personality
        personalityTraits: parseJsonSafe(row.personality_traits),
        socialPreferences: row.social_preferences,
        riskTolerance: row.risk_tolerance,
        learningStyle: parseJsonSafe(row.learning_style),

        // Practical Constraints
        physicalLimitations: row.physical_limitations,
        scentSensitivities: parseJsonSafe(row.scent_sensitivities),
        materialSensitivities: parseJsonSafe(row.material_sensitivities),
        spaceConstraints: row.space_constraints,

        // Address fields are EXCLUDED here because they belong to recipient_profiles, not recipient_preferences
        /*
        address: row.address,
        apartment: row.apartment,
        city: row.city,
        state: row.state,
        country: row.country,
        zip: row.zip,
        */

        // Free-Form & AI Learning
        additionalNotes: row.additional_notes,
        giftHistoryFeedback: parseJsonSafe(row.gift_history_feedback),
        aiLearningData: parseJsonSafe(row.ai_learning_data),
    };
}
