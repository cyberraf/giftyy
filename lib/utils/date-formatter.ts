export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a YYYY-MM-DD date string into a human-readable format.
 * If the year is 0004 (SENTINEL_YEAR), it omits the year from the output.
 * Avoids using the Date object constructor with the string to prevent timezone shifts.
 */
export function formatOccasionDate(dateYMD: string, options: { short?: boolean; hideYear?: boolean } = {}) {
    if (!dateYMD) return 'Select date';
    const parts = dateYMD.split('-').map(Number);
    if (parts.length !== 3) return 'Select date';

    const [y, m, d] = parts;
    if (!m || !d) return 'Select date';

    const monthName = options.short ? MONTHS_SHORT[m - 1] : MONTHS[m - 1];
    if (!monthName) return 'Select date';

    const isNoYear = (y === 4) || options.hideYear; // SENTINEL_YEAR or explicit hide

    if (isNoYear) {
        return `${monthName} ${d}`;
    }

    return options.short ? `${monthName} ${d}, ${y}` : `${monthName} ${d}, ${y}`;
}
