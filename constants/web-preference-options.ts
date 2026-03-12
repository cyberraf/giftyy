/**
 * Comprehensive Preference Options for Web Form
 * Adapted from mobile app preferences
 */

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
