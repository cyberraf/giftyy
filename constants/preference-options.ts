/** App store URLs - recipients use the mobile app only (no web recipient flow). */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6739556270';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.giftyy.app';
/** @deprecated Use APP_STORE_URL / PLAY_STORE_URL - web recipient preferences deprecated */
export const RECIPIENT_FORM_URL = APP_STORE_URL;

// ============================================
// CATEGORY 1: Demographics & Identity
// ============================================

export const AGE_RANGE_OPTIONS = [
    { value: '0-12', label: 'Child (0-12)' },
    { value: '13-17', label: 'Teen (13-17)' },
    { value: '18-24', label: 'Young Adult (18-24)' },
    { value: '25-34', label: 'Adult (25-34)' },
    { value: '35-44', label: 'Adult (35-44)' },
    { value: '45-54', label: 'Middle Age (45-54)' },
    { value: '55-64', label: 'Mature (55-64)' },
    { value: '65+', label: 'Senior (65+)' },
] as const;

export const GENDER_IDENTITY_OPTIONS = [
    'Female',
    'Male',
    'Non-binary',
    'Genderqueer',
    'Genderfluid',
    'Agender',
    'Transgender',
] as const;

export const PRONOUN_OPTIONS = [
    'he/him',
    'she/her',
    'they/them',
    'he/they',
    'she/they',
] as const;

export const CULTURAL_BACKGROUND_OPTIONS = [
    'African',
    'African American',
    'Asian',
    'Caribbean',
    'East Asian',
    'European',
    'Hispanic/Latino',
    'Indigenous',
    'Middle Eastern',
    'Mixed/Multicultural',
    'North American',
    'Pacific Islander',
    'South Asian',
    'Southeast Asian',
] as const;

export const LANGUAGE_OPTIONS = [
    'Arabic',
    'Bengali',
    'Chinese (Mandarin)',
    'Chinese (Cantonese)',
    'English',
    'French',
    'German',
    'Hindi',
    'Italian',
    'Japanese',
    'Korean',
    'Portuguese',
    'Russian',
    'Spanish',
    'Tagalog',
    'Vietnamese',
] as const;

// ============================================
// CATEGORY 2: Interests & Hobbies
// ============================================

export const SPORTS_ACTIVITIES_OPTIONS = [
    'Basketball',
    'Cycling',
    'Dancing',
    'Football/Soccer',
    'Golf',
    'Gym/Fitness',
    'Hiking',
    'Martial Arts',
    'Pilates',
    'Running',
    'Skiing/Snowboarding',
    'Swimming',
    'Tennis',
    'Volleyball',
    'Yoga',
] as const;

export const CREATIVE_HOBBIES_OPTIONS = [
    'Baking',
    'Calligraphy',
    'Cooking',
    'Crafting',
    'Drawing',
    'Embroidery',
    'Gardening',
    'Jewelry Making',
    'Knitting/Crocheting',
    'Music (Playing)',
    'Music (Listening)',
    'Painting',
    'Photography',
    'Pottery/Ceramics',
    'Scrapbooking',
    'Sewing',
    'Singing',
    'Woodworking',
    'Writing',
] as const;

export const COLLECTING_INTERESTS_OPTIONS = [
    'Action Figures',
    'Antiques',
    'Art',
    'Books',
    'Coins',
    'Comics',
    'Crystals/Minerals',
    'Memorabilia',
    'Plants',
    'Records/Vinyl',
    'Sneakers',
    'Stamps',
    'Trading Cards',
    'Vintage Items',
    'Watches',
] as const;

export const TECH_INTERESTS_OPTIONS = [
    'AI/Machine Learning',
    'Coding/Programming',
    'Cryptocurrency',
    'Drones',
    'Gaming (Console)',
    'Gaming (PC)',
    'Gaming (Mobile)',
    'Photography Gear',
    'Robotics',
    'Smart Home',
    'VR/AR',
    'Wearable Tech',
] as const;

export const OUTDOOR_ACTIVITIES_OPTIONS = [
    'Beach Activities',
    'Birdwatching',
    'Camping',
    'Fishing',
    'Gardening',
    'Hiking',
    'Hunting',
    'Kayaking/Canoeing',
    'Mountain Biking',
    'Nature Photography',
    'Rock Climbing',
    'Sailing',
    'Stargazing',
    'Surfing',
] as const;

export const INDOOR_ACTIVITIES_OPTIONS = [
    'Board Games',
    'Card Games',
    'Chess',
    'Cooking',
    'Escape Rooms',
    'Home Improvement',
    'Interior Design',
    'Meditation',
    'Movie Watching',
    'Puzzles',
    'Reading',
    'Video Games',
    'Wine Tasting',
] as const;

// ============================================
// CATEGORY 3: Entertainment & Media
// ============================================

export const MUSIC_GENRES_OPTIONS = [
    'Alternative',
    'Blues',
    'Classical',
    'Country',
    'EDM/Electronic',
    'Folk',
    'Hip Hop/Rap',
    'Indie',
    'Jazz',
    'K-Pop',
    'Latin',
    'Metal',
    'Pop',
    'R&B/Soul',
    'Reggae',
    'Rock',
] as const;

export const BOOK_GENRES_OPTIONS = [
    'Biography/Memoir',
    'Business',
    'Cookbooks',
    'Fantasy',
    'Graphic Novels',
    'Historical Fiction',
    'History',
    'Horror',
    'Mystery/Thriller',
    'Non-Fiction',
    'Poetry',
    'Romance',
    'Science',
    'Science Fiction',
    'Self-Help',
    'True Crime',
    'Young Adult',
] as const;

export const MOVIE_GENRES_OPTIONS = [
    'Action',
    'Animated',
    'Comedy',
    'Documentary',
    'Drama',
    'Fantasy',
    'Foreign Films',
    'Horror',
    'Independent',
    'Musical',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'Western',
] as const;

export const TV_SHOWS_OPTIONS = [
    'Action & Adventure',
    'Anime',
    'Comedy',
    'Documentary',
    'Drama',
    'Fantasy',
    'Game Shows',
    'Horror',
    'Kids & Family',
    'Mystery',
    'Reality TV',
    'Sci-Fi',
    'Soap Operas',
    'True Crime',
] as const;

export const PODCAST_INTERESTS_OPTIONS = [
    'Business',
    'Comedy',
    'Crime/Mystery',
    'Education',
    'Health & Wellness',
    'History',
    'News & Politics',
    'Personal Development',
    'Science',
    'Society & Culture',
    'Sports',
    'Storytelling',
    'Technology',
    'True Crime',
] as const;

// ============================================
// CATEGORY 4: Lifestyle & Values
// ============================================

export const LIFESTYLE_TYPE_OPTIONS = [
    { value: 'minimalist', label: 'Minimalist' },
    { value: 'maximalist', label: 'Maximalist' },
    { value: 'eco-conscious', label: 'Eco-Conscious' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'practical', label: 'Practical' },
    { value: 'adventurous', label: 'Adventurous' },
    { value: 'homebody', label: 'Homebody' },
] as const;

export const CORE_VALUES_OPTIONS = [
    'Adventure',
    'Authenticity',
    'Community',
    'Creativity',
    'Family',
    'Freedom',
    'Growth',
    'Health',
    'Honesty',
    'Innovation',
    'Kindness',
    'Knowledge',
    'Loyalty',
    'Peace',
    'Spirituality',
    'Success',
    'Sustainability',
    'Tradition',
] as const;

export const CAUSES_OPTIONS = [
    'Animal Welfare',
    'Arts & Culture',
    'Children & Youth',
    'Climate Action',
    'Education',
    'Environmental Conservation',
    'Food Security',
    'Health & Medical Research',
    'Human Rights',
    'LGBTQ+ Rights',
    'Mental Health',
    'Poverty Relief',
    'Racial Justice',
    'Veterans Support',
    'Wildlife Protection',
    "Women's Rights",
] as const;

export const ENVIRONMENTAL_CONSCIOUSNESS_OPTIONS = [
    { value: 'very_important', label: 'Very Important' },
    { value: 'somewhat_important', label: 'Somewhat Important' },
    { value: 'not_priority', label: 'Not a Priority' },
] as const;

// ============================================
// CATEGORY 5: Style & Aesthetics
// ============================================

export const FASHION_STYLE_OPTIONS = [
    'Athletic/Sporty',
    'Bohemian',
    'Business/Professional',
    'Casual',
    'Classic/Timeless',
    'Edgy/Alternative',
    'Elegant',
    'Minimalist',
    'Preppy',
    'Streetwear',
    'Trendy',
    'Vintage/Retro',
] as const;

export const COLOR_PREFERENCES_OPTIONS = [
    'Black & White',
    'Blues',
    'Bold/Bright Colors',
    'Earth Tones',
    'Greens',
    'Metallics (Gold/Silver)',
    'Monochrome',
    'Neutrals (Beige/Tan)',
    'Pastels',
    'Pinks/Reds',
    'Purples',
    'Rainbow/Multicolor',
] as const;

export const HOME_DECOR_STYLE_OPTIONS = [
    'Bohemian',
    'Coastal',
    'Contemporary',
    'Eclectic',
    'Farmhouse',
    'Industrial',
    'Mid-Century Modern',
    'Minimalist',
    'Modern',
    'Rustic',
    'Scandinavian',
    'Traditional',
    'Transitional',
] as const;

// ============================================
// CATEGORY 6: Food & Wellness
// ============================================

export const DIETARY_PREFERENCES_OPTIONS = [
    'Carnivore',
    'Flexitarian',
    'Gluten-Free',
    'Halal',
    'Keto',
    'Kosher',
    'Low-Carb',
    'Mediterranean',
    'Omnivore',
    'Paleo',
    'Pescatarian',
    'Plant-Based',
    'Raw Food',
    'Vegan',
    'Vegetarian',
] as const;

export const FOOD_ALLERGIES_OPTIONS = [
    'Dairy',
    'Eggs',
    'Fish',
    'Gluten',
    'Peanuts',
    'Shellfish',
    'Soy',
    'Tree Nuts',
    'Wheat',
] as const;

export const CUISINE_OPTIONS = [
    'American',
    'Caribbean',
    'Chinese',
    'Ethiopian',
    'French',
    'Greek',
    'Haitian',
    'Indian',
    'Italian',
    'Japanese',
    'Korean',
    'Mediterranean',
    'Mexican',
    'Middle Eastern',
    'Spanish',
    'Thai',
    'Vietnamese',
    'West African',
] as const;

export const BEVERAGE_PREFERENCES_OPTIONS = [
    'Beer',
    'Cocktails',
    'Coffee',
    'Energy Drinks',
    'Herbal Tea',
    'Juice',
    'Kombucha',
    'Smoothies',
    'Soda',
    'Sparkling Water',
    'Tea',
    'Wine (Red)',
    'Wine (White)',
] as const;

export const WELLNESS_INTERESTS_OPTIONS = [
    'Aromatherapy',
    'Fitness',
    'Massage',
    'Meditation',
    'Mental Health',
    'Mindfulness',
    'Nutrition',
    'Self-Care',
    'Skincare',
    'Sleep Health',
    'Spa Treatments',
    'Supplements',
    'Yoga',
] as const;

// ============================================
// CATEGORY 7: Gift Preferences
// ============================================

export const GIFT_TYPE_PREFERENCE_OPTIONS = [
    'Consumables',
    'DIY/Craft Kits',
    'Experiences',
    'Handmade',
    'Luxury',
    'Personalized',
    'Practical',
    'Sentimental',
    'Subscription Services',
    'Tech Gadgets',
] as const;

export const GIFT_DISLIKES_OPTIONS = [
    'Candles',
    'Clothing',
    'Decorative Items',
    'Food Items',
    'Fragrances/Perfumes',
    'Gift Cards',
    'Jewelry',
    'Mugs/Drinkware',
    'Picture Frames',
    'Stuffed Animals',
    'Tech Accessories',
] as const;

export const BUDGET_SENSITIVITY_OPTIONS = [
    { value: 'price_conscious', label: 'Price Conscious' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'luxury_preferred', label: 'Luxury Preferred' },
] as const;

// ============================================
// CATEGORY 8: Life Context
// ============================================

export const LIFE_STAGE_OPTIONS = [
    { value: 'student', label: 'Student' },
    { value: 'young_professional', label: 'Young Professional' },
    { value: 'parent', label: 'Parent' },
    { value: 'empty_nester', label: 'Empty Nester' },
    { value: 'retired', label: 'Retired' },
] as const;

export const LIFE_EVENTS_OPTIONS = [
    'Bought a Home',
    'Changed Careers',
    'Got Engaged',
    'Got Married',
    'Graduated',
    'Had a Baby',
    'Moved Cities',
    'New Job',
    'Promotion',
    'Retired',
    'Started Business',
] as const;

export const MILESTONE_OPTIONS = [
    'Anniversary',
    'Baby Shower',
    'Birthday (Milestone)',
    'Graduation',
    'Housewarming',
    'Promotion',
    'Retirement',
    'Wedding',
] as const;

export const LIVING_SITUATION_OPTIONS = [
    'Apartment',
    'Condo',
    'Dorm',
    'House',
    'Studio',
    'With Family',
    'With Roommates',
] as const;

export const PET_OPTIONS = [
    'Bird',
    'Cat',
    'Dog',
    'Fish',
    'Hamster/Guinea Pig',
    'Horse',
    'Rabbit',
    'Reptile',
    'None',
] as const;

// ============================================
// CATEGORY 9: Personality & Behavior
// ============================================

export const PERSONALITY_TRAITS_OPTIONS = [
    'Adventurous',
    'Analytical',
    'Artistic',
    'Compassionate',
    'Creative',
    'Detail-Oriented',
    'Energetic',
    'Extroverted',
    'Introverted',
    'Logical',
    'Organized',
    'Outgoing',
    'Practical',
    'Spontaneous',
    'Thoughtful',
] as const;

export const SOCIAL_PREFERENCES_OPTIONS = [
    { value: 'very_social', label: 'Very Social' },
    { value: 'moderately_social', label: 'Moderately Social' },
    { value: 'prefers_solitude', label: 'Prefers Solitude' },
] as const;

export const RISK_TOLERANCE_OPTIONS = [
    { value: 'adventurous', label: 'Adventurous' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'cautious', label: 'Cautious' },
] as const;

export const LEARNING_STYLE_OPTIONS = [
    'Auditory',
    'Hands-On/Kinesthetic',
    'Reading/Writing',
    'Visual',
] as const;

// ============================================
// CATEGORY 10: Practical Constraints
// ============================================

export const SCENT_SENSITIVITIES_OPTIONS = [
    'Chemical Fragrances',
    'Citrus',
    'Essential Oils',
    'Floral Scents',
    'Musk',
    'Perfumes',
    'Strong Scents',
] as const;

export const MATERIAL_SENSITIVITIES_OPTIONS = [
    'Certain Metals',
    'Latex',
    'Leather',
    'Nickel',
    'Synthetic Fabrics',
    'Wool',
] as const;

// ============================================
// Helper Types
// ============================================

export type PreferenceOption = {
    value: string;
    label: string;
};

export type PreferenceCategory = {
    title: string;
    description: string;
    fields: Array<{
        key: string;
        label: string;
        type: 'single-select' | 'multi-select' | 'text';
        options?: readonly string[] | readonly PreferenceOption[];
        placeholder?: string;
    }>;
};
