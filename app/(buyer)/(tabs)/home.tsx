/**
 * Giftyy Premium Marketplace Home Screen
 * Modern marketplace design with animations, hero section, categories, product grids, and vendor spotlight
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Dimensions,
	Image,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import Animated, {
	FadeInDown,
	FadeInRight,
	FadeInUp,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import { AnimatedSectionHeader } from '@/components/marketplace/AnimatedSectionHeader';
import { CategoryChip } from '@/components/marketplace/CategoryChip';
import { MarketplaceProductCard } from '@/components/marketplace/ProductCard';
import { PromotionalBanner } from '@/components/marketplace/PromotionalBanner';
import { ProductGridShimmer } from '@/components/marketplace/ShimmerLoader';
import { VendorCard } from '@/components/marketplace/VendorCard';
import { FilterModal } from '@/components/search/FilterModal';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Contexts & Utils
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useBottomBarVisibility } from '@/contexts/BottomBarVisibility';
import { useCategories } from '@/contexts/CategoriesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { productToSimpleProduct, useProducts, type Product } from '@/contexts/ProductsContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { getVendorsInfo, type VendorInfo } from '@/lib/vendor-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEALS_ROW_CARD_WIDTH = SCREEN_WIDTH * 0.44;
const ALL_PRODUCTS_PER_PAGE = 18;

// Category definitions
const CATEGORIES = [
	{ id: 'birthday', name: 'Birthday', icon: 'gift.fill' },
	{ id: 'valentine', name: 'Valentine', icon: 'heart.fill' },
	{ id: 'mother', name: 'Mother', icon: 'heart.circle.fill' },
	{ id: 'father', name: 'Father', icon: 'person.fill' },
	{ id: 'christmas', name: 'Christmas', icon: 'tree.fill' },
	{ id: 'couples', name: 'Couples', icon: 'heart.2.fill' },
	{ id: 'kids', name: 'Kids', icon: 'face.smiling.fill' },
	{ id: 'luxury', name: 'Luxury', icon: 'star.fill' },
	{ id: 'handmade', name: 'Handmade', icon: 'paintbrush.fill' },
];

export default function MarketplaceHomeScreen() {
	const { top, right, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ collection?: string; recipient?: string; category?: string }>();
	const { setVisible } = useBottomBarVisibility();
	
	// Contexts
	const { products, collections, loading, refreshProducts, refreshCollections } = useProducts();
	const { unreadCount } = useNotifications();
	const { categories } = useCategories();
	const { recipients } = useRecipients();
	
	// Filter collections to only show bundles with products
	const bundlesWithProducts = useMemo(() => {
		return collections.filter(collection => collection.products && collection.products.length > 0);
	}, [collections]);
	
	// State
	const [refreshing, setRefreshing] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(params.category || null);
	const [searchQuery, setSearchQuery] = useState('');
	const [showFilters, setShowFilters] = useState(false);
	const [allProductsPage, setAllProductsPage] = useState(1);
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [filters, setFilters] = useState<{
		categories: string[];
		priceRange: { min: number; max: number };
		sortBy: any;
	}>({
		categories: [],
		priceRange: { min: 0, max: 1000 },
		sortBy: 'recommended',
	});
	
	// Ensure bottom bar is visible
	useEffect(() => {
		setVisible(true);
	}, [setVisible]);
	
	// Update selected category when category param changes
	useEffect(() => {
		if (params.category) {
			setSelectedCategory(params.category);
			// Clear database category filters when category chip is selected via param
			setFilters(prev => ({
				...prev,
				categories: [],
			}));
		}
	}, [params.category]);

	// Reset All Products pagination when filters/search change
	useEffect(() => {
		setAllProductsPage(1);
	}, [searchQuery, selectedCategory, filters]);
	
	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCollections()]);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCollections]);
	
	// Fetch vendor info for products
	useEffect(() => {
		const fetchVendors = async () => {
			const vendorIds = Array.from(
				new Set(products.filter(p => p.vendorId).map(p => p.vendorId!))
			);
			if (vendorIds.length > 0) {
				const vendors = await getVendorsInfo(vendorIds);
				setVendorsMap(vendors);
			}
		};
		
		if (products.length > 0) {
			fetchVendors();
		}
	}, [products]);
	
	// Filter products
	const filteredProducts = useMemo(() => {
		let filtered = products.filter(p => p.isActive);
		
		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(p =>
				p.name.toLowerCase().includes(query) ||
				p.description?.toLowerCase().includes(query) ||
				p.tags.some(tag => tag.toLowerCase().includes(query))
			);
		}
		
		// Filter by categories from filter modal (database category IDs)
		if (filters.categories.length > 0) {
			filtered = filtered.filter(p => 
				filters.categories.some(catId => p.categoryIds?.includes(catId))
			);
		}
		
		// Filter by selected category chip (hardcoded category IDs - semantic filtering)
		// This uses semantic matching (tags, occasionTags, etc.) and should NOT conflict with database categories
		if (selectedCategory && filters.categories.length === 0) {
			filtered = filtered.filter(p => {
				if (selectedCategory === 'deals') {
					return p.discountPercentage > 0;
				}
				
				// Map category IDs to product attributes
				const categoryMap: Record<string, (p: Product) => boolean> = {
					'birthday': (p) => 
						p.occasionTags?.includes('birthday') || 
						p.tags.some(tag => tag.toLowerCase().includes('birthday')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('birthday')),
					'valentine': (p) => 
						p.occasionTags?.includes('valentine') || 
						p.tags.some(tag => tag.toLowerCase().includes('valentine')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('valentine')),
					'mother': (p) => 
						p.targetAudience?.includes('for-her') ||
						p.relationshipTags?.includes('family') ||
						p.tags.some(tag => tag.toLowerCase().includes('mother') || tag.toLowerCase().includes('mom')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('mother')),
					'father': (p) => 
						p.targetAudience?.includes('for-him') ||
						p.relationshipTags?.includes('family') ||
						p.tags.some(tag => tag.toLowerCase().includes('father') || tag.toLowerCase().includes('dad')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('father')),
					'christmas': (p) => 
						p.occasionTags?.includes('christmas') || 
						p.tags.some(tag => tag.toLowerCase().includes('christmas') || tag.toLowerCase().includes('holiday')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('christmas')),
					'couples': (p) => 
						p.relationshipTags?.includes('romantic') ||
						p.giftStyleTags?.includes('romantic') ||
						p.tags.some(tag => tag.toLowerCase().includes('couple') || tag.toLowerCase().includes('romantic')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('couple')),
					'kids': (p) => 
						p.ageGroupTags?.some(age => age.includes('child') || age.includes('kid')) ||
						p.targetAudience?.includes('for-kids') ||
						p.tags.some(tag => tag.toLowerCase().includes('kid') || tag.toLowerCase().includes('child')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('kid') || catId.toLowerCase().includes('child')),
					'luxury': (p) => 
						p.giftStyleTags?.includes('luxury') ||
						p.priceRange === 'luxury' ||
						p.tags.some(tag => tag.toLowerCase().includes('luxury') || tag.toLowerCase().includes('premium')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('luxury')),
					'handmade': (p) => 
						p.tags.some(tag => tag.toLowerCase().includes('handmade') || tag.toLowerCase().includes('artisan') || tag.toLowerCase().includes('craft')) ||
						(p.categoryIds || []).some(catId => catId.toLowerCase().includes('handmade')),
				};
				
				const filterFn = categoryMap[selectedCategory];
				return filterFn ? filterFn(p) : false;
			});
		}
		
		// Filter by price range
		filtered = filtered.filter(p => {
			const price = p.discountPercentage > 0 
				? p.price * (1 - p.discountPercentage / 100)
				: p.price;
			return price >= filters.priceRange.min && price <= filters.priceRange.max;
		});
		
		return filtered;
	}, [products, searchQuery, selectedCategory, filters]);

	const allProductsTotalPages = useMemo(() => {
		return Math.max(1, Math.ceil(filteredProducts.length / ALL_PRODUCTS_PER_PAGE));
	}, [filteredProducts.length]);

	useEffect(() => {
		// Clamp page if product count changes (e.g., filters applied)
		setAllProductsPage(prev => Math.min(prev, allProductsTotalPages));
	}, [allProductsTotalPages]);

	const allProductsPageItems = useMemo(() => {
		const start = (allProductsPage - 1) * ALL_PRODUCTS_PER_PAGE;
		return filteredProducts.slice(start, start + ALL_PRODUCTS_PER_PAGE);
	}, [filteredProducts, allProductsPage]);
	
	// Get featured products (with discounts)
	const saleProducts = useMemo(() => {
		const isOnSale = (p: Product) => {
			const discount = typeof p.discountPercentage === 'number' ? p.discountPercentage : Number(p.discountPercentage ?? 0);
			const hasDiscount = !Number.isNaN(discount) && discount > 0;
			const hasOriginalPrice =
				typeof (p as any).originalPrice === 'number' &&
				typeof p.price === 'number' &&
				(p as any).originalPrice > p.price;
			return hasDiscount || hasOriginalPrice;
		};

		return products
			.filter(p => p.isActive)
			.filter(isOnSale)
			.sort((a, b) => {
				const da = typeof a.discountPercentage === 'number' ? a.discountPercentage : Number(a.discountPercentage ?? 0);
				const db = typeof b.discountPercentage === 'number' ? b.discountPercentage : Number(b.discountPercentage ?? 0);
				return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
			})
			.slice(0, 12)
			.map(p => {
				const vendor = p.vendorId ? vendorsMap.get(p.vendorId) : undefined;
				const imageUrl = p.imageUrl ? (() => {
					try {
						const parsed = JSON.parse(p.imageUrl);
						return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
					} catch {
						return p.imageUrl;
					}
				})() : undefined;
				
				return {
					...p,
					vendorName: vendor?.storeName,
					imageUrl,
				};
			});
	}, [products, vendorsMap]);
	
	// Get personalized picks for each recipient
	// Helper function to normalize and extract keywords from text
	const extractKeywords = (text: string): string[] => {
		if (!text) return [];
		return text
			.toLowerCase()
			.split(/[,\s]+/)
			.map(word => word.trim())
			.filter(word => word.length >= 3);
	};

	// Helper function for semantic matching
	const semanticMatch = (text: string, keyword: string): number => {
		if (!text || !keyword) return 0;
		const lowerText = text.toLowerCase();
		const lowerKeyword = keyword.toLowerCase();
		
		if (lowerText === lowerKeyword) return 10;
		const wordBoundaryRegex = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
		if (wordBoundaryRegex.test(lowerText)) return 8;
		if (lowerText.includes(lowerKeyword)) return 5;
		const pluralKeyword = lowerKeyword + 's';
		const singularKeyword = lowerKeyword.replace(/s$/, '');
		if (lowerText.includes(pluralKeyword) || lowerText.includes(singularKeyword)) return 4;
		if (lowerKeyword.length >= 4 && lowerText.includes(lowerKeyword.substring(0, Math.floor(lowerKeyword.length * 0.7)))) {
			return 2;
		}
		return 0;
	};

	// Preference weights
	const PREFERENCE_WEIGHTS = {
		hobbies: 1.5,
		favoriteColors: 1.2,
		stylePreferences: 1.3,
		personalityLifestyle: 1.4,
		giftTypePreference: 1.6,
		sports: 1.3,
		favoriteArtists: 1.1,
		favoriteGenres: 1.1,
	};

	const recipientCards = useMemo(() => {
		// If no recipients, return empty array
		if (!recipients || recipients.length === 0) {
			return [];
		}

		// Filter out featured products once
		const availableProducts = filteredProducts.filter(
			p => !saleProducts.find(fp => fp.id === p.id)
		);

		return recipients.map(recipient => {
			// Collect preferences with their types and weights
			const preferences: Array<{ keyword: string; type: keyof typeof PREFERENCE_WEIGHTS; weight: number }> = [];
			
			if (recipient.hobbies) {
				extractKeywords(recipient.hobbies).forEach(kw => {
					preferences.push({ keyword: kw, type: 'hobbies', weight: PREFERENCE_WEIGHTS.hobbies });
				});
			}
			if (recipient.favoriteColors) {
				extractKeywords(recipient.favoriteColors).forEach(kw => {
					preferences.push({ keyword: kw, type: 'favoriteColors', weight: PREFERENCE_WEIGHTS.favoriteColors });
				});
			}
			if (recipient.favoriteArtists) {
				extractKeywords(recipient.favoriteArtists).forEach(kw => {
					preferences.push({ keyword: kw, type: 'favoriteArtists', weight: PREFERENCE_WEIGHTS.favoriteArtists });
				});
			}
			if (recipient.favoriteGenres) {
				extractKeywords(recipient.favoriteGenres).forEach(kw => {
					preferences.push({ keyword: kw, type: 'favoriteGenres', weight: PREFERENCE_WEIGHTS.favoriteGenres });
				});
			}
			if (recipient.stylePreferences) {
				extractKeywords(recipient.stylePreferences).forEach(kw => {
					preferences.push({ keyword: kw, type: 'stylePreferences', weight: PREFERENCE_WEIGHTS.stylePreferences });
				});
			}
			if (recipient.personalityLifestyle) {
				extractKeywords(recipient.personalityLifestyle).forEach(kw => {
					preferences.push({ keyword: kw, type: 'personalityLifestyle', weight: PREFERENCE_WEIGHTS.personalityLifestyle });
				});
			}
			if (recipient.giftTypePreference) {
				extractKeywords(recipient.giftTypePreference).forEach(kw => {
					preferences.push({ keyword: kw, type: 'giftTypePreference', weight: PREFERENCE_WEIGHTS.giftTypePreference });
				});
			}
			if (recipient.sports) {
				extractKeywords(recipient.sports).forEach(kw => {
					preferences.push({ keyword: kw, type: 'sports', weight: PREFERENCE_WEIGHTS.sports });
				});
			}

			// Relationship to target audience mapping
			const relationshipToTargetMap: Record<string, string[]> = {
				'wife': ['for-her', 'romantic'],
				'husband': ['for-him'],
				'mother': ['for-her', 'family'],
				'father': ['for-him', 'family'],
				'sister': ['for-her', 'family'],
				'brother': ['for-him', 'family'],
				'daughter': ['for-her', 'for-kids', 'for-teens'],
				'son': ['for-him', 'for-kids', 'for-teens'],
				'friend': ['for-her', 'for-him'],
				'girlfriend': ['for-her', 'romantic'],
				'boyfriend': ['for-him', 'romantic'],
			};

			// Age range to age group mapping
			const ageRangeToGroupMap = (ageRange?: string): string[] => {
				if (!ageRange) return [];
				const age = ageRange.split('-')[0];
				const ageNum = parseInt(age);
				if (isNaN(ageNum)) return [];
				if (ageNum < 13) return ['child'];
				if (ageNum < 18) return ['teen'];
				if (ageNum < 26) return ['young-adult'];
				if (ageNum < 50) return ['adult'];
				return ['senior'];
			};

			// Helper function to generate recommendation reason (summary for badge)
			const generateRecommendationReason = (
				product: any,
				recipient: ReturnType<typeof useRecipients>['recipients'][0],
				matchReasons: string[]
			): string => {
				if (matchReasons.length === 0) {
					return `A thoughtful gift for ${recipient.firstName}`;
				}
				const topReasons = matchReasons.slice(0, 2);
				if (topReasons.length === 1) {
					return topReasons[0];
				}
				return `${topReasons[0]}${topReasons[1] ? ` and ${topReasons[1]}` : ''}`;
			};

			// Helper function to generate detailed explanation for modal
			const generateDetailedExplanation = (
				product: any,
				recipient: ReturnType<typeof useRecipients>['recipients'][0],
				matchReasons: string[]
			): string => {
				if (matchReasons.length === 0) {
					return `This is a thoughtful gift choice for ${recipient.firstName}.`;
				}

				// Build a comprehensive explanation
				let explanation = `This product is an excellent match for ${recipient.firstName}`;
				
				if (matchReasons.length === 1) {
					explanation += ` because ${matchReasons[0].toLowerCase()}.`;
				} else if (matchReasons.length === 2) {
					explanation += ` because ${matchReasons[0].toLowerCase()} and ${matchReasons[1].toLowerCase()}.`;
				} else {
					// For 3+ reasons, create a more detailed explanation
					const firstReason = matchReasons[0].toLowerCase();
					const middleReasons = matchReasons.slice(1, -1).map(r => r.toLowerCase()).join(', ');
					const lastReason = matchReasons[matchReasons.length - 1].toLowerCase();
					
					if (matchReasons.length === 3) {
						explanation += ` because ${firstReason}, ${lastReason}, and it aligns with their preferences.`;
					} else {
						explanation += ` because ${firstReason}`;
						if (middleReasons) {
							explanation += `, ${middleReasons}`;
						}
						explanation += `, and ${lastReason}. This combination makes it a perfect personalized gift.`;
					}
				}
				
				return explanation;
			};

			// Score and rank products
			const scoredProducts = availableProducts
				.filter(product => product.stockQuantity > 0) // Filter out out-of-stock products
				.map(product => {
					const productName = product.name?.toLowerCase() || '';
					const productDescription = product.description?.toLowerCase() || '';
					const productTags = product.tags?.join(' ').toLowerCase() || '';
					const categoryName = (product.categoryId 
						? categories.find((c: any) => c.id === product.categoryId)?.name?.toLowerCase() 
						: '') || '';

					let totalScore = 0;
					let matchCount = 0;
					const matchReasons: string[] = [];

					// 1. Preference-based matching
					preferences.forEach(pref => {
						const nameScore = semanticMatch(productName, pref.keyword) * 2.0;
						const descriptionScore = semanticMatch(productDescription, pref.keyword) * 1.5;
						const tagsScore = semanticMatch(productTags, pref.keyword) * 1.8;
						const categoryScore = semanticMatch(categoryName, pref.keyword) * 1.2;

						const fieldScore = Math.max(nameScore, descriptionScore, tagsScore, categoryScore);
						
						if (fieldScore > 0) {
							const weightedScore = fieldScore * pref.weight;
							totalScore += weightedScore;
							matchCount++;
						}
					});

					// 2. Relationship-based matching
					const relationshipLower = recipient.relationship?.toLowerCase() || '';
					const targetAudiences = relationshipToTargetMap[relationshipLower] || [];
					if (product.targetAudience && product.targetAudience.length > 0) {
						const hasMatchingTarget = product.targetAudience.some(target => 
							targetAudiences.includes(target.toLowerCase())
						);
						if (hasMatchingTarget) {
							totalScore += 15;
							matchCount++;
							matchReasons.push(`Perfect for ${recipient.relationship || 'them'}`);
						}
					}

					// 3. Relationship tags matching
					if (product.relationshipTags && product.relationshipTags.length > 0) {
						const relationshipMatch = product.relationshipTags.some(tag => 
							semanticMatch(relationshipLower, tag.toLowerCase()) > 0
						);
						if (relationshipMatch) {
							totalScore += 12;
							matchCount++;
							if (!matchReasons.some(r => r.includes('relationship'))) {
								matchReasons.push(`Ideal for ${recipient.relationship || 'this relationship'}`);
							}
						}
					}

					// 4. Age group matching
					const recipientAgeGroups = ageRangeToGroupMap(recipient.ageRange);
					if (product.ageGroupTags && product.ageGroupTags.length > 0 && recipientAgeGroups.length > 0) {
						const hasMatchingAgeGroup = product.ageGroupTags.some(ageTag => 
							recipientAgeGroups.includes(ageTag.toLowerCase())
						);
						if (hasMatchingAgeGroup) {
							totalScore += 10;
							matchCount++;
							if (recipient.ageRange) {
								matchReasons.push(`Great for ${recipient.ageRange} year olds`);
							}
						}
					}

					// 5. Interest tags matching
					if (product.interestTags && product.interestTags.length > 0) {
						preferences.forEach(pref => {
							const interestMatch = product.interestTags!.some(interest => 
								semanticMatch(interest.toLowerCase(), pref.keyword) > 0
							);
							if (interestMatch) {
								totalScore += 8 * pref.weight;
								matchCount++;
								if (pref.type === 'hobbies' && recipient.hobbies) {
									const hobbyMatch = extractKeywords(recipient.hobbies).find(kw => 
										semanticMatch(pref.keyword, kw) > 0
									);
									if (hobbyMatch && !matchReasons.some(r => r.includes('hobby'))) {
										matchReasons.push(`Matches ${recipient.firstName}'s love of ${hobbyMatch}`);
									}
								} else if (pref.type === 'sports' && recipient.sports) {
									const sportMatch = extractKeywords(recipient.sports).find(kw => 
										semanticMatch(pref.keyword, kw) > 0
									);
									if (sportMatch && !matchReasons.some(r => r.includes('sport'))) {
										matchReasons.push(`Perfect for ${recipient.firstName}'s passion for ${sportMatch}`);
									}
								}
							}
						});
					}

					// 6. Lifestyle tags matching
					if (product.lifestyleTags && product.lifestyleTags.length > 0 && recipient.personalityLifestyle) {
						const lifestyleKeywords = extractKeywords(recipient.personalityLifestyle);
						const lifestyleMatch = product.lifestyleTags.some(lifestyle => 
							lifestyleKeywords.some(kw => semanticMatch(lifestyle.toLowerCase(), kw) > 0)
						);
						if (lifestyleMatch) {
							totalScore += 10;
							matchCount++;
							const matchedLifestyle = lifestyleKeywords.find(kw => 
								product.lifestyleTags!.some(lt => semanticMatch(lt.toLowerCase(), kw) > 0)
							);
							if (matchedLifestyle && !matchReasons.some(r => r.includes('personality'))) {
								matchReasons.push(`Matches ${recipient.firstName}'s ${matchedLifestyle} personality`);
							}
						}
					}

					// 7. Gift style tags matching
					if (product.giftStyleTags && product.giftStyleTags.length > 0 && recipient.giftTypePreference) {
						const giftStyleKeywords = extractKeywords(recipient.giftTypePreference);
						const giftStyleMatch = product.giftStyleTags.some(style => 
							giftStyleKeywords.some(kw => semanticMatch(style.toLowerCase(), kw) > 0)
						);
						if (giftStyleMatch) {
							totalScore += 12;
							matchCount++;
							const matchedStyle = giftStyleKeywords.find(kw => 
								product.giftStyleTags!.some(gs => semanticMatch(gs.toLowerCase(), kw) > 0)
							);
							if (matchedStyle && !matchReasons.some(r => r.includes('style'))) {
								matchReasons.push(`A ${matchedStyle} gift ${recipient.firstName} will love`);
							}
						}
					}

					// 8. Occasion tags matching
					if (product.occasionTags && product.occasionTags.length > 0 && recipient.recentLifeEvents) {
						const eventKeywords = extractKeywords(recipient.recentLifeEvents);
						const occasionMatch = product.occasionTags.some(occasion => 
							eventKeywords.some(kw => semanticMatch(occasion.toLowerCase(), kw) > 0)
						);
						if (occasionMatch) {
							totalScore += 14;
							matchCount++;
							const matchedOccasion = eventKeywords.find(kw => 
								product.occasionTags!.some(oc => semanticMatch(oc.toLowerCase(), kw) > 0)
							);
							if (matchedOccasion && !matchReasons.some(r => r.includes('occasion'))) {
								matchReasons.push(`Perfect for ${recipient.firstName}'s recent ${matchedOccasion}`);
							}
						}
					}

					// Add preference-based reasons
					if (matchReasons.length === 0) {
						const matchedPreferences = preferences.filter(pref => {
							const nameScore = semanticMatch(productName, pref.keyword);
							const tagsScore = semanticMatch(productTags, pref.keyword);
							return nameScore > 0 || tagsScore > 0;
						}).slice(0, 2);
						
						if (matchedPreferences.length > 0) {
							const prefText = matchedPreferences.map(p => {
								if (p.type === 'hobbies') return recipient.hobbies?.split(/[,\s]+/)[0] || 'interests';
								if (p.type === 'favoriteColors') return recipient.favoriteColors?.split(/[,\s]+/)[0] || 'favorite colors';
								if (p.type === 'stylePreferences') return recipient.stylePreferences?.split(/[,\s]+/)[0] || 'style';
								return p.keyword;
							}).join(' and ');
							matchReasons.push(`Matches ${recipient.firstName}'s ${prefText}`);
						}
					}

					// 9. Discount boost
					if (product.discountPercentage > 0) {
						totalScore += Math.min(product.discountPercentage * 0.1, 3);
					}

					const diversityBonus = matchCount > 1 ? Math.min(matchCount * 0.5, 5) : 0;
					const finalScore = totalScore + diversityBonus;

					const recommendationReason = generateRecommendationReason(product, recipient, matchReasons);

					return {
						product,
						score: finalScore,
						matchCount,
						recommendationReason,
						allMatchReasons: matchReasons, // Store all reasons for detailed view
					};
				});

			// Sort by score and take top 4 products with scores
			const topProductsWithScores = scoredProducts
				.filter(item => item.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, 4);
			
			const topProducts = topProductsWithScores.map(item => item.product);

			// If no matches or not enough matches, supplement with fallback
			let products = topProducts;
			let productsWithScores = topProductsWithScores;
			
			if (products.length < 4) {
				const remainingProducts = availableProducts.filter(
					p => !products.some(selected => selected.id === p.id)
				);
				
				const fallbackProducts = remainingProducts
					.sort((a, b) => {
						if (a.discountPercentage > 0 && b.discountPercentage === 0) return -1;
						if (a.discountPercentage === 0 && b.discountPercentage > 0) return 1;
						if (a.discountPercentage > 0 && b.discountPercentage > 0) {
							return b.discountPercentage - a.discountPercentage;
						}
						return 0;
					})
					.slice(0, 4 - products.length);
				
				// Add fallback products with score 0
				const fallbackWithScores = fallbackProducts.map(p => ({
					product: p,
					score: 0,
					matchCount: 0,
					recommendationReason: `A thoughtful gift for ${recipient.firstName}`,
				}));
				
				products = [...products, ...fallbackProducts];
				productsWithScores = [...productsWithScores, ...fallbackWithScores];
			}

			// Map products with vendor info, images, and scores
			const productsWithDetails = products.map(p => {
				const vendor = p.vendorId ? vendorsMap.get(p.vendorId) : undefined;
				const imageUrl = p.imageUrl ? (() => {
					try {
						const parsed = JSON.parse(p.imageUrl);
						return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
					} catch {
						return p.imageUrl;
					}
				})() : undefined;
				
				// Find the score for this product
				const productScore = productsWithScores.find(item => item.product.id === p.id);
				
				return {
					...p,
					vendorName: vendor?.storeName,
					imageUrl,
					score: productScore?.score || 0,
					matchCount: productScore?.matchCount || 0,
					recommendationReason: productScore?.recommendationReason || `A thoughtful gift for ${recipient.firstName}`,
					detailedExplanation: productScore?.detailedExplanation || `This is a thoughtful gift choice for ${recipient.firstName}.`,
					allMatchReasons: productScore?.allMatchReasons || [],
				};
			});

			return {
				recipient,
				products: productsWithDetails,
			};
		});
	}, [filteredProducts, vendorsMap, recipients, saleProducts, categories]);
	
	// Get vendors with their products
	const featuredVendors = useMemo(() => {
		const vendorProductsMap = new Map<string, Product[]>();
		
		filteredProducts.forEach(product => {
			if (product.vendorId) {
				if (!vendorProductsMap.has(product.vendorId)) {
					vendorProductsMap.set(product.vendorId, []);
				}
				vendorProductsMap.get(product.vendorId)!.push(product);
			}
		});
		
		return Array.from(vendorProductsMap.entries())
			.slice(0, 5)
			.map(([vendorId, vendorProducts]) => {
				const vendor = vendorsMap.get(vendorId);
		return {
					vendor: vendor || { id: vendorId, storeName: undefined, profileImageUrl: undefined },
					products: vendorProducts.slice(0, 3).map(p => ({
						id: p.id,
						name: p.name,
						price: p.discountPercentage > 0 
							? p.price * (1 - p.discountPercentage / 100)
							: p.price,
						image: p.imageUrl ? (() => {
							try {
								const parsed = JSON.parse(p.imageUrl);
								return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
							} catch {
								return p.imageUrl;
							}
						})() : undefined,
					})),
				};
			})
			.filter(v => v.vendor.storeName); // Only show vendors with names
	}, [filteredProducts, vendorsMap]);
	
	// Promotional banners
	const banners = useMemo(() => {
		const bannerItems = [];
		
		if (saleProducts.length > 0) {
			bannerItems.push({
				id: 'deals',
				title: 'Special Deals',
				subtitle: 'Up to 50% off selected items',
				backgroundColor: GIFTYY_THEME.colors.primary,
				ctaText: 'Shop Deals',
				onPress: () => router.push('/(buyer)/deals'),
			});
		}
		
		if (bundlesWithProducts.length > 0) {
			bannerItems.push({
				id: 'collections',
				title: 'Shop Giftyy Bundles',
				subtitle: 'Curated gifts for every occasion',
				backgroundColor: GIFTYY_THEME.colors.success,
				onPress: () => router.push('/(buyer)/bundles'),
			});
		}
		
		return bannerItems;
	}, [saleProducts, bundlesWithProducts]);
	
	const headerPaddingTop = top + 6;

	return (
		<View style={styles.container}>
			{/* Header */}
			<Animated.View
				entering={FadeInDown.duration(300)}
				style={[
					styles.header,
					{
						paddingTop: headerPaddingTop,
						paddingRight: 16 + right,
					},
				]}
			>
				{/* Search Bar */}
				<View style={styles.searchContainer}>
					<Pressable
						style={styles.searchBox}
						onPress={() => router.push('/(buyer)/(tabs)/search')}
					>
						<IconSymbol name="magnifyingglass" size={18} color={GIFTYY_THEME.colors.gray400} />
						<Text style={styles.searchPlaceholder}>Search gifts, vendors, categories...</Text>
					</Pressable>
					
					{/* Filter Button */}
					<Pressable
						style={styles.filterButton}
						onPress={() => setShowFilters(true)}
					>
						<IconSymbol name="slider.horizontal.3" size={20} color={GIFTYY_THEME.colors.gray700} />
					</Pressable>

				{/* Notifications */}
					<Pressable
						style={styles.notificationButton}
						onPress={() => router.push('/(buyer)/notifications')}
					>
						<IconSymbol name="bell" size={20} color={GIFTYY_THEME.colors.gray700} />
					{unreadCount > 0 && (
							<View style={styles.notificationBadge}>
								<Text style={styles.notificationBadgeText}>
									{unreadCount > 9 ? '9+' : unreadCount}
								</Text>
						</View>
					)}
				</Pressable>
			</View>
			</Animated.View>
			
			{/* Main Content */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 24 },
				]}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={GIFTYY_THEME.colors.primary}
						colors={[GIFTYY_THEME.colors.primary]}
					/>
				}
			>
				{loading && products.length === 0 ? (
					<>
						<ProductGridShimmer count={9} />
					</>
				) : selectedCategory ? (
					<>
						{/* Category Filter Active - Show Only Filtered Products */}
						<View style={styles.categoryHeader}>
							<Pressable 
								style={styles.clearFilterButton}
								onPress={() => setSelectedCategory(null)}
							>
								<IconSymbol name="xmark.circle.fill" size={20} color={GIFTYY_THEME.colors.gray600} />
							</Pressable>
							<Text style={styles.categoryHeaderTitle}>
								{CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Category'}
							</Text>
							<Text style={styles.categoryHeaderSubtitle}>
								{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
							</Text>
						</View>
						
						{filteredProducts.length > 0 ? (
							<View style={styles.dealsGrid}>
								{filteredProducts.map((product, index) => {
									const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
									const imageUrl = product.imageUrl ? (() => {
										try {
											const parsed = JSON.parse(product.imageUrl);
											return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
										} catch {
											return product.imageUrl;
										}
									})() : undefined;
									
									// Ensure 3-column layout - remove marginRight from last item in each row
									const isLastInRow = (index + 1) % 3 === 0;
									
									return (
										<Animated.View
											key={product.id}
											entering={FadeInUp.duration(400).delay(100 + index * 30)}
											style={{ 
												marginRight: isLastInRow ? 0 : 10, 
												marginBottom: 10 
											}}
										>
											<MarketplaceProductCard
												id={product.id}
												name={product.name || ''}
												price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
												originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
												discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
												image={imageUrl}
												vendorName={vendor?.storeName || undefined}
												onPress={() => router.push({
													pathname: '/(buyer)/(tabs)/product/[id]',
													params: { id: product.id },
												})}
											/>
										</Animated.View>
									);
								})}
							</View>
						) : (
							<View style={styles.emptyState}>
								<IconSymbol name="square.grid.2x2" size={64} color={GIFTYY_THEME.colors.gray300} />
								<Text style={styles.emptyStateTitle}>No products found</Text>
								<Text style={styles.emptyStateSubtitle}>
									Try selecting a different category
								</Text>
								<Pressable 
									style={styles.clearFilterButtonLarge}
									onPress={() => setSelectedCategory(null)}
								>
									<Text style={styles.clearFilterButtonText}>Clear filter</Text>
								</Pressable>
							</View>
						)}
					</>
				) : (
					<>
						{/* Hero Banner */}
						{banners.length > 0 && (
							<Animated.View entering={FadeInUp.duration(400).delay(100)}>
								<PromotionalBanner banners={banners} />
							</Animated.View>
						)}
						
						{/* Categories */}
						<AnimatedSectionHeader
							title="Shop by Category"
							icon="square.grid.2x2"
						/>
                                            <ScrollView 
                                                horizontal
                                                showsHorizontalScrollIndicator={false} 
							contentContainerStyle={styles.categoriesContainer}
							nestedScrollEnabled={true}
							scrollEventThrottle={16}
						>
							{CATEGORIES.map((category, index) => (
								<Animated.View
									key={category.id}
									entering={FadeInRight.duration(300).delay(150 + index * 50)}
									style={{ marginRight: 12 }}
								>
									<CategoryChip
										id={category.id}
										name={category.name}
										icon={category.icon}
										isSelected={selectedCategory === category.id}
										onPress={() => {
											// Clear database category filters when selecting a chip
											if (selectedCategory === category.id) {
												setSelectedCategory(null);
											} else {
												setSelectedCategory(category.id);
												setFilters({
													...filters,
													categories: [], // Clear database category filters
												});
											}
										}}
									/>
								</Animated.View>
							))}
						</ScrollView>
						
						{/* Deals Section */}
						{saleProducts.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="Deals for You"
									subtitle="Limited time offers"
									icon="tag.fill"
									actionText="See All"
									onActionPress={() => router.push('/(buyer)/deals')}
								/>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.dealsRowContainer}
									nestedScrollEnabled={true}
									scrollEventThrottle={16}
									decelerationRate="fast"
								>
									{saleProducts.slice(0, 12).map((product, index) => (
										<Animated.View
											key={product.id}
											entering={FadeInRight.duration(350).delay(150 + index * 60)}
											style={{ marginRight: index === Math.min(11, saleProducts.length - 1) ? 0 : 12 }}
										>
											<MarketplaceProductCard
												id={product.id}
												name={product.name || ''}
												price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
												originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
												discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
												image={product.imageUrl}
												vendorName={product.vendorName || undefined}
												onPress={() => router.push({
													pathname: '/(buyer)/(tabs)/product/[id]',
													params: { id: product.id },
												})}
												width={DEALS_ROW_CARD_WIDTH}
											/>
										</Animated.View>
									))}
								</ScrollView>
							</>
						)}
						
						{/* Vendor Spotlight */}
						{featuredVendors.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="Featured Vendors"
									subtitle="Shop from trusted sellers"
									icon="storefront.fill"
									actionText="See All"
									onActionPress={() => router.push('/(buyer)/vendors')}
								/>
                                        <ScrollView 
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.vendorsContainer}
									nestedScrollEnabled={true}
									scrollEventThrottle={16}
								>
									{featuredVendors.map((item, index) => (
										<Animated.View
											key={item.vendor.id}
											entering={FadeInRight.duration(400).delay(250 + index * 100)}
											style={{ marginRight: 16 }}
										>
											<VendorCard
												id={item.vendor.id}
												name={item.vendor.storeName || 'Vendor'}
												profileImageUrl={item.vendor.profileImageUrl}
												featuredProducts={item.products}
												onPress={() => router.push({
													pathname: '/(buyer)/vendor/[id]',
													params: { id: item.vendor.id },
												})}
											/>
										</Animated.View>
									))}
								</ScrollView>
							</>
						)}
						
						{/* Personalized Picks for Recipients */}
						{recipientCards.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="For your loved ones"
									subtitle={`Gifts curated for ${recipientCards.length} ${recipientCards.length === 1 ? 'recipient' : 'recipients'}`}
									icon="sparkles"
								/>
								<ScrollView 
									horizontal 
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.recipientCardsContainer}
									nestedScrollEnabled={true}
									scrollEventThrottle={16}
									decelerationRate="normal"
									bounces={true}
									scrollEnabled={true}
									removeClippedSubviews={false}
								>
									{recipientCards.map((card, cardIndex) => (
										<Pressable
											key={card.recipient.id}
											style={styles.recipientCard}
											onPress={() => router.push('/(buyer)/recipients')}
										>
											{/* Recipient Header */}
											<View style={styles.recipientCardHeader}>
												<View style={styles.recipientInfo}>
													<Text style={styles.recipientName}>
														{card.recipient.firstName || ''} {card.recipient.lastName || ''}
													</Text>
													{card.recipient.relationship ? (
														<Text style={styles.recipientRelationship}>
															{card.recipient.relationship}
														</Text>
													) : null}
												</View>
												<View style={styles.recipientIconContainer}>
													<IconSymbol name="heart.fill" size={20} color={GIFTYY_THEME.colors.primary} />
												</View>
											</View>

											{/* Products Grid */}
											<ScrollView 
												horizontal 
												showsHorizontalScrollIndicator={false}
												contentContainerStyle={styles.recipientProductsContainer}
												nestedScrollEnabled={true}
												scrollEventThrottle={16}
												decelerationRate="normal"
												bounces={true}
												scrollEnabled={true}
												removeClippedSubviews={false}
											>
												{card.products && card.products.length > 0 ? card.products.map((product) => {
													if (!product || !product.id) return null;
													return (
														<View key={product.id} style={styles.recipientProductItemContainer}>
															{/* Product Card */}
															<Pressable
																onPress={() => {
																	if (product.id) {
																		router.push({
																			pathname: '/(buyer)/(tabs)/product/[id]',
																			params: { id: product.id },
																		});
																	}
																}}
																style={styles.recipientProductCard}
															>
																{product.imageUrl ? (
																	<Image 
																		source={{ uri: product.imageUrl }} 
																		style={styles.recipientProductImage}
																		resizeMode="cover"
																		onError={() => {
																			// Silently handle image errors
																		}}
																	/>
																) : (
																	<View style={[styles.recipientProductImage, styles.recipientProductImagePlaceholder]}>
																		<IconSymbol name="photo" size={24} color={GIFTYY_THEME.colors.gray400} />
																	</View>
																)}
																{product.discountPercentage && product.discountPercentage > 0 ? (
																	<View style={styles.recipientProductDiscountBadge}>
																		<Text style={styles.recipientProductDiscountText}>
																			{Math.round(product.discountPercentage)}%
																		</Text>
																	</View>
																) : null}
																<View style={styles.recipientProductInfo}>
																	<Text style={styles.recipientProductName} numberOfLines={2}>
																		{product.name || 'Product'}
																	</Text>
																	<View style={styles.recipientProductPriceRow}>
																		<Text style={styles.recipientProductPrice}>
																			${typeof product.price === 'number' && !isNaN(product.price) 
																				? (product.discountPercentage && product.discountPercentage > 0
																					? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
																					: product.price.toFixed(2))
																				: '0.00'}
																		</Text>
																		{product.discountPercentage && product.discountPercentage > 0 ? (
																			<Text style={styles.recipientProductOriginalPrice}>
																				${typeof product.price === 'number' && !isNaN(product.price) ? product.price.toFixed(2) : '0.00'}
																			</Text>
																		) : null}
																	</View>
																</View>
															</Pressable>
														</View>
													);
												}).filter(Boolean) : (
													<View style={{ padding: 20, alignItems: 'center' }}>
														<Text style={{ color: GIFTYY_THEME.colors.gray500, fontSize: 14 }}>
															No products available
														</Text>
													</View>
												)}
											</ScrollView>
										</Pressable>
									))}
								</ScrollView>
							</>
						)}
						
						{/* Giftyy Bundles */}
						{bundlesWithProducts.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="Giftyy Bundles"
									subtitle="Curated gift sets"
									icon="rectangle.grid.2x2"
									actionText="See All"
									onActionPress={() => router.push('/(buyer)/bundles')}
								/>
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false} 
									contentContainerStyle={styles.collectionsContainer}
									nestedScrollEnabled={true}
									scrollEventThrottle={16}
								>
									{bundlesWithProducts.slice(0, 5).map((collection, index) => {
										const collectionProducts = collection.products.map(productToSimpleProduct);
										const firstProductImage = collectionProducts[0]?.image ? (() => {
							try {
								const parsed = JSON.parse(collectionProducts[0].image);
								return Array.isArray(parsed) ? parsed[0] : collectionProducts[0].image;
							} catch {
								return collectionProducts[0].image;
							}
						})() : undefined;
						
										return (
											<Animated.View
												key={collection.id}
												entering={FadeInRight.duration(400).delay(350 + index * 100)}
												style={{ marginRight: 16 }}
											>
											<Pressable
												style={[styles.collectionCard, { backgroundColor: collection.color }]}
												onPress={() => router.push({
													pathname: '/(buyer)/bundle/[id]',
													params: { id: collection.id },
												})}
											>
													<LinearGradient
														colors={[collection.color, collection.color + 'DD']}
														style={styles.collectionGradient}
													>
														{firstProductImage && (
															<Image
																source={{ uri: firstProductImage }}
																style={styles.collectionImage}
																resizeMode="cover"
															/>
														)}
														<View style={styles.collectionContent}>
															<Text style={styles.collectionTitle}>{collection.title}</Text>
															{collection.description && (
																<Text style={styles.collectionDescription} numberOfLines={2}>
																	{collection.description}
																</Text>
															)}
															<Text style={styles.collectionProductCount}>
																{collectionProducts.length} products
															</Text>
                    </View>
													</LinearGradient>
												</Pressable>
											</Animated.View>
										);
									})}
								</ScrollView>
							</>
						)}
						
						{/* All Products Grid */}
						{filteredProducts.length > 0 && (
							<>
								<AnimatedSectionHeader
									title="All Products"
									subtitle={`${filteredProducts.length} items available • Page ${allProductsPage} of ${allProductsTotalPages}`}
									icon="square.grid.3x3"
								/>
								<View style={styles.dealsGrid}>
									{allProductsPageItems.map((product, index) => {
										const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
										const imageUrl = product.imageUrl ? (() => {
											try {
												const parsed = JSON.parse(product.imageUrl);
												return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
											} catch {
												return product.imageUrl;
											}
										})() : undefined;
										
										// Ensure 3-column layout - remove marginRight from last item in each row
										const isLastInRow = (index + 1) % 3 === 0;
										
							return (
											<Animated.View
												key={product.id}
												entering={FadeInUp.duration(400).delay(400 + index * 30)}
												style={{ 
													marginRight: isLastInRow ? 0 : 10, 
													marginBottom: 10 
												}}
											>
												<MarketplaceProductCard
													id={product.id}
													name={product.name || ''}
													price={typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0}
													originalPrice={product.originalPrice !== undefined && product.originalPrice > product.price ? product.originalPrice : (typeof product.discountPercentage === 'number' && product.discountPercentage > 0 && typeof product.price === 'number' && !isNaN(product.price) ? product.price / (1 - product.discountPercentage / 100) : undefined)}
													discountPercentage={typeof product.discountPercentage === 'number' && !isNaN(product.discountPercentage) ? product.discountPercentage : undefined}
													image={imageUrl}
													vendorName={vendor?.storeName || undefined}
													onPress={() => router.push({
														pathname: '/(buyer)/(tabs)/product/[id]',
														params: { id: product.id },
													})}
												/>
											</Animated.View>
							);
						})}
					</View>
								{allProductsTotalPages > 1 && (
									<View style={styles.paginationContainer}>
										<Pressable
											onPress={() => setAllProductsPage(p => Math.max(1, p - 1))}
											disabled={allProductsPage <= 1}
											style={[
												styles.paginationButton,
												allProductsPage <= 1 && styles.paginationButtonDisabled,
											]}
										>
											<Text style={styles.paginationButtonText}>Prev</Text>
										</Pressable>

										<Text style={styles.paginationText}>
											{allProductsPage} / {allProductsTotalPages}
										</Text>

										<Pressable
											onPress={() => setAllProductsPage(p => Math.min(allProductsTotalPages, p + 1))}
											disabled={allProductsPage >= allProductsTotalPages}
											style={[
												styles.paginationButton,
												allProductsPage >= allProductsTotalPages && styles.paginationButtonDisabled,
											]}
										>
											<Text style={styles.paginationButtonText}>Next</Text>
										</Pressable>
									</View>
								)}
							</>
						)}
					</>
				)}
			</ScrollView>
			
			{/* Filters Modal */}
			<FilterModal
				visible={showFilters}
				onClose={() => setShowFilters(false)}
				filters={filters}
				onFiltersChange={(newFilters) => {
					// Clear category chip selection when database categories are selected
					if (newFilters.categories.length > 0) {
						setSelectedCategory(null);
					}
					
					setFilters(newFilters);
					// Navigate to search page with filters applied
					const hasActiveFilters = newFilters.categories.length > 0 || 
						newFilters.priceRange.min > 0 || 
						newFilters.priceRange.max < 1000;
					
					if (hasActiveFilters) {
						// Encode filters as URL parameters
						const params: Record<string, string> = {};
						if (newFilters.categories.length > 0) {
							params.categories = newFilters.categories.join(',');
						}
						if (newFilters.priceRange.min > 0) {
							params.minPrice = newFilters.priceRange.min.toString();
						}
						if (newFilters.priceRange.max < 1000) {
							params.maxPrice = newFilters.priceRange.max.toString();
						}
						if (newFilters.sortBy !== 'recommended') {
							params.sortBy = newFilters.sortBy;
						}
						
						setShowFilters(false);
						router.push({
							pathname: '/(buyer)/(tabs)/search',
							params,
						});
					} else {
						setShowFilters(false);
					}
				}}
				onReset={() => {
					setFilters({
						categories: [],
						priceRange: { min: 0, max: 1000 },
						sortBy: 'recommended',
					});
					setSelectedCategory(null);
				}}
				categories={categories}
			/>
			
			{/* Gift suggestion explanation removed for a cleaner personalized section */}
        </View>
    );
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.background,
	},
	header: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 20,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: 12,
		...GIFTYY_THEME.shadows.sm,
	},
	searchContainer: {
		flexDirection: 'row', 
		alignItems: 'center', 
	},
	searchBox: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderRadius: GIFTYY_THEME.radius.md,
		paddingHorizontal: 14,
		height: 44,
		marginRight: 8,
		...GIFTYY_THEME.shadows.sm,
	},
	searchInput: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray900,
	},
	filterButton: {
		width: 44,
		height: 44,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
	},
	notificationButton: {
		width: 44,
		height: 44,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		position: 'relative',
		...GIFTYY_THEME.shadows.sm,
	},
	notificationBadge: {
		position: 'absolute',
		top: 6,
		right: 6,
		minWidth: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: GIFTYY_THEME.colors.error,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: GIFTYY_THEME.colors.white,
	},
	notificationBadgeText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: 10,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingTop: 100, // Header height + padding
	},
	categoriesContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	productsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	dealsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		justifyContent: 'flex-start',
	},
	dealsRowContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	paginationContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingTop: GIFTYY_THEME.spacing.sm,
		paddingBottom: GIFTYY_THEME.spacing.xl,
	},
	paginationButton: {
		minWidth: 86,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		alignItems: 'center',
		justifyContent: 'center',
	},
	paginationButtonDisabled: {
		opacity: 0.5,
	},
	paginationButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray800,
	},
	paginationText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray600,
	},
	vendorsContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	recipientCardsContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
		gap: GIFTYY_THEME.spacing.lg,
	},
	recipientCard: {
		width: SCREEN_WIDTH * 0.85,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		marginRight: GIFTYY_THEME.spacing.md,
		...GIFTYY_THEME.shadows.md,
	},
	recipientCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.md,
		paddingBottom: GIFTYY_THEME.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	recipientInfo: {
		flex: 1,
	},
	recipientName: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 4,
	},
	recipientRelationship: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
	},
	recipientIconContainer: {
		width: 40,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.cream,
		alignItems: 'center',
		justifyContent: 'center',
	},
	recipientProductsContainer: {
		gap: GIFTYY_THEME.spacing.md,
		paddingVertical: GIFTYY_THEME.spacing.xs,
	},
	recipientProductItemContainer: {
		width: 140,
		marginRight: GIFTYY_THEME.spacing.md,
	},
	recipientProductRecommendationCard: {
		marginBottom: GIFTYY_THEME.spacing.xs,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.sm,
		padding: 6,
		borderLeftWidth: 2,
		borderLeftColor: GIFTYY_THEME.colors.primary,
		...GIFTYY_THEME.shadows.xs,
	},
	recipientProductRecommendationCardPressed: {
		opacity: 0.7,
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	recipientProductRecommendationCardContent: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 4,
	},
	recipientProductRecommendationCardText: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: 12,
		fontStyle: 'italic',
	},
	recipientProductCard: {
		width: '100%',
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
	},
	recipientProductImage: {
		width: '100%',
		height: 140,
		backgroundColor: GIFTYY_THEME.colors.gray200,
	},
	recipientProductImagePlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	recipientProductDiscountBadge: {
		position: 'absolute',
		top: 8,
		right: 8,
		backgroundColor: GIFTYY_THEME.colors.primary,
		paddingHorizontal: 6,
		paddingVertical: 4,
		borderRadius: GIFTYY_THEME.radius.sm,
	},
	recipientProductDiscountText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	recipientProductInfo: {
		padding: GIFTYY_THEME.spacing.sm,
	},
	recipientProductName: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 4,
		minHeight: 32,
	},
	recipientProductPriceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	recipientProductPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.success,
	},
	recipientProductOriginalPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		textDecorationLine: 'line-through',
	},
	collectionsContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.md,
	},
	collectionCard: {
		width: SCREEN_WIDTH * 0.75,
		height: 200,
		borderRadius: GIFTYY_THEME.radius.xl,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.lg,
	},
	collectionGradient: {
		flex: 1,
		padding: GIFTYY_THEME.spacing.xl,
		justifyContent: 'flex-end',
		position: 'relative',
	},
	collectionImage: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		opacity: 0.3,
	},
	collectionContent: {
		zIndex: 1,
	},
	collectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
		marginBottom: 6,
		textShadowColor: 'rgba(0, 0, 0, 0.3)',
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 4,
	},
	collectionDescription: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.white,
		opacity: 0.9,
		marginBottom: 4,
	},
	collectionProductCount: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.white,
		opacity: 0.8,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.overlay,
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopLeftRadius: GIFTYY_THEME.radius['2xl'],
		borderTopRightRadius: GIFTYY_THEME.radius['2xl'],
		maxHeight: '80%',
		paddingTop: GIFTYY_THEME.spacing.xl,
		...GIFTYY_THEME.shadows.xl,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	modalTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
	},
	modalCloseButton: {
		padding: GIFTYY_THEME.spacing.xs,
	},
	modalExplanation: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.regular,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: 24,
		textAlign: 'center',
	},
	modalBody: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.xl,
	},
	filterSectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	filterChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	filterChip: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	filterChipActive: {
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderColor: GIFTYY_THEME.colors.primary,
	},
	filterChipText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
	},
	filterChipTextActive: {
		color: GIFTYY_THEME.colors.primary,
	},
	modalFooter: {
		flexDirection: 'row',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	modalButtonSecondary: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: GIFTYY_THEME.radius.md,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray300,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalButtonSecondaryText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
	},
	modalButtonPrimary: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: GIFTYY_THEME.radius.md,
		backgroundColor: GIFTYY_THEME.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	modalButtonPrimaryText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
	categoryHeader: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	clearFilterButton: {
		width: 40,
		height: 40,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	categoryHeaderTitle: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	categoryHeaderSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: GIFTYY_THEME.spacing['5xl'],
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	emptyStateTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginTop: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	emptyStateSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	clearFilterButtonLarge: {
		paddingVertical: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		borderRadius: GIFTYY_THEME.radius.full,
		backgroundColor: GIFTYY_THEME.colors.primary,
		...GIFTYY_THEME.shadows.md,
	},
	clearFilterButtonText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
});

