/**
 * Premium Product Detail Page (PDP) Redesign
 * Marketplace-quality shopping experience with Giftyy's emotional branding
 */

import AddedToCartDialog from '@/components/AddedToCartDialog';
import { AccordionSection } from '@/components/pdp/AccordionSection';
import { AddPersonalMessageButton } from '@/components/pdp/AddPersonalMessageButton';
import { ProductMediaCarousel } from '@/components/pdp/ProductMediaCarousel';
import { ProductVariantsSelector } from '@/components/pdp/ProductVariantsSelector';
import { RecommendationsCarousel } from '@/components/pdp/RecommendationsCarousel';
import { StickyBottomBar } from '@/components/pdp/StickyBottomBar';
import { VendorInfoCard } from '@/components/pdp/VendorInfoCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useCart } from '@/contexts/CartContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useProducts } from '@/contexts/ProductsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCheckout } from '@/lib/CheckoutContext';
import { logProductAnalyticsEvent } from '@/lib/product-analytics';
import { supabase } from '@/lib/supabase';
import { getVendorsInfo } from '@/lib/vendor-utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Tab bar height: 68px base + safe area bottom (8-34px)
// StickyBottomBar will sit above the tab bar (reduced height)
const TAB_BAR_HEIGHT = 68;
const STICKY_BAR_HEIGHT = 70; // Reduced from 80px
const TOTAL_BOTTOM_HEIGHT = TAB_BAR_HEIGHT + STICKY_BAR_HEIGHT; // Combined height of both bars

// Types (preserved from original)
type ProductVariation = {
	id: string;
	productId: string;
	name?: string; // Attribute name (e.g., "Color", "Size")
	price?: number;
	priceModifier?: number; // Price modifier from database
	sku?: string;
	stockQuantity: number;
	imageUrl?: string;
	images?: string[]; // Images array from database
	attributes: Record<string, string> | { options?: any[] }; // JSONB: {"options": [{"value": "Red", ...}]}
	parsedOptions?: {
		attributeName: string;
		options: any[];
	};
	attrMap?: Record<string, string>; // Normalized attribute map
};

type VariationOption = {
	value: string;
	images?: string[];
	priceModifier?: number;
	stockQuantity?: number;
	sku?: string | null;
};

export default function ProductDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const productId = params.id;
	const { top, bottom } = useSafeAreaInsets();
	const { videoUri, setVideoUri } = useCheckout();

	const { getProductById, products, loading: productsLoading, refreshProducts } = useProducts();
	const { categories, refreshCategories } = useCategories();
	const product = productId ? getProductById(productId) : undefined;
	const { isWishlisted, toggleWishlist } = useWishlist();
	const { addItem } = useCart();
	const viewLoggedRef = useRef<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [showAdded, setShowAdded] = useState(false);

	// Vendor state
	const [vendor, setVendor] = useState<{ id: string; storeName?: string; profileImageUrl?: string } | null>(null);
	const [vendorLoading, setVendorLoading] = useState(false);

	// Variation state
	const [variations, setVariations] = useState<ProductVariation[]>([]);
	const [variationsLoading, setVariationsLoading] = useState(false);
	const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
	const [selected, setSelected] = useState<Record<string, string>>({});

	const isInWishlist = product ? isWishlisted(product.id) : false;

	// Calculate adaptive font size for product title to fit within 3 lines
	const titleStyle = useMemo(() => {
		if (!product?.name) {
			return {
				fontSize: GIFTYY_THEME.typography.sizes['3xl'],
				lineHeight: GIFTYY_THEME.typography.sizes['3xl'] * 1.3,
			};
		}
		
		const titleLength = product.name.length;
		let fontSize: number;
		
		// Estimate characters per line for different font sizes (approximate)
		// Adjust font size based on title length to fit within 3 lines
		if (titleLength <= 50) {
			fontSize = GIFTYY_THEME.typography.sizes['3xl']; // 28px
		} else if (titleLength <= 70) {
			fontSize = GIFTYY_THEME.typography.sizes['2xl']; // 24px
		} else if (titleLength <= 90) {
			fontSize = GIFTYY_THEME.typography.sizes.xl; // 20px
		} else {
			fontSize = GIFTYY_THEME.typography.sizes.lg; // 18px
		}
		
		return {
			fontSize,
			lineHeight: fontSize * 1.3, // 1.3x for good readability
		};
	}, [product?.name]);

	// Refresh handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refreshProducts(), refreshCategories()]);
		} catch (error) {
			console.error('Error refreshing product data:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshProducts, refreshCategories]);

	// Log product view
	useEffect(() => {
		if (!product?.id) return;
		if (viewLoggedRef.current === product.id) return;
		viewLoggedRef.current = product.id;
		logProductAnalyticsEvent({
			productId: product.id,
			eventType: 'view',
		});
	}, [product?.id]);

	// Fetch vendor information
	useEffect(() => {
		const fetchVendor = async () => {
			if (!product?.vendorId) {
				setVendor(null);
				return;
			}

			try {
				setVendorLoading(true);
				const vendors = await getVendorsInfo([product.vendorId]);
				const vendorData = vendors.get(product.vendorId);
				if (vendorData) {
					setVendor({
						id: vendorData.id,
						storeName: vendorData.storeName,
						profileImageUrl: vendorData.profileImageUrl,
					});
				}
			} catch (err) {
				console.error('[ProductDetails] Error fetching vendor:', err);
				setVendor(null);
			} finally {
				setVendorLoading(false);
			}
		};

		fetchVendor();
	}, [product?.vendorId]);

	// Helpers to normalize variation attributes coming from different shapes
	// The attributes field is JSONB with structure: {"options": [{"value": "Red", "sku": null, "image": "..."}]}
	// The variation's "name" field (e.g., "Color") is the attribute name
	const normalizeAttributes = useCallback((raw: any, variationName?: string): Record<string, string> => {
		const attrs: Record<string, string> = {};

		if (!raw) return attrs;

		// If stored as JSON string, parse it
		let value = raw;
		if (typeof value === 'string') {
			try {
				value = JSON.parse(value);
			} catch {
				value = raw;
			}
		}

			// Case 1: { format: "combination", attributes: [...], combinations: [...] }
		// This is the combination format with attribute definitions and their combinations
		if (typeof value === 'object' && !Array.isArray(value) && value.format === 'combination') {
			// For combination format, we don't normalize to a simple key-value map
			// Instead, we return the full structure for later processing
			// The normalization will happen when building variantAttributes
			return value as any;
		}

		// Case 2: { options: [...] } - This is the structure from product_variations table
		// Each option has {value, sku, image} and the attribute name comes from variation.name
		if (typeof value === 'object' && !Array.isArray(value) && 'options' in value && Array.isArray((value as any).options)) {
			const options = (value as any).options;
			// If there's only one option and we have a variation name, use it
			if (options.length > 0 && variationName) {
				// For single-option variations, use the variation name as the key
				const firstOption = options[0];
				if (firstOption?.value !== undefined && firstOption?.value !== null) {
					attrs[variationName] = String(firstOption.value);
				}
			} else {
				// Multiple options - each should have an attribute name
				options.forEach((opt: any) => {
					const key = opt?.attribute || opt?.attributeName || opt?.name || variationName;
					const val = opt?.value;
					if (key && val !== undefined && val !== null) {
						attrs[key] = String(val);
					}
				});
			}
			return attrs;
		}

		// Case 3: simple key/value object
		if (typeof value === 'object' && !Array.isArray(value) && !('options' in value) && value.format !== 'combination') {
			Object.entries(value).forEach(([k, v]) => {
				if (k && v !== undefined && v !== null) {
					attrs[k] = String(v);
				}
			});
			return attrs;
		}

		// Case 4: array of attribute objects
		if (Array.isArray(value)) {
			value.forEach((opt: any) => {
				const key = opt?.attribute || opt?.attributeName || opt?.name || variationName;
				const val = opt?.value;
				if (key && val !== undefined && val !== null) {
					attrs[key] = String(val);
				}
			});
			return attrs;
		}

		return attrs;
	}, []);

	// Fetch product variations (preserve original logic)
	useEffect(() => {
		if (!productId) {
			setVariations([]);
			setVariationsLoading(false);
			return;
		}

		const fetchVariations = async () => {
			setVariationsLoading(true);
			try {
				// Try fetching variations - first without is_active filter in case that column doesn't exist
				let { data, error } = await supabase
					.from('product_variations')
					.select('*')
					.eq('product_id', productId)
					.order('display_order', { ascending: true })
					.order('created_at', { ascending: true });

				// If error, try without is_active filter
				if (error && error.code !== 'PGRST205') {
					console.warn('[Product] Error with is_active filter, trying without:', error);
					const retry = await supabase
						.from('product_variations')
						.select('*')
						.eq('product_id', productId)
						.order('created_at', { ascending: true });
					
					if (!retry.error) {
						data = retry.data;
						error = null;
					} else {
						error = retry.error;
					}
				}

				// Filter by is_active if the column exists and data was fetched
				if (data && data.length > 0 && data[0].hasOwnProperty('is_active')) {
					data = data.filter((row: any) => row.is_active !== false);
				}

				if (error) {
					console.error('[Product] Error fetching variations:', error);
					if (error.code === 'PGRST205') {
						console.log('[Product] Product variations table not found.');
					}
					setVariations([]);
				} else {
					console.log('[Product] Fetched variations:', data?.length || 0, 'variations');
					console.log('[Product] Raw variation data:', JSON.stringify(data, null, 2));
					
					const mappedVariations: ProductVariation[] = (data || []).map((row: any) => {
						// Parse attributes if it's a JSON string
						let attributes = row.attributes ?? {};
						if (typeof attributes === 'string') {
							try {
								attributes = JSON.parse(attributes);
							} catch {
								console.warn('[Product] Failed to parse attributes JSON:', row.attributes);
								attributes = {};
							}
						}
						
						// Parse parsed_options if it's a JSON string
						let parsedOptions = row.parsed_options ?? undefined;
						if (parsedOptions && typeof parsedOptions === 'string') {
							try {
								parsedOptions = JSON.parse(parsedOptions);
							} catch {
								console.warn('[Product] Failed to parse parsed_options JSON:', row.parsed_options);
								parsedOptions = undefined;
							}
						}
						
						console.log('[Product] Mapped variation:', {
							id: row.id,
							attributes,
							parsedOptions,
							rawAttributes: row.attributes,
							rawParsedOptions: row.parsed_options,
						});
						
						return {
							id: row.id,
							productId: row.product_id,
							name: row.name || undefined, // Attribute name (e.g., "Color")
							price: row.price ? parseFloat(String(row.price)) : undefined,
							priceModifier: row.price_modifier ? parseFloat(String(row.price_modifier)) : undefined,
							sku: row.sku || undefined,
							stockQuantity: row.stock_quantity || 0,
							imageUrl: row.image_url,
							images: row.images || undefined, // Array of image URLs
							attributes,
							parsedOptions,
						};
					});
					setVariations(mappedVariations);
					setSelectedVariation(null);
					setSelected({});
				}
			} catch (err) {
				console.error('[Product] Error fetching variations:', err);
				setVariations([]);
			} finally {
				setVariationsLoading(false);
			}
		};

		fetchVariations();
	}, [productId]);

	// Normalize all variations with attribute maps
	// Each variation has a "name" field (e.g., "Color") which is the attribute name
	// The attributes field contains {"options": [{"value": "Red", ...}]}
	const normalizedVariations = useMemo(() => {
		const normalized = variations.map((v) => {
			// Pass the variation name to help normalizeAttributes understand the structure
			const attrMap = normalizeAttributes(v.attributes || v.parsedOptions || {}, v.name);
			console.log('[Product] Normalizing variation:', {
				id: v.id,
				name: v.name,
				attributes: v.attributes,
				parsedOptions: v.parsedOptions,
				attrMap,
			});
			return { ...v, attrMap };
		});
		console.log('[Product] Normalized variations:', normalized.length, 'variations');
		return normalized;
	}, [variations, normalizeAttributes]);

	// Build variant attributes for ProductVariantsSelector
	// Database structure: Each variation row represents ONE attribute (e.g., "Color")
	// with MULTIPLE options in attributes.options array:
	// {"options": [{"value": "Red", "priceModifier": 29, "stockQuantity": 20, "images": [...]}, ...]}
	const variantAttributes = useMemo(() => {
		if (normalizedVariations.length === 0) {
			console.log('[Product] No normalized variations, returning empty variantAttributes');
			return [];
		}

		console.log('[Product] Building variantAttributes from', normalizedVariations.length, 'variations');
		
		const baseProductPrice = product?.price || 0;
		
		// Handle combination format variations
		// Check if any variation uses the combination format
		const hasCombinationFormat = normalizedVariations.some((v) => {
			const attrs = v.attributes;
			return attrs && typeof attrs === 'object' && attrs.format === 'combination';
		});

		if (hasCombinationFormat) {
			// Process combination format
			// Find the variation with combination format
			const combinationVariation = normalizedVariations.find((v) => {
				const attrs = v.attributes;
				return attrs && typeof attrs === 'object' && attrs.format === 'combination';
			});

			if (combinationVariation && combinationVariation.attributes) {
				const attrs = combinationVariation.attributes as any;
				const attributeDefinitions = attrs.attributes || [];
				const combinations = attrs.combinations || [];

				// Build variant attributes from attribute definitions
				// Each attribute definition has a name and possible values
				const result = attributeDefinitions.map((attrDef: any, attrIndex: number) => {
					const attributeName = attrDef.name || 'Option';
					const values = attrDef.values || [];

					// Build options from the values defined in the attribute definition
					// For each value, check if any combination has it and if it's available
					const options = values.map((value: string) => {
						// Find combinations that have this specific attribute value
						let matchingCombinations = combinations.filter((combo: any) => {
							return combo.attributes && combo.attributes[attributeName] === value;
						});

						// If this is not the first attribute, filter combinations based on previous selections
						// Only show options that are compatible with already selected attributes
						if (attrIndex > 0 && Object.keys(selected).length > 0) {
							matchingCombinations = matchingCombinations.filter((combo: any) => {
								// Check if this combination matches all previously selected attributes
								return Object.entries(selected).every(([key, val]) => {
									// Skip checking this attribute itself
									if (key === attributeName) return true;
									return combo.attributes && combo.attributes[key] === val;
								});
							});
						}

						// Check if at least one combination with this value is available
						// (has stock > 0)
						const isAvailable = matchingCombinations.length > 0 && matchingCombinations.some((combo: any) => {
							return (combo.stockQuantity || 0) > 0;
						});

						// Don't set price here - price is determined by the full combination
						// when all attributes are selected
						return {
							value: String(value),
							price: undefined, // Price comes from the selected combination, not individual options
							isAvailable,
						};
					});

					return {
						name: attributeName,
						options,
					};
				}).filter(attr => attr.options.length > 0);

				console.log('[Product] Processed combination format:', {
					variationId: combinationVariation.id,
					attributesCount: result.length,
					combinationsCount: combinations.length,
					attributes: result.map(a => ({ name: a.name, optionsCount: a.options.length })),
				});

				return result;
			}
		}

		// Process standard format (options array)
		// Each variation row contains one attribute with multiple options
		const result = normalizedVariations.map((variation) => {
			const attributeName = variation.name || 'Option';
			const attrs = variation.attributes;
			
			let options: Array<{ value: string; price?: number; isAvailable: boolean }> = [];
			
			// Extract options from attributes.options array
			if (attrs && typeof attrs === 'object' && 'options' in attrs && Array.isArray((attrs as any).options)) {
				const optionsArray = (attrs as any).options;
				
				options = optionsArray.map((opt: any) => {
					const optionValue = String(opt?.value || '');
					const optionStockQuantity = opt?.stockQuantity ?? opt?.stock_quantity ?? variation.stockQuantity ?? 0;
					const optionPriceModifier = opt?.priceModifier ?? opt?.price_modifier;
					
					// Calculate price modifier
					let priceModifier: number | undefined = undefined;
					if (optionPriceModifier !== undefined && optionPriceModifier !== null) {
						priceModifier = parseFloat(String(optionPriceModifier));
					} else if (variation.priceModifier !== undefined && variation.priceModifier !== null) {
						priceModifier = parseFloat(String(variation.priceModifier));
					}
					
					return {
						value: optionValue,
						price: priceModifier,
						isAvailable: optionStockQuantity > 0,
					};
				});
				
				console.log('[Product] Processed attribute:', {
					attributeName,
					variationId: variation.id,
					optionsCount: options.length,
					options: options.map(o => ({ value: o.value, price: o.price, available: o.isAvailable })),
				});
			} else {
				console.warn('[Product] Variation missing options array:', {
					variationId: variation.id,
					attributeName,
					attributes: attrs,
				});
			}
			
			return {
				name: attributeName,
				options,
			};
		}).filter(attr => attr.options.length > 0); // Only include attributes with options
		
		console.log('[Product] Final variantAttributes:', result.length, 'attributes');
		result.forEach(attr => {
			console.log('[Product] Attribute:', attr.name, 'with', attr.options.length, 'options');
		});
		
		return result;
	}, [normalizedVariations, product, selected]);

	// Handle variant selection
	// When an option is selected, find the matching combination or option
	// When value is null, unselect the variation and revert to original product
	const handleVariantSelect = useCallback((attributeName: string, value: string | null) => {
		setSelected((prev) => {
			const newSelected = { ...prev };
			
			if (value === null) {
				// Unselect: remove this attribute from selection
				delete newSelected[attributeName];
				// If no selections remain, clear the selected variation
				if (Object.keys(newSelected).length === 0) {
					setSelectedVariation(null);
				} else {
					// Update selected variation based on remaining selections
					// Check if we're using combination format
					const combinationVariation = normalizedVariations.find((v) => {
						const attrs = v.attributes;
						return attrs && typeof attrs === 'object' && attrs.format === 'combination';
					});

					if (combinationVariation && combinationVariation.attributes) {
						// Find matching combination
						const attrs = combinationVariation.attributes as any;
						const combinations = attrs.combinations || [];
						const matchingCombination = combinations.find((combo: any) => {
							return combo.attributes && Object.entries(newSelected).every(
								([key, val]) => combo.attributes[key] === val
							);
						});

						if (matchingCombination) {
							// Create a variation object from the combination
							setSelectedVariation({
								...combinationVariation,
								stockQuantity: matchingCombination.stockQuantity || 0,
								priceModifier: matchingCombination.priceModifier ?? matchingCombination.price_modifier,
								discountPercentage: matchingCombination.discountPercentage ?? matchingCombination.discount_percentage,
								images: matchingCombination.images || [],
								imageUrl: matchingCombination.images?.[0],
								sku: matchingCombination.sku,
								attrMap: newSelected,
							});
						} else {
							setSelectedVariation(null);
						}
					} else {
						// Standard format: Find the first remaining selected attribute's variation
						const remainingAttribute = Object.keys(newSelected)[0];
						const variationRow = normalizedVariations.find((v) => v.name === remainingAttribute);
						if (variationRow) {
							const optionsArray = (variationRow.attributes as any)?.options || [];
							const selectedOption = optionsArray.find((opt: any) => String(opt?.value) === newSelected[remainingAttribute]);
							if (selectedOption) {
								setSelectedVariation({
									...variationRow,
									priceModifier: selectedOption.priceModifier ?? selectedOption.price_modifier,
									stockQuantity: selectedOption.stockQuantity ?? selectedOption.stock_quantity ?? variationRow.stockQuantity,
									images: selectedOption.images || variationRow.images,
								});
							} else {
								setSelectedVariation(variationRow);
							}
						}
					}
				}
				return newSelected;
			}

			// Select: add or update the selection
			newSelected[attributeName] = value;

			// Check if we're using combination format
			const combinationVariation = normalizedVariations.find((v) => {
				const attrs = v.attributes;
				return attrs && typeof attrs === 'object' && attrs.format === 'combination';
			});

			if (combinationVariation && combinationVariation.attributes) {
				// Find matching combination based on all selected attributes
				const attrs = combinationVariation.attributes as any;
				const attributeDefinitions = attrs.attributes || [];
				const combinations = attrs.combinations || [];
				
				// Check if all required attributes are selected
				const allAttributesSelected = attributeDefinitions.every((attrDef: any) => {
					return newSelected[attrDef.name] !== undefined && newSelected[attrDef.name] !== null;
				});

				if (allAttributesSelected) {
					// All attributes selected - find the matching combination
					const matchingCombination = combinations.find((combo: any) => {
						if (!combo.attributes) return false;
						return Object.entries(newSelected).every(
							([key, val]) => combo.attributes[key] === val
						);
					});

					if (matchingCombination) {
						console.log('[Product] Found matching combination:', {
							selected: newSelected,
							combination: matchingCombination.attributes,
							priceModifier: matchingCombination.priceModifier ?? matchingCombination.price_modifier,
							discountPercentage: matchingCombination.discountPercentage ?? matchingCombination.discount_percentage,
							stock: matchingCombination.stockQuantity,
						});
						
						// Create a variation object from the combination
						setSelectedVariation({
							...combinationVariation,
							stockQuantity: matchingCombination.stockQuantity || 0,
							priceModifier: matchingCombination.priceModifier ?? matchingCombination.price_modifier,
							discountPercentage: matchingCombination.discountPercentage ?? matchingCombination.discount_percentage,
							images: matchingCombination.images || [],
							imageUrl: matchingCombination.images?.[0],
							sku: matchingCombination.sku,
							attrMap: newSelected,
						});
					} else {
						console.log('[Product] No matching combination found for:', newSelected);
						// All attributes selected but no matching combination - invalid selection
						setSelectedVariation(null);
					}
				} else {
					// Partial selection - not all attributes selected yet
					console.log('[Product] Partial selection, waiting for all attributes:', {
						selected: newSelected,
						required: attributeDefinitions.map((a: any) => a.name),
					});
					setSelectedVariation(null);
				}
			} else {
				// Standard format: Find the variation row that contains this attribute
				const variationRow = normalizedVariations.find((v) => v.name === attributeName);
				
				if (variationRow && variationRow.attributes && typeof variationRow.attributes === 'object' && 'options' in variationRow.attributes) {
					// Find the specific option object that matches the selected value
					const optionsArray = (variationRow.attributes as any).options;
					const selectedOption = optionsArray.find((opt: any) => String(opt?.value) === value);
					
					if (selectedOption) {
						// Create a variation-like object with the selected option's data
						const matchingVariation: ProductVariation = {
							...variationRow,
							// Override with option-specific data
							priceModifier: selectedOption.priceModifier ?? selectedOption.price_modifier,
							stockQuantity: selectedOption.stockQuantity ?? selectedOption.stock_quantity ?? variationRow.stockQuantity,
							images: selectedOption.images || variationRow.images,
						};
						setSelectedVariation(matchingVariation);
					} else {
						setSelectedVariation(variationRow);
					}
				} else {
					setSelectedVariation(variationRow || null);
				}
			}

			return newSelected;
		});
	}, [normalizedVariations]);

	// Image handling - properly handle product and variation images
	// When a variation option is selected, use its images from attributes.options[].images
	const imageUris: string[] = useMemo(() => {
		if (!product) return [];

		let images: string[] = [];
		
		// If a variation option is selected, use its images
		if (selectedVariation?.images && Array.isArray(selectedVariation.images) && selectedVariation.images.length > 0) {
			images = selectedVariation.images.filter(Boolean);
		} else if (selectedVariation?.imageUrl) {
			// Fallback to imageUrl if images array is not available
			try {
				const parsed = JSON.parse(selectedVariation.imageUrl);
				if (Array.isArray(parsed)) {
					images = parsed.filter(Boolean);
				} else if (typeof parsed === 'string') {
					images = [parsed];
				}
			} catch {
				// Not JSON, treat as single image URL
				if (selectedVariation.imageUrl) {
					images = [selectedVariation.imageUrl];
				}
			}
		}
		
		// If no variation images, use product images
		if (images.length === 0 && product.imageUrl) {
			try {
				const parsed = JSON.parse(product.imageUrl);
				const productImages = Array.isArray(parsed) ? parsed.filter(Boolean) : [product.imageUrl];
				images = productImages;
			} catch {
				// Not JSON, treat as single image URL
				images = [product.imageUrl];
			}
		}

		// Ensure we have at least one image
		if (images.length === 0 && product.imageUrl) {
			images = [product.imageUrl];
		}

		return Array.from(new Set(images.filter(Boolean)));
	}, [product, selectedVariation]);

	// Calculate lowest price from all variations (for display when no variation is selected)
	const lowestPrice = useMemo(() => {
		if (!product || !normalizedVariations || normalizedVariations.length === 0) {
			return product?.price || 0;
		}

		// Use original price for calculations if available (for variable products), otherwise use current price
		const productBasePrice = (product.originalPrice ?? product.price) || 0;
		let lowest = productBasePrice;

		// Check all variations for the lowest price
		for (const variation of normalizedVariations) {
			const attrs = variation.attributes || {};
			
			// Check if this is a combination format
			if (typeof attrs === 'object' && !Array.isArray(attrs) && attrs.format === 'combination') {
				const combinations = attrs.combinations || [];
				
				// Check each combination
				for (const combo of combinations) {
					// Calculate price for this combination
					const priceModifier = combo.priceModifier ?? combo.price_modifier ?? 0;
					const comboPrice = productBasePrice + parseFloat(String(priceModifier));
					
					// Apply discount if available
					const discount = combo.discountPercentage ?? combo.discount_percentage ?? 0;
					const finalPrice = discount > 0 
						? comboPrice * (1 - discount / 100)
						: comboPrice;
					
					// Check stock availability
					const stock = combo.stockQuantity ?? combo.stock_quantity ?? 0;
					if (stock > 0 && finalPrice < lowest) {
						lowest = finalPrice;
					}
				}
			} else {
				// Standard format - check variation price
				if (variation.price !== null && variation.price !== undefined) {
					const variationPrice = parseFloat(String(variation.price));
					if (variationPrice < lowest) {
						lowest = variationPrice;
					}
				}
			}
		}

		return lowest;
	}, [product, normalizedVariations]);

	// Pricing - calculate price based on selected variation option's priceModifier
	const basePrice = useMemo(() => {
		// Use original price for calculations if available (for variable products), otherwise use current price
		const productBasePrice = (product?.originalPrice ?? product?.price) || 0;
		
		// If a variation option is selected, add its priceModifier
		if (selectedVariation?.priceModifier !== undefined && selectedVariation.priceModifier !== null) {
			return productBasePrice + parseFloat(String(selectedVariation.priceModifier));
		}
		
		// Fallback to variation price if available
		if (selectedVariation?.price !== undefined && selectedVariation.price !== null) {
			return selectedVariation.price;
		}
		
		// If no variation selected, use the lowest price from all variations
		return lowestPrice;
	}, [selectedVariation, product, lowestPrice]);

	const discountedPrice = useMemo(() => {
		if (!product || basePrice === 0) return 0;
		
		// Use combination's discount percentage if available, otherwise use product's discount
		const discount = selectedVariation?.discountPercentage ?? product.discountPercentage ?? 0;
		
		if (discount > 0) {
			return basePrice * (1 - discount / 100);
		}
		return basePrice;
	}, [product, basePrice, selectedVariation]);

	// Calculate discount percentage (from combination or product)
	const discountPercentage = useMemo(() => {
		return selectedVariation?.discountPercentage ?? product?.discountPercentage ?? 0;
	}, [selectedVariation, product]);

	const formattedPrice = `$${discountedPrice.toFixed(2)}`;
	const formattedOriginalPrice = discountPercentage > 0 ? `$${basePrice.toFixed(2)}` : undefined;

	// Stock status
	const currentStock = useMemo(() => {
		if (selectedVariation) return selectedVariation.stockQuantity;
		return product?.stockQuantity || 0;
	}, [selectedVariation, product]);

	const stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = useMemo(() => {
		if (currentStock === 0) return 'out_of_stock';
		if (currentStock <= 5) return 'low_stock';
		return 'in_stock';
	}, [currentStock]);

	// Reset image index when variation changes
	const [imageKey, setImageKey] = useState(0);
	useEffect(() => {
		setImageKey((prev) => prev + 1);
	}, [selectedVariation?.id]);

	// Related products
	const relatedProducts = useMemo(() => {
		if (!product) return [];

		const productCategoryIds = product.categoryIds || [];
		if (productCategoryIds.length === 0) return [];

		const related: typeof products = [];
		const seenProductIds = new Set<string>([product.id]);

		for (const p of products) {
			if (!p.isActive || p.id === product.id || seenProductIds.has(p.id)) continue;
			if (!p.categoryIds || p.categoryIds.length === 0) continue;

			const sharedCategories = productCategoryIds.filter((catId) => p.categoryIds?.includes(catId));
			if (sharedCategories.length > 0) {
				related.push(p);
				seenProductIds.add(p.id);
				if (related.length >= 10) break;
			}
		}

		return related.slice(0, 10);
	}, [product, products]);

	// Convert related products for RecommendationsCarousel
	const recommendationProducts = useMemo(() => {
		return relatedProducts.map((p) => {
			const imageUrl = p.imageUrl
				? (() => {
						try {
							const parsed = JSON.parse(p.imageUrl);
							return Array.isArray(parsed) ? parsed[0] : p.imageUrl;
						} catch {
							return p.imageUrl;
						}
					})()
				: undefined;

			return {
				id: p.id,
				name: p.name || '',
				price: p.price || 0,
				originalPrice: p.discountPercentage > 0 ? p.price : undefined,
				discountPercentage: p.discountPercentage,
				image: imageUrl,
			};
		});
	}, [relatedProducts]);

	// Handlers
	const handleShare = async () => {
		if (!product) return;
		try {
			const shareUrl = `https://giftyy.com/products/${product.id}`;
			await Share.share({
				title: product.name,
				message: `Check out "${product.name}" on Giftyy: ${shareUrl}`,
			});
			logProductAnalyticsEvent({
				productId: product.id,
				eventType: 'share',
			});
		} catch (error) {
			console.warn('[Product] Share failed', error);
		}
	};

	const handleWishlistToggle = () => {
		if (!product) return;
		toggleWishlist(product.id);
	};

	// Check if all required attributes are selected
	// If no variations exist, allow adding original product
	// If variations exist, allow adding even without selection (user can add base product)
	const allAttributesSelected = useMemo(() => {
		if (variantAttributes.length === 0) return true; // No variations, no selection needed
		return variantAttributes.every(attr => selected[attr.name]);
	}, [variantAttributes, selected]);

	// Check if we can add to cart
	// Allow if: no variations exist OR all variations selected OR user wants to add base product
	const canAddToCart = useMemo(() => {
		if (variantAttributes.length === 0) return true; // No variations, always allow
		// If variations exist, allow adding base product even without selection
		return true; // Always allow - user can add base product or selected variation
	}, [variantAttributes.length]);

	const handleAddToCart = () => {
		if (!product || currentStock === 0) return;

		const itemName = selectedVariation 
			? `${product.name}${Object.keys(selected).length > 0 ? ` (${Object.values(selected).join(', ')})` : ''}`
			: product.name;
		
		addItem({
			id: selectedVariation?.id || product.id,
			productId: product.id,
			name: itemName,
			price: formattedPrice,
			image: imageUris[0],
			selectedOptions: selected,
			vendorId: product.vendorId,
		});
		setShowAdded(true);
	};

	const handleBuyNow = () => {
		handleAddToCart();
		router.push('/(buyer)/checkout/cart');
	};

	const handleAddVideoMessage = () => {
		// Add product to cart first if not already added
		if (product && currentStock > 0) {
			const itemName = selectedVariation 
				? `${product.name}${Object.keys(selected).length > 0 ? ` (${Object.values(selected).join(', ')})` : ''}`
				: product.name;
			
			addItem({
				id: selectedVariation?.id || product.id,
				productId: product.id,
				name: itemName,
				price: formattedPrice,
				image: imageUris[0],
				selectedOptions: selected,
				vendorId: product.vendorId,
			});
		}
		// Navigate directly to checkout cart instead of video recording
		router.push('/(buyer)/checkout/cart');
	};

	// Loading state
	if (productsLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} />
				<Text style={styles.loadingText}>Loading product...</Text>
			</View>
		);
	}

	// Error state
	if (!product) {
		return (
			<View style={styles.errorContainer}>
				<IconSymbol name="exclamationmark.triangle" size={48} color={GIFTYY_THEME.colors.gray400} />
				<Text style={styles.errorTitle}>Product not found</Text>
				<Text style={styles.errorText}>The product you're looking for doesn't exist or has been removed.</Text>
				<Pressable onPress={() => router.back()} style={styles.errorButton}>
					<Text style={styles.errorButtonText}>Go Back</Text>
				</Pressable>
			</View>
		);
	}

	// Accordion items - only show if product has description
	const accordionItems = [
		{
			id: 'details',
			title: 'Item Details',
			icon: 'info.circle.fill',
			content: product.description || 'No description available.',
		},
	];

	return (
		<View style={styles.container}>
			{/* Scrollable Content */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={{ paddingBottom: TOTAL_BOTTOM_HEIGHT + bottom + 32 }}
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
				{/* A - Product Media Carousel (Edge-to-edge, fully visible) */}
				<View style={styles.carouselWrapper}>
					<ProductMediaCarousel key={imageKey} images={imageUris} />
					{/* Header Overlay */}
					<Animated.View 
						entering={FadeInDown.duration(300)} 
						style={[styles.headerOverlay, { paddingTop: top + 6 }]}
						pointerEvents="box-none"
					>
						<Pressable onPress={() => router.back()} style={styles.headerButton}>
							<IconSymbol name="chevron.left" size={24} color={GIFTYY_THEME.colors.white} />
						</Pressable>
						<View style={styles.headerRight}>
							<Pressable style={styles.headerButton} onPress={handleShare}>
								<IconSymbol name="square.and.arrow.up" size={20} color={GIFTYY_THEME.colors.white} />
							</Pressable>
							<Pressable
								style={[styles.headerButton, isInWishlist && styles.headerButtonActive]}
								onPress={handleWishlistToggle}
							>
								<IconSymbol
									name={isInWishlist ? 'heart.fill' : 'heart'}
									size={20}
									color={isInWishlist ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.white}
								/>
						</Pressable>
					</View>
					</Animated.View>
				</View>

				{/* B - Product Title & Price Block */}
				<Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.titleSection}>
					<View style={styles.titleRow}>
						<Text 
							style={[styles.productTitle, titleStyle]} 
							numberOfLines={3}
							ellipsizeMode="tail"
						>
							{product.name}
						</Text>
					</View>
					<View style={styles.priceRow}>
						<Text style={styles.price}>{formattedPrice}</Text>
						{formattedOriginalPrice && <Text style={styles.originalPrice}>{formattedOriginalPrice}</Text>}
						{discountPercentage > 0 && (
							<View style={styles.discountBadge}>
								<Text style={styles.discountText}>{discountPercentage}% OFF</Text>
							</View>
						)}
					</View>
					{stockStatus === 'low_stock' && (
						<View style={styles.stockWarning}>
							<Text style={styles.stockWarningText}>Only {currentStock} left in stock!</Text>
						</View>
					)}
					{stockStatus === 'out_of_stock' && (
						<View style={styles.stockError}>
							<Text style={styles.stockErrorText}>Out of stock</Text>
					</View>
				)}
				</Animated.View>

				{/* C - Product Options / Variants (moved above vendor section) */}
				{variationsLoading ? (
					<Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.variationsLoadingContainer}>
						<ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
						<Text style={styles.variationsLoadingText}>Loading options...</Text>
					</Animated.View>
				) : variations.length > 0 ? (
					variantAttributes.length > 0 ? (
						<Animated.View entering={FadeInUp.duration(400).delay(150)}>
							<ProductVariantsSelector
								attributes={variantAttributes}
								selected={selected}
								onSelect={handleVariantSelect}
								disabled={stockStatus === 'out_of_stock'}
							/>
						</Animated.View>
					) : (
						<Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.variationsErrorContainer}>
							<Text style={styles.variationsErrorText}>
								{variations.length} variation{variations.length !== 1 ? 's' : ''} available
							</Text>
							<Text style={styles.variationsErrorSubtext}>
								Please select from available options
							</Text>
						</Animated.View>
					)
				) : null}

				{/* D - Product Specifications / Item Details (moved above vendor section) */}
				{accordionItems.length > 0 && (
					<Animated.View entering={FadeInUp.duration(400).delay(200)}>
						<AccordionSection items={accordionItems} defaultOpenId="details" />
					</Animated.View>
				)}

				{/* E - Vendor Section */}
				{vendor && (
					<Animated.View entering={FadeInUp.duration(400).delay(250)}>
						<VendorInfoCard
							vendorId={vendor.id}
							vendorName={vendor.storeName}
							profileImageUrl={vendor.profileImageUrl}
							onPress={() => router.push(`/(buyer)/vendor/${vendor.id}`)}
							loading={vendorLoading}
						/>
					</Animated.View>
				)}

				{/* F - Personalization Block (Giftyy's Magic) */}
				<Animated.View entering={FadeInUp.duration(400).delay(300)}>
					<AddPersonalMessageButton
						onPress={handleAddVideoMessage}
						hasMessage={!!videoUri}
					/>
				</Animated.View>

				{/* H - Recommended Products */}
				{recommendationProducts.length > 0 && (
					<Animated.View entering={FadeInUp.duration(400).delay(400)}>
						<RecommendationsCarousel
							title="You might also like"
							products={recommendationProducts}
						/>
					</Animated.View>
				)}
			</ScrollView>

			{/* I - Sticky Bottom Bar (positioned above tab bar) */}
			<StickyBottomBar
				price={formattedPrice}
				originalPrice={formattedOriginalPrice}
				onAddToCart={handleAddToCart}
				onBuyNow={handleBuyNow}
				disabled={variationsLoading || currentStock === 0}
				stockStatus={stockStatus}
				bottomOffset={TAB_BAR_HEIGHT + bottom}
			/>

			{/* Added to Cart Dialog */}
			<AddedToCartDialog
				visible={showAdded}
				onClose={() => setShowAdded(false)}
				onViewCart={() => {
					setShowAdded(false);
					router.push('/(buyer)/(tabs)/cart');
				}}
				title="Added to cart"
				imageUri={imageUris[0]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	loadingText: {
		marginTop: 12,
		color: GIFTYY_THEME.colors.gray500,
		fontSize: GIFTYY_THEME.typography.sizes.base,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: GIFTYY_THEME.colors.white,
		padding: 20,
	},
	errorTitle: {
		marginTop: 16,
		fontSize: GIFTYY_THEME.typography.sizes['2xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	errorText: {
		marginTop: 8,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
		fontSize: GIFTYY_THEME.typography.sizes.base,
	},
	errorButton: {
		marginTop: 24,
		paddingVertical: 12, 
		paddingHorizontal: 24,
		backgroundColor: GIFTYY_THEME.colors.primary,
		borderRadius: GIFTYY_THEME.radius.full,
	},
	errorButtonText: {
		color: GIFTYY_THEME.colors.white,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		fontSize: GIFTYY_THEME.typography.sizes.base,
	},
	carouselWrapper: {
		position: 'relative',
		width: SCREEN_WIDTH,
		overflow: 'hidden',
	},
	headerOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 100,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: 12,
	},
	headerButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		...GIFTYY_THEME.shadows.md,
	},
	headerButtonActive: {
		backgroundColor: 'rgba(247, 85, 7, 0.9)',
	},
	headerRight: {
		flexDirection: 'row',
		gap: 8,
	},
	scrollView: {
		flex: 1,
	},
	titleSection: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.xl,
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	productTitle: {
		// fontSize is now set dynamically based on title length
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		flex: 1,
		// lineHeight will be calculated based on fontSize (1.3x font size for better readability)
	},
	discountBadge: {
		backgroundColor: GIFTYY_THEME.colors.error,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: GIFTYY_THEME.radius.full,
		marginLeft: GIFTYY_THEME.spacing.sm,
		alignSelf: 'center',
	},
	discountText: {
		color: GIFTYY_THEME.colors.white,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	price: {
		fontSize: GIFTYY_THEME.typography.sizes['3xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.success,
	},
	originalPrice: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		color: GIFTYY_THEME.colors.gray400,
		textDecorationLine: 'line-through',
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	subtitle: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		lineHeight: 22,
		marginTop: GIFTYY_THEME.spacing.sm,
	},
	stockWarning: {
		backgroundColor: GIFTYY_THEME.colors.warning + '20',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: GIFTYY_THEME.radius.md,
		marginTop: GIFTYY_THEME.spacing.md,
	},
	stockWarningText: {
		color: GIFTYY_THEME.colors.warning,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	stockError: {
		backgroundColor: GIFTYY_THEME.colors.error + '20',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: GIFTYY_THEME.radius.md,
		marginTop: GIFTYY_THEME.spacing.md,
	},
	stockErrorText: {
		color: GIFTYY_THEME.colors.error,
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	variationsLoadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: GIFTYY_THEME.spacing.xl,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.md,
	},
	variationsLoadingText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	variationsErrorContainer: {
		paddingVertical: GIFTYY_THEME.spacing.lg,
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		backgroundColor: GIFTYY_THEME.colors.gray50,
		borderRadius: GIFTYY_THEME.radius.lg,
		marginHorizontal: GIFTYY_THEME.spacing.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
	},
	variationsErrorText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.xs,
	},
	variationsErrorSubtext: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray600,
	},
});

