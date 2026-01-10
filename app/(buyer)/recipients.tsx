/**
 * Recipients Screen
 * Displays user's recipients with their details and suggested products
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useCategories } from '@/contexts/CategoriesContext';
import { productToSimpleProduct, useProducts } from '@/contexts/ProductsContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import type { VendorInfo } from '@/lib/vendor-utils';
import { getVendorsInfo } from '@/lib/vendor-utils';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - GIFTYY_THEME.spacing.lg * 2 - GIFTYY_THEME.spacing.md * 2) / 3;

type RecipientWithProducts = {
	recipient: ReturnType<typeof useRecipients>['recipients'][0];
	products: Array<{
		id: string;
		name: string;
		price: number | string; // Can be number or string from productToSimpleProduct
		discount?: number; // discountPercentage from productToSimpleProduct
		discountPercentage?: number; // For backward compatibility
		image?: string;
		vendorId?: string;
		vendorName?: string;
		score?: number; // Match score for this product
		matchCount?: number; // Number of matching criteria
		// Removed recommendation explanation fields for a cleaner UI
	}>;
};

export default function RecipientsScreen() {
	const router = useRouter();
	const { top, bottom } = useSafeAreaInsets();
	const { recipients, loading: recipientsLoading, refreshRecipients } = useRecipients();
	const { products, loading: productsLoading, refreshProducts } = useProducts();
	const { categories } = useCategories();
	
	const [refreshing, setRefreshing] = useState(false);
	const [vendorsMap, setVendorsMap] = useState<Map<string, VendorInfo>>(new Map());
	const [vendorsLoading, setVendorsLoading] = useState(false);
	const [expandedSections, setExpandedSections] = useState<Map<string, Set<string>>>(new Map());

	// Fetch vendors for products
	useEffect(() => {
		const fetchVendors = async () => {
			if (products.length === 0) return;
			
			setVendorsLoading(true);
			try {
				const vendorIds = Array.from(
					new Set(products.filter(p => p.vendorId).map(p => p.vendorId!))
				);
				
				if (vendorIds.length > 0) {
					const vendors = await getVendorsInfo(vendorIds);
					setVendorsMap(vendors);
				}
			} catch (error) {
				console.error('[Recipients] Error fetching vendors:', error);
			} finally {
				setVendorsLoading(false);
			}
		};
		
		fetchVendors();
	}, [products]);

	// Get active products
	const activeProducts = useMemo(() => {
		return products.filter(p => p.isActive);
	}, [products]);

	// Helper function to normalize and extract keywords from text
	const extractKeywords = (text: string): string[] => {
		if (!text) return [];
		return text
			.toLowerCase()
			.split(/[,\s]+/)
			.map(word => word.trim())
			.filter(word => word.length >= 3); // Only keep words with 3+ characters
	};

	// Helper function for semantic matching (word boundary aware, handles plurals, etc.)
	const semanticMatch = (text: string, keyword: string): number => {
		if (!text || !keyword) return 0;
		const lowerText = text.toLowerCase();
		const lowerKeyword = keyword.toLowerCase();
		
		// Exact match (highest score)
		if (lowerText === lowerKeyword) return 10;
		
		// Word boundary match (high score)
		const wordBoundaryRegex = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
		if (wordBoundaryRegex.test(lowerText)) return 8;
		
		// Contains as substring (medium score)
		if (lowerText.includes(lowerKeyword)) return 5;
		
		// Check for plural/singular variations
		const pluralKeyword = lowerKeyword + 's';
		const singularKeyword = lowerKeyword.replace(/s$/, '');
		if (lowerText.includes(pluralKeyword) || lowerText.includes(singularKeyword)) return 4;
		
		// Check for partial matches (fuzzy)
		if (lowerKeyword.length >= 4 && lowerText.includes(lowerKeyword.substring(0, Math.floor(lowerKeyword.length * 0.7)))) {
			return 2;
		}
		
		return 0;
	};

	// Preference weights (higher = more important)
	const PREFERENCE_WEIGHTS = {
		hobbies: 1.5,
		favoriteColors: 1.2,
		stylePreferences: 1.3,
		personalityLifestyle: 1.4,
		giftTypePreference: 1.6, // Most important - what type of gift they want
		sports: 1.3,
		favoriteArtists: 1.1,
		favoriteGenres: 1.1,
	};

	// Get recipient cards with suggested products
	const recipientCards = useMemo<RecipientWithProducts[]>(() => {
		if (!recipients || recipients.length === 0) {
			return [];
		}

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

				// Prioritize the most relevant reasons
				const topReasons = matchReasons.slice(0, 2);
				
				if (topReasons.length === 1) {
					return topReasons[0];
				}
				
				// Combine top 2 reasons
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
			const scoredProducts = activeProducts
				.filter(product => product.stockQuantity > 0) // Filter out out-of-stock products
				.map(product => {
					// Build product searchable text
					const productName = product.name?.toLowerCase() || '';
					const productDescription = product.description?.toLowerCase() || '';
					const productTags = product.tags?.join(' ').toLowerCase() || '';
					const categoryName = '';

					// Calculate match score and track reasons
					let totalScore = 0;
					let matchCount = 0;
					const matchReasons: string[] = [];

					// 1. Preference-based matching (existing logic)
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

					// 2. Relationship-based matching (NEW)
					const relationshipLower = recipient.relationship?.toLowerCase() || '';
					const targetAudiences = relationshipToTargetMap[relationshipLower] || [];
					if (product.targetAudience && product.targetAudience.length > 0) {
						const hasMatchingTarget = product.targetAudience.some(target => 
							targetAudiences.includes(target.toLowerCase())
						);
						if (hasMatchingTarget) {
							totalScore += 15; // High bonus for relationship match
							matchCount++;
							matchReasons.push(`Perfect for ${recipient.relationship || 'them'}`);
						}
					}

					// 3. Relationship tags matching (NEW)
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

					// 4. Age group matching (NEW)
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

					// 5. Interest tags matching (NEW)
					if (product.interestTags && product.interestTags.length > 0) {
						preferences.forEach(pref => {
							const interestMatch = product.interestTags!.some(interest => 
							semanticMatch(interest.toLowerCase(), pref.keyword) > 0
						);
							if (interestMatch) {
								totalScore += 8 * pref.weight;
								matchCount++;
								// Add interest-based reason
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

					// 6. Lifestyle tags matching (NEW)
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

					// 7. Gift style tags matching (NEW)
					if (product.giftStyleTags && product.giftStyleTags.length > 0 && recipient.giftTypePreference) {
						const giftStyleKeywords = extractKeywords(recipient.giftTypePreference);
						const giftStyleMatch = product.giftStyleTags.some(style => 
							giftStyleKeywords.some(kw => semanticMatch(style.toLowerCase(), kw) > 0)
						);
						if (giftStyleMatch) {
							totalScore += 12; // High bonus for gift style match
							matchCount++;
							const matchedStyle = giftStyleKeywords.find(kw => 
								product.giftStyleTags!.some(gs => semanticMatch(gs.toLowerCase(), kw) > 0)
							);
							if (matchedStyle && !matchReasons.some(r => r.includes('style'))) {
								matchReasons.push(`A ${matchedStyle} gift ${recipient.firstName} will love`);
							}
						}
					}

					// 8. Occasion tags matching (NEW) - match recent life events
					if (product.occasionTags && product.occasionTags.length > 0 && recipient.recentLifeEvents) {
						const eventKeywords = extractKeywords(recipient.recentLifeEvents);
						const occasionMatch = product.occasionTags.some(occasion => 
							eventKeywords.some(kw => semanticMatch(occasion.toLowerCase(), kw) > 0)
						);
						if (occasionMatch) {
							totalScore += 14; // Very high bonus for occasion match
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
						// Fallback to preference matches
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

					// 9. Discount boost (NEW) - prefer discounted products slightly
					if (product.discountPercentage > 0) {
						totalScore += Math.min(product.discountPercentage * 0.1, 3); // Max 3 points for discounts
					}

					// Bonus for multiple matches (diversity bonus)
					const diversityBonus = matchCount > 1 ? Math.min(matchCount * 0.5, 5) : 0;
					
					// Final score
					const finalScore = totalScore + diversityBonus;

					return {
						product,
						score: finalScore,
						matchCount,
					};
				});

			// Sort by score (descending) and take top products with scores
			const topProductsWithScores = scoredProducts
				.filter(item => item.score > 0) // Only products with matches
				.sort((a, b) => b.score - a.score)
				.slice(0, 4);
			
			const topProducts = topProductsWithScores.map(item => item.product);

			// If no matches or not enough matches, supplement with fallback
			let products = topProducts;
			let productsWithScores = topProductsWithScores;
			
			if (products.length < 4) {
				// Get products that weren't already selected
				const remainingProducts = activeProducts.filter(
					p => !products.some(selected => selected.id === p.id)
				);
				
				// Sort by discount percentage (prefer discounted items) and popularity
				const fallbackProducts = remainingProducts
					.sort((a, b) => {
						// Prefer products with discounts
						if (a.discountPercentage > 0 && b.discountPercentage === 0) return -1;
						if (a.discountPercentage === 0 && b.discountPercentage > 0) return 1;
						// If both have discounts, prefer higher discount
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
					...productToSimpleProduct(p),
					image: imageUrl,
					vendorName: vendor?.storeName,
					score: productScore?.score || 0,
					matchCount: productScore?.matchCount || 0,
				};
			});

			return {
				recipient,
				products: productsWithDetails,
			};
		});
	}, [recipients, activeProducts, categories, vendorsMap]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshRecipients(), refreshProducts()]);
		} catch (error) {
			console.error('[Recipients] Error refreshing:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshRecipients, refreshProducts]);

	const isLoading = recipientsLoading || productsLoading || vendorsLoading;
	const hasRecipients = recipientCards.length > 0;

	// Early returns after all hooks are called
	if (isLoading && !hasRecipients) {
		return (
			<View style={[styles.container, { paddingTop: top + 100, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
				<Text style={styles.loadingText}>Loading recipients...</Text>
			</View>
		);
	}

	if (!hasRecipients) {
		return (
			<View style={[styles.container, { paddingTop: top + 100 }]}>
				<Pressable onPress={() => router.back()} style={[styles.backButton, { top: top + 12 }]}>
					<IconSymbol name="chevron.left" size={22} color={GIFTYY_THEME.colors.gray900} />
				</Pressable>
				<View style={styles.emptyContainer}>
					<IconSymbol name="person.2" size={64} color={GIFTYY_THEME.colors.gray300} />
					<Text style={styles.emptyTitle}>No recipients yet</Text>
					<Text style={styles.emptyText}>
						Add recipients to get personalized gift suggestions for your loved ones.
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<Animated.View
				entering={FadeInDown.duration(400)}
				style={[styles.header, { paddingTop: top + 12 }]}
			>
				<Pressable onPress={() => router.back()} style={styles.backButtonHeader} hitSlop={12}>
					<IconSymbol name="chevron.left" size={22} color={GIFTYY_THEME.colors.gray900} />
				</Pressable>
				<Text style={styles.headerTitle}>My Recipients</Text>
				<View style={styles.headerSpacer} />
			</Animated.View>

			{/* Recipients List */}
			<FlatList
				data={recipientCards}
				keyExtractor={(item) => item.recipient.id}
				contentContainerStyle={[
					styles.content,
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
				renderItem={({ item, index }) => (
					<Animated.View
						entering={FadeInUp.duration(400).delay(index * 100)}
						style={styles.recipientCard}
					>
						{/* Recipient Header */}
						<LinearGradient
							colors={[GIFTYY_THEME.colors.primary, GIFTYY_THEME.colors.primaryLight]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.recipientHeader}
						>
							<View style={styles.recipientHeaderContent}>
								<View style={styles.recipientInfo}>
									<Text style={styles.recipientName}>
										{item.recipient.firstName} {item.recipient.lastName || ''}
									</Text>
									<View style={styles.recipientMetaRow}>
										<View style={styles.recipientMetaItem}>
											<IconSymbol name="person.fill" size={14} color={GIFTYY_THEME.colors.white} />
											<Text style={styles.recipientRelationship}>{item.recipient.relationship}</Text>
										</View>
										{item.recipient.ageRange && (
											<View style={styles.recipientMetaItem}>
												<IconSymbol name="calendar" size={14} color={GIFTYY_THEME.colors.white} />
												<Text style={styles.recipientMetaText}>{item.recipient.ageRange}</Text>
											</View>
										)}
									</View>
								</View>
								<View style={styles.recipientIconContainer}>
									<IconSymbol name="heart.fill" size={24} color={GIFTYY_THEME.colors.white} />
								</View>
							</View>
						</LinearGradient>

						{/* Recipient Details - Single Collapsible Section */}
						<CollapsibleSection
							recipientId={item.recipient.id}
							sectionKey="details"
							title="Recipient Details"
							expandedSections={expandedSections}
							setExpandedSections={setExpandedSections}
						>
							<View style={styles.recipientDetails}>
								{/* Contact Information */}
								{(item.recipient.email || item.recipient.phone) && (
									<View style={styles.detailSubSection}>
										<Text style={styles.subSectionTitle}>Contact</Text>
										{item.recipient.email && (
											<View style={styles.detailRow}>
												<IconSymbol name="envelope.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.email}</Text>
											</View>
										)}
										{item.recipient.phone && (
											<View style={styles.detailRow}>
												<IconSymbol name="phone.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.phone}</Text>
											</View>
										)}
									</View>
								)}

								{/* Address */}
								{((item.recipient.address && item.recipient.address.trim()) || 
								  (item.recipient.city && item.recipient.city.trim()) || 
								  item.recipient.state || 
								  item.recipient.zip || 
								  item.recipient.country) && (
									<View style={styles.detailSubSection}>
										<Text style={styles.subSectionTitle}>Address</Text>
										<View style={styles.detailRow}>
											<IconSymbol name="mappin.circle.fill" size={16} color={GIFTYY_THEME.colors.primary} />
											<View style={styles.addressContainer}>
												{((item.recipient.address && item.recipient.address.trim()) || item.recipient.apartment) && (
													<Text style={styles.detailText}>
														{item.recipient.address?.trim() || ''}
														{item.recipient.apartment 
															? (item.recipient.address?.trim() ? `, ${item.recipient.apartment}` : item.recipient.apartment) 
															: ''}
													</Text>
												)}
												{((item.recipient.city && item.recipient.city.trim()) || item.recipient.state || item.recipient.zip) && (
													<Text style={styles.detailText}>
														{item.recipient.city?.trim() || ''}
														{item.recipient.state 
															? (item.recipient.city?.trim() ? `, ${item.recipient.state}` : item.recipient.state) 
															: ''}
														{item.recipient.zip ? ` ${item.recipient.zip}` : ''}
													</Text>
												)}
												{item.recipient.country && (
													<Text style={styles.detailText}>{item.recipient.country}</Text>
												)}
											</View>
										</View>
									</View>
								)}

								{/* Interests & Hobbies */}
								{(item.recipient.hobbies || item.recipient.sports) && (
									<View style={styles.detailSubSection}>
										<Text style={styles.subSectionTitle}>Interests & Hobbies</Text>
										{item.recipient.hobbies && (
											<View style={styles.detailRow}>
												<IconSymbol name="star.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.hobbies}</Text>
											</View>
										)}
										{item.recipient.sports && (
											<View style={styles.detailRow}>
												<IconSymbol name="figure.run" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.sports}</Text>
											</View>
										)}
									</View>
								)}

								{/* Preferences */}
								{(item.recipient.favoriteColors || item.recipient.favoriteArtists || item.recipient.favoriteGenres || item.recipient.stylePreferences) && (
									<View style={styles.detailSubSection}>
										<Text style={styles.subSectionTitle}>Preferences</Text>
										{item.recipient.favoriteColors && (
											<View style={styles.detailRow}>
												<IconSymbol name="paintpalette.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.favoriteColors}</Text>
											</View>
										)}
										{item.recipient.favoriteArtists && (
											<View style={styles.detailRow}>
												<IconSymbol name="music.note" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.favoriteArtists}</Text>
											</View>
										)}
										{item.recipient.favoriteGenres && (
											<View style={styles.detailRow}>
												<IconSymbol name="book.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.favoriteGenres}</Text>
											</View>
										)}
										{item.recipient.stylePreferences && (
											<View style={styles.detailRow}>
												<IconSymbol name="tshirt.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.stylePreferences}</Text>
											</View>
										)}
									</View>
								)}

								{/* Lifestyle & Personality */}
								{(item.recipient.personalityLifestyle || item.recipient.giftTypePreference) && (
									<View style={styles.detailSubSection}>
										<Text style={styles.subSectionTitle}>Lifestyle</Text>
										{item.recipient.personalityLifestyle && (
											<View style={styles.detailRow}>
												<IconSymbol name="sparkles" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.personalityLifestyle}</Text>
											</View>
										)}
										{item.recipient.giftTypePreference && (
											<View style={styles.detailRow}>
												<IconSymbol name="gift.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.giftTypePreference}</Text>
											</View>
										)}
									</View>
								)}

								{/* Health & Dietary */}
								{(item.recipient.dietaryPreferences || item.recipient.allergies) && (
									<View style={styles.detailSubSection}>
										<Text style={styles.subSectionTitle}>Health & Dietary</Text>
										{item.recipient.dietaryPreferences && (
											<View style={styles.detailRow}>
												<IconSymbol name="leaf.fill" size={16} color={GIFTYY_THEME.colors.primary} />
												<Text style={styles.detailText}>{item.recipient.dietaryPreferences}</Text>
											</View>
										)}
										{item.recipient.allergies && (
											<View style={styles.detailRow}>
												<IconSymbol name="exclamationmark.triangle.fill" size={16} color={GIFTYY_THEME.colors.error} />
												<Text style={[styles.detailText, styles.allergyText]}>Allergies: {item.recipient.allergies}</Text>
											</View>
										)}
									</View>
								)}

								{/* Life Events */}
								{item.recipient.recentLifeEvents && (
									<View style={styles.detailSubSection}>
										<Text style={styles.subSectionTitle}>Recent Life Events</Text>
										<View style={styles.detailRow}>
											<IconSymbol name="calendar.badge.plus" size={16} color={GIFTYY_THEME.colors.primary} />
											<Text style={styles.detailText}>{item.recipient.recentLifeEvents}</Text>
										</View>
									</View>
								)}

								{/* Notes */}
								{item.recipient.notes && (
									<View style={[styles.detailSubSection, { borderBottomWidth: 0, marginBottom: 0 }]}>
										<Text style={styles.subSectionTitle}>Notes</Text>
										<View style={styles.detailRow}>
											<IconSymbol name="note.text" size={16} color={GIFTYY_THEME.colors.primary} />
											<Text style={styles.detailText}>{item.recipient.notes}</Text>
										</View>
									</View>
								)}
							</View>
						</CollapsibleSection>

						{/* Suggested Products */}
						{item.products.length > 0 && (
							<View style={styles.productsSection}>
								<View style={styles.productsSectionHeader}>
									<View style={styles.productsSectionHeaderLeft}>
										<View style={styles.productsSectionIconContainer}>
											<IconSymbol name="sparkles" size={20} color={GIFTYY_THEME.colors.primary} />
										</View>
										<View style={styles.productsSectionTitleContainer}>
											<Text style={styles.productsSectionTitle}>Curated Gifts</Text>
											<Text style={styles.productsSectionSubtitle}>
												{item.products.length} {item.products.length === 1 ? 'gift' : 'gifts'} personalized for {item.recipient.firstName}
											</Text>
										</View>
									</View>
								</View>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.productsScrollContent}
									nestedScrollEnabled={true}
									scrollEventThrottle={16}
								>
									{item.products.map((product, productIndex) => {
										const vendor = product.vendorId ? vendorsMap.get(product.vendorId) : undefined;
										const productVendorName = vendor?.storeName;
										
										return (
											<Animated.View
												key={product.id}
												entering={FadeInRight.duration(300).delay(productIndex * 100)}
												style={styles.productItemContainer}
											>
												{/* Product Card */}
												<Pressable
													onPress={() => router.push({
														pathname: '/(buyer)/(tabs)/product/[id]',
														params: { id: product.id },
													})}
													style={styles.productCardPressable}
												>
													<View style={styles.productImageContainer}>
														{product.image ? (
															<Image
																source={{ uri: product.image }}
																style={styles.productImage}
																resizeMode="cover"
																onError={() => {}}
															/>
														) : (
															<View style={styles.productImagePlaceholder}>
																<IconSymbol name="photo" size={32} color={GIFTYY_THEME.colors.gray400} />
															</View>
														)}
														{((product.discount || product.discountPercentage) && (product.discount || product.discountPercentage || 0) > 0) && (
															<View style={styles.productDiscountBadge}>
																<Text style={styles.productDiscountText}>
																	-{Math.round(product.discount || product.discountPercentage || 0)}%
																</Text>
															</View>
														)}
													</View>
													<View style={styles.productInfo}>
														{productVendorName && (
															<Text style={styles.productVendorName} numberOfLines={1}>
																{productVendorName}
															</Text>
														)}
														<Text style={styles.productName} numberOfLines={2}>
															{product.name || 'Product'}
														</Text>
														<View style={styles.productPriceRow}>
															{(() => {
																// Handle price - it can be a string (from productToSimpleProduct) or number
																let priceValue: number;
																let originalPrice: number | null = null;
																const discount = product.discount || product.discountPercentage;
																
																if (typeof product.price === 'string') {
																	// Parse string like "$25.99" to number
																	priceValue = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
																} else if (typeof product.price === 'number' && !isNaN(product.price)) {
																	priceValue = product.price;
																} else {
																	priceValue = 0;
																}
																
																// Calculate original price if there's a discount
																if (discount && discount > 0 && priceValue > 0) {
																	originalPrice = priceValue / (1 - discount / 100);
																}
																
																return (
																	<>
																		<Text style={styles.productPrice}>
																			${priceValue.toFixed(2)}
																		</Text>
																		{originalPrice && originalPrice > priceValue && (
																			<Text style={styles.productOriginalPrice}>
																				${originalPrice.toFixed(2)}
																			</Text>
																		)}
																	</>
																);
															})()}
														</View>
													</View>
												</Pressable>
											</Animated.View>
										);
									})}
								</ScrollView>
							</View>
						)}
					</Animated.View>
				)}
			/>
			
			{/* Recommendation explanations removed from Curated Gifts cards */}
		</View>
	);
}

// Collapsible Section Component
type CollapsibleSectionProps = {
	recipientId: string;
	sectionKey: string;
	title: string;
	children: React.ReactNode;
	expandedSections: Map<string, Set<string>>;
	setExpandedSections: React.Dispatch<React.SetStateAction<Map<string, Set<string>>>>;
};

function CollapsibleSection({
	recipientId,
	sectionKey,
	title,
	children,
	expandedSections,
	setExpandedSections,
}: CollapsibleSectionProps) {
	const isExpanded = expandedSections.get(recipientId)?.has(sectionKey) ?? false;
	const height = useSharedValue(isExpanded ? 1 : 0);
	const rotate = useSharedValue(isExpanded ? 1 : 0);

	useEffect(() => {
		height.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
		rotate.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
	}, [isExpanded, height, rotate]);

	const animatedHeightStyle = useAnimatedStyle(() => {
		return {
			opacity: height.value,
			maxHeight: height.value === 1 ? 1000 : 0,
		};
	});

	const animatedChevronStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotate.value * 180}deg` }],
	}));

	const toggleSection = () => {
		setExpandedSections(prev => {
			const newMap = new Map(prev);
			const recipientSections = newMap.get(recipientId) || new Set<string>();
			const newSections = new Set(recipientSections);
			
			if (newSections.has(sectionKey)) {
				newSections.delete(sectionKey);
			} else {
				newSections.add(sectionKey);
			}
			
			newMap.set(recipientId, newSections);
			return newMap;
		});
	};

	return (
		<View style={styles.detailSection}>
			<Pressable 
				onPress={toggleSection} 
				style={[styles.sectionHeader, isExpanded && styles.sectionHeaderExpanded]}
				android_ripple={{ color: GIFTYY_THEME.colors.gray100 }}
			>
				<View style={styles.sectionHeaderLeft}>
					<View style={[styles.sectionIconContainer, isExpanded && styles.sectionIconContainerExpanded]}>
						<IconSymbol 
							name="person.text.rectangle.fill" 
							size={18} 
							color={isExpanded ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray600} 
						/>
					</View>
					<Text style={[styles.sectionTitle, isExpanded && styles.sectionTitleExpanded]}>{title}</Text>
				</View>
				<Animated.View style={[styles.chevronContainer, animatedChevronStyle]}>
					<IconSymbol 
						name="chevron.down" 
						size={18} 
						color={isExpanded ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray500} 
					/>
				</Animated.View>
			</Pressable>
			<Animated.View style={[animatedHeightStyle, { overflow: 'hidden' }]}>
				<View style={styles.sectionContent}>
					{children}
				</View>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.md,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
		zIndex: 10,
	},
	backButtonHeader: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	headerTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		flex: 1,
		textAlign: 'center',
	},
	headerSpacer: {
		width: 40,
	},
	backButton: {
		position: 'absolute',
		left: 16,
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.white,
		...GIFTYY_THEME.shadows.md,
		zIndex: 10,
	},
	loadingText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		textAlign: 'center',
		marginTop: GIFTYY_THEME.spacing.md,
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
	},
	emptyTitle: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginTop: GIFTYY_THEME.spacing.lg,
		textAlign: 'center',
	},
	emptyText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		marginTop: GIFTYY_THEME.spacing.md,
		textAlign: 'center',
		lineHeight: 22,
	},
	content: {
		paddingTop: GIFTYY_THEME.spacing.lg,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
	},
	recipientCard: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		marginBottom: GIFTYY_THEME.spacing.lg,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.md,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	recipientHeader: {
		padding: GIFTYY_THEME.spacing.lg,
	},
	recipientHeaderContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	recipientInfo: {
		flex: 1,
	},
	recipientName: {
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.white,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	recipientRelationship: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: 'rgba(255, 255, 255, 0.95)',
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		marginLeft: GIFTYY_THEME.spacing.xs,
	},
	recipientMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
		marginTop: GIFTYY_THEME.spacing.xs,
	},
	recipientMetaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.xs,
	},
	recipientMetaText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: 'rgba(255, 255, 255, 0.95)',
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		marginLeft: GIFTYY_THEME.spacing.xs,
	},
	recipientIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	recipientDetails: {
		padding: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.lg,
	},
	detailSubSection: {
		marginBottom: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray100,
		gap: GIFTYY_THEME.spacing.sm,
	},
	subSectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray600,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	detailSection: {
		marginBottom: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.sm,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: GIFTYY_THEME.spacing.md,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	sectionHeaderExpanded: {
		backgroundColor: GIFTYY_THEME.colors.primary + '08',
		borderBottomColor: GIFTYY_THEME.colors.primary + '20',
	},
	sectionHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: GIFTYY_THEME.spacing.md,
	},
	sectionIconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	sectionIconContainerExpanded: {
		backgroundColor: GIFTYY_THEME.colors.primary + '15',
		borderColor: GIFTYY_THEME.colors.primary + '30',
	},
	sectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray700,
		flex: 1,
	},
	sectionTitleExpanded: {
		color: GIFTYY_THEME.colors.gray900,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	chevronContainer: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: GIFTYY_THEME.colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	sectionContent: {
		padding: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: GIFTYY_THEME.spacing.sm,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	detailText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray700,
		flex: 1,
		lineHeight: 20,
	},
	addressContainer: {
		flex: 1,
		gap: 2,
	},
	allergyText: {
		color: GIFTYY_THEME.colors.error,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	productsSection: {
		paddingTop: GIFTYY_THEME.spacing.lg,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
		backgroundColor: GIFTYY_THEME.colors.gray50,
	},
	productsSectionHeader: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.md,
	},
	productsSectionHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.md,
	},
	productsSectionIconContainer: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: GIFTYY_THEME.colors.primary + '15',
		alignItems: 'center',
		justifyContent: 'center',
	},
	productsSectionTitleContainer: {
		flex: 1,
	},
	productsSectionTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xl,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	productsSectionSubtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
	},
	productsScrollContent: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.md,
	},
	productItemContainer: {
		width: 180,
		marginRight: GIFTYY_THEME.spacing.md,
	},
	productRecommendationCard: {
		marginBottom: GIFTYY_THEME.spacing.sm,
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.md,
		padding: GIFTYY_THEME.spacing.sm,
		borderLeftWidth: 3,
		borderLeftColor: GIFTYY_THEME.colors.primary,
		...GIFTYY_THEME.shadows.sm,
	},
	productRecommendationCardPressed: {
		opacity: 0.8,
		transform: [{ scale: 0.98 }],
	},
	productRecommendationCardContent: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
	},
	productRecommendationTextContainer: {
		flex: 1,
	},
	productRecommendationCardText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: 16,
		fontStyle: 'italic',
		marginBottom: 4,
	},
	productRecommendationDetails: {
		marginTop: GIFTYY_THEME.spacing.sm,
		paddingTop: GIFTYY_THEME.spacing.sm,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	productRecommendationDetailsTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	productRecommendationDetailItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	productRecommendationDetailText: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.normal,
		color: GIFTYY_THEME.colors.gray600,
		lineHeight: 16,
	},
	productRecommendationExpandIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: GIFTYY_THEME.spacing.xs,
		paddingTop: GIFTYY_THEME.spacing.xs,
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	productRecommendationExpandText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.primary,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: GIFTYY_THEME.spacing.lg,
	},
	modalContent: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		width: '100%',
		maxWidth: 400,
		maxHeight: '80%',
		...GIFTYY_THEME.shadows.lg,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	modalHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.sm,
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
		fontWeight: GIFTYY_THEME.typography.weights.normal,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: 24,
		textAlign: 'center',
	},
	productCardPressable: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.lg,
		overflow: 'hidden',
		...GIFTYY_THEME.shadows.sm,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	productImageContainer: {
		width: '100%',
		height: 160,
		position: 'relative',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	productImage: {
		width: '100%',
		height: '100%',
	},
	productImagePlaceholder: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
	productDiscountBadge: {
		position: 'absolute',
		top: 8,
		right: 8,
		backgroundColor: GIFTYY_THEME.colors.error,
		borderRadius: GIFTYY_THEME.radius.full,
		paddingHorizontal: 8,
		paddingVertical: 4,
		...GIFTYY_THEME.shadows.sm,
	},
	productDiscountText: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.white,
	},
	productInfo: {
		padding: GIFTYY_THEME.spacing.md,
	},
	productRecommendationBadge: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: GIFTYY_THEME.colors.primary + '08',
		borderLeftWidth: 3,
		borderLeftColor: GIFTYY_THEME.colors.primary,
		borderRadius: GIFTYY_THEME.radius.sm,
		padding: GIFTYY_THEME.spacing.sm,
		marginBottom: GIFTYY_THEME.spacing.sm,
		gap: 6,
	},
	productRecommendationText: {
		flex: 1,
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: GIFTYY_THEME.colors.gray700,
		lineHeight: 16,
		fontStyle: 'italic',
	},
	productVendorName: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	productName: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.xs,
		lineHeight: 20,
	},
	productPriceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: GIFTYY_THEME.spacing.xs,
	},
	productPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.primary,
	},
	productOriginalPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
		textDecorationLine: 'line-through',
	},
});

