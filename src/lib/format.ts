/**
 * Format a number with max 2 decimal places, no trailing zeros.
 * Examples: 100 -> "100", 100.5 -> "100.5", 100.50 -> "100.5", 100.123 -> "100.12"
 */
export function formatNumber(value: number, maxDecimals: number = 2): string {
    if (value === null || value === undefined || isNaN(value)) return '0';

    // Round to max decimals and convert to number to strip trailing zeros
    const rounded = Math.round(value * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);

    return rounded.toString();
}

/**
 * Format calories (always whole number)
 */
export function formatCalories(value: number): string {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return Math.round(value).toString();
}

/**
 * Format grams with unit suffix (e.g., "12.5g")
 */
export function formatGrams(value: number): string {
    return `${formatNumber(value)}g`;
}

/**
 * Format percentage (e.g., "75%")
 */
export function formatPercent(value: number): string {
    return `${Math.round(value)}%`;
}
