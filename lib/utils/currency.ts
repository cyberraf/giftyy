/**
 * Safely parses a price value (string or number) into a valid number.
 * Handles currency symbols, commas, and undefined/null values.
 */
export function parsePrice(value?: string | number | null): number {
	if (value === undefined || value === null) return 0;
	if (typeof value === 'number') return value;
	
	const cleaned = String(value).replace(/[^0-9.]/g, '');
	const amount = parseFloat(cleaned);
	return Number.isNaN(amount) ? 0 : amount;
}

/**
 * Formats a number as a currency string.
 */
export function formatCurrency(amount: number): string {
	return `$${amount.toFixed(2)}`;
}
