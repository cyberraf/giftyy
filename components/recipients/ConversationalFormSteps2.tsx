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
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ShareInviteModal } from './ShareInviteModal';
import { calculatePreferenceCompletion, PREFERENCE_THRESHOLD } from '@/lib/utils/onboarding';

const GIFTYY_AVATAR = require('@/assets/images/giftyy.png');

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
            question={isSelf ? "I love this one! What's your personal style?" : `What's ${formData?.firstName || 'their'} vibe?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🎨"}
            description={isSelf ? "Fashion, colors, home vibes — it all helps me find the perfect gifts." : "The colors, styles, and aesthetics that speak to who they are"}
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
// STEP 7a: Entertainment — Music, Movies & TV
// ============================================
export function Step7a_Entertainment({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [music, setMusic] = useState(formData?.preferences?.favoriteMusicGenres || []);
    const [movies, setMovies] = useState(formData?.preferences?.favoriteMoviesGenres || []);
    const [tvShows, setTvShows] = useState(formData?.preferences?.favoriteTvShows || []);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                favoriteMusicGenres: music,
                favoriteMoviesGenres: movies,
                favoriteTvShows: tvShows,
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
                favoriteMoviesGenres: movies,
                favoriteTvShows: tvShows,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "Music, movies, and shows?" : `What does ${formData?.firstName || 'they'} watch and listen to?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🎵"}
            description={isSelf ? "What are you into right now?" : "Entertainment preferences for better gifts"}
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
            />

            <MultiSelectChips
                label="Movie Genres"
                options={MOVIE_GENRES_OPTIONS}
                selected={movies}
                onChange={setMovies}
            />

            <MultiSelectChips
                label="TV Shows"
                options={TV_SHOWS_OPTIONS}
                selected={tvShows}
                onChange={setTvShows}
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 7b: Entertainment — Books, Podcasts & Artists
// ============================================
export function Step7b_Entertainment({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [books, setBooks] = useState(formData?.preferences?.favoriteBooksGenres || []);
    const [podcasts, setPodcasts] = useState(formData?.preferences?.podcastInterests || []);
    const [artists, setArtists] = useState(formData?.preferences?.favoriteArtists || '');

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                favoriteBooksGenres: books,
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
                favoriteBooksGenres: books,
                podcastInterests: podcasts,
                favoriteArtists: artists,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "Books, podcasts, and artists?" : `${formData?.firstName || 'Their'} reading and listening?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🎵"}
            description={isSelf ? "Favorite reads, listens, and creators" : "Books, podcasts, and creators they love"}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Book Genres"
                options={BOOK_GENRES_OPTIONS}
                selected={books}
                onChange={setBooks}
            />

            <MultiSelectChips
                label="Podcast Interests"
                options={PODCAST_INTERESTS_OPTIONS}
                selected={podcasts}
                onChange={setPodcasts}
            />

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Favorite Artists</Text>
                <TextInput
                    style={styles.notesInput}
                    value={artists}
                    onChangeText={setArtists}
                    placeholder="Singers, bands, creators..."
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
            question={isSelf ? "OK, important one — what are your food and drink vibes?" : `What's ${formData?.firstName || 'their'} relationship with food & wellness?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🍃"}
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
            question={isSelf ? "How would you describe your lifestyle?" : `What does ${formData?.firstName || 'they'} stand for?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🌱"}
            description={isSelf ? "Your values and lifestyle help me suggest gifts that truly resonate." : "Values and lifestyle choices that shape their world"}
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
            question={isSelf ? "What kind of gifts make you go 'wow'?" : `What makes ${formData?.firstName || 'them'} feel truly appreciated?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "💖"}
            description={isSelf ? "This is the good stuff — tell me what you actually want!" : "The gestures and moments that mean the most to them"}
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
            question={isSelf ? "Quick one — what are your sizes?" : `What are ${formData?.firstName || 'their'} sizes?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "📏"}
            description={isSelf ? "Totally optional, but super helpful for clothing and accessory gifts!" : "Perfect for clothing, shoes, and accessory gifts"}
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
            question={isSelf ? "What's your current chapter in life?" : `What's ${formData?.firstName || 'their'} current chapter?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "📖"}
            description={isSelf ? "Life stage, recent events — this helps me pick gifts that fit where you are right now." : "Life context helps us find the most relevant and timely gifts"}
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
// STEP 12a: Personality
// ============================================
export function Step12a_Personality({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [personality, setPersonality] = useState(formData?.preferences?.personalityTraits || []);
    const [socialPrefs, setSocialPrefs] = useState(formData?.preferences?.socialPreferences);
    const [riskTolerance, setRiskTolerance] = useState(formData?.preferences?.riskTolerance);
    const [learningStyle, setLearningStyle] = useState(formData?.preferences?.learningStyle || []);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                personalityTraits: personality,
                socialPreferences: socialPrefs,
                riskTolerance,
                learningStyle,
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
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "How would your friends describe you?" : `How would you describe ${formData?.firstName || 'them'}?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🔍"}
            description={isSelf ? "Personality and social style" : "Their personality and social preferences"}
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
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 12b: Sensitivities & Notes
// ============================================
export function Step12b_Sensitivities({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [scentSensitivities, setScentSensitivities] = useState(formData?.preferences?.scentSensitivities || []);
    const [materialSensitivities, setMaterialSensitivities] = useState(formData?.preferences?.materialSensitivities || []);
    const [physicalLimitations, setPhysicalLimitations] = useState(formData?.preferences?.physicalLimitations || '');
    const [spaceConstraints, setSpaceConstraints] = useState(formData?.preferences?.spaceConstraints || '');
    const [additionalNotes, setAdditionalNotes] = useState(formData?.preferences?.additionalNotes || '');

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
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
            question={isSelf ? "Any sensitivities or things to avoid?" : `Anything to be careful with for ${formData?.firstName || 'them'}?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🔍"}
            description={isSelf ? "Helps us avoid gifts that don't work for you" : "Sensitivities and special notes"}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Scent Sensitivities"
                options={SCENT_SENSITIVITIES_OPTIONS}
                selected={scentSensitivities}
                onChange={setScentSensitivities}
            />

            <MultiSelectChips
                label="Material Sensitivities"
                options={MATERIAL_SENSITIVITIES_OPTIONS}
                selected={materialSensitivities}
                onChange={setMaterialSensitivities}
            />

            <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Physical Limitations</Text>
                <TextInput
                    style={styles.notesInput}
                    value={physicalLimitations}
                    onChangeText={setPhysicalLimitations}
                    placeholder="Any mobility or accessibility needs..."
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
                    placeholder={isSelf ? "Anything else that would help find great gifts?" : `Anything else about ${formData?.firstName || 'them'}?`}
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={3}
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
            question={isSelf ? "Amazing! Here's everything I've learned about you" : `Beautiful! Here's the story of ${formData?.firstName}`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "✨"}
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
                        <Text style={styles.inviteButtonText}>Invite to Giftyy</Text>
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

const BRAND_COLOR = '#f75507';

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

// ============================================
// MILESTONE: 60% Preference Celebration
// ============================================
export function StepMilestone_60({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const completion = calculatePreferenceCompletion(formData?.preferences || {});
    const pct = Math.round(completion.percentage * 100);

    const handleContinue = () => {
        updateFormData?.({ _milestoneShown: true });
        props.onNext?.({ _milestoneShown: true });
    };

    const handleFinishNow = () => {
        updateFormData?.({ _milestoneShown: true });
        props.onSaveAndExit?.({ _milestoneShown: true });
    };

    return (
        <View style={milestoneStyles.container}>
            <View style={milestoneStyles.content}>
                <Image
                    source={GIFTYY_AVATAR}
                    style={milestoneStyles.avatar}
                    resizeMode="contain"
                />

                <Text style={milestoneStyles.celebration}>You're amazing!</Text>
                <Text style={milestoneStyles.percentage}>{pct}% complete</Text>

                <View style={milestoneStyles.messageBubble}>
                    <Text style={milestoneStyles.messageText}>
                        I now have enough info to help your friends find the perfect gifts for you!
                    </Text>
                </View>

                <View style={milestoneStyles.encourageBubble}>
                    <Text style={milestoneStyles.encourageText}>
                        But the more I know, the better the suggestions get. Keep going? It only takes a couple more minutes!
                    </Text>
                </View>

                <Pressable style={milestoneStyles.continueButton} onPress={handleContinue}>
                    <Text style={milestoneStyles.continueText}>Keep Going</Text>
                </Pressable>

                <Pressable style={milestoneStyles.finishButton} onPress={handleFinishNow}>
                    <Text style={milestoneStyles.finishText}>Finish for Now</Text>
                </Pressable>
            </View>
        </View>
    );
}

const milestoneStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff5f0',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        maxWidth: 340,
    },
    avatar: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    celebration: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1f2937',
        marginBottom: 4,
    },
    percentage: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f75507',
        marginBottom: 20,
    },
    messageBubble: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    messageText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
        lineHeight: 24,
    },
    encourageBubble: {
        backgroundColor: '#fff7ed',
        borderRadius: 16,
        padding: 16,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    encourageText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#92400e',
        textAlign: 'center',
        lineHeight: 20,
    },
    continueButton: {
        backgroundColor: '#f75507',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 40,
        alignItems: 'center',
        marginBottom: 12,
        width: '100%',
        shadowColor: '#f75507',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    finishButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    finishText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#9ca3af',
    },
});
