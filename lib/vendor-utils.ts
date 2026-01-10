/**
 * Vendor Utilities
 * Helper functions to fetch and manage vendor information
 */

import { supabase } from './supabase';

export type VendorInfo = {
	id: string;
	storeName?: string;
	profileImageUrl?: string;
};

const vendorCache = new Map<string, VendorInfo>();

/**
 * Get vendor information by ID
 * Caches results to avoid repeated queries
 */
export async function getVendorInfo(vendorId: string): Promise<VendorInfo | null> {
	if (!vendorId) return null;
	
	// Check cache first
	if (vendorCache.has(vendorId)) {
		return vendorCache.get(vendorId) || null;
	}
	
	try {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, store_name, profile_image_url')
			.eq('id', vendorId)
			.eq('role', 'vendor')
			.single();
		
		if (error || !data) {
			return null;
		}
		
		// Ensure profile image URL is a proper public URL
		// Expected URL format: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
		let profileImageUrl = data.profile_image_url || undefined;
		if (profileImageUrl) {
			// If it's already a full HTTP URL, use it as-is
			if (profileImageUrl.startsWith('http')) {
				// URL is already complete, use as-is
			} else {
				// Convert storage path to public URL
				// The database might store:
				// 1. Just the filename: "filename.png"
				// 2. Relative path: "avatars/{user_id}/filename.png"
				// 3. Path without avatars: "{user_id}/filename.png"
				// We need: "avatars/{user_id}/filename.png"
				let path = profileImageUrl.trim();
				
				// Remove leading/trailing slashes
				path = path.replace(/^\/+|\/+$/g, '');
				
				// Remove bucket name if present (shouldn't be in path)
				path = path.replace(/^profile_images\//, '');
				
				// Check if path already has avatars prefix
				if (path.startsWith('avatars/')) {
					// Path is already in correct format: avatars/{user_id}/filename
					// Use it as-is
				} else {
					// Extract filename (last part after any slashes)
					const pathParts = path.split('/');
					const filename = pathParts[pathParts.length - 1];
					
					// Construct path as: avatars/{user_id}/filename
					path = `avatars/${vendorId}/${filename}`;
				}
				
				// Get public URL from Supabase storage
				// This will return: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
				const { data: urlData } = supabase.storage
					.from('profile_images')
					.getPublicUrl(path);
				profileImageUrl = urlData.publicUrl;
			}
		}
		
		const vendorInfo: VendorInfo = {
			id: data.id,
			storeName: data.store_name || undefined,
			profileImageUrl,
		};
		
		// Cache the result
		vendorCache.set(vendorId, vendorInfo);
		
		return vendorInfo;
	} catch (error) {
		console.warn('[VendorUtils] Error fetching vendor:', error);
		return null;
	}
}

/**
 * Batch fetch vendor information for multiple vendor IDs
 */
export async function getVendorsInfo(vendorIds: string[]): Promise<Map<string, VendorInfo>> {
	const vendorsMap = new Map<string, VendorInfo>();
	const idsToFetch: string[] = [];
	
	// Check cache first
	for (const vendorId of vendorIds) {
		if (vendorCache.has(vendorId)) {
			const cached = vendorCache.get(vendorId);
			if (cached) vendorsMap.set(vendorId, cached);
		} else {
			idsToFetch.push(vendorId);
		}
	}
	
	if (idsToFetch.length === 0) {
		return vendorsMap;
	}
	
	try {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, store_name, profile_image_url')
			.in('id', idsToFetch)
			.eq('role', 'vendor');
		
		if (error || !data) {
			return vendorsMap;
		}
		
		// Process and cache results
		for (const row of data) {
			let profileImageUrl = row.profile_image_url || undefined;
			if (profileImageUrl) {
				// If it's already a full HTTP URL, use it as-is
				if (profileImageUrl.startsWith('http')) {
					// URL is already complete, use as-is
				} else {
					// Convert storage path to public URL
					// Expected URL format: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
					// The database might store:
					// 1. Just the filename: "filename.png"
					// 2. Relative path: "avatars/{user_id}/filename.png"
					// 3. Path without avatars: "{user_id}/filename.png"
					// We need: "avatars/{user_id}/filename.png"
					let path = profileImageUrl.trim();
					
					// Remove leading/trailing slashes
					path = path.replace(/^\/+|\/+$/g, '');
					
					// Remove bucket name if present (shouldn't be in path)
					path = path.replace(/^profile_images\//, '');
					
					// Check if path already has avatars prefix
					if (path.startsWith('avatars/')) {
						// Path is already in correct format: avatars/{user_id}/filename
						// Use it as-is
					} else {
						// Extract filename (last part after any slashes)
						const pathParts = path.split('/');
						const filename = pathParts[pathParts.length - 1];
						
						// Construct path as: avatars/{user_id}/filename
						path = `avatars/${row.id}/${filename}`;
					}
					
					// Get public URL from Supabase storage
					// This will return: https://...supabase.co/storage/v1/object/public/profile_images/avatars/{user_id}/{filename}
					const { data: urlData } = supabase.storage
						.from('profile_images')
						.getPublicUrl(path);
					profileImageUrl = urlData.publicUrl;
				}
			}
			
			const vendorInfo: VendorInfo = {
				id: row.id,
				storeName: row.store_name || undefined,
				profileImageUrl,
			};
			
			vendorCache.set(row.id, vendorInfo);
			vendorsMap.set(row.id, vendorInfo);
		}
	} catch (error) {
		console.warn('[VendorUtils] Error batch fetching vendors:', error);
	}
	
	return vendorsMap;
}

/**
 * Clear vendor cache (useful when vendor info is updated)
 */
export function clearVendorCache(vendorId?: string) {
	if (vendorId) {
		vendorCache.delete(vendorId);
	} else {
		vendorCache.clear();
	}
}

