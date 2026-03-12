-- Migration: Create comprehensive recipient_preferences table
-- This creates a detailed preference system optimized for AI-powered gift recommendations

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS recipient_preferences CASCADE;

-- Create the comprehensive recipient_preferences table
CREATE TABLE recipient_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
    
    -- ============================================
    -- CATEGORY 1: Demographics & Identity
    -- ============================================
    age_range TEXT CHECK (age_range IN ('0-12', '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
    gender_identity TEXT,
    pronouns TEXT,
    cultural_background JSONB DEFAULT '[]'::jsonb,
    languages_spoken JSONB DEFAULT '[]'::jsonb,
    
    -- ============================================
    -- CATEGORY 2: Interests & Hobbies
    -- ============================================
    sports_activities JSONB DEFAULT '[]'::jsonb,
    creative_hobbies JSONB DEFAULT '[]'::jsonb,
    collecting_interests JSONB DEFAULT '[]'::jsonb,
    tech_interests JSONB DEFAULT '[]'::jsonb,
    outdoor_activities JSONB DEFAULT '[]'::jsonb,
    indoor_activities JSONB DEFAULT '[]'::jsonb,
    
    -- ============================================
    -- CATEGORY 3: Entertainment & Media
    -- ============================================
    favorite_music_genres JSONB DEFAULT '[]'::jsonb,
    favorite_artists TEXT,
    favorite_books_genres JSONB DEFAULT '[]'::jsonb,
    favorite_movies_genres JSONB DEFAULT '[]'::jsonb,
    favorite_tv_shows JSONB DEFAULT '[]'::jsonb,
    podcast_interests JSONB DEFAULT '[]'::jsonb,
    
    -- ============================================
    -- CATEGORY 4: Lifestyle & Values
    -- ============================================
    lifestyle_type TEXT CHECK (lifestyle_type IN ('minimalist', 'maximalist', 'eco-conscious', 'luxury', 'practical', 'adventurous', 'homebody')),
    core_values JSONB DEFAULT '[]'::jsonb,
    causes_they_support JSONB DEFAULT '[]'::jsonb,
    environmental_consciousness TEXT CHECK (environmental_consciousness IN ('very_important', 'somewhat_important', 'not_priority')),
    
    -- ============================================
    -- CATEGORY 5: Style & Aesthetics
    -- ============================================
    fashion_style JSONB DEFAULT '[]'::jsonb,
    color_preferences JSONB DEFAULT '[]'::jsonb,
    home_decor_style JSONB DEFAULT '[]'::jsonb,
    design_preferences TEXT,
    
    -- ============================================
    -- CATEGORY 6: Food & Wellness
    -- ============================================
    dietary_preferences JSONB DEFAULT '[]'::jsonb,
    food_allergies JSONB DEFAULT '[]'::jsonb,
    favorite_cuisines JSONB DEFAULT '[]'::jsonb,
    beverage_preferences JSONB DEFAULT '[]'::jsonb,
    wellness_interests JSONB DEFAULT '[]'::jsonb,
    
    -- ============================================
    -- CATEGORY 7: Gift Preferences & Constraints
    -- ============================================
    gift_type_preference JSONB DEFAULT '[]'::jsonb,
    gift_dislikes JSONB DEFAULT '[]'::jsonb,
    size_constraints TEXT,
    budget_sensitivity TEXT CHECK (budget_sensitivity IN ('price_conscious', 'moderate', 'luxury_preferred')),
    prefers_experiences_over_things BOOLEAN DEFAULT false,
    
    -- ============================================
    -- CATEGORY 8: Life Context
    -- ============================================
    current_life_stage TEXT CHECK (current_life_stage IN ('student', 'young_professional', 'parent', 'empty_nester', 'retired')),
    recent_life_events JSONB DEFAULT '[]'::jsonb,
    upcoming_milestones JSONB DEFAULT '[]'::jsonb,
    living_situation TEXT,
    has_pets JSONB DEFAULT '[]'::jsonb,
    
    -- ============================================
    -- CATEGORY 9: Behavioral & Personality
    -- ============================================
    personality_traits JSONB DEFAULT '[]'::jsonb,
    social_preferences TEXT CHECK (social_preferences IN ('very_social', 'moderately_social', 'prefers_solitude')),
    risk_tolerance TEXT CHECK (risk_tolerance IN ('adventurous', 'moderate', 'cautious')),
    learning_style JSONB DEFAULT '[]'::jsonb,
    
    -- ============================================
    -- CATEGORY 10: Practical Constraints
    -- ============================================
    physical_limitations TEXT,
    scent_sensitivities JSONB DEFAULT '[]'::jsonb,
    material_sensitivities JSONB DEFAULT '[]'::jsonb,
    space_constraints TEXT,
    
    -- ============================================
    -- CATEGORY 11: Free-Form & AI Learning
    -- ============================================
    additional_notes TEXT,
    gift_history_feedback JSONB DEFAULT '[]'::jsonb,
    ai_learning_data JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(recipient_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_recipient_preferences_recipient_id ON recipient_preferences(recipient_id);
CREATE INDEX idx_recipient_preferences_age_range ON recipient_preferences(age_range);
CREATE INDEX idx_recipient_preferences_lifestyle_type ON recipient_preferences(lifestyle_type);

-- Create GIN indexes for JSONB fields (enables efficient searching within arrays)
CREATE INDEX idx_recipient_preferences_interests ON recipient_preferences USING GIN (
    (sports_activities || creative_hobbies || collecting_interests || tech_interests || outdoor_activities || indoor_activities)
);
CREATE INDEX idx_recipient_preferences_dietary ON recipient_preferences USING GIN (dietary_preferences);
CREATE INDEX idx_recipient_preferences_gift_prefs ON recipient_preferences USING GIN (gift_type_preference);

-- Enable RLS
ALTER TABLE recipient_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own recipients' preferences
CREATE POLICY "Users can view their own recipient preferences"
    ON recipient_preferences FOR SELECT
    USING (
        recipient_id IN (
            SELECT id FROM recipients WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own recipient preferences"
    ON recipient_preferences FOR INSERT
    WITH CHECK (
        recipient_id IN (
            SELECT id FROM recipients WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own recipient preferences"
    ON recipient_preferences FOR UPDATE
    USING (
        recipient_id IN (
            SELECT id FROM recipients WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own recipient preferences"
    ON recipient_preferences FOR DELETE
    USING (
        recipient_id IN (
            SELECT id FROM recipients WHERE user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recipient_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipient_preferences_updated_at
    BEFORE UPDATE ON recipient_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_recipient_preferences_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully created comprehensive recipient_preferences table with 40+ fields across 11 categories';
    RAISE NOTICE 'Table is ready for AI-powered gift recommendations';
END $$;
