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

/**
 * Calculate shipping cost based on vendor shipping zones and rates.
 * Uses vendor_shipping_zones and vendor_shipping_rates tables to determine
 * the appropriate shipping cost based on recipient location.
 */
export async function calculateVendorShippingByZone(
	items: CartItem[],
	recipientState: string,
	recipientCountry: string = 'United States',
	defaultShippingCost: number = 4.99,
	freeShippingThreshold: number = 50
): Promise<{ total: number; breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number }> }> {
	if (items.length === 0) {
		return { total: 0, breakdown: [] };
	}

	// Group items by vendor
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

	const vendorIds = Array.from(itemsByVendor.keys()).filter(id => id !== 'default');
	const breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number }> = [];
	let totalShipping = 0;

	// Fetch vendor names
	const vendorNamesMap = new Map<string, string>();
	if (vendorIds.length > 0) {
		try {
			const { data: vendorData } = await supabase
				.from('profiles')
				.select('id, store_name')
				.in('id', vendorIds);
			
			vendorData?.forEach((vendor: any) => {
				if (vendor.id) {
					vendorNamesMap.set(vendor.id, vendor.store_name?.trim() || `Vendor ${vendor.id.slice(0, 8)}`);
				}
			});
		} catch (err) {
			console.warn('[Shipping] Error fetching vendor names:', err);
		}
	}

	// Process each vendor
	for (const [vendorId, vendorItems] of itemsByVendor.entries()) {
		const subtotal = vendorSubtotals.get(vendorId) || 0;
		const itemCount = vendorItems.reduce((sum, item) => sum + item.quantity, 0);
		let shipping = defaultShippingCost;

		if (vendorId === 'default') {
			// Default vendor logic - only use default for items without a vendor
			shipping = subtotal >= freeShippingThreshold ? 0 : defaultShippingCost;
		} else {
			// Find shipping zone for this vendor and location
			try {
				// First, find zones that match the recipient's location
				// Table structure: id, vendor_id, name, countries (text[]), is_rest_of_world (bool)
				console.log(`[Shipping] Querying zones for vendor_id: ${vendorId} (type: ${typeof vendorId})`);
				
				const { data: zones, error: zonesError } = await supabase
					.from('vendor_shipping_zones')
					.select('id, vendor_id, name, countries, is_rest_of_world')
					.eq('vendor_id', vendorId);

				console.log(`[Shipping] Zones query result for vendor ${vendorId}:`, zones, 'Error:', zonesError);
				
				// Check for RLS/permission errors
				if (zonesError) {
					console.error(`[Shipping] Error querying zones:`, zonesError);
					if (zonesError.code === '42501' || zonesError.message?.includes('permission') || zonesError.message?.includes('policy')) {
						console.warn(`[Shipping] RLS policy may be blocking access to vendor_shipping_zones table`);
					}
				}
				
				// If no zones found, try querying all zones to debug
				if ((!zones || zones.length === 0) && !zonesError) {
					const { data: allZones, error: allZonesError } = await supabase
						.from('vendor_shipping_zones')
						.select('id, vendor_id, name, countries, is_rest_of_world')
						.limit(10);
					console.log(`[Shipping] Sample of all zones (first 10):`, allZones, 'Error:', allZonesError);
					if (allZonesError) {
						console.error(`[Shipping] Error querying all zones:`, allZonesError);
					}
				}

				if (!zonesError && zones && zones.length > 0) {
					let matchedZone: any = null;

					// Find zone that matches recipient location
					for (const zone of zones) {
						const countries = zone.countries || [];
						const isRestOfWorld = zone.is_rest_of_world === true;
						
						// Ensure countries is an array
						const countriesArray = Array.isArray(countries) ? countries : [];

						// Check if this is a "rest of world" zone (matches any country not in other zones)
						if (isRestOfWorld) {
							// Check if recipient country is NOT in any other zone's countries list
							const otherZonesHaveCountry = zones.some((z: any) => {
								if (z.id === zone.id) return false; // Skip current zone
								const zCountries = Array.isArray(z.countries) ? z.countries : [];
								return zCountries.includes(recipientCountry);
							});
							
							if (!otherZonesHaveCountry) {
								matchedZone = zone;
								console.log(`[Shipping] Matched rest-of-world zone:`, zone);
								break;
							}
						} else {
							// Regular zone: check if recipient country is in the countries array
							if (countriesArray.length === 0 || countriesArray.includes(recipientCountry)) {
								matchedZone = zone;
								console.log(`[Shipping] Matched zone by country:`, zone, `for country: ${recipientCountry}`);
								break;
							}
						}
					}

					// If no specific zone matches, use the first zone as fallback
					if (!matchedZone && zones.length > 0) {
						matchedZone = zones[0];
						console.log(`[Shipping] No zone matched, using first zone as fallback:`, matchedZone);
					}

					if (matchedZone) {
						console.log(`[Shipping] Found matched zone for vendor ${vendorId}:`, matchedZone.id);
						
						// Get all shipping rates for this zone
						const { data: rates, error: ratesError } = await supabase
							.from('vendor_shipping_rates')
							.select('id, price, is_free, conditions, name')
							.eq('zone_id', matchedZone.id)
							.order('price', { ascending: true });

						console.log(`[Shipping] Rates for zone ${matchedZone.id}:`, rates, 'Error:', ratesError);
						
						// Check for RLS/permission errors
						if (ratesError) {
							console.error(`[Shipping] Error querying rates:`, ratesError);
							if (ratesError.code === '42501' || ratesError.message?.includes('permission') || ratesError.message?.includes('policy')) {
								console.warn(`[Shipping] RLS policy may be blocking access to vendor_shipping_rates table`);
							}
						}

						if (!ratesError && rates && rates.length > 0) {
							// Find the matching rate based on conditions
							let matchedRate: any = null;

							// Sort rates: rates without conditions first (default), then by price
							const sortedRates = [...rates].sort((a, b) => {
								const aHasConditions = a.conditions && (a.conditions.order_price_min !== undefined || a.conditions.order_price_max !== undefined);
								const bHasConditions = b.conditions && (b.conditions.order_price_min !== undefined || b.conditions.order_price_max !== undefined);
								
								// Rates without conditions come first
								if (!aHasConditions && bHasConditions) return -1;
								if (aHasConditions && !bHasConditions) return 1;
								
								// Otherwise sort by price
								const aPrice = parseFloat(String(a.price)) || 0;
								const bPrice = parseFloat(String(b.price)) || 0;
								return aPrice - bPrice;
							});

							for (const rate of sortedRates) {
								const conditions = rate.conditions || {};
								const orderPriceMin = conditions.order_price_min;
								const orderPriceMax = conditions.order_price_max;

								console.log(`[Shipping] Checking rate ${rate.id}: price=${rate.price}, is_free=${rate.is_free}, conditions=`, conditions, `subtotal=${subtotal}`);

								// If no conditions specified, this is a default rate that matches everything
								const hasNoConditions = (orderPriceMin === undefined || orderPriceMin === null) && 
														(orderPriceMax === undefined || orderPriceMax === null);

								if (hasNoConditions) {
									matchedRate = rate;
									console.log(`[Shipping] Matched default rate (no conditions):`, matchedRate);
									break;
								}

								// Check if subtotal matches the conditions
								const matchesMin = orderPriceMin === undefined || orderPriceMin === null || subtotal >= orderPriceMin;
								const matchesMax = orderPriceMax === undefined || orderPriceMax === null || subtotal <= orderPriceMax;

								if (matchesMin && matchesMax) {
									matchedRate = rate;
									console.log(`[Shipping] Matched rate with conditions:`, matchedRate);
									break; // Use the first matching rate
								}
							}

							// If no rate matches conditions, use the first rate as fallback
							if (!matchedRate && sortedRates.length > 0) {
								matchedRate = sortedRates[0];
								console.log(`[Shipping] No condition match, using first rate as fallback:`, matchedRate);
							}

							if (matchedRate) {
								// If is_free is true, shipping is free
								if (matchedRate.is_free === true) {
									shipping = 0;
									console.log(`[Shipping] Rate is free, setting shipping to 0`);
								} else {
									// Use the price from the rate - handle both string and number types
									let ratePrice = 0;
									if (typeof matchedRate.price === 'number') {
										ratePrice = matchedRate.price;
									} else if (typeof matchedRate.price === 'string') {
										ratePrice = parseFloat(matchedRate.price) || 0;
									}
									
									// Always use the rate price if it's valid, never fall back to default
									if (ratePrice > 0) {
										shipping = ratePrice;
										console.log(`[Shipping] Using rate price: ${ratePrice} (from ${typeof matchedRate.price}), final shipping: ${shipping}`);
									} else {
										// If price is 0 or invalid, log warning but still use 0 (not default)
										console.warn(`[Shipping] Rate price is invalid (${matchedRate.price}), using 0 instead of default`);
										shipping = 0;
									}
								}
							} else {
								// No rates found - this shouldn't happen if zones are configured correctly
								// Log error but don't use default - use 0 to indicate missing configuration
								console.error(`[Shipping] No matched rate found for zone ${matchedZone.id}. This indicates missing shipping rate configuration.`);
								shipping = 0;
							}
						} else {
							// No rates configured for this zone - log error
							console.error(`[Shipping] No rates found for zone ${matchedZone.id}. This indicates missing shipping rate configuration. Error:`, ratesError);
							shipping = 0;
						}
					} else {
						// No matching zone found - this means vendor hasn't configured shipping for this location
						// Log warning but don't use default - use 0 to indicate missing configuration
						console.warn(`[Shipping] No matching zone found for vendor ${vendorId}, location: ${recipientState}, ${recipientCountry}. Vendor needs to configure shipping zones.`);
						shipping = 0;
					}
				} else {
					// No zones configured for this vendor - this means vendor hasn't set up shipping
					// Log warning but don't use default - use 0 to indicate missing configuration
					console.warn(`[Shipping] No zones found for vendor ${vendorId}. Vendor needs to configure shipping zones. Error:`, zonesError);
					shipping = 0;
				}
			} catch (err) {
				console.warn(`[Shipping] Error calculating shipping for vendor ${vendorId}:`, err);
				// Fallback to default logic
				shipping = subtotal >= freeShippingThreshold ? 0 : defaultShippingCost;
			}
		}

		totalShipping += shipping;

		const vendorName = vendorId === 'default' 
			? 'Giftyy Store' 
			: vendorNamesMap.get(vendorId) || `Vendor ${vendorId.slice(0, 8)}`;

		breakdown.push({
			vendorId,
			vendorName,
			subtotal,
			shipping,
			itemCount,
		});
	}

	return { total: totalShipping, breakdown };
}

