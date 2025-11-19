// Stubbed client-only OpenAI utility.
// In production, proxy these requests via your backend to avoid leaking API keys.

import type { Product } from '@/contexts/ProductsContext';

export type GiftSuggestion = { title: string; reason: string; productId?: string | null; priceHint?: string | null };

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL ?? 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const isOpenAIConfigured = Boolean(OPENAI_API_KEY);

type GiftSuggestionOptions = {
	products?: Product[];
	maxResults?: number;
	context?: {
		occasion?: string;
		relationship?: string;
		giftStyle?: string[];
		ageGroup?: string;
		gender?: string;
		interests?: string[];
		emotionalTone?: string;
		urgency?: string;
		giftType?: string[];
		specialRequirements?: string[];
		contextSummary?: string;
		location?: {
			country?: string;
			region?: string;
			city?: string;
			timezone?: string;
		};
		culture?: {
			primary?: string;
			secondary?: string[];
			religiousContext?: string;
			culturalPreferences?: string[];
		};
		lifestyle?: {
			urban?: boolean;
			rural?: boolean;
			active?: boolean;
			homebody?: boolean;
			social?: boolean;
			introverted?: boolean;
			workLife?: string;
			familyStatus?: string;
			livingSituation?: string;
		};
		preferences?: {
			likes: string[];
			dislikes: string[];
			avoid?: string[];
		};
		seasonalContext?: {
			season?: string;
			holiday?: string;
			localEvents?: string[];
			weather?: string;
		};
		socialContext?: {
			groupGift?: boolean;
			giftExchange?: boolean;
			corporateGift?: boolean;
			surprise?: boolean;
			publicGift?: boolean;
		};
		personality?: {
			traits?: string[];
			values?: string[];
		};
	};
};

export async function getGiftSuggestions(prompt: string, options: GiftSuggestionOptions = {}): Promise<GiftSuggestion[]> {
	const trimmedPrompt = prompt.trim();
	const products = options.products ?? [];
	const maxResults = options.maxResults ?? 4;

	console.log('[GiftFinder] ========================================');
	console.log('[GiftFinder] Starting gift suggestion request');
	console.log('[GiftFinder] Prompt:', trimmedPrompt);
	console.log('[GiftFinder] Products available:', products.length);
	console.log('[GiftFinder] Max results:', maxResults);
	console.log('[GiftFinder] OpenAI configured:', isOpenAIConfigured);

	if (!trimmedPrompt) {
		console.log('[GiftFinder] No prompt provided, using fallback');
		return buildFallbackSuggestions('general celebrations', maxResults, products);
	}

	if (!isOpenAIConfigured) {
		console.log('[GiftFinder] ⚠️ OpenAI API key not configured, using fallback suggestions');
		console.log('[GiftFinder] Add EXPO_PUBLIC_OPENAI_API_KEY to .env.local to enable AI');
		return buildFallbackSuggestions(trimmedPrompt, maxResults, products, options.context);
	}

	try {
		console.log('[GiftFinder] 🤖 Calling OpenAI API...');
		const productContext = serializeProducts(products, 12);
		console.log('[GiftFinder] Product context length:', productContext.length, 'characters');
		
		const systemMessage =
			'You are an expert AI gift recommendation stylist who considers multiple factors when recommending thoughtful physical gifts. ' +
			'Always respond with pure JSON: an array of objects like {"title": "...", "reason": "...", "productId": "...", "priceHint": "$45"}. ' +
			'Use the provided product catalog where possible. productId must match catalog IDs exactly or be null. ' +
			'Consider ALL context provided including: occasion, relationship, age, gender, location, cultural background, lifestyle, personality, preferences (likes/dislikes), seasonal context, social context, and budget. ' +
			'Make culturally appropriate recommendations. Consider regional preferences and cultural gift-giving practices. ' +
			'Respect dietary restrictions, allergies, and special requirements. Avoid items in the "avoid" list. ' +
			'Match gift style preferences (thoughtful, practical, luxury, fun, etc.) and consider the emotional tone of the occasion.';

		// Build enhanced user message with context
		let userMessage = `Recipient description: ${trimmedPrompt}\n\n`;
		
		// Add structured context if available
		if (options.context) {
			const ctx = options.context;
			const contextParts: string[] = [];
			
			if (ctx.occasion) contextParts.push(`Occasion: ${ctx.occasion}`);
			if (ctx.relationship) contextParts.push(`Relationship: ${ctx.relationship}`);
			if (ctx.ageGroup) contextParts.push(`Age group: ${ctx.ageGroup}`);
			if (ctx.gender) contextParts.push(`Gender: ${ctx.gender}`);
			
			// NEW: Enhanced context fields
			if (ctx.location?.country) {
				contextParts.push(`Location: ${ctx.location.country}${ctx.location.city ? `, ${ctx.location.city}` : ''}${ctx.location.region ? `, ${ctx.location.region}` : ''}`);
			}
			if (ctx.culture?.primary) {
				contextParts.push(`Cultural background: ${ctx.culture.primary}${ctx.culture.religiousContext ? ` (${ctx.culture.religiousContext})` : ''}`);
			}
			if (ctx.lifestyle) {
				const lifestyleParts: string[] = [];
				if (ctx.lifestyle.workLife) lifestyleParts.push(`Work: ${ctx.lifestyle.workLife}`);
				if (ctx.lifestyle.familyStatus) lifestyleParts.push(`Family: ${ctx.lifestyle.familyStatus}`);
				if (ctx.lifestyle.livingSituation) lifestyleParts.push(`Living: ${ctx.lifestyle.livingSituation}`);
				if (ctx.lifestyle.active) lifestyleParts.push('Active lifestyle');
				if (ctx.lifestyle.homebody) lifestyleParts.push('Homebody');
				if (ctx.lifestyle.social) lifestyleParts.push('Social');
				if (ctx.lifestyle.introverted) lifestyleParts.push('Introverted');
				if (ctx.lifestyle.urban) lifestyleParts.push('Urban');
				if (ctx.lifestyle.rural) lifestyleParts.push('Rural');
				if (lifestyleParts.length > 0) {
					contextParts.push(`Lifestyle: ${lifestyleParts.join(', ')}`);
				}
			}
			if (ctx.preferences) {
				if (ctx.preferences.likes && ctx.preferences.likes.length > 0) {
					contextParts.push(`Likes: ${ctx.preferences.likes.join(', ')}`);
				}
				if (ctx.preferences.dislikes && ctx.preferences.dislikes.length > 0) {
					contextParts.push(`Dislikes: ${ctx.preferences.dislikes.join(', ')}`);
				}
				if (ctx.preferences.avoid && ctx.preferences.avoid.length > 0) {
					contextParts.push(`Avoid: ${ctx.preferences.avoid.join(', ')}`);
				}
			}
			if (ctx.personality) {
				if (ctx.personality.traits && ctx.personality.traits.length > 0) {
					contextParts.push(`Personality traits: ${ctx.personality.traits.join(', ')}`);
				}
				if (ctx.personality.values && ctx.personality.values.length > 0) {
					contextParts.push(`Values: ${ctx.personality.values.join(', ')}`);
				}
			}
			if (ctx.seasonalContext?.season) {
				contextParts.push(`Season: ${ctx.seasonalContext.season}${ctx.seasonalContext.weather ? ` (${ctx.seasonalContext.weather} weather)` : ''}`);
			}
			if (ctx.socialContext) {
				if (ctx.socialContext.groupGift) contextParts.push('Group gift');
				if (ctx.socialContext.corporateGift) contextParts.push('Corporate gift');
				if (ctx.socialContext.surprise) contextParts.push('Surprise gift');
				if (ctx.socialContext.publicGift) contextParts.push('Public opening');
			}
			
			// Existing fields
			if (ctx.giftStyle && ctx.giftStyle.length > 0) contextParts.push(`Gift style preferences: ${ctx.giftStyle.join(', ')}`);
			if (ctx.interests && ctx.interests.length > 0) contextParts.push(`Interests: ${ctx.interests.join(', ')}`);
			if (ctx.emotionalTone) contextParts.push(`Emotional tone: ${ctx.emotionalTone}`);
			if (ctx.giftType && ctx.giftType.length > 0) contextParts.push(`Preferred gift types: ${ctx.giftType.join(', ')}`);
			if (ctx.specialRequirements && ctx.specialRequirements.length > 0) contextParts.push(`Special requirements: ${ctx.specialRequirements.join(', ')}`);
			if (ctx.urgency) contextParts.push(`Urgency: ${ctx.urgency}`);
			
			if (contextParts.length > 0) {
				userMessage += `Additional context:\n${contextParts.join('\n')}\n\n`;
				console.log('[GiftFinder] Added structured context to OpenAI request');
			}
		}
		
		userMessage += `Product catalog:\n${productContext}\n\n`;
		userMessage += `Return between 3 and ${maxResults} suggestions. Respond with JSON only.`;

		console.log('[GiftFinder] Model:', OPENAI_MODEL);
		console.log('[GiftFinder] Sending request to OpenAI...');

		const startTime = Date.now();
		const response = await fetch(OPENAI_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: OPENAI_MODEL,
				messages: [
					{ role: 'system', content: systemMessage },
					{ role: 'user', content: userMessage },
				],
				temperature: 0.7,
			}),
		});

		const duration = Date.now() - startTime;
		console.log('[GiftFinder] Response received in', duration, 'ms');
		console.log('[GiftFinder] Response status:', response.status, response.statusText);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('[GiftFinder] ❌ OpenAI request failed');
			console.error('[GiftFinder] Status:', response.status);
			console.error('[GiftFinder] Error:', errorText);
			console.log('[GiftFinder] Falling back to product-based suggestions');
			return buildFallbackSuggestions(trimmedPrompt, maxResults, products, options.context);
		}

		const data = await response.json();
		console.log('[GiftFinder] ✅ OpenAI response received');
		console.log('[GiftFinder] Response keys:', Object.keys(data));
		
		const content = data.choices?.[0]?.message?.content;
		console.log('[GiftFinder] Content length:', content?.length || 0, 'characters');
		console.log('[GiftFinder] Content preview:', content?.substring(0, 200) || 'No content');
		
		const parsed = parseSuggestions(content);
		console.log('[GiftFinder] Parsed suggestions:', parsed?.length || 0);

		if (parsed && parsed.length) {
			console.log('[GiftFinder] ✅ Successfully parsed', parsed.length, 'suggestions');
			parsed.forEach((s, i) => {
				console.log(`[GiftFinder]   ${i + 1}. ${s.title} (productId: ${s.productId || 'none'})`);
			});
			return parsed.slice(0, maxResults);
		} else {
			console.warn('[GiftFinder] ⚠️ Failed to parse suggestions, using fallback');
		}
	} catch (error) {
		console.error('[GiftFinder] ❌ Error fetching suggestions');
		console.error('[GiftFinder] Error type:', error instanceof Error ? error.constructor.name : typeof error);
		console.error('[GiftFinder] Error message:', error instanceof Error ? error.message : String(error));
		if (error instanceof Error && error.stack) {
			console.error('[GiftFinder] Stack:', error.stack);
		}
	}

	console.log('[GiftFinder] Using fallback suggestions');
	const fallback = buildFallbackSuggestions(trimmedPrompt, maxResults, products, options.context);
	console.log('[GiftFinder] Fallback suggestions:', fallback.length);
	console.log('[GiftFinder] ========================================');
	return fallback;
}

function parseSuggestions(content?: string | null): GiftSuggestion[] | null {
	if (!content) {
		console.log('[GiftFinder] No content to parse');
		return null;
	}

	try {
		// Try to extract JSON from markdown code blocks if present
		let jsonString = content.trim();
		if (jsonString.startsWith('```')) {
			const lines = jsonString.split('\n');
			jsonString = lines.slice(1, -1).join('\n').trim();
			if (jsonString.startsWith('json')) {
				jsonString = lines.slice(2, -1).join('\n').trim();
			}
		}

		console.log('[GiftFinder] Parsing JSON...');
		const json = JSON.parse(jsonString);
		const suggestionsArray = Array.isArray(json) ? json : json.suggestions || json.data || json.results;
		
		if (!Array.isArray(suggestionsArray)) {
			console.warn('[GiftFinder] Parsed JSON is not an array:', typeof suggestionsArray);
			return null;
		}

		const parsed = suggestionsArray
			.map((item) => ({
				title: String(item.title || '').trim(),
				reason: String(item.reason || item.description || '').trim(),
				productId: item.productId ?? item.product_id ?? null,
				priceHint: item.priceHint ?? item.price_hint ?? null,
			}))
			.filter((item) => item.title && item.reason);

		console.log('[GiftFinder] Parsed', parsed.length, 'valid suggestions from', suggestionsArray.length, 'items');
		return parsed;
	} catch (error) {
		console.error('[GiftFinder] ❌ Failed to parse OpenAI response');
		console.error('[GiftFinder] Parse error:', error instanceof Error ? error.message : String(error));
		console.error('[GiftFinder] Content that failed to parse:', content.substring(0, 500));
		return null;
	}
}

function serializeProducts(products: Product[], limit: number): string {
	return products
		.filter((product) => product.isActive)
		.slice(0, limit)
		.map((product) => {
			const parts: string[] = [];
			
			// Basic info
			parts.push(`${product.name} (id: ${product.id}, $${product.price.toFixed(2)})`);
			
			// SEO keywords
			if (product.seoKeywords && product.seoKeywords.length > 0) {
				parts.push(`Keywords: ${product.seoKeywords.join(', ')}`);
			}
			
			// Target audience
			if (product.targetAudience && product.targetAudience.length > 0) {
				parts.push(`Target: ${product.targetAudience.join(', ')}`);
			}
			
			// Occasions
			if (product.occasionTags && product.occasionTags.length > 0) {
				parts.push(`Occasions: ${product.occasionTags.join(', ')}`);
			}
			
			// Gift styles
			if (product.giftStyleTags && product.giftStyleTags.length > 0) {
				parts.push(`Styles: ${product.giftStyleTags.join(', ')}`);
			}
			
			// Age groups
			if (product.ageGroupTags && product.ageGroupTags.length > 0) {
				parts.push(`Age groups: ${product.ageGroupTags.join(', ')}`);
			}
			
			// Interests
			if (product.interestTags && product.interestTags.length > 0) {
				parts.push(`Interests: ${product.interestTags.join(', ')}`);
			}
			
			// Relationships
			if (product.relationshipTags && product.relationshipTags.length > 0) {
				parts.push(`Relationships: ${product.relationshipTags.join(', ')}`);
			}
			
			// Price range
			if (product.priceRange) {
				parts.push(`Price range: ${product.priceRange}`);
			}
			
			// Cultural tags
			if (product.culturalTags && product.culturalTags.length > 0) {
				parts.push(`Cultural: ${product.culturalTags.join(', ')}`);
			}
			
			// Lifestyle tags
			if (product.lifestyleTags && product.lifestyleTags.length > 0) {
				parts.push(`Lifestyle: ${product.lifestyleTags.join(', ')}`);
			}
			
			// Regular tags
			if (product.tags && product.tags.length > 0) {
				parts.push(`Tags: ${product.tags.join(', ')}`);
			}
			
			// Description
			parts.push(`Description: ${product.description || 'No description provided.'}`);
			
			return `- ${parts.join(' | ')}`;
		})
		.join('\n');
}

function buildFallbackSuggestions(prompt: string, maxResults: number, products: Product[], context?: GiftSuggestionOptions['context']): GiftSuggestion[] {
	const normalized = prompt.toLowerCase();
	
	// Build search terms from context (enhanced)
	const searchTerms: string[] = [normalized];
	if (context) {
		if (context.interests && context.interests.length > 0) {
			searchTerms.push(...context.interests);
		}
		if (context.query) {
			searchTerms.push(context.query);
		}
		if (context.giftStyle && context.giftStyle.length > 0) {
			searchTerms.push(...context.giftStyle);
		}
		if (context.occasion) {
			searchTerms.push(context.occasion);
		}
		if (context.preferences?.likes && context.preferences.likes.length > 0) {
			searchTerms.push(...context.preferences.likes);
		}
		if (context.personality?.traits && context.personality.traits.length > 0) {
			searchTerms.push(...context.personality.traits);
		}
		if (context.culture?.primary) {
			searchTerms.push(context.culture.primary);
		}
		if (context.lifestyle?.workLife) {
			searchTerms.push(context.lifestyle.workLife);
		}
	}
	
	// Score products based on SEO field matches
	const scoredProducts = products.map((product) => {
		let score = 0;
		const normalizedTerm = normalized.toLowerCase();
		
		// Build comprehensive searchable text from all SEO fields
		const searchableText = [
			product.name,
			product.description || '',
			...(product.tags || []),
			...(product.seoKeywords || []),
			...(product.targetAudience || []),
			...(product.occasionTags || []),
			...(product.giftStyleTags || []),
			...(product.ageGroupTags || []),
			...(product.interestTags || []),
			...(product.relationshipTags || []),
			product.priceRange || '',
			...(product.culturalTags || []),
			...(product.lifestyleTags || []),
		].join(' ').toLowerCase();
		
		// Check for matches in search terms
		for (const term of searchTerms) {
			const lowerTerm = term.toLowerCase();
			if (searchableText.includes(lowerTerm)) {
				score += 1;
			}
		}
		
		// Context-based matching with higher weights
		if (context) {
			// Match target audience
			if (context.gender && product.targetAudience) {
				if (context.gender === 'female' && product.targetAudience.includes('for-her')) score += 3;
				if (context.gender === 'male' && product.targetAudience.includes('for-him')) score += 3;
			}
			
			// Match age groups
			if (context.ageGroup && product.ageGroupTags) {
				const ageMap: Record<string, string[]> = {
					'child': ['child'],
					'teen': ['teen'],
					'young-adult': ['young-adult', 'teen'],
					'adult': ['adult', 'young-adult'],
					'senior': ['senior', 'adult'],
				};
				const matchingAges = ageMap[context.ageGroup] || [];
				if (matchingAges.some(age => product.ageGroupTags!.includes(age))) score += 3;
			}
			
			// Match occasions
			if (context.occasion && product.occasionTags) {
				const occasionLower = context.occasion.toLowerCase();
				if (product.occasionTags.some(tag => tag.toLowerCase().includes(occasionLower) || occasionLower.includes(tag.toLowerCase()))) {
					score += 4;
				}
			}
			
			// Match interests
			if (context.interests && product.interestTags) {
				const matchingInterests = context.interests.filter(interest =>
					product.interestTags!.some(tag => tag.toLowerCase().includes(interest.toLowerCase()) || interest.toLowerCase().includes(tag.toLowerCase()))
				);
				score += matchingInterests.length * 2;
			}
			
			// Match gift styles
			if (context.giftStyle && product.giftStyleTags) {
				const matchingStyles = context.giftStyle.filter(style =>
					product.giftStyleTags!.some(tag => tag.toLowerCase().includes(style.toLowerCase()) || style.toLowerCase().includes(tag.toLowerCase()))
				);
				score += matchingStyles.length * 2;
			}
			
			// Match relationships
			if (context.relationship && product.relationshipTags) {
				const relationshipLower = context.relationship.toLowerCase();
				if (product.relationshipTags.some(tag => tag.toLowerCase().includes(relationshipLower) || relationshipLower.includes(tag.toLowerCase()))) {
					score += 2;
				}
			}
			
			// Match cultural context
			if (context.culture?.primary && product.culturalTags) {
				const cultureLower = context.culture.primary.toLowerCase();
				if (product.culturalTags.some(tag => tag.toLowerCase().includes(cultureLower) || cultureLower.includes(tag.toLowerCase()))) {
					score += 2;
				}
			}
			
			// Match lifestyle
			if (context.lifestyle && product.lifestyleTags) {
				if (context.lifestyle.active && product.lifestyleTags.includes('active')) score += 2;
				if (context.lifestyle.homebody && product.lifestyleTags.includes('homebody')) score += 2;
				if (context.lifestyle.urban && product.lifestyleTags.includes('urban')) score += 2;
				if (context.lifestyle.rural && product.lifestyleTags.includes('rural')) score += 2;
				if (context.lifestyle.social && product.lifestyleTags.includes('social')) score += 2;
				if (context.lifestyle.introverted && product.lifestyleTags.includes('introverted')) score += 2;
			}
			
			// Match price range
			if (context.min !== undefined && context.max !== undefined && product.priceRange) {
				const avgPrice = (context.min + context.max) / 2;
				if (product.priceRange === 'budget' && avgPrice < 50) score += 2;
				if (product.priceRange === 'mid-range' && avgPrice >= 50 && avgPrice < 150) score += 2;
				if (product.priceRange === 'luxury' && avgPrice >= 150) score += 2;
			}
		}
		
		return { product, score };
	});
	
	// Sort by score (highest first) and filter out zero-score products
	const prioritizedProducts = scoredProducts
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ product }) => product)
		.slice(0, maxResults);

	if (prioritizedProducts.length > 0) {
		return prioritizedProducts.map((product) => ({
			title: product.name,
			reason: `Pairs beautifully with a heartfelt video for ${prompt}.`,
			productId: product.id,
			priceHint: `$${product.price.toFixed(2)}`,
		}));
	}

	const generic = [
		{ title: 'Curated Gift Box', reason: `Mix keepsakes that celebrate ${prompt}`, productId: null },
		{ title: 'Handwritten Memory Bundle', reason: 'Combine your video with printed photos and notes', productId: null },
		{ title: 'Experience Voucher', reason: `Create new memories with ${prompt}`, productId: null },
		{ title: 'Personalized Keepsake', reason: 'Custom engravings or embroidery to match the video sentiment', productId: null },
	];

	return generic.slice(0, maxResults);
}


