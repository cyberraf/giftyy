/**
 * Conversational Recipient Form Steps - Part 2
 * Steps 6-12 for the multi-step recipient form
 */

import { ConversationalStep } from '@/components/forms/ConversationalStep';
import { MultiSelectChips } from '@/components/forms/MultiSelectChips';
import { SingleSelectDropdown } from '@/components/forms/SingleSelectDropdown';
import {
    BEVERAGE_PREFERENCES_OPTIONS,
    BOOK_GENRES_OPTIONS,
    BUDGET_SENSITIVITY_OPTIONS,
    CAUSES_OPTIONS,
    COLOR_PREFERENCES_OPTIONS,
    CORE_VALUES_OPTIONS,
    CUISINE_OPTIONS,
    DIETARY_PREFERENCES_OPTIONS,
    ENVIRONMENTAL_CONSCIOUSNESS_OPTIONS,
    FASHION_STYLE_OPTIONS,
    FOOD_ALLERGIES_OPTIONS,
    GIFT_DISLIKES_OPTIONS,
    GIFT_TYPE_PREFERENCE_OPTIONS,
    HOME_DECOR_STYLE_OPTIONS,
    LEARNING_STYLE_OPTIONS,
    LIFE_EVENTS_OPTIONS,
    LIFE_STAGE_OPTIONS,
    LIFESTYLE_TYPE_OPTIONS,
    LIVING_SITUATION_OPTIONS,
    MATERIAL_SENSITIVITIES_OPTIONS,
    MILESTONE_OPTIONS,
    MOVIE_GENRES_OPTIONS,
    MUSIC_GENRES_OPTIONS,
    PERSONALITY_TRAITS_OPTIONS,
    PET_OPTIONS,
    PODCAST_INTERESTS_OPTIONS,
    RISK_TOLERANCE_OPTIONS,
    SCENT_SENSITIVITIES_OPTIONS,
    SOCIAL_PREFERENCES_OPTIONS,
    TV_SHOWS_OPTIONS,
    WELLNESS_INTERESTS_OPTIONS
} from '@/constants/preference-options';
import { useRecipients } from '@/contexts/RecipientsContext';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ShareInviteModal } from './ShareInviteModal';

type StepProps = {
    formData?: any;
    updateFormData?: (data: any) => void;
    onNext?: (data?: any) => void;
    onBack?: () => void;
    onSkip?: () => void;
    isFirstStep?: boolean;
    isLastStep?: boolean;
    shouldShow?: (data: any) => boolean;
    isSelf?: boolean;
    onSaveAndExit?: (data?: any) => void;
    label?: string;
};

// ============================================
// STEP 6: Style & Aesthetics
// ============================================
export function Step6_Style({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [fashion, setFashion] = useState(formData?.preferences?.fashionStyle || []);
    const [colors, setColors] = useState(formData?.preferences?.colorPreferences || []);
    const [homeDecor, setHomeDecor] = useState(formData?.preferences?.homeDecorStyle || []);
    const [designPrefs, setDesignPrefs] = useState(formData?.preferences?.designPreferences || '');

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                fashionStyle: fashion,
                colorPreferences: colors,
                homeDecorStyle: homeDecor,
                designPreferences: designPrefs,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                fashionStyle: fashion,
                colorPreferences: colors,
                homeDecorStyle: homeDecor,
                designPreferences: designPrefs,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What's your vibe?" : `What's ${formData?.firstName || 'their'} vibe?`}
            emoji="🎨"
            description={isSelf ? "The colors, styles, and aesthetics that speak to who you are" : "The colors, styles, and aesthetics that speak to who they are"}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Fashion Style"
                options={FASHION_STYLE_OPTIONS}
                selected={fashion}
                onChange={setFashion}
                placeholder="Select styles..."
            />

            <MultiSelectChips
                label="Favorite Colors"
                options={COLOR_PREFERENCES_OPTIONS}
                selected={colors}
                onChange={setColors}
                placeholder="Select colors..."
            />

            <MultiSelectChips
                label="Home Décor Style"
                options={HOME_DECOR_STYLE_OPTIONS}
                selected={homeDecor}
                onChange={setHomeDecor}
                placeholder="Select décor style..."
            />

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Design Preferences</Text>
                <TextInput
                    style={styles.notesInput}
                    value={designPrefs}
                    onChangeText={setDesignPrefs}
                    placeholder="Minimalist, modern, vintage, industrial..."
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                />
            </View>
        </ConversationalStep>
    );
}

// ============================================
// STEP 7: Entertainment & Media
// ============================================
export function Step7_Entertainment({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [music, setMusic] = useState(formData?.preferences?.favoriteMusicGenres || []);
    const [books, setBooks] = useState(formData?.preferences?.favoriteBooksGenres || []);
    const [movies, setMovies] = useState(formData?.preferences?.favoriteMoviesGenres || []);
    const [tvShows, setTvShows] = useState(formData?.preferences?.favoriteTvShows || []);
    const [podcasts, setPodcasts] = useState(formData?.preferences?.podcastInterests || []);
    const [artists, setArtists] = useState(formData?.preferences?.favoriteArtists || '');

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                favoriteMusicGenres: music,
                favoriteBooksGenres: books,
                favoriteMoviesGenres: movies,
                favoriteTvShows: tvShows,
                podcastInterests: podcasts,
                favoriteArtists: artists,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                favoriteMusicGenres: music,
                favoriteBooksGenres: books,
                favoriteMoviesGenres: movies,
                favoriteTvShows: tvShows,
                podcastInterests: podcasts,
                favoriteArtists: artists,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What do you love to watch, read & listen to?" : `What does ${formData?.firstName || 'they'} love to watch, read & listen to?`}
            emoji="🎵"
            description="Entertainment preferences help us find the perfect gifts"
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Music Genres"
                options={MUSIC_GENRES_OPTIONS}
                selected={music}
                onChange={setMusic}
                placeholder="Select music genres..."
            />

            <MultiSelectChips
                label="Book Genres"
                options={BOOK_GENRES_OPTIONS}
                selected={books}
                onChange={setBooks}
                placeholder="Select book genres..."
            />

            <MultiSelectChips
                label="Movie Genres"
                options={MOVIE_GENRES_OPTIONS}
                selected={movies}
                onChange={setMovies}
                placeholder="Select movie genres..."
            />

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Favorite Artists</Text>
                <TextInput
                    style={styles.notesInput}
                    value={artists}
                    onChangeText={setArtists}
                    placeholder="Enter favorite singers, bands, or creators..."
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                />
            </View>

            <MultiSelectChips
                label="TV Shows"
                options={TV_SHOWS_OPTIONS}
                selected={tvShows}
                onChange={setTvShows}
                placeholder="Select TV show genres..."
            />

            <MultiSelectChips
                label="Podcast Interests"
                options={PODCAST_INTERESTS_OPTIONS}
                selected={podcasts}
                onChange={setPodcasts}
                placeholder="Select podcast interests..."
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 8: Food & Wellness
// ============================================
export function Step8_Food({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [dietary, setDietary] = useState(formData?.preferences?.dietaryPreferences || []);
    const [allergies, setAllergies] = useState(formData?.preferences?.foodAllergies || []);
    const [cuisines, setCuisines] = useState(formData?.preferences?.favoriteCuisines || []);
    const [beverages, setBeverages] = useState(formData?.preferences?.beveragePreferences || []);
    const [wellness, setWellness] = useState(formData?.preferences?.wellnessInterests || []);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                dietaryPreferences: dietary,
                foodAllergies: allergies,
                favoriteCuisines: cuisines,
                beveragePreferences: beverages,
                wellnessInterests: wellness,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                dietaryPreferences: dietary,
                foodAllergies: allergies,
                favoriteCuisines: cuisines,
                beveragePreferences: beverages,
                wellnessInterests: wellness,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What's your relationship with food & wellness?" : `What's ${formData?.firstName || 'their'} relationship with food & wellness?`}
            emoji="🍃"
            description="Any preferences or things to keep in mind?"
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Dietary Preferences"
                options={DIETARY_PREFERENCES_OPTIONS}
                selected={dietary}
                onChange={setDietary}
                placeholder="Select dietary preferences..."
            />

            <MultiSelectChips
                label="Food Allergies"
                options={FOOD_ALLERGIES_OPTIONS}
                selected={allergies}
                onChange={setAllergies}
                placeholder="Select allergies..."
            />

            <MultiSelectChips
                label="Favorite Cuisines"
                options={CUISINE_OPTIONS}
                selected={cuisines}
                onChange={setCuisines}
                placeholder="Select cuisines..."
            />

            <MultiSelectChips
                label="Beverage Preferences"
                options={BEVERAGE_PREFERENCES_OPTIONS}
                selected={beverages}
                onChange={setBeverages}
                placeholder="Select beverages..."
            />

            <MultiSelectChips
                label="Wellness Interests"
                options={WELLNESS_INTERESTS_OPTIONS}
                selected={wellness}
                onChange={setWellness}
                placeholder="Select wellness interests..."
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 9: Lifestyle & Values
// ============================================
export function Step9_Lifestyle({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [lifestyleType, setLifestyleType] = useState(formData?.preferences?.lifestyleType);
    const [coreValues, setCoreValues] = useState(formData?.preferences?.coreValues || []);
    const [causes, setCauses] = useState(formData?.preferences?.causesTheySupport || []);
    const [envConsciousness, setEnvConsciousness] = useState(formData?.preferences?.environmentalConsciousness);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                lifestyleType,
                coreValues,
                causesTheySupport: causes,
                environmentalConsciousness: envConsciousness,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                lifestyleType,
                coreValues,
                causesTheySupport: causes,
                environmentalConsciousness: envConsciousness,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What do you stand for?" : `What does ${formData?.firstName || 'they'} stand for?`}
            emoji="🌱"
            description={isSelf ? "Values and lifestyle choices that shape your world" : "Values and lifestyle choices that shape their world"}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <SingleSelectDropdown
                label="Lifestyle Type"
                options={LIFESTYLE_TYPE_OPTIONS}
                selected={lifestyleType}
                onChange={setLifestyleType}
                placeholder="Select lifestyle..."
            />

            <MultiSelectChips
                label="Core Values"
                options={CORE_VALUES_OPTIONS}
                selected={coreValues}
                onChange={setCoreValues}
                placeholder="Select values..."
            />

            <MultiSelectChips
                label={isSelf ? "Causes You Support" : "Causes They Support"}
                options={CAUSES_OPTIONS}
                selected={causes}
                onChange={setCauses}
                placeholder="Select causes..."
            />

            <SingleSelectDropdown
                label="Environmental Consciousness"
                options={ENVIRONMENTAL_CONSCIOUSNESS_OPTIONS}
                selected={envConsciousness}
                onChange={setEnvConsciousness}
                placeholder={isSelf ? "How eco-conscious are you?" : "How eco-conscious are they?"}
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 10: Gift Guidance
// ============================================
export function Step10_GiftGuidance({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [giftTypes, setGiftTypes] = useState(formData?.preferences?.giftTypePreference || []);
    const [giftDislikes, setGiftDislikes] = useState(formData?.preferences?.giftDislikes || []);
    const [budgetSensitivity, setBudgetSensitivity] = useState(formData?.preferences?.budgetSensitivity);
    const [sizeConstraints, setSizeConstraints] = useState(formData?.preferences?.sizeConstraints || '');
    const [prefersExperiences, setPrefersExperiences] = useState<string | undefined>(
        formData?.preferences?.prefersExperiencesOverThings === true ? 'experiences'
            : formData?.preferences?.prefersExperiencesOverThings === false ? 'things'
                : undefined
    );

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                giftTypePreference: giftTypes,
                giftDislikes,
                budgetSensitivity,
                prefersExperiencesOverThings: prefersExperiences === 'experiences' ? true
                    : prefersExperiences === 'things' ? false : undefined,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                giftTypePreference: giftTypes,
                giftDislikes,
                budgetSensitivity,
                prefersExperiencesOverThings: prefersExperiences === 'experiences' ? true
                    : prefersExperiences === 'things' ? false : undefined,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What makes you feel truly appreciated?" : `What makes ${formData?.firstName || 'them'} feel truly appreciated?`}
            emoji="💖"
            description={isSelf ? "The gestures and moments that mean the most to you" : "The gestures and moments that mean the most to them"}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label={isSelf ? "Gift Types You Love" : "Gift Types They Love"}
                options={GIFT_TYPE_PREFERENCE_OPTIONS}
                selected={giftTypes}
                onChange={setGiftTypes}
                placeholder="Select gift types..."
            />

            <MultiSelectChips
                label="Gift Types to Avoid"
                options={GIFT_DISLIKES_OPTIONS}
                selected={giftDislikes}
                onChange={setGiftDislikes}
                placeholder="Select what to avoid..."
            />

            <SingleSelectDropdown
                label="Budget Preference"
                options={BUDGET_SENSITIVITY_OPTIONS}
                selected={budgetSensitivity}
                onChange={setBudgetSensitivity}
                placeholder="Select budget preference..."
            />

            <SingleSelectDropdown
                label="Experiences vs. Things"
                options={[
                    { value: 'experiences', label: isSelf ? 'I Prefer Experiences (concerts, trips, classes)' : 'Prefers Experiences (concerts, trips, classes)' },
                    { value: 'things', label: isSelf ? 'I Prefer Physical Gifts' : 'Prefers Physical Gifts' },
                ]}
                selected={prefersExperiences}
                onChange={setPrefersExperiences}
                placeholder={isSelf ? "What do you prefer?" : "What do they prefer?"}
            />

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Size Constraints & Notes</Text>
                <TextInput
                    style={styles.notesInput}
                    value={sizeConstraints}
                    onChangeText={setSizeConstraints}
                    placeholder="e.g., petite, tall, oversize fit preferred, no wool..."
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                />
            </View>
        </ConversationalStep>
    );
}

// ============================================
// STEP 10.5: Sizes
// ============================================
export function Step10_5_Sizes({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [sizeTshirt, setSizeTshirt] = useState(formData?.preferences?.sizeTshirt || '');
    const [sizeShoes, setSizeShoes] = useState(formData?.preferences?.sizeShoes || '');
    const [sizePants, setSizePants] = useState(formData?.preferences?.sizePants || '');
    const [sizeDress, setSizeDress] = useState(formData?.preferences?.sizeDress || '');
    const [sizeHat, setSizeHat] = useState(formData?.preferences?.sizeHat || '');
    const [sizeRing, setSizeRing] = useState(formData?.preferences?.sizeRing || '');

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                sizeTshirt,
                sizeShoes,
                sizePants,
                sizeDress,
                sizeHat,
                sizeRing,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                sizeTshirt,
                sizeShoes,
                sizePants,
                sizeDress,
                sizeHat,
                sizeRing,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What are your sizes?" : `What are ${formData?.firstName || 'their'} sizes?`}
            emoji="📏"
            description="Perfect for clothing, shoes, and accessory gifts"
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <View style={styles.sizeGrid}>
                <View style={styles.sizeItem}>
                    <Text style={styles.inputLabel}>T-Shirt</Text>
                    <TextInput
                        style={styles.textInput}
                        value={sizeTshirt}
                        onChangeText={setSizeTshirt}
                        placeholder="e.g., M, L..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>
                <View style={styles.sizeItem}>
                    <Text style={styles.inputLabel}>Shoes</Text>
                    <TextInput
                        style={styles.textInput}
                        value={sizeShoes}
                        onChangeText={setSizeShoes}
                        placeholder="e.g., 10, 38..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>
            </View>

            <View style={styles.sizeGrid}>
                <View style={styles.sizeItem}>
                    <Text style={styles.inputLabel}>Pants/Waist</Text>
                    <TextInput
                        style={styles.textInput}
                        value={sizePants}
                        onChangeText={setSizePants}
                        placeholder="e.g., 32x30..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>
                <View style={styles.sizeItem}>
                    <Text style={styles.inputLabel}>Dress</Text>
                    <TextInput
                        style={styles.textInput}
                        value={sizeDress}
                        onChangeText={setSizeDress}
                        placeholder="e.g., 4, S..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>
            </View>

            <View style={styles.sizeGrid}>
                <View style={styles.sizeItem}>
                    <Text style={styles.inputLabel}>Hat</Text>
                    <TextInput
                        style={styles.textInput}
                        value={sizeHat}
                        onChangeText={setSizeHat}
                        placeholder="e.g., 7 1/4, M..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>
                <View style={styles.sizeItem}>
                    <Text style={styles.inputLabel}>Ring</Text>
                    <TextInput
                        style={styles.textInput}
                        value={sizeRing}
                        onChangeText={setSizeRing}
                        placeholder="e.g., 7, 17mm..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>
            </View>
        </ConversationalStep>
    );
}

// ============================================
// STEP 11: Life Context
// ============================================
export function Step11_LifeContext({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [lifeStage, setLifeStage] = useState(formData?.preferences?.currentLifeStage);
    const [lifeEvents, setLifeEvents] = useState(formData?.preferences?.recentLifeEvents || []);
    const [milestones, setMilestones] = useState(formData?.preferences?.upcomingMilestones || []);
    const [livingSituation, setLivingSituation] = useState(formData?.preferences?.livingSituation);
    const [pets, setPets] = useState(formData?.preferences?.hasPets || []);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                currentLifeStage: lifeStage,
                recentLifeEvents: lifeEvents,
                upcomingMilestones: milestones,
                livingSituation,
                hasPets: pets,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                currentLifeStage: lifeStage,
                recentLifeEvents: lifeEvents,
                upcomingMilestones: milestones,
                livingSituation,
                hasPets: pets,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What's your current chapter?" : `What's ${formData?.firstName || 'their'} current chapter?`}
            emoji="📖"
            description="Life context helps us find the most relevant and timely gifts"
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <SingleSelectDropdown
                label="Life Stage"
                options={LIFE_STAGE_OPTIONS}
                selected={lifeStage}
                onChange={setLifeStage}
                placeholder="Select life stage..."
            />

            <MultiSelectChips
                label="Recent Life Events"
                options={LIFE_EVENTS_OPTIONS}
                selected={lifeEvents}
                onChange={setLifeEvents}
                placeholder="Select recent events..."
            />

            <MultiSelectChips
                label="Upcoming Milestones"
                options={MILESTONE_OPTIONS}
                selected={milestones}
                onChange={setMilestones}
                placeholder="Select upcoming milestones..."
            />

            <SingleSelectDropdown
                label="Living Situation"
                options={LIVING_SITUATION_OPTIONS}
                selected={livingSituation}
                onChange={setLivingSituation}
                placeholder="Select living situation..."
            />

            <MultiSelectChips
                label="Pets"
                options={PET_OPTIONS}
                selected={pets}
                onChange={setPets}
                placeholder={isSelf ? "Do you have pets?" : "Do they have pets?"}
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 12: Personality & Constraints
// ============================================
export function Step12_PersonalityAndConstraints({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [personality, setPersonality] = useState(formData?.preferences?.personalityTraits || []);
    const [socialPrefs, setSocialPrefs] = useState(formData?.preferences?.socialPreferences);
    const [riskTolerance, setRiskTolerance] = useState(formData?.preferences?.riskTolerance);
    const [learningStyle, setLearningStyle] = useState(formData?.preferences?.learningStyle || []);
    const [scentSensitivities, setScentSensitivities] = useState(formData?.preferences?.scentSensitivities || []);
    const [materialSensitivities, setMaterialSensitivities] = useState(formData?.preferences?.materialSensitivities || []);
    const [physicalLimitations, setPhysicalLimitations] = useState(formData?.preferences?.physicalLimitations || '');
    const [spaceConstraints, setSpaceConstraints] = useState(formData?.preferences?.spaceConstraints || '');
    const [additionalNotes, setAdditionalNotes] = useState(formData?.preferences?.additionalNotes || '');

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                personalityTraits: personality,
                socialPreferences: socialPrefs,
                riskTolerance,
                learningStyle,
                scentSensitivities,
                materialSensitivities,
                physicalLimitations: physicalLimitations.trim() || undefined,
                spaceConstraints: spaceConstraints.trim() || undefined,
                additionalNotes: additionalNotes.trim() || undefined,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                personalityTraits: personality,
                socialPreferences: socialPrefs,
                riskTolerance,
                learningStyle,
                scentSensitivities,
                materialSensitivities,
                physicalLimitations: physicalLimitations.trim() || undefined,
                spaceConstraints: spaceConstraints.trim() || undefined,
                additionalNotes: additionalNotes.trim() || undefined,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "Any final details about you?" : `Any final details about ${formData?.firstName || 'them'}?`}
            emoji="🔍"
            description="Help us get the little things right"
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Personality Traits"
                options={PERSONALITY_TRAITS_OPTIONS}
                selected={personality}
                onChange={setPersonality}
                placeholder="Select traits..."
            />

            <SingleSelectDropdown
                label="Social Style"
                options={SOCIAL_PREFERENCES_OPTIONS}
                selected={socialPrefs}
                onChange={setSocialPrefs}
                placeholder={isSelf ? "How social are you?" : "How social are they?"}
            />

            <SingleSelectDropdown
                label="Risk Tolerance"
                options={RISK_TOLERANCE_OPTIONS}
                selected={riskTolerance}
                onChange={setRiskTolerance}
                placeholder="Adventurous or cautious?"
            />

            <MultiSelectChips
                label="Learning Style"
                options={LEARNING_STYLE_OPTIONS}
                selected={learningStyle}
                onChange={setLearningStyle}
                placeholder="How do they learn best?"
            />

            <MultiSelectChips
                label="Scent Sensitivities"
                options={SCENT_SENSITIVITIES_OPTIONS}
                selected={scentSensitivities}
                onChange={setScentSensitivities}
                placeholder="Any scent sensitivities?"
            />

            <MultiSelectChips
                label="Material Sensitivities"
                options={MATERIAL_SENSITIVITIES_OPTIONS}
                selected={materialSensitivities}
                onChange={setMaterialSensitivities}
                placeholder="Any material sensitivities?"
            />

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Physical Limitations</Text>
                <TextInput
                    style={styles.notesInput}
                    value={physicalLimitations}
                    onChangeText={setPhysicalLimitations}
                    placeholder="Any mobility issues, dietary restrictions not covered elsewhere, etc..."
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Space Constraints</Text>
                <TextInput
                    style={styles.notesInput}
                    value={spaceConstraints}
                    onChangeText={setSpaceConstraints}
                    placeholder="Small apartment, lots of clutter, downsizing..."
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Additional Notes</Text>
                <TextInput
                    style={styles.notesInput}
                    value={additionalNotes}
                    onChangeText={setAdditionalNotes}
                    placeholder={isSelf ? "Anything else about yourself that would help find great gifts?" : `Anything else about ${formData?.firstName || 'them'} we should know?`}
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>
        </ConversationalStep>
    );
}

// ============================================
// STEP 13: Summary
// ============================================
export function Step13_Summary({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const preferences = formData?.preferences || {};
    const { addRecipient, updateRecipient } = useRecipients();
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Auto-save new recipient when reaching summary to get an ID for the link
    useEffect(() => {
        const autoSave = async () => {
            if (isSelf) return; // Self profiles are handled on final complete
            if (!formData?.id && !isSaving) {
                setIsSaving(true);
                try {
                    const { id, error } = await addRecipient(formData);
                    if (id && !error) {
                        updateFormData?.({ id });
                    }
                } catch (error) {
                    console.error('Error auto-saving recipient:', error);
                } finally {
                    setIsSaving(false);
                }
            }
        };
        autoSave();
    }, [formData?.id]);

    // Count filled preferences
    const filledCount = Object.values(preferences).filter(v => {
        if (Array.isArray(v)) return v.length > 0;
        return v !== undefined && v !== null && v !== '';
    }).length;

    const recipientName = formData?.firstName || 'your recipient';
    const recipientPhone = formData?.phone || '';
    const recipientId = formData?.id || '';

    return (
        <ConversationalStep
            question={isSelf ? "Beautiful! Here's your story" : `Beautiful! Here's the story of ${formData?.firstName}`}
            emoji="✨"
            description={isSelf ? "You can update your profile anytime" : `You can always add more to ${formData?.firstName || 'their'} profile anytime`}
            required={false}
            {...props}
        >
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryName}>
                        {formData?.firstName} {formData?.lastName || ''}
                    </Text>
                    <Text style={styles.summaryRelationship}>
                        {formData?.relationship}
                    </Text>
                </View>

                <View style={styles.summaryStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{filledCount}</Text>
                        <Text style={styles.statLabel}>Preferences Added</Text>
                    </View>
                </View>

                {filledCount > 0 && (
                    <View style={styles.previewSection}>
                        <Text style={styles.previewTitle}>Quick Preview:</Text>
                        {preferences.sportsActivities?.length > 0 && (
                            <Text style={styles.previewItem}>
                                ⚡ {preferences.sportsActivities.slice(0, 3).join(', ')}
                            </Text>
                        )}
                        {preferences.creativeHobbies?.length > 0 && (
                            <Text style={styles.previewItem}>
                                🎨 {preferences.creativeHobbies.slice(0, 3).join(', ')}
                            </Text>
                        )}
                        {preferences.dietaryPreferences?.length > 0 && (
                            <Text style={styles.previewItem}>
                                🍽️ {preferences.dietaryPreferences.join(', ')}
                            </Text>
                        )}
                    </View>
                )}

                <View style={styles.encouragement}>
                    <Text style={styles.encouragementText}>
                        {filledCount > 5
                            ? "🎉 Great! We have plenty of info to find amazing gifts!"
                            : "👍 Good start! You can add more details anytime."}
                    </Text>
                </View>
            </View>

            {/* Separate Invite Card */}
            {!isSelf && (
                <View style={styles.inviteCard}>
                    <Text style={styles.inviteCardIcon}>✉️</Text>
                    <Text style={styles.inviteCardTitle}>Want even more personalized gifts?</Text>
                    <Text style={styles.inviteCardDescription}>
                        Invite {formData?.firstName} to add or customize their preferences directly
                    </Text>
                    <Pressable
                        style={styles.inviteButton}
                        onPress={() => setShowShareModal(true)}
                    >
                        <Text style={styles.inviteButtonText}>Send Invitation</Text>
                    </Pressable>
                </View>
            )}

            {/* Reusable Share Invite Modal */}
            <ShareInviteModal
                visible={showShareModal}
                onClose={() => setShowShareModal(false)}
                recipientName={recipientName}
                recipientPhone={recipientPhone}
                profileId={recipientId}
            />
        </ConversationalStep>
    );
}

const BRAND_COLOR = '#E07B39';

const styles = StyleSheet.create({
    notesContainer: {
        marginTop: 16,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    notesInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: 'rgba(47,35,24,0.15)',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#2F2318',
        minHeight: 100,
        lineHeight: 22,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(47,35,24,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryHeader: {
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(47,35,24,0.1)',
    },
    summaryName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2F2318',
        marginBottom: 4,
    },
    summaryRelationship: {
        fontSize: 16,
        color: BRAND_COLOR,
        fontWeight: '500',
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 36,
        fontWeight: '700',
        color: BRAND_COLOR,
    },
    statLabel: {
        fontSize: 14,
        color: 'rgba(47,35,24,0.6)',
        marginTop: 4,
    },
    previewSection: {
        backgroundColor: 'rgba(224,123,57,0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2F2318',
        marginBottom: 12,
    },
    previewItem: {
        fontSize: 14,
        color: 'rgba(47,35,24,0.8)',
        marginBottom: 6,
        lineHeight: 20,
    },
    encouragement: {
        backgroundColor: 'rgba(224,123,57,0.1)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    encouragementText: {
        fontSize: 15,
        color: '#2F2318',
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
    },
    inviteCard: {
        marginTop: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        borderWidth: 2,
        borderColor: BRAND_COLOR,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        alignItems: 'center',
    },
    inviteCardIcon: {
        fontSize: 32,
        marginBottom: 12,
    },
    inviteCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2F2318',
        marginBottom: 8,
        textAlign: 'center',
    },
    inviteCardDescription: {
        fontSize: 14,
        color: 'rgba(47,35,24,0.7)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    inviteButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    inviteButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2F2318',
    },
    sizeGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    sizeItem: {
        flex: 1,
    },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: 'rgba(47,35,24,0.15)',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#2F2318',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(47,35,24,0.6)',
        marginBottom: 6,
        marginLeft: 4,
    },
});
