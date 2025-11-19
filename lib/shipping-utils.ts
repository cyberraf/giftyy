import { CartItem } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';

/**
 * Calculate shipping cost based on vendors in the cart.
 * Groups items by vendor and sums up shipping costs from each vendor.
 * If a vendor doesn't have shipping info, uses default shipping cost.
 */
export async function calculateVendorShipping(
	items: CartItem[],
	defaultShippingCost: number = 4.99,
	freeShippingThreshold: number = 50
): Promise<number> {
	if (items.length === 0) return 0;

	// Group items by vendorId
	const itemsByVendor = new Map<string, CartItem[]>();
	
	items.forEach(item => {
		const vendorId = item.vendorId || 'default';
		if (!itemsByVendor.has(vendorId)) {
			itemsByVendor.set(vendorId, []);
		}
		itemsByVendor.get(vendorId)!.push(item);
	});

	// Calculate subtotal per vendor
	const vendorSubtotals = new Map<string, number>();
	itemsByVendor.forEach((vendorItems, vendorId) => {
		const subtotal = vendorItems.reduce((sum, item) => {
			const price = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
			return sum + price * item.quantity;
		}, 0);
		vendorSubtotals.set(vendorId, subtotal);
	});

	// Fetch vendor shipping costs from database
	const vendorIds = Array.from(itemsByVendor.keys()).filter(id => id !== 'default');
	let vendorShippingMap = new Map<string, number>();

	if (vendorIds.length > 0) {
		try {
			const { data, error } = await supabase
				.from('vendors')
				.select('id, shipping_cost, free_shipping_threshold')
				.in('id', vendorIds);

			if (!error && data) {
				data.forEach((vendor: any) => {
					const vendorId = vendor.id;
					const subtotal = vendorSubtotals.get(vendorId) || 0;
					const threshold = vendor.free_shipping_threshold || freeShippingThreshold;
					
					// Check if vendor offers free shipping for this order
					if (subtotal >= threshold) {
						vendorShippingMap.set(vendorId, 0);
					} else {
						// Use vendor's shipping cost or default
						vendorShippingMap.set(vendorId, vendor.shipping_cost || defaultShippingCost);
					}
				});
			}
		} catch (err) {
			console.warn('[Shipping] Error fetching vendor shipping costs:', err);
		}
	}

	// Calculate total shipping
	let totalShipping = 0;
	
	itemsByVendor.forEach((vendorItems, vendorId) => {
		if (vendorId === 'default') {
			// For items without vendor, use default shipping logic
			const subtotal = vendorSubtotals.get(vendorId) || 0;
			totalShipping += subtotal >= freeShippingThreshold ? 0 : defaultShippingCost;
		} else {
			// Use vendor-specific shipping cost
			const shippingCost = vendorShippingMap.get(vendorId) ?? defaultShippingCost;
			totalShipping += shippingCost;
		}
	});

	return totalShipping;
}

/**
 * Synchronous version that uses default shipping if vendor info is not available.
 * Use this for immediate calculations without async database calls.
 */
export function calculateVendorShippingSync(
	items: CartItem[],
	defaultShippingCost: number = 4.99,
	freeShippingThreshold: number = 50
): number {
	if (items.length === 0) return 0;

	// Group items by vendorId
	const itemsByVendor = new Map<string, CartItem[]>();
	
	items.forEach(item => {
		const vendorId = item.vendorId || 'default';
		if (!itemsByVendor.has(vendorId)) {
			itemsByVendor.set(vendorId, []);
		}
		itemsByVendor.get(vendorId)!.push(item);
	});

	// Calculate subtotal per vendor and apply default shipping logic
	let totalShipping = 0;
	
	itemsByVendor.forEach((vendorItems, vendorId) => {
		const subtotal = vendorItems.reduce((sum, item) => {
			const price = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
			return sum + price * item.quantity;
		}, 0);
		
		// Apply default shipping logic per vendor
		// Each vendor gets their own shipping cost if subtotal < threshold
		totalShipping += subtotal >= freeShippingThreshold ? 0 : defaultShippingCost;
	});

	return totalShipping;
}

