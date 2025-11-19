import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/contexts/ProductsContext';
import { supabase } from '@/lib/supabase';
import BrandButton from '@/components/BrandButton';
import { BRAND_COLOR } from '@/constants/theme';
import AddedToCartDialog from '@/components/AddedToCartDialog';

const BRAND = '#f75507';
const { width } = Dimensions.get('window');

type ProductOption = { name: string; values: string[] };
type VariationOption = {
	value: string;
	images?: string[];
	priceModifier?: number;
	stockQuantity?: number;
	sku?: string | null;
};
type ProductVariation = {
	id: string;
	productId: string;
	name?: string;
	price?: number;
	sku?: string;
	stockQuantity: number;
	imageUrl?: string;
	attributes: Record<string, string> | { options?: VariationOption[] };
	// For nested options structure, we'll also store the parsed options
	parsedOptions?: {
		attributeName: string;
		options: VariationOption[];
	};
};

export default function ProductDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const productId = params.id;
	const { top, bottom } = useSafeAreaInsets();
	const headerPaddingTop = top + 6;
	const headerTotalHeight = headerPaddingTop + 56;
	// Add extra padding for bottom tab bar (typically ~60-80px) + safe area bottom + extra space
	const bottomPadding = bottom + 100;

	const { getProductById, products, loading: productsLoading } = useProducts();
	const product = productId ? getProductById(productId) : undefined;

	const [activeImage, setActiveImage] = useState(0);
	const [variations, setVariations] = useState<ProductVariation[]>([]);
	const [variationsLoading, setVariationsLoading] = useState(false);
	const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);

	// Image handling - collect ALL images from product and ALL variations
	const imageUris: string[] = useMemo(() => {
		if (!product) return [];
		
		let images: string[] = [];
		
		// Get product images from imageUrl (can be JSON string or single URL)
		if (product.imageUrl) {
			try {
				const parsed = JSON.parse(product.imageUrl);
				if (Array.isArray(parsed)) {
					images = parsed.filter(Boolean); // Show ALL images, no limit
				} else if (typeof parsed === 'string') {
					images = [parsed];
				} else {
					images = [product.imageUrl];
				}
			} catch {
				// Not JSON, treat as single image URL
				images = [product.imageUrl];
			}
		}
		
		// Collect images from ALL variations (not just selected one)
		variations.forEach(variation => {
			if (variation.imageUrl) {
				let variationImages: string[] = [];
				try {
					// Check if variation imageUrl is a JSON array
					const parsed = JSON.parse(variation.imageUrl);
					if (Array.isArray(parsed)) {
						variationImages = parsed.filter(Boolean);
					} else {
						variationImages = [variation.imageUrl];
					}
				} catch {
					// Single image URL
					variationImages = [variation.imageUrl];
				}
				images.push(...variationImages);
			}
		});
		
		// If a variation is selected and has images, prioritize them at the beginning
		if (selectedVariation?.imageUrl) {
			let selectedVariationImages: string[] = [];
			try {
				const parsed = JSON.parse(selectedVariation.imageUrl);
				if (Array.isArray(parsed)) {
					selectedVariationImages = parsed.filter(Boolean);
				} else {
					selectedVariationImages = [selectedVariation.imageUrl];
				}
			} catch {
				selectedVariationImages = [selectedVariation.imageUrl];
			}
			
			// Move selected variation images to the front
			const otherImages = images.filter(img => !selectedVariationImages.includes(img));
			images = [...selectedVariationImages, ...otherImages];
		}
		
		// Remove any duplicates and empty strings
		images = Array.from(new Set(images.filter(Boolean)));
		
		return images;
	}, [product, variations, selectedVariation]);

	// Calculate pricing (use variation price if selected, otherwise product price)
	const basePrice = useMemo(() => {
		// If a variation is selected and has a price, use that
		if (selectedVariation?.price !== undefined && selectedVariation.price !== null) {
			console.log('[Product] Using variation price:', selectedVariation.price);
			return selectedVariation.price;
		}
		// Otherwise use product price
		const productPrice = product?.price || 0;
		console.log('[Product] Using product price:', productPrice);
		return productPrice;
	}, [selectedVariation, product]);

	const discountedPrice = useMemo(() => {
		if (!product || basePrice === 0) return 0;
		
		// Apply product discount percentage to the base price
		if (product.discountPercentage > 0) {
			const discounted = basePrice * (1 - product.discountPercentage / 100);
			console.log('[Product] Price calculation:', {
				basePrice,
				discountPercentage: product.discountPercentage,
				discountedPrice: discounted,
				variationSelected: !!selectedVariation
			});
			return discounted;
		}
		
		return basePrice;
	}, [product, basePrice, selectedVariation]);

	const formattedPrice = useMemo(() => {
		return `$${discountedPrice.toFixed(2)}`;
	}, [discountedPrice]);

	const formattedOriginalPrice = useMemo(() => {
		if (!product || product.discountPercentage === 0) return null;
		
		// Show the original base price before discount (this is the price used for calculation)
		return `$${basePrice.toFixed(2)}`;
	}, [product, basePrice]);

	// Fetch product variations from separate table
	useEffect(() => {
		if (!productId) {
			setVariations([]);
			setVariationsLoading(false);
			return;
		}

		const fetchVariations = async () => {
			setVariationsLoading(true);
			try {
				// Check if Supabase is configured
				const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
				const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
				
				if (!supabaseUrl || !supabaseKey) {
					console.warn('[Product] Supabase not configured. Skipping variations fetch.');
					setVariations([]);
					setVariationsLoading(false);
					return;
				}

				console.log('[Product] Fetching variations for product_id:', productId);

				const { data, error } = await supabase
					.from('product_variations')
					.select('*')
					.eq('product_id', productId)
					.eq('is_active', true)
					.order('display_order', { ascending: true })
					.order('created_at', { ascending: true });

				console.log('[Product] Variations query result:', { 
					dataLength: data?.length || 0, 
					error: error ? { code: error.code, message: error.message } : null,
					rawData: data 
				});

				if (error) {
					// If table doesn't exist (PGRST205), just log and continue without variations
					if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('product_variations')) {
						console.log('[Product] ❌ Product variations table not found. Please run the migration: supabase-migrations-product-variations.sql');
						console.log('[Product] Error details:', { code: error.code, message: error.message });
						setVariations([]);
					} else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
						console.error('[Product] ❌ RLS Policy Error: You may not have permission to read product_variations. Check RLS policies.');
						console.error('[Product] Error details:', { code: error.code, message: error.message });
						setVariations([]);
					} else {
						console.error('[Product] ❌ Error fetching product variations:', error);
						setVariations([]);
					}
				} else {
					const mappedVariations: ProductVariation[] = (data || []).map((row: any) => {
						// Parse attributes - handle both flat structure and nested options structure
						let attributes: Record<string, string> | { options?: VariationOption[] } = {};
						let parsedOptions: { attributeName: string; options: VariationOption[] } | undefined = undefined;
						
						console.log('[Product] Raw row.attributes:', {
							value: row.attributes,
							type: typeof row.attributes,
							hasOptions: row.attributes && typeof row.attributes === 'object' && 'options' in row.attributes,
							isArray: Array.isArray(row.attributes),
						});
						
						if (row.attributes) {
							let parsed: any = null;
							
							if (typeof row.attributes === 'string') {
								try {
									parsed = JSON.parse(row.attributes);
									console.log('[Product] Parsed from string:', parsed);
								} catch (e) {
									console.warn('[Product] Failed to parse attributes as JSON:', row.attributes, e);
									attributes = {};
								}
							} else if (typeof row.attributes === 'object' && !Array.isArray(row.attributes)) {
								parsed = row.attributes;
								console.log('[Product] Using attributes as-is (already object):', parsed);
							}
							
							if (parsed) {
								console.log('[Product] Checking parsed structure:', {
									hasOptions: 'options' in parsed,
									optionsIsArray: parsed.options && Array.isArray(parsed.options),
									optionsLength: parsed.options ? parsed.options.length : 0,
									parsedType: typeof parsed,
									parsedKeys: Object.keys(parsed),
								});
								
								// Check if it's the nested options structure: { "options": [...] }
								// Handle both direct options array and nested structure
								const hasOptionsArray = parsed.options && Array.isArray(parsed.options) && parsed.options.length > 0;
								if (hasOptionsArray) {
									console.log('[Product] ✅ Found nested options structure with', parsed.options.length, 'options');
									attributes = parsed;
									
									// Extract attribute name from variation name (e.g., "Color: Red" -> "Color")
									// or use a default like "Option" or try to infer from context
									let attributeName = 'Option';
									if (row.name) {
										const nameParts = row.name.split(':');
										if (nameParts.length > 0 && nameParts[0].trim()) {
											attributeName = nameParts[0].trim();
										}
									}
									
									// If we still don't have a good name, try to infer from the first option's context
									// or use a generic name like "Color" if all options look like colors
									if (attributeName === 'Option' && parsed.options.length > 0) {
										// Could add logic here to detect common attribute types
										attributeName = 'Color'; // Default to Color for now
									}
									
									parsedOptions = {
										attributeName,
										options: parsed.options.map((opt: any) => ({
											value: opt.value || '',
											images: opt.images || [],
											priceModifier: opt.priceModifier,
											stockQuantity: opt.stockQuantity,
											sku: opt.sku,
										})),
									};
									
									console.log('[Product] ✅ Created parsedOptions:', {
										attributeName: parsedOptions.attributeName,
										optionsCount: parsedOptions.options.length,
										optionValues: parsedOptions.options.map(o => o.value),
									});
								} else if (typeof parsed === 'object' && !Array.isArray(parsed) && !parsed.options) {
									// Flat structure: { "Color": "Red", "Size": "Large" }
									console.log('[Product] Using flat structure');
									attributes = parsed;
								} else {
									console.warn('[Product] Parsed structure does not match expected formats:', parsed);
								}
							}
						} else {
							console.log('[Product] No attributes found in row');
						}
						
						console.log('[Product] Parsed attributes for variation:', {
							variationId: row.id,
							rawAttributes: row.attributes,
							parsedAttributes: attributes,
							parsedOptions,
							attributeKeys: parsedOptions ? [parsedOptions.attributeName] : Object.keys(attributes)
						});
						
						// Handle variation image - support both single URL and JSON array
						let imageUrl: string | undefined = undefined;
						if (row.image_url) {
							if (typeof row.image_url === 'string') {
								// Check if it's a JSON string
								try {
									const parsed = JSON.parse(row.image_url);
									if (Array.isArray(parsed) && parsed.length > 0) {
										// If it's an array, use the first image or stringify for the component to handle
										imageUrl = JSON.stringify(parsed);
									} else {
										imageUrl = row.image_url;
									}
								} catch {
									// Not JSON, treat as single URL
									imageUrl = row.image_url;
								}
							} else if (Array.isArray(row.image_url) && row.image_url.length > 0) {
								// If it's already an array (from JSONB), stringify it
								imageUrl = JSON.stringify(row.image_url);
							}
						}
						
						return {
							id: row.id,
							productId: row.product_id,
							name: row.name || undefined,
							price: row.price ? parseFloat(String(row.price)) : undefined,
							sku: row.sku || undefined,
							stockQuantity: row.stock_quantity || 0,
							imageUrl,
							attributes,
							parsedOptions,
						};
					});
					
					console.log('[Product] ✅ Successfully fetched variations:', mappedVariations.length);
					console.log('[Product] Mapped variations:', JSON.stringify(mappedVariations, null, 2));
					setVariations(mappedVariations);
					
					// Don't auto-select a variation - let user choose Default (base product) or a variation
					if (mappedVariations.length > 0) {
						console.log('[Product] Variations loaded. User can select Default (base product) or a variation.');
						// Start with Default selected (base product, no variation)
						setSelectedVariation(null);
						// Set Default for the first attribute if we have options
						if (mappedVariations[0].parsedOptions) {
							setSelected({ [mappedVariations[0].parsedOptions.attributeName]: 'Default' });
						} else {
							setSelected({});
						}
					} else {
						console.log('[Product] ⚠️ No variations found for this product');
						setSelectedVariation(null);
						setSelected({});
					}
				}
			} catch (err: any) {
				console.error('[Product] Unexpected error fetching variations:', err);
				// Handle network errors gracefully
				if (err?.message?.includes('Network request failed') || err?.message?.includes('fetch')) {
					console.warn('[Product] Network error. Check your internet connection and Supabase configuration.');
				}
				setVariations([]);
			} finally {
				setVariationsLoading(false);
			}
		};

		fetchVariations();
	}, [productId]);

	// Build options from variations
	const options: ProductOption[] = useMemo(() => {
		if (variations.length === 0) {
			console.log('[Product] ⚠️ No variations available - cannot build options');
			return [];
		}

		console.log('[Product] Building options from', variations.length, 'variations');
		console.log('[Product] Variations:', variations.map(v => ({ 
			id: v.id, 
			attributes: v.attributes,
			parsedOptions: v.parsedOptions 
		})));

		// Extract unique attribute names and their values from variations
		const attributeMap = new Map<string, Set<string>>();
		
		variations.forEach((variation, index) => {
			console.log(`[Product] Processing variation ${index + 1}:`, {
				id: variation.id,
				attributes: variation.attributes,
				parsedOptions: variation.parsedOptions,
			});
			
			// Handle nested options structure: { "options": [...] }
			if (variation.parsedOptions) {
				const { attributeName, options: opts } = variation.parsedOptions;
				if (!attributeMap.has(attributeName)) {
					attributeMap.set(attributeName, new Set());
				}
				opts.forEach(opt => {
					if (opt.value) {
						attributeMap.get(attributeName)!.add(opt.value);
						console.log(`[Product] Added option from nested structure: ${attributeName} = ${opt.value}`);
					}
				});
			} 
			// Check if attributes has nested options structure but parsedOptions wasn't set (fallback)
			else if (variation.attributes && typeof variation.attributes === 'object' && 'options' in variation.attributes && Array.isArray((variation.attributes as any).options)) {
				console.warn(`[Product] Variation ${index + 1} has nested options but parsedOptions is missing. Attempting to parse...`);
				const attrs = variation.attributes as { options?: any[] };
				if (attrs.options && attrs.options.length > 0) {
					// Try to extract attribute name
					let attributeName = 'Color'; // Default
					if (variation.name) {
						const nameParts = variation.name.split(':');
						if (nameParts.length > 0 && nameParts[0].trim()) {
							attributeName = nameParts[0].trim();
						}
					}
					
					if (!attributeMap.has(attributeName)) {
						attributeMap.set(attributeName, new Set());
					}
					attrs.options.forEach((opt: any) => {
						if (opt && opt.value) {
							attributeMap.get(attributeName)!.add(String(opt.value));
							console.log(`[Product] Added option from fallback parsing: ${attributeName} = ${opt.value}`);
						}
					});
				}
			}
			// Handle flat structure: { "Color": "Red", "Size": "Large" }
			else if (variation.attributes && typeof variation.attributes === 'object' && !('options' in variation.attributes)) {
				Object.entries(variation.attributes).forEach(([key, value]) => {
					if (key && value && key !== 'options') {
						if (!attributeMap.has(key)) {
							attributeMap.set(key, new Set());
						}
						attributeMap.get(key)!.add(String(value));
						console.log(`[Product] Added option from flat structure: ${key} = ${value}`);
					}
				});
			} else {
				console.warn(`[Product] Variation ${index + 1} has invalid attributes:`, variation.attributes);
			}
		});

		const opts = Array.from(attributeMap.entries()).map(([name, values]) => {
			// Add "Default" option at the beginning of each attribute's values to represent base product
			return {
				name,
				values: ['Default', ...Array.from(values)],
			};
		});
		
		console.log('[Product] ✅ Built options from variations (with Default option):', opts);
		console.log('[Product] Options count:', opts.length);
		return opts;
	}, [variations]);

	const [selected, setSelected] = useState<Record<string, string>>({});

	// Update selected variation when options change
	useEffect(() => {
		if (variations.length === 0) {
			setSelectedVariation(null);
			return;
		}

		// Check if "Default" is selected (base product, no variation)
		const isDefaultSelected = Object.values(selected).some(value => value === 'Default') || Object.keys(selected).length === 0;
		
		if (isDefaultSelected) {
			// Use base product (no variation selected)
			setSelectedVariation(null);
			setActiveImage(0);
			return;
		}

		// Find variation that matches all selected attributes
		const matchingVariation = variations.find(variation => {
			// Handle nested options structure
			if (variation.parsedOptions) {
				const { attributeName, options: opts } = variation.parsedOptions;
				// Check if the selected value matches any option in this variation
				return Object.entries(selected).every(([key, value]) => {
					if (key === attributeName) {
						return opts.some(opt => opt.value === value);
					}
					return false; // For nested structure, we only have one attribute per variation
				});
			}
			// Handle flat structure
			return Object.entries(selected).every(([key, value]) => {
				if (typeof variation.attributes === 'object' && !('options' in variation.attributes)) {
					return variation.attributes[key] === value;
				}
				return false;
			});
		});

		if (matchingVariation) {
			// For nested structure, find the selected option to get its price and images
			let finalVariation = matchingVariation;
			if (matchingVariation.parsedOptions) {
				const { attributeName, options: opts } = matchingVariation.parsedOptions;
				const selectedValue = selected[attributeName];
				const selectedOption = opts.find(opt => opt.value === selectedValue);
				
				if (selectedOption) {
					// Create a modified variation with the selected option's price and images
					const basePrice = product?.price || 0;
					const optionPrice = selectedOption.priceModifier !== undefined 
						? basePrice + selectedOption.priceModifier 
						: matchingVariation.price;
					
					// Use option images if available, otherwise use variation image
					const optionImages = selectedOption.images && selectedOption.images.length > 0
						? selectedOption.images
						: matchingVariation.imageUrl ? [matchingVariation.imageUrl] : undefined;
					
					finalVariation = {
						...matchingVariation,
						price: optionPrice,
						stockQuantity: selectedOption.stockQuantity ?? matchingVariation.stockQuantity,
						imageUrl: optionImages ? JSON.stringify(optionImages) : matchingVariation.imageUrl,
					};
				}
			}
			
			console.log('[Product] Variation changed:', {
				variationId: finalVariation.id,
				variationPrice: finalVariation.price,
				attributes: finalVariation.attributes,
				selectedAttributes: selected
			});
			setSelectedVariation(finalVariation);
			// Reset active image to 0 when variation changes to show variation image first
			setActiveImage(0);
		} else if (variations.length > 0 && Object.keys(selected).length === 0) {
			// If no selection yet, use base product (Default)
			console.log('[Product] No selection - using base product (Default)');
			setSelectedVariation(null);
			setActiveImage(0);
		}
	}, [selected, variations]);

	const { addItem } = useCart();
	const [showAdded, setShowAdded] = useState(false);

	// Stock status (use variation stock if selected, otherwise product stock)
	const currentStock = useMemo(() => {
		if (selectedVariation) {
			return selectedVariation.stockQuantity;
		}
		return product?.stockQuantity || 0;
	}, [selectedVariation, product]);

	const stockStatus = useMemo(() => {
		if (currentStock === 0) {
			return { text: 'Out of stock', color: '#BE123C', show: true };
		}
		if (currentStock <= 5) {
			return { text: `Only ${currentStock} left!`, color: '#BE123C', show: true };
		}
		if (currentStock <= 10) {
			return { text: `Selling fast! Only ${currentStock} left`, color: '#F59E0B', show: true };
		}
		return { text: '', color: '', show: false };
	}, [currentStock]);

	// Get related products from the same collections or with similar tags
	const relatedProducts = useMemo(() => {
		if (!product) return [];
		// Get products with similar tags or from same target audience
		return products
			.filter(p => p.id !== product.id && p.isActive)
			.filter(p => {
				// Match by tags, target audience, or occasion
				const hasCommonTag = product.tags.some(tag => p.tags.includes(tag));
				const hasCommonTarget = product.targetAudience?.some(aud => p.targetAudience?.includes(aud));
				const hasCommonOccasion = product.occasionTags?.some(occ => p.occasionTags?.includes(occ));
				return hasCommonTag || hasCommonTarget || hasCommonOccasion;
			})
			.slice(0, 6);
	}, [product, products]);

	if (productsLoading) {
		return (
			<View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color={BRAND_COLOR} />
				<Text style={{ marginTop: 12, color: '#6b7280' }}>Loading product...</Text>
			</View>
		);
	}

	if (!product) {
		return (
			<View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
				<IconSymbol name="exclamationmark.triangle" size={48} color="#9ca3af" />
				<Text style={{ marginTop: 16, fontSize: 18, fontWeight: '800', color: '#111827' }}>Product not found</Text>
				<Text style={{ marginTop: 8, color: '#6b7280', textAlign: 'center' }}>
					The product you're looking for doesn't exist or has been removed.
				</Text>
				<Pressable
					onPress={() => router.back()}
					style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: BRAND_COLOR, borderRadius: 12 }}
				>
					<Text style={{ color: 'white', fontWeight: '700' }}>Go Back</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={{ flex: 1, backgroundColor: 'white' }}>
			{/* Custom header */}
			<View style={[styles.header, { paddingTop: headerPaddingTop, height: headerTotalHeight }]}>
				<Pressable onPress={() => router.back()} style={styles.headerBtn}>
					<IconSymbol size={20} name="chevron.left" color="#111" />
				</Pressable>
				<View style={{ flexDirection: 'row', gap: 12 }}>
					<Pressable style={styles.headerBtn}><IconSymbol size={18} name="square.and.arrow.up" color="#111" /></Pressable>
					<Pressable style={styles.headerBtn}><IconSymbol size={18} name="heart" color="#111" /></Pressable>
				</View>
			</View>

			<ScrollView contentContainerStyle={{ paddingBottom: bottomPadding, backgroundColor: 'white' }} showsVerticalScrollIndicator={false}>
				{/* Images gallery */}
				<View>
					{imageUris.length > 0 ? (
						<View>
							<ScrollView
								horizontal
								pagingEnabled
								showsHorizontalScrollIndicator={false}
								scrollEventThrottle={16}
								decelerationRate="fast"
								snapToInterval={width}
								snapToAlignment="start"
								onScroll={(e) => {
									const x = e.nativeEvent.contentOffset.x;
									const newIndex = Math.round(x / width);
									if (newIndex !== activeImage) {
										setActiveImage(newIndex);
									}
								}}
								contentContainerStyle={{ width: width * imageUris.length }}
							>
								{imageUris.map((uri, idx) => (
									<Image 
										key={uri + idx} 
										source={{ uri }} 
										style={{ width, height: width }} 
										resizeMode="cover" 
									/>
								))}
							</ScrollView>
							{/* Dots */}
							{imageUris.length > 1 && (
								<View style={styles.dotsWrap}>
									{imageUris.map((_, i) => (
										<View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
									))}
								</View>
							)}
						</View>
					) : (
						<View style={{ width, height: width, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
							<IconSymbol name="photo" size={64} color="#d1d5db" />
						</View>
					)}
				</View>

				{/* Title & price */}
				<View style={{ padding: 16, gap: 12 }}>
					<Text style={styles.title}>{product.name}</Text>
					{/* Show variation name if a specific variation is selected and has a name */}
					{selectedVariation?.name && Object.keys(selected).length > 0 && (
						<Text style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>
							{selectedVariation.name}
						</Text>
					)}
					
					{/* Price and discount */}
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
						<Text style={styles.price}>{formattedPrice}</Text>
						{formattedOriginalPrice && (
							<Text style={styles.originalPrice}>{formattedOriginalPrice}</Text>
						)}
						{product.discountPercentage > 0 && (
							<View style={styles.discountBadge}>
								<Text style={styles.discountBadgeText}>{product.discountPercentage}% OFF</Text>
							</View>
						)}
						{product.tags.includes('bestseller') && (
							<Text style={styles.badge}>Bestseller</Text>
						)}
					</View>


					{/* Stock status */}
					{stockStatus.show && (
						<View style={[styles.notice, { backgroundColor: stockStatus.color === '#BE123C' ? '#FFF1F2' : '#FEF3C7' }]}>
							<Text style={[styles.noticeText, { color: stockStatus.color }]}>{stockStatus.text}</Text>
						</View>
					)}

					{/* Options (variable products) */}
					<View style={{ marginTop: 8 }}>
						<Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Options</Text>
						
						{variationsLoading && (
							<View style={{ paddingVertical: 12 }}>
								<ActivityIndicator size="small" color={BRAND_COLOR} />
								<Text style={{ marginTop: 8, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>Loading variations...</Text>
							</View>
						)}
						
						{!variationsLoading && variations.length > 0 && options.length === 0 && (
							<View style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#FEF3C7', borderRadius: 8 }}>
								<Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
									⚠️ Variations found ({variations.length}) but no attributes detected.
								</Text>
								<Text style={{ fontSize: 11, color: '#92400E', marginTop: 4 }}>
									Check that variations have attributes in JSONB format: {"{"}"Size": "Large", "Color": "Red"{"}"}
								</Text>
								<Text style={{ fontSize: 10, color: '#92400E', marginTop: 4, fontFamily: 'monospace' }}>
									Debug: {JSON.stringify(variations.map(v => ({ id: v.id, attrs: v.attributes })))}
								</Text>
							</View>
						)}
						
						{!variationsLoading && variations.length === 0 && (
							<View style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#E5E7EB', borderRadius: 8 }}>
								<Text style={{ fontSize: 12, color: '#374151', textAlign: 'center' }}>
									No variations available for this product
								</Text>
							</View>
						)}
						
						{!variationsLoading && options.length > 0 && (
						<View style={{ gap: 12, marginTop: 8 }}>
							{options.map((opt) => (
								<View key={opt.name} style={{ gap: 8 }}>
									<Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{opt.name}</Text>
									<ScrollView 
										horizontal 
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={{ paddingRight: 16 }}
										style={{ flexGrow: 0 }}
									>
										{opt.values.map((value) => {
											const isSelected = selected[opt.name] === value;
											
											// Handle "Default" option (base product, no variation)
											if (value === 'Default') {
												const isAvailable = (product?.stockQuantity ?? 0) > 0;
												const valuePrice = product?.price || null;
												const displayPrice = valuePrice !== null && product?.discountPercentage > 0
													? valuePrice * (1 - product.discountPercentage / 100)
													: valuePrice;
												
												return (
													<Pressable
														key={value}
														onPress={() => {
															setSelected((s) => ({ ...s, [opt.name]: value }));
														}}
														style={[
															styles.variationOption,
															isSelected && styles.variationOptionSelected,
															!isAvailable && styles.variationOptionDisabled,
														]}
														disabled={!isAvailable}
													>
														<View style={{ alignItems: 'center', gap: 2 }}>
															<Text
																style={[
																	styles.variationOptionText,
																	isSelected && styles.variationOptionTextSelected,
																	!isAvailable && styles.variationOptionTextDisabled,
																]}
															>
																{value}
															</Text>
															{displayPrice !== null && (
																<Text
																	style={[
																		{
																			fontSize: 11,
																			fontWeight: '600',
																			color: isSelected ? BRAND_COLOR : '#6b7280',
																		},
																		!isAvailable && { color: '#d1d5db' },
																	]}
																>
																	${displayPrice.toFixed(2)}
																</Text>
															)}
														</View>
													</Pressable>
												);
											}
											
											// Handle variation options
											// Find the matching option within variations
											let matchingOption: VariationOption | null = null;
											let isAvailable = false;
											
											// Handle nested options structure
											for (const v of variations) {
												if (v.parsedOptions && v.parsedOptions.attributeName === opt.name) {
													const option = v.parsedOptions.options.find(opt => opt.value === value);
													if (option) {
														matchingOption = option;
														isAvailable = (option.stockQuantity ?? 0) > 0;
														break; // Found the matching option
													}
												}
											}
											
											// Handle flat structure (fallback)
											if (!matchingOption) {
												const matchingVariations = variations.filter(v => {
													if (typeof v.attributes === 'object' && !('options' in v.attributes)) {
														if (v.attributes[opt.name] !== value) return false;
														
														// Check if it matches other selected attributes
														const otherSelections = Object.entries(selected).filter(([k]) => k !== opt.name);
														if (otherSelections.length > 0) {
															const matchesOtherSelections = otherSelections.every(([k, selectedValue]) => 
																v.attributes[k] === selectedValue
															);
															if (!matchesOtherSelections) return false;
														}
														
														return true;
													}
													return false;
												});
												
												isAvailable = matchingVariations.some(v => v.stockQuantity > 0);
											}
											
											// Get price for this value
											// For nested structure: use priceModifier + base product price
											// For flat structure: use variation price or product price
											let valuePrice: number | null = null;
											if (matchingOption && matchingOption.priceModifier !== undefined) {
												// priceModifier is added to base product price
												valuePrice = (product?.price || 0) + matchingOption.priceModifier;
											} else if (!matchingOption) {
												// Fallback to flat structure logic
												const matchingVariations = variations.filter(v => {
													if (typeof v.attributes === 'object' && !('options' in v.attributes)) {
														return v.attributes[opt.name] === value;
													}
													return false;
												});
												if (matchingVariations.length > 0 && matchingVariations[0].price !== undefined && matchingVariations[0].price !== null) {
													valuePrice = matchingVariations[0].price;
												}
											}
											
											// Calculate displayed price (with discount if applicable)
											const displayPrice = valuePrice !== null
												? product.discountPercentage > 0
													? valuePrice * (1 - product.discountPercentage / 100)
													: valuePrice
												: null;
											
											return (
												<Pressable
													key={value}
													onPress={() => {
														if (isAvailable) {
															setSelected((s) => ({ ...s, [opt.name]: value }));
														}
													}}
													style={[
														styles.variationOption,
														isSelected && styles.variationOptionSelected,
														!isAvailable && styles.variationOptionDisabled,
													]}
													disabled={!isAvailable}
												>
													<View style={{ alignItems: 'center', gap: 2 }}>
														<Text
															style={[
																styles.variationOptionText,
																isSelected && styles.variationOptionTextSelected,
																!isAvailable && styles.variationOptionTextDisabled,
															]}
														>
															{value}
														</Text>
														{displayPrice !== null && (
															<Text
																style={[
																	{
																		fontSize: 11,
																		fontWeight: '600',
																		color: isSelected ? BRAND_COLOR : '#6b7280',
																	},
																	!isAvailable && { color: '#d1d5db' },
																]}
															>
																${displayPrice.toFixed(2)}
															</Text>
														)}
													</View>
												</Pressable>
											);
										})}
									</ScrollView>
								</View>
							))}
						</View>
						)}
					</View>

					{/* Quick purchase row */}
					<View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
						<BrandButton
							title={currentStock === 0 ? "Out of stock" : "Add to cart"}
							style={{ flex: 1 }}
							disabled={currentStock === 0}
							onPress={() => {
								if (currentStock > 0) {
									const itemName = selectedVariation 
										? `${product.name}${Object.keys(selected).length > 0 ? ` (${Object.values(selected).join(', ')})` : ''}`
										: product.name;
									
									addItem({
										id: selectedVariation?.id || product.id,
										name: itemName,
										price: formattedPrice,
										image: imageUris[0],
										selectedOptions: selected,
										vendorId: product.vendorId,
									});
									setShowAdded(true);
								}
							}}
						/>
						<Pressable
							style={[styles.appleBtn, { backgroundColor: currentStock === 0 ? '#9ca3af' : BRAND_COLOR }]}
							disabled={currentStock === 0}
							onPress={() => {
								if (currentStock > 0) {
									// Add to cart first, then navigate directly to checkout
									const itemName = selectedVariation 
										? `${product.name}${Object.keys(selected).length > 0 ? ` (${Object.values(selected).join(', ')})` : ''}`
										: product.name;
									
									addItem({
										id: selectedVariation?.id || product.id,
										name: itemName,
										price: formattedPrice,
										image: imageUris[0],
										selectedOptions: selected,
										vendorId: product.vendorId,
									});
									
									// Navigate directly to checkout (first step: cart)
									router.push('/(buyer)/checkout/cart');
								}
							}}
						>
							<Text style={styles.appleBtnText}>Buy now</Text>
						</Pressable>
					</View>
				</View>

				{/* Tags and SEO info */}
				{(product.tags.length > 0 || product.occasionTags?.length || product.targetAudience?.length) && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Product tags</Text>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
							{product.tags.map((tag, idx) => (
								<View key={idx} style={styles.tag}>
									<Text style={styles.tagText}>{tag}</Text>
								</View>
							))}
							{product.occasionTags?.map((tag, idx) => (
								<View key={`occasion-${idx}`} style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
									<Text style={[styles.tagText, { color: '#92400E' }]}>{tag}</Text>
								</View>
							))}
							{product.targetAudience?.map((aud, idx) => (
								<View key={`audience-${idx}`} style={[styles.tag, { backgroundColor: '#DBEAFE' }]}>
									<Text style={[styles.tagText, { color: '#1E40AF' }]}>{aud}</Text>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Description */}
				{product.description && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Item details</Text>
						<Text style={styles.sectionText}>{product.description}</Text>
					</View>
				)}

				{/* Meta description (SEO) */}
				{product.metaDescription && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>About this product</Text>
						<Text style={styles.sectionText}>{product.metaDescription}</Text>
					</View>
				)}

				{/* Related products */}
				{relatedProducts.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>You might also like</Text>
						<View style={{ paddingHorizontal: 16, marginTop: 12 }}>
							<RelatedProductsGrid products={relatedProducts} />
						</View>
					</View>
				)}
			</ScrollView>
			<AddedToCartDialog
				visible={showAdded}
				onClose={() => setShowAdded(false)}
				onViewCart={() => { setShowAdded(false); router.push('/(buyer)/(tabs)/cart'); }}
				title="Added to cart"
				imageUri={imageUris[0]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
	title: { fontSize: 22, fontWeight: '800', color: '#111827' },
	price: { fontSize: 24, color: '#16a34a', fontWeight: '900' },
	originalPrice: { fontSize: 18, color: '#9ca3af', textDecorationLine: 'line-through', fontWeight: '600' },
	discountBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#FEE2E2' },
	discountBadgeText: { color: '#BE123C', fontWeight: '800', fontSize: 12 },
	badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '700', overflow: 'hidden', fontSize: 12 },
	sku: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
	optionRow: { marginTop: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	notice: { marginTop: 10, backgroundColor: '#FFF1F2', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
	noticeText: { color: '#BE123C', fontWeight: '700' },
	section: { paddingHorizontal: 16, paddingVertical: 12, gap: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
	sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
	sectionText: { color: '#6b7280', lineHeight: 22, fontSize: 15 },
	tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#f3f4f6' },
	tagText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
	sellerCard: { marginHorizontal: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 12 },
	outlineBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
	outlineBtnText: { fontWeight: '700' },
	appleBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
	appleBtnText: { color: 'white', fontWeight: '800' },
	linkBtn: { marginTop: 8 },
	linkText: { color: BRAND, fontWeight: '700' },
	dotsWrap: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 },
	dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
	dotActive: { backgroundColor: '#111827' },
	variationOption: { 
		paddingVertical: 12, 
		paddingHorizontal: 16, 
		borderRadius: 8, 
		borderWidth: 2, 
		borderColor: '#e5e7eb', 
		backgroundColor: 'white',
		minWidth: 80,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	variationOptionSelected: { borderColor: BRAND_COLOR, backgroundColor: '#FFF0E8' },
	variationOptionDisabled: { opacity: 0.5, borderColor: '#d1d5db' },
	variationOptionText: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'center' },
	variationOptionTextSelected: { color: BRAND_COLOR, fontWeight: '700' },
	variationOptionTextDisabled: { color: '#9ca3af' },
});

function OptionSelector({ name, values, value, onChange }: { name: string; values: string[]; value?: string; onChange: (v: string) => void }) {
	const [visible, setVisible] = useState(false);
	return (
		<View>
			<View style={styles.optionRow}>
				<Text style={{ color: '#6b7280', fontWeight: '600' }}>{name}</Text>
				<Pressable style={styles.optionBtn} onPress={() => setVisible(true)}>
					<Text style={{ fontWeight: '700' }}>{value || 'Select an option'}</Text>
					<IconSymbol size={16} name="chevron.down" color="#111" />
				</Pressable>
			</View>

			<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
				<Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setVisible(false)} />
				<View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 8 }}>
					<Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 4 }}>{name}</Text>
					{values.map((v) => (
						<Pressable key={v} onPress={() => { onChange(v); setVisible(false); }} style={{ paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12 }}>
							<Text style={{ fontWeight: '700' }}>{v}</Text>
						</Pressable>
					))}
					<Pressable onPress={() => setVisible(false)} style={{ paddingVertical: 12, alignItems: 'center' }}>
						<Text style={{ color: BRAND, fontWeight: '800' }}>Close</Text>
					</Pressable>
				</View>
			</Modal>
		</View>
	);
}

function RelatedProductsGrid({ products }: { products: any[] }) {
	const gap = 12;
	const cardWidth = (width - 32 - gap) / 2; // 32 for padding, gap for spacing
	const router = useRouter();

	return (
		<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
			{products.map((product) => {
				const discountedPrice = product.discountPercentage > 0
					? product.price * (1 - product.discountPercentage / 100)
					: product.price;
				const imageUrl = product.imageUrl ? (() => {
					try {
						const parsed = JSON.parse(product.imageUrl);
						return Array.isArray(parsed) ? parsed[0] : product.imageUrl;
					} catch {
						return product.imageUrl;
					}
				})() : undefined;
				
				return (
					<View key={product.id} style={{ width: cardWidth }}>
						<Pressable
							onPress={() => router.push({ pathname: '/(buyer)/(tabs)/product/[id]', params: { id: product.id } })}
							style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' }}
						>
							<View>
								{imageUrl ? (
									<Image
										source={{ uri: imageUrl }}
										style={{ width: '100%', height: cardWidth }}
										resizeMode="cover"
									/>
								) : (
									<View style={{ width: '100%', height: cardWidth, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
										<IconSymbol name="photo" size={32} color="#d1d5db" />
									</View>
								)}
								{product.discountPercentage > 0 && (
									<View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#BE123C', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }}>
										<Text style={{ color: 'white', fontWeight: '800', fontSize: 11 }}>{product.discountPercentage}% OFF</Text>
									</View>
								)}
							</View>
							<View style={{ padding: 10, gap: 4 }}>
								<Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
									{product.name}
								</Text>
								<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
									<Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 14 }}>${discountedPrice.toFixed(2)}</Text>
									{product.discountPercentage > 0 && (
										<Text style={{ color: '#9ba1a6', textDecorationLine: 'line-through', fontSize: 12 }}>
											${product.price.toFixed(2)}
										</Text>
									)}
								</View>
							</View>
						</Pressable>
					</View>
				);
			})}
		</View>
	);
}

