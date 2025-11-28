import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type Product = {
	id: string;
	name: string;
	description?: string;
	price: number;
	discountPercentage: number;
	imageUrl?: string;
	sku?: string;
	stockQuantity: number;
	isActive: boolean;
	tags: string[];
	vendorId?: string; // Vendor who owns this product
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

			const fetchedProducts = (data || []).map(dbRowToProduct);
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

			// Fetch collections
			const { data: collectionsData, error: collectionsError } = await supabase
				.from('collections')
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

			// Fetch collection-product relationships
			const collectionIds = collectionsData.map((c) => c.id);
			const { data: collectionProductsData, error: cpError } = await supabase
				.from('collection_products')
				.select('*')
				.in('collection_id', collectionIds)
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

			// Group products by collection
			const productsByCollectionId = new Map<string, Product[]>();
			(collectionProductsData || []).forEach((cp) => {
				const product = collectionProducts.find((p) => p.id === cp.product_id);
				if (product) {
					if (!productsByCollectionId.has(cp.collection_id)) {
						productsByCollectionId.set(cp.collection_id, []);
					}
					productsByCollectionId.get(cp.collection_id)!.push(product);
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
export function productToSimpleProduct(product: Product): { id: string; name: string; price: string; image: string; discount?: number } {
	const discountedPrice = product.discountPercentage > 0
		? product.price * (1 - product.discountPercentage / 100)
		: product.price;
	
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
		price: `$${discountedPrice.toFixed(2)}`,
		image: primaryImage,
		discount: product.discountPercentage > 0 ? product.discountPercentage : undefined,
	};
}

