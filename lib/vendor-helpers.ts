/**
 * Vendor Helper Functions
 * Utilities for fetching and formatting vendor data for marketplace
 */

import type { Product } from '@/contexts/ProductsContext';
import { supabase } from './supabase';

export type VendorWithProducts = {
	id: string;
	storeName: string;
	profileImageUrl?: string;
	createdAt: string;
	products: Product[];
};

/**
 * Fetch vendors with their active products
 */
export async function fetchVendorsWithProducts(limit = 10): Promise<VendorWithProducts[]> {
	try {
		const { data: vendors, error } = await supabase
			.from('profiles')
			.select('id, store_name, profile_image_url, created_at')
			.eq('role', 'vendor')
			.limit(limit);

		if (error) {
			console.error('[VendorHelpers] Error fetching vendors:', error);
			return [];
		}

		if (!vendors || vendors.length === 0) {
			return [];
		}

		// Fetch products for each vendor
		const vendorsWithProducts: VendorWithProducts[] = [];

		for (const vendor of vendors) {
			const { data: products } = await supabase
				.from('products')
				.select('*')
				.eq('vendor_id', vendor.id)
				.eq('is_active', true)
				.order('created_at', { ascending: false })
				.limit(5);

			vendorsWithProducts.push({
				id: vendor.id,
				storeName: vendor.store_name || 'Vendor Store',
				profileImageUrl: vendor.profile_image_url || undefined,
				createdAt: vendor.created_at,
				products: (products || []).map((p: any) => ({
					id: p.id,
					name: p.name,
					description: p.description,
					price: parseFloat(p.price || '0'),
					discountPercentage: p.discount_percentage || 0,
					imageUrl: p.images && Array.isArray(p.images) && p.images.length > 0
						? JSON.stringify(p.images)
						: p.image_url,
					sku: p.sku,
					stockQuantity: p.stock_quantity || 0,
					isActive: p.is_active !== false,
					tags: p.tags || [],
					vendorId: p.vendor_id,
					createdAt: p.created_at,
					updatedAt: p.updated_at,
				})),
			});
		}

		return vendorsWithProducts;
	} catch (error) {
		console.error('[VendorHelpers] Unexpected error:', error);
		return [];
	}
}

