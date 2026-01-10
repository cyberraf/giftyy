import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type Product = {
	id: string;
	name: string;
	description?: string;
	price: number; // Display price (lowest price for variable products)
	originalPrice?: number; // Original base price (for calculations with variations)
	discountPercentage: number;
	imageUrl?: string;
	sku?: string;
	stockQuantity: number;
	isActive: boolean;
	tags: string[];
	vendorId?: string; // Vendor who owns this product
	// Category and subcategory fields
	categoryIds?: string[]; // Categories this product belongs to
	subcategories?: string[]; // Subcategory names this product belongs to
	// SEO fields for AI training and better gift discovery
	seoKeywords?: string[]; // Keywords for search optimization
	metaDescription?: string; // SEO meta description
	targetAudience?: string[]; // e.g., ["for-her", "for-him", "for-kids", "for-teens"]
	occasionTags?: string[]; // e.g., ["birthday", "valentine", "christmas", "wedding"]
	giftStyleTags?: string[]; // e.g., ["thoughtful", "luxury", "practical", "fun", "romantic"]
	ageGroupTags?: string[]; // e.g., ["child", "teen", "young-adult", "adult", "senior"]
	interestTags?: string[]; // e.g., ["sports", "music", "reading", "cooking", "gaming"]
	relationshipTags?: string[]; // e.g., ["family", "friend", "romantic", "colleague", "extended-family"]
	priceRange?: string; // e.g., "budget", "mid-range", "luxury"
	culturalTags?: string[]; // e.g., ["western", "asian", "middle-eastern", "latin-american"]
	lifestyleTags?: string[]; // e.g., ["urban", "rural", "active", "homebody", "social"]
	createdAt: string;
	updatedAt: string;
};

export type CollectionCategory = 'celebrations' | 'family' | 'life-events' | 'seasonal-faith' | 'interests';

export type Collection = {
	id: string;
	title: string;
	description?: string;
	color: string;
	category: CollectionCategory;
	isActive: boolean;
	displayOrder: number;
	products: Product[];
	createdAt: string;
	updatedAt: string;
};

type ProductsContextValue = {
	products: Product[];
	collections: Collection[];
	loading: boolean;
	refreshProducts: () => Promise<void>;
	refreshCollections: () => Promise<void>;
	getProductById: (id: string) => Product | undefined;
	getCollectionById: (id: string) => Collection | undefined;
	getProductsByCollection: (collectionId: string) => Product[];
};

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

// Helper function to convert database row (snake_case) to Product (camelCase)
function dbRowToProduct(row: any): Product {
	// Handle images - support both image_url (string/JSON) and images (JSONB array)
	let imageUrl: string | undefined = undefined;
	if (row.images && Array.isArray(row.images) && row.images.length > 0) {
		// If images is a JSONB array, convert to JSON string for backward compatibility
		imageUrl = JSON.stringify(row.images);
	} else if (row.image_url) {
		imageUrl = row.image_url;
	}

	return {
		id: row.id,
		name: row.name,
		description: row.description || undefined,
		price: parseFloat(row.price || '0'),
		discountPercentage: row.discount_percentage || 0,
		imageUrl,
		sku: row.sku || undefined,
		stockQuantity: row.stock_quantity || 0,
		isActive: row.is_active !== false,
		tags: row.tags || [],
		vendorId: row.vendor_id || undefined,
		// Category and subcategory fields are populated from product_category_assignments table
		// SEO fields
		seoKeywords: row.seo_keywords || undefined,
		metaDescription: row.meta_description || undefined,
		targetAudience: row.target_audience || undefined,
		occasionTags: row.occasion_tags || undefined,
		giftStyleTags: row.gift_style_tags || undefined,
		ageGroupTags: row.age_group_tags || undefined,
		interestTags: row.interest_tags || undefined,
		relationshipTags: row.relationship_tags || undefined,
		priceRange: row.price_range || undefined,
		culturalTags: row.cultural_tags || undefined,
		lifestyleTags: row.lifestyle_tags || undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

// Helper function to convert database row (snake_case) to Collection (camelCase)
function dbRowToCollection(row: any, products: Product[] = []): Collection {
	return {
		id: row.id,
		title: row.title,
		description: row.description || undefined,
		color: row.color,
		category: row.category as CollectionCategory,
		isActive: row.is_active !== false,
		displayOrder: row.display_order || 0,
		products,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
	const [products, setProducts] = useState<Product[]>([]);
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);

	// Fetch products from Supabase
	const refreshProducts = useCallback(async () => {
		try {
			// Check if Supabase is configured
			if (!isSupabaseConfigured()) {
				console.warn('[ProductsContext] Supabase not configured. Skipping product fetch.');
				setProducts([]);
				setLoading(false);
				return;
			}

			const { data, error } = await supabase
				.from('products')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) {
				// Check if it's a network error before logging
				const isNetworkError = error?.message?.includes('Network request failed') ||
				                      error?.message?.includes('fetch') ||
				                      error?.code === 'ECONNABORTED' ||
				                      error?.code === 'ENOTFOUND';
				
				if (!isNetworkError) {
					console.error('[ProductsContext] Error fetching products:', error);
				} else {
					console.warn('[ProductsContext] Network error fetching products (may be offline)');
				}
				setProducts([]);
				return;
			}

			// Fetch category assignments for all products
			const productIds = (data || []).map(p => p.id);
			let categoryAssignments: { product_id: string; category_id: string; subcategory?: string }[] = [];

			if (productIds.length > 0) {
				// Get product-category assignments
				const { data: assignmentsData, error: assignmentsError } = await supabase
					.from('product_category_assignments')
					.select('product_id, category_id, subcategory')
					.in('product_id', productIds);

				if (!assignmentsError && assignmentsData) {
					categoryAssignments = assignmentsData;
				}
			}

			// Group assignments by product
			const categoriesByProduct = new Map<string, Set<string>>();
			const subcategoriesByProduct = new Map<string, Set<string>>();

			categoryAssignments.forEach(assignment => {
				if (!categoriesByProduct.has(assignment.product_id)) {
					categoriesByProduct.set(assignment.product_id, new Set());
					subcategoriesByProduct.set(assignment.product_id, new Set());
				}
				categoriesByProduct.get(assignment.product_id)!.add(assignment.category_id);
				
				// Track subcategories if specified
				if (assignment.subcategory) {
					subcategoriesByProduct.get(assignment.product_id)!.add(assignment.subcategory);
				}
			});

			// Fetch variations for all products to calculate lowest prices
			const { data: variationsData, error: variationsError } = await supabase
				.from('product_variations')
				.select('*')
				.in('product_id', productIds);
			
			// Filter by is_active if the column exists
			let activeVariations = variationsData || [];
			if (variationsData && variationsData.length > 0 && variationsData[0].hasOwnProperty('is_active')) {
				activeVariations = variationsData.filter((v: any) => v.is_active !== false);
			}
			
			if (variationsError) {
				console.warn('[ProductsContext] Error fetching variations:', variationsError);
			} else {
				console.log(`[ProductsContext] Fetched ${activeVariations.length} variations for ${productIds.length} products`);
			}

			// Group variations by product ID
			const variationsByProduct = new Map<string, any[]>();
			activeVariations.forEach((variation: any) => {
				const productId = variation.product_id;
				if (!variationsByProduct.has(productId)) {
					variationsByProduct.set(productId, []);
				}
				variationsByProduct.get(productId)!.push(variation);
			});

			// Map products with their category IDs, subcategories, and lowest prices
			const fetchedProducts = (data || []).map(row => {
				const product = dbRowToProduct(row);
				const categoryIds = Array.from(categoriesByProduct.get(product.id) || []);
				const subcategories = Array.from(subcategoriesByProduct.get(product.id) || []);
				
				// Calculate lowest price from variations if available
				const productVariations = variationsByProduct.get(product.id) || [];
				const originalBasePrice = product.price; // Store original price
				let displayPrice = product.price;
				let lowestOriginalPrice = product.price; // Track lowest original price (before discount)
				
				if (productVariations.length > 0) {
					const basePrice = originalBasePrice;
					// When combinations exist, we use the lowest combination price, not basePrice
					// Initialize with Infinity so we only use combination prices
					let lowestPrice = Infinity;
					let lowestOriginal = Infinity; // Track lowest price before discount
					let hasCombinations = false; // Track if we found any combinations

					console.log(`[ProductsContext] Calculating lowest price for product ${product.id} (${product.name}):`, {
						basePrice,
						variationsCount: productVariations.length,
						variations: productVariations.map(v => ({
							id: v.id,
							price: v.price,
							price_modifier: v.price_modifier,
							attributes: typeof v.attributes === 'string' ? 'JSON string' : (v.attributes ? 'object' : 'empty'),
						})),
					});

					// Check each variation
					for (const variation of productVariations) {
						// Parse attributes if it's a JSON string
						let attrs = variation.attributes || {};
						if (typeof attrs === 'string') {
							try {
								attrs = JSON.parse(attrs);
							} catch {
								console.warn('[ProductsContext] Failed to parse variation attributes:', variation.attributes);
								attrs = {};
							}
						}
						
						// Debug logging for specific products
						if (product.name?.toLowerCase().includes('halloween') || product.name?.toLowerCase().includes('pink flower') || product.name?.toLowerCase().includes('candle')) {
							console.log(`[ProductsContext] 🔍 Processing variation ${variation.id}:`, {
								variationPrice: variation.price,
								priceModifier: variation.price_modifier,
								attributesType: typeof attrs,
								attributesKeys: attrs && typeof attrs === 'object' ? Object.keys(attrs) : [],
								attributes: JSON.stringify(attrs).substring(0, 500), // First 500 chars
								hasFormat: attrs && typeof attrs === 'object' && 'format' in attrs,
								format: attrs && typeof attrs === 'object' && attrs.format,
								hasCombinations: attrs && typeof attrs === 'object' && 'combinations' in attrs,
								hasOptions: attrs && typeof attrs === 'object' && 'options' in attrs,
							});
						}
						
						// Check if this is a combination format
						if (typeof attrs === 'object' && !Array.isArray(attrs) && attrs.format === 'combination') {
							const combinations = attrs.combinations || [];
							hasCombinations = true; // Mark that we have combinations
							
							if (product.name?.toLowerCase().includes('halloween') || product.name?.toLowerCase().includes('pink flower') || product.name?.toLowerCase().includes('candle')) {
								console.log(`[ProductsContext] 🔍 Found combination format with ${combinations.length} combinations`);
							}
							
							// Check each combination
							for (const combo of combinations) {
								// Calculate price for this combination
								const priceModifier = combo.priceModifier ?? combo.price_modifier ?? 0;
								const comboPrice = basePrice + parseFloat(String(priceModifier));
								
								// Track original price (before discount)
								if (comboPrice < lowestOriginal) {
									lowestOriginal = comboPrice;
								}
								
								// Apply discount if available
								const discount = combo.discountPercentage ?? combo.discount_percentage ?? 0;
								const finalPrice = discount > 0 
									? comboPrice * (1 - discount / 100)
									: comboPrice;
								
								if (product.name?.toLowerCase().includes('halloween') || product.name?.toLowerCase().includes('pink flower') || product.name?.toLowerCase().includes('candle')) {
									console.log(`[ProductsContext] 🔍 Combination price:`, {
										comboPrice,
										priceModifier,
										discount,
										finalPrice,
										lowestPrice,
									});
								}
								
								// Check stock availability - show lowest price even if out of stock
								// (we'll show stock status separately in the UI)
								const stock = combo.stockQuantity ?? combo.stock_quantity ?? 0;
								// Update lowest price if this is lower (or if lowestPrice is Infinity)
								if (finalPrice < lowestPrice || lowestPrice === Infinity) {
									lowestPrice = finalPrice;
								}
								// Update lowest original price if this is lower (or if lowestOriginal is Infinity)
								if (comboPrice < lowestOriginal || lowestOriginal === Infinity) {
									lowestOriginal = comboPrice;
								}
							}
						} else {
							// Standard format - check variation price
							// First check if variation has a direct price
							if (variation.price !== null && variation.price !== undefined) {
								const variationPrice = parseFloat(String(variation.price));
								if (variationPrice < lowestPrice || lowestPrice === Infinity) {
									lowestPrice = variationPrice;
								}
								if (variationPrice < lowestOriginal || lowestOriginal === Infinity) {
									lowestOriginal = variationPrice;
								}
							} else if (variation.price_modifier !== null && variation.price_modifier !== undefined) {
								// Check if variation has a price modifier
								const priceModifier = parseFloat(String(variation.price_modifier));
								const variationPrice = basePrice + priceModifier;
								if (variationPrice < lowestPrice || lowestPrice === Infinity) {
									lowestPrice = variationPrice;
								}
								if (variationPrice < lowestOriginal || lowestOriginal === Infinity) {
									lowestOriginal = variationPrice;
								}
							} else {
								// Check if there's a price modifier in the attributes options
								if (typeof attrs === 'object' && 'options' in attrs && Array.isArray(attrs.options)) {
									for (const option of attrs.options) {
										if (option.priceModifier !== null && option.priceModifier !== undefined) {
											const optionPrice = basePrice + parseFloat(String(option.priceModifier));
											if (optionPrice < lowestPrice || lowestPrice === Infinity) {
												lowestPrice = optionPrice;
											}
											if (optionPrice < lowestOriginal || lowestOriginal === Infinity) {
												lowestOriginal = optionPrice;
											}
										} else if (option.price !== null && option.price !== undefined) {
											const optionPrice = parseFloat(String(option.price));
											if (optionPrice < lowestPrice || lowestPrice === Infinity) {
												lowestPrice = optionPrice;
											}
											if (optionPrice < lowestOriginal || lowestOriginal === Infinity) {
												lowestOriginal = optionPrice;
											}
										}
									}
								}
							}
						}
					}

					// Update display price to lowest price found
					// If we have combinations, use only combination prices (ignore basePrice)
					// If no combinations, compare with basePrice and variation prices
					if (hasCombinations) {
						// When combinations exist, use only the lowest combination price
						if (lowestPrice === Infinity) {
							// No valid combination prices found, fallback to basePrice
							displayPrice = basePrice;
							lowestOriginalPrice = basePrice;
						} else {
							displayPrice = lowestPrice;
							lowestOriginalPrice = lowestOriginal === Infinity ? lowestPrice : lowestOriginal;
						}
					} else {
						// No combinations, compare with basePrice to ensure we have the absolute minimum
						if (basePrice > 0 && basePrice < lowestPrice) {
							lowestPrice = basePrice;
						}
						if (basePrice > 0 && basePrice < lowestOriginal) {
							lowestOriginal = basePrice;
						}
						
						// If lowestPrice is still Infinity, use basePrice as fallback
						if (lowestPrice === Infinity) {
							displayPrice = basePrice;
							lowestOriginalPrice = basePrice;
						} else {
							displayPrice = lowestPrice;
							lowestOriginalPrice = lowestOriginal === Infinity ? basePrice : lowestOriginal;
						}
					}
					
					// Log for debugging specific products
					if (product.name?.toLowerCase().includes('halloween') || product.name?.toLowerCase().includes('pink flower') || product.name?.toLowerCase().includes('candle')) {
						console.log(`[ProductsContext] ⚠️ Price calculation result for product ${product.id} (${product.name}):`, {
							originalPrice: originalBasePrice,
							lowestOriginalPrice,
							lowestPrice,
							displayPrice,
							hasVariations: true,
							hasCombinations,
							variationsProcessed: productVariations.length,
						});
					}
				} else {
					console.log(`[ProductsContext] No variations for product ${product.id}, using base price:`, product.price);
				}
				
				return {
					...product,
					price: displayPrice, // Use lowest price for variable products (after discount if applicable)
					originalPrice: productVariations.length > 0 ? lowestOriginalPrice : undefined, // Store lowest original price (before discount) for variable products
					categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
					subcategories: subcategories.length > 0 ? subcategories : undefined,
				};
			});
			
			setProducts(fetchedProducts);
		} catch (err: any) {
			// Suppress repeated network error logs
			const isNetworkError = err?.message?.includes('Network request failed') || 
			                      err?.message?.includes('fetch') ||
			                      err?.name === 'TypeError';
			
			if (!isNetworkError) {
				console.error('[ProductsContext] Unexpected error fetching products:', err);
			}
			setProducts([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch collections with their products from Supabase
	const refreshCollections = useCallback(async () => {
		try {
			// Check if Supabase is configured
			if (!isSupabaseConfigured()) {
				console.warn('[ProductsContext] Supabase not configured. Skipping collections fetch.');
				setCollections([]);
				setLoading(false);
				return;
			}

			// Fetch bundles (previously collections)
			const { data: collectionsData, error: collectionsError } = await supabase
				.from('bundles')
				.select('*')
				.order('display_order', { ascending: true })
				.order('created_at', { ascending: false });

			if (collectionsError) {
				// Check if it's a network error before logging
				const isNetworkError = collectionsError?.message?.includes('Network request failed') ||
				                      collectionsError?.message?.includes('fetch') ||
				                      collectionsError?.code === 'ECONNABORTED' ||
				                      collectionsError?.code === 'ENOTFOUND';
				
				if (!isNetworkError) {
					console.error('[ProductsContext] Error fetching collections:', collectionsError);
				} else {
					console.warn('[ProductsContext] Network error fetching collections (may be offline)');
				}
				setCollections([]);
				return;
			}

			if (!collectionsData || collectionsData.length === 0) {
				setCollections([]);
				return;
			}

			// Fetch bundle-product relationships
			const collectionIds = collectionsData.map((c) => c.id);
			const { data: collectionProductsData, error: cpError } = await supabase
				.from('bundle_products')
				.select('*')
				.in('bundle_id', collectionIds)
				.order('display_order', { ascending: true });

			if (cpError) {
				// Check if it's a network error before logging
				const isNetworkError = cpError?.message?.includes('Network request failed') ||
				                      cpError?.message?.includes('fetch') ||
				                      cpError?.code === 'ECONNABORTED' ||
				                      cpError?.code === 'ENOTFOUND';
				
				if (!isNetworkError) {
					console.error('[ProductsContext] Error fetching collection products:', cpError);
				} else {
					console.warn('[ProductsContext] Network error fetching collection products (may be offline)');
				}
				// Continue with empty collections if this fails
				setCollections([]);
				return;
			}

			// Get all product IDs from collections
			const productIds = new Set<string>();
			(collectionProductsData || []).forEach((cp) => {
				productIds.add(cp.product_id);
			});

			// Fetch products that are in collections
			let collectionProducts: Product[] = [];
			if (productIds.size > 0) {
				const { data: productsData, error: productsError } = await supabase
					.from('products')
					.select('*')
					.in('id', Array.from(productIds));

				if (productsError) {
					// Check if it's a network error before logging
					const isNetworkError = productsError?.message?.includes('Network request failed') ||
					                      productsError?.message?.includes('fetch') ||
					                      productsError?.code === 'ECONNABORTED' ||
					                      productsError?.code === 'ENOTFOUND';
					
					if (!isNetworkError) {
						console.error('[ProductsContext] Error fetching collection products:', productsError);
					} else {
						console.warn('[ProductsContext] Network error fetching collection products (may be offline)');
					}
					collectionProducts = [];
				} else {
					collectionProducts = (productsData || []).map(dbRowToProduct);
				}
			}

			// Group products by bundle
			const productsByCollectionId = new Map<string, Product[]>();
			(collectionProductsData || []).forEach((cp) => {
				const product = collectionProducts.find((p) => p.id === cp.product_id);
				if (product) {
					const bundleId = cp.bundle_id || cp.collection_id; // Support both for migration period
					if (!productsByCollectionId.has(bundleId)) {
						productsByCollectionId.set(bundleId, []);
					}
					productsByCollectionId.get(bundleId)!.push(product);
				}
			});

			// Combine collections with their products
			const fetchedCollections = collectionsData.map((collection) =>
				dbRowToCollection(collection, productsByCollectionId.get(collection.id) || [])
			);

			setCollections(fetchedCollections);
		} catch (err: any) {
			// Suppress repeated network error logs
			const isNetworkError = err?.message?.includes('Network request failed') || 
			                      err?.message?.includes('fetch') ||
			                      err?.name === 'TypeError' ||
			                      err?.code === 'ECONNABORTED' ||
			                      err?.code === 'ENOTFOUND';
			
			if (!isNetworkError) {
				console.error('[ProductsContext] Unexpected error fetching collections:', err);
			} else {
				console.warn('[ProductsContext] Network error fetching collections (may be offline)');
			}
			setCollections([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// Initial load
	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			await Promise.all([refreshProducts(), refreshCollections()]);
			setLoading(false);
		};
		loadData();
	}, [refreshProducts, refreshCollections]);

	const getProductById = useCallback(
		(id: string): Product | undefined => {
			return products.find((p) => p.id === id);
		},
		[products]
	);

	const getCollectionById = useCallback(
		(id: string): Collection | undefined => {
			return collections.find((c) => c.id === id);
		},
		[collections]
	);

	const getProductsByCollection = useCallback(
		(collectionId: string): Product[] => {
			const collection = collections.find((c) => c.id === collectionId);
			return collection?.products || [];
		},
		[collections]
	);

	const value = useMemo(
		() => ({
			products,
			collections,
			loading,
			refreshProducts,
			refreshCollections,
			getProductById,
			getCollectionById,
			getProductsByCollection,
		}),
		[products, collections, loading, refreshProducts, refreshCollections, getProductById, getCollectionById, getProductsByCollection]
	);

	return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
	const ctx = useContext(ProductsContext);
	if (ctx === undefined) {
		throw new Error('useProducts must be used within ProductsProvider');
	}
	return ctx;
}

// Utility function to convert Product to SimpleProduct format (for backward compatibility)
export function productToSimpleProduct(product: Product): { id: string; name: string; price: string; image: string; discount?: number; originalPrice?: number } {
	// If originalPrice is provided, it means the price is already the discounted price
	// Otherwise, apply discountPercentage if available
	const discountedPrice = product.originalPrice !== undefined && product.originalPrice > product.price
		? product.price
		: (product.discountPercentage > 0
			? product.price * (1 - product.discountPercentage / 100)
			: product.price);
	
	// Extract primary image from imageUrl (can be JSON string array or single URL)
	let primaryImage = '';
	if (product.imageUrl) {
		try {
			// Try to parse as JSON array
			const parsed = JSON.parse(product.imageUrl);
			if (Array.isArray(parsed) && parsed.length > 0) {
				// Use the first image as the primary image
				primaryImage = parsed[0];
			} else {
				// Not an array, use as-is
				primaryImage = product.imageUrl;
			}
		} catch {
			// Not JSON, treat as single URL
			primaryImage = product.imageUrl;
		}
	}
	
	return {
		id: product.id,
		name: product.name,
		price: typeof discountedPrice === 'number' ? discountedPrice : parseFloat(String(discountedPrice)) || 0, // Return as number for ProductGridItem
		image: primaryImage,
		discount: product.discountPercentage > 0 ? product.discountPercentage : undefined,
		originalPrice: product.originalPrice,
		discountPercentage: product.discountPercentage,
	};
}

