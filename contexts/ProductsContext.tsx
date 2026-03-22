import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { swrRead, swrWrite } from '@/lib/cache/swr';

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
	hasMore: boolean;
	refreshProducts: () => Promise<void>;
	loadMoreProducts: () => Promise<void>;
	refreshCollections: () => Promise<void>;
	getProductById: (id: string) => Product | undefined;
	fetchProductById: (id: string) => Promise<Product | undefined>;
	getCollectionById: (id: string) => Collection | undefined;
	getProductsByCollection: (collectionId: string) => Product[];
};

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

// Helper function to convert database row (snake_case) to Product (camelCase)
export function dbRowToProduct(row: any): Product {
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

const PAGE_SIZE = 60;

export function ProductsProvider({ children }: { children: React.ReactNode }) {
	const [products, setProducts] = useState<Product[]>([]);
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);

	// Fetch products from Supabase with pagination
	const fetchProductsBatch = useCallback(async (pageNum: number, isAppend: boolean = false) => {
		try {
			if (!isSupabaseConfigured()) {
				console.warn('[ProductsContext] Supabase not configured.');
				if (!isAppend) setProducts([]);
				setLoading(false);
				return;
			}

			const start = pageNum * PAGE_SIZE;
			const end = start + PAGE_SIZE - 1;

			const { data, error, count } = await supabase
				.from('products')
				.select('*', { count: 'exact' })
				.gt('stock_quantity', 0)
				.order('created_at', { ascending: false })
				.range(start, end);

			if (error) {
				console.error('[ProductsContext] Error fetching products:', error);
				if (!isAppend) setProducts([]);
				return;
			}

			const fetchedRows = data || [];
			setHasMore(fetchedRows.length === PAGE_SIZE && (count ? start + fetchedRows.length < count : true));

			// Fetch category assignments for these products
			const productIds = fetchedRows.map(p => p.id);
			let categoryAssignments: { product_id: string; category_id: string; subcategory?: string }[] = [];

			if (productIds.length > 0) {
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
				
				if (assignment.subcategory) {
					subcategoriesByProduct.get(assignment.product_id)!.add(assignment.subcategory);
				}
			});

			// Fetch variations for these products
			const { data: variationsData, error: variationsError } = await supabase
				.from('product_variations')
				.select('*')
				.in('product_id', productIds);
			
			let activeVariations = variationsData || [];
			if (variationsData && variationsData.length > 0 && variationsData[0].hasOwnProperty('is_active')) {
				activeVariations = variationsData.filter((v: any) => v.is_active !== false);
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

			// Map products with categories and lowest prices
			const processedProducts = fetchedRows.map(row => {
				const product = dbRowToProduct(row);
				const categoryIds = Array.from(categoriesByProduct.get(product.id) || []);
				const subcategories = Array.from(subcategoriesByProduct.get(product.id) || []);
				
				const productVariations = variationsByProduct.get(product.id) || [];
				const originalBasePrice = product.price;
				let displayPrice = product.price;
				let lowestOriginalPrice = product.price;
				
				if (productVariations.length > 0) {
					const basePrice = originalBasePrice;
					let lowestPrice = Infinity;
					let lowestOriginal = Infinity;
					let hasCombinations = false;

					for (const variation of productVariations) {
						let attrs = variation.attributes || {};
						if (typeof attrs === 'string') {
							try { attrs = JSON.parse(attrs); } catch { attrs = {}; }
						}
						
						if (typeof attrs === 'object' && !Array.isArray(attrs) && attrs.format === 'combination') {
							const combinations = attrs.combinations || [];
							hasCombinations = true;
							
							for (const combo of combinations) {
								const priceModifier = combo.priceModifier ?? combo.price_modifier ?? 0;
								const comboPrice = basePrice + parseFloat(String(priceModifier));
								const discount = combo.discountPercentage ?? combo.discount_percentage ?? 0;
								const finalPrice = discount > 0 
									? comboPrice * (1 - discount / 100)
									: comboPrice;
								
								if (finalPrice < lowestPrice || lowestPrice === Infinity) lowestPrice = finalPrice;
								if (comboPrice < lowestOriginal || lowestOriginal === Infinity) lowestOriginal = comboPrice;
							}
						} else {
							if (variation.price !== null && variation.price !== undefined) {
								const vp = parseFloat(String(variation.price));
								if (vp < lowestPrice || lowestPrice === Infinity) lowestPrice = vp;
								if (vp < lowestOriginal || lowestOriginal === Infinity) lowestOriginal = vp;
							} else if (variation.price_modifier !== null && variation.price_modifier !== undefined) {
								const pm = parseFloat(String(variation.price_modifier));
								const vp = basePrice + pm;
								if (vp < lowestPrice || lowestPrice === Infinity) lowestPrice = vp;
								if (vp < lowestOriginal || lowestOriginal === Infinity) lowestOriginal = vp;
							}
						}
					}

					if (hasCombinations) {
						if (lowestPrice === Infinity) {
							displayPrice = basePrice;
							lowestOriginalPrice = basePrice;
						} else {
							displayPrice = lowestPrice;
							lowestOriginalPrice = lowestOriginal === Infinity ? lowestPrice : lowestOriginal;
						}
					} else {
						if (basePrice > 0 && basePrice < lowestPrice) lowestPrice = basePrice;
						if (basePrice > 0 && basePrice < lowestOriginal) lowestOriginal = basePrice;
						
						if (lowestPrice === Infinity) {
							displayPrice = basePrice;
							lowestOriginalPrice = basePrice;
						} else {
							displayPrice = lowestPrice;
							lowestOriginalPrice = lowestOriginal === Infinity ? basePrice : lowestOriginal;
						}
					}
				}
				
				return {
					...product,
					price: displayPrice,
					originalPrice: productVariations.length > 0 ? lowestOriginalPrice : undefined,
					categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
					subcategories: subcategories.length > 0 ? subcategories : undefined,
				};
			});
			
			if (isAppend) {
				setProducts(prev => [...prev, ...processedProducts]);
			} else {
				setProducts(processedProducts);
			}
		} catch (err: any) {
			console.error('[ProductsContext] Unexpected error:', err);
		}
	}, []);

	const refreshProducts = useCallback(async () => {
		setLoading(true);
		setPage(0);
		await fetchProductsBatch(0, false);
		// Cache the fetched products for SWR
		setProducts(current => {
			swrWrite('products', current).catch(() => {});
			return current;
		});
		setLoading(false);
	}, [fetchProductsBatch]);

	const loadMoreProducts = useCallback(async () => {
		if (!hasMore || loading) return;
		setLoading(true);
		const nextPage = page + 1;
		setPage(nextPage);
		await fetchProductsBatch(nextPage, true);
		setLoading(false);
	}, [hasMore, loading, page, fetchProductsBatch]);

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
					.gt('stock_quantity', 0)
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

	// Initial load with stale-while-revalidate
	useEffect(() => {
		const loadData = async () => {
			setLoading(true);

			// Try to load cached products immediately
			const cached = await swrRead<Product[]>('products', { maxAgeMs: 5 * 60_000 });
			if (cached.isCached && cached.data) {
				setProducts(cached.data);
				setLoading(false);
			}

			// Always revalidate from network (even if cache was fresh, to catch updates)
			if (cached.isStale || !cached.isCached) {
				await Promise.all([refreshProducts(), refreshCollections()]);
				setLoading(false);
			} else {
				// Revalidate in background (cache was fresh but we still want latest)
				Promise.all([refreshProducts(), refreshCollections()]).catch(() => {});
			}
		};
		loadData();
	}, [refreshProducts, refreshCollections]);

	const getProductById = useCallback(
		(id: string): Product | undefined => {
			return products.find((p) => p.id === id);
		},
		[products]
	);

	const fetchProductById = useCallback(
		async (id: string): Promise<Product | undefined> => {
			// Check local cache first
			const cached = products.find((p) => p.id === id);
			if (cached) return cached;

			try {
				const { data, error } = await supabase
					.from('products')
					.select('*')
					.eq('id', id)
					.single();

				if (error || !data) {
					console.error('[ProductsContext] Error fetching product by ID:', error);
					return undefined;
				}

				const newProduct = dbRowToProduct(data);
				
				// Update products list if it's not already there
				setProducts(prev => {
					if (prev.some(p => p.id === id)) return prev;
					return [...prev, newProduct];
				});

				return newProduct;
			} catch (err) {
				console.error('[ProductsContext] Unexpected error fetching product by ID:', err);
				return undefined;
			}
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
			hasMore,
			refreshProducts,
			loadMoreProducts,
			refreshCollections,
			getProductById,
			fetchProductById,
			getCollectionById,
			getProductsByCollection,
		}),
		[products, collections, loading, hasMore, refreshProducts, loadMoreProducts, refreshCollections, getProductById, fetchProductById, getCollectionById, getProductsByCollection]
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
export function productToSimpleProduct(product: Product): { id: string; name: string; price: number; image: string; discount?: number; originalPrice?: number, discountPercentage?: number } {
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

