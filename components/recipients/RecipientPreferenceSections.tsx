/**
 * Example: Comprehensive Recipient Preferences Form Sections
 * 
 * This file demonstrates how to integrate the preference options
 * into the RecipientFormModal using the new components.
 */

import { MultiSelectChips } from '@/components/forms/MultiSelectChips';
import { SingleSelectDropdown } from '@/components/forms/SingleSelectDropdown';
import {
    AGE_RANGE_OPTIONS,
    BOOK_GENRES_OPTIONS,
    BUDGET_SENSITIVITY_OPTIONS,
    COLOR_PREFERENCES_OPTIONS,
    CORE_VALUES_OPTIONS,
    CREATIVE_HOBBIES_OPTIONS,
    CUISINE_OPTIONS,
    DIETARY_PREFERENCES_OPTIONS,
    FASHION_STYLE_OPTIONS,
    FOOD_ALLERGIES_OPTIONS,
    GIFT_DISLIKES_OPTIONS,
    GIFT_TYPE_PREFERENCE_OPTIONS,
    LIFE_STAGE_OPTIONS,
    LIFESTYLE_TYPE_OPTIONS,
    MUSIC_GENRES_OPTIONS,
    PERSONALITY_TRAITS_OPTIONS,
    PRONOUN_OPTIONS,
    SPORTS_ACTIVITIES_OPTIONS,
} from '@/constants/preference-options';
import type { RecipientPreferences } from '@/types/recipient-preferences';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type PreferencesFormProps = {
    preferences: RecipientPreferences;
    onChange: (updates: Partial<RecipientPreferences>) => void;
};

/**
 * Section 1: Demographics & Identity
 */
export function DemographicsSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demographics & Identity</Text>
            <Text style={styles.sectionDescription}>
                Help us understand who they are for age-appropriate and culturally-relevant gifts
            </Text>

            <SingleSelectDropdown
                label="Age Range"
                options={AGE_RANGE_OPTIONS}
                selected={preferences.ageRange}
                onChange={(value) => onChange({ ageRange: value as any })}
                placeholder="Select age range..."
            />

            <SingleSelectDropdown
                label="Pronouns"
                options={PRONOUN_OPTIONS}
                selected={preferences.pronouns}
                onChange={(value) => onChange({ pronouns: value })}
                placeholder="Select pronouns..."
            />
        </View>
    );
}

/**
 * Section 2: Interests & Hobbies
 */
export function InterestsSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests & Hobbies</Text>
            <Text style={styles.sectionDescription}>
                What do they love to do? Select all that apply
            </Text>

            <MultiSelectChips
                label="Sports & Activities"
                options={SPORTS_ACTIVITIES_OPTIONS}
                selected={preferences.sportsActivities || []}
                onChange={(values) => onChange({ sportsActivities: values })}
                placeholder="Select sports and activities..."
            />

            <MultiSelectChips
                label="Creative Hobbies"
                options={CREATIVE_HOBBIES_OPTIONS}
                selected={preferences.creativeHobbies || []}
                onChange={(values) => onChange({ creativeHobbies: values })}
                placeholder="Select creative hobbies..."
            />
        </View>
    );
}

/**
 * Section 3: Entertainment & Media
 */
export function EntertainmentSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entertainment & Media</Text>
            <Text style={styles.sectionDescription}>
                What do they enjoy watching, reading, and listening to?
            </Text>

            <MultiSelectChips
                label="Music Genres"
                options={MUSIC_GENRES_OPTIONS}
                selected={preferences.favoriteMusicGenres || []}
                onChange={(values) => onChange({ favoriteMusicGenres: values })}
                placeholder="Select music genres..."
            />

            <MultiSelectChips
                label="Book Genres"
                options={BOOK_GENRES_OPTIONS}
                selected={preferences.favoriteBooksGenres || []}
                onChange={(values) => onChange({ favoriteBooksGenres: values })}
                placeholder="Select book genres..."
            />
        </View>
    );
}

/**
 * Section 4: Lifestyle & Values
 */
export function LifestyleSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifestyle & Values</Text>
            <Text style={styles.sectionDescription}>
                What matters most to them?
            </Text>

            <SingleSelectDropdown
                label="Lifestyle Type"
                options={LIFESTYLE_TYPE_OPTIONS}
                selected={preferences.lifestyleType}
                onChange={(value) => onChange({ lifestyleType: value as any })}
                placeholder="Select lifestyle type..."
            />

            <MultiSelectChips
                label="Core Values"
                options={CORE_VALUES_OPTIONS}
                selected={preferences.coreValues || []}
                onChange={(values) => onChange({ coreValues: values })}
                placeholder="Select core values..."
                maxSelections={5}
            />
        </View>
    );
}

/**
 * Section 5: Style & Aesthetics
 */
export function StyleSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style & Aesthetics</Text>
            <Text style={styles.sectionDescription}>
                What's their personal style?
            </Text>

            <MultiSelectChips
                label="Fashion Style"
                options={FASHION_STYLE_OPTIONS}
                selected={preferences.fashionStyle || []}
                onChange={(values) => onChange({ fashionStyle: values })}
                placeholder="Select fashion styles..."
            />

            <MultiSelectChips
                label="Color Preferences"
                options={COLOR_PREFERENCES_OPTIONS}
                selected={preferences.colorPreferences || []}
                onChange={(values) => onChange({ colorPreferences: values })}
                placeholder="Select color preferences..."
            />
        </View>
    );
}

/**
 * Section 6: Food & Wellness
 */
export function FoodWellnessSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Food & Wellness</Text>
            <Text style={styles.sectionDescription}>
                Important for food gifts and wellness products
            </Text>

            <MultiSelectChips
                label="Dietary Preferences"
                options={DIETARY_PREFERENCES_OPTIONS}
                selected={preferences.dietaryPreferences || []}
                onChange={(values) => onChange({ dietaryPreferences: values })}
                placeholder="Select dietary preferences..."
            />

            <MultiSelectChips
                label="Food Allergies"
                options={FOOD_ALLERGIES_OPTIONS}
                selected={preferences.foodAllergies || []}
                onChange={(values) => onChange({ foodAllergies: values })}
                placeholder="Select food allergies..."
            />

            <MultiSelectChips
                label="Favorite Cuisines"
                options={CUISINE_OPTIONS}
                selected={preferences.favoriteCuisines || []}
                onChange={(values) => onChange({ favoriteCuisines: values })}
                placeholder="Select favorite cuisines..."
            />
        </View>
    );
}

/**
 * Section 7: Gift Preferences
 */
export function GiftPreferencesSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gift Preferences</Text>
            <Text style={styles.sectionDescription}>
                Help us find the perfect gift by telling us what works and what doesn't
            </Text>

            <MultiSelectChips
                label="Gift Types They Love"
                options={GIFT_TYPE_PREFERENCE_OPTIONS}
                selected={preferences.giftTypePreference || []}
                onChange={(values) => onChange({ giftTypePreference: values })}
                placeholder="Select gift types..."
            />

            <MultiSelectChips
                label="Gift Types to Avoid"
                options={GIFT_DISLIKES_OPTIONS}
                selected={preferences.giftDislikes || []}
                onChange={(values) => onChange({ giftDislikes: values })}
                placeholder="Select gift types to avoid..."
            />

            <SingleSelectDropdown
                label="Budget Sensitivity"
                options={BUDGET_SENSITIVITY_OPTIONS}
                selected={preferences.budgetSensitivity}
                onChange={(value) => onChange({ budgetSensitivity: value as any })}
                placeholder="Select budget preference..."
            />
        </View>
    );
}

/**
 * Section 8: Life Context
 */
export function LifeContextSection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Life Context</Text>
            <Text style={styles.sectionDescription}>
                Current life stage and recent events
            </Text>

            <SingleSelectDropdown
                label="Life Stage"
                options={LIFE_STAGE_OPTIONS}
                selected={preferences.currentLifeStage}
                onChange={(value) => onChange({ currentLifeStage: value as any })}
                placeholder="Select life stage..."
            />
        </View>
    );
}

/**
 * Section 9: Personality
 */
export function PersonalitySection({ preferences, onChange }: PreferencesFormProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personality</Text>
            <Text style={styles.sectionDescription}>
                What are they like as a person?
            </Text>

            <MultiSelectChips
                label="Personality Traits"
                options={PERSONALITY_TRAITS_OPTIONS}
                selected={preferences.personalityTraits || []}
                onChange={(values) => onChange({ personalityTraits: values })}
                placeholder="Select personality traits..."
                maxSelections={5}
            />
        </View>
    );
}

/**
 * Complete Preferences Form (All Sections)
 */
export function ComprehensivePreferencesForm({ preferences, onChange }: PreferencesFormProps) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <DemographicsSection preferences={preferences} onChange={onChange} />
            <InterestsSection preferences={preferences} onChange={onChange} />
            <EntertainmentSection preferences={preferences} onChange={onChange} />
            <LifestyleSection preferences={preferences} onChange={onChange} />
            <StyleSection preferences={preferences} onChange={onChange} />
            <FoodWellnessSection preferences={preferences} onChange={onChange} />
            <GiftPreferencesSection preferences={preferences} onChange={onChange} />
            <LifeContextSection preferences={preferences} onChange={onChange} />
            <PersonalitySection preferences={preferences} onChange={onChange} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginBottom: 32,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(47,35,24,0.1)',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2F2318',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: 'rgba(47,35,24,0.6)',
        marginBottom: 20,
        lineHeight: 20,
    },
});
