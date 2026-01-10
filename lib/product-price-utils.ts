import { supabase } from '@/lib/supabase';

/**
 * Calculate the lowest price for a product considering all its variations/combinations
 * @param productId - The product ID
 * @param basePrice - The base product price
 * @returns Promise<number> - The lowest price found (or base price if no variations)
 */
export async function calculateLowestProductPrice(
	productId: string,
	basePrice: number
): Promise<number> {
	try {
		// Fetch all variations for this product
		const { data: variations, error } = await supabase
			.from('product_variations')
			.select('*')
			.eq('product_id', productId)
			.eq('is_active', true);

		if (error || !variations || variations.length === 0) {
			// No variations, return base price
			return basePrice;
		}

		let lowestPrice = basePrice;

		// Check each variation
		for (const variation of variations) {
			const attrs = variation.attributes || {};
			
			// Check if this is a combination format
			if (typeof attrs === 'object' && !Array.isArray(attrs) && attrs.format === 'combination') {
				const combinations = attrs.combinations || [];
				
				// Check each combination
				for (const combo of combinations) {
					// Calculate price for this combination
					const priceModifier = combo.priceModifier ?? combo.price_modifier ?? 0;
					const comboPrice = basePrice + parseFloat(String(priceModifier));
					
					// Apply discount if available
					const discount = combo.discountPercentage ?? combo.discount_percentage ?? 0;
					const finalPrice = discount > 0 
						? comboPrice * (1 - discount / 100)
						: comboPrice;
					
					// Check stock availability
					const stock = combo.stockQuantity ?? combo.stock_quantity ?? 0;
					if (stock > 0 && finalPrice < lowestPrice) {
						lowestPrice = finalPrice;
					}
				}
			} else {
				// Standard format - check variation price
				if (variation.price !== null && variation.price !== undefined) {
					const variationPrice = parseFloat(String(variation.price));
					if (variationPrice < lowestPrice) {
						lowestPrice = variationPrice;
					}
				} else {
					// No price override, use base price (already set as lowestPrice)
					// But check if there's a price modifier in attributes
					if (typeof attrs === 'object' && 'options' in attrs && Array.isArray(attrs.options)) {
						for (const option of attrs.options) {
							if (option.price !== null && option.price !== undefined) {
								const optionPrice = parseFloat(String(option.price));
								if (optionPrice < lowestPrice) {
									lowestPrice = optionPrice;
								}
							}
						}
					}
				}
			}
		}

		return lowestPrice;
	} catch (error) {
		console.error('[ProductPriceUtils] Error calculating lowest price:', error);
		return basePrice;
	}
}

/**
 * Calculate the lowest price synchronously from already-fetched variations
 * @param variations - Array of product variations
 * @param basePrice - The base product price
 * @returns number - The lowest price found (or base price if no variations)
 */
export function calculateLowestPriceFromVariations(
	variations: any[],
	basePrice: number
): number {
	if (!variations || variations.length === 0) {
		return basePrice;
	}

	let lowestPrice = basePrice;

	// Check each variation
	for (const variation of variations) {
		const attrs = variation.attributes || {};
		
		// Check if this is a combination format
		if (typeof attrs === 'object' && !Array.isArray(attrs) && attrs.format === 'combination') {
			const combinations = attrs.combinations || [];
			
			// Check each combination
			for (const combo of combinations) {
				// Calculate price for this combination
				const priceModifier = combo.priceModifier ?? combo.price_modifier ?? 0;
				const comboPrice = basePrice + parseFloat(String(priceModifier));
				
				// Apply discount if available
				const discount = combo.discountPercentage ?? combo.discount_percentage ?? 0;
				const finalPrice = discount > 0 
					? comboPrice * (1 - discount / 100)
					: comboPrice;
				
				// Check stock availability
				const stock = combo.stockQuantity ?? combo.stock_quantity ?? 0;
				if (stock > 0 && finalPrice < lowestPrice) {
					lowestPrice = finalPrice;
				}
			}
		} else {
			// Standard format - check variation price
			if (variation.price !== null && variation.price !== undefined) {
				const variationPrice = parseFloat(String(variation.price));
				if (variationPrice < lowestPrice) {
					lowestPrice = variationPrice;
				}
			} else {
				// No price override, check if there's a price modifier in attributes
				if (typeof attrs === 'object' && 'options' in attrs && Array.isArray(attrs.options)) {
					for (const option of attrs.options) {
						if (option.price !== null && option.price !== undefined) {
							const optionPrice = parseFloat(String(option.price));
							if (optionPrice < lowestPrice) {
								lowestPrice = optionPrice;
							}
						}
					}
				}
			}
		}
	}

	return lowestPrice;
}

