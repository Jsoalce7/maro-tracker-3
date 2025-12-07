/**
 * Date utilities for timezone-aware date handling
 * 
 * Los Angeles is in Pacific Time (UTC-8 in winter, UTC-7 in summer)
 * These utilities ensure calendar dates are based on local timezone,
 * not UTC, preventing off-by-one date errors.
 */

/**
 * Get current date in YYYY-MM-DD format (user's local timezone)
 * 
 * This correctly handles timezone offset to avoid the common bug where
 * `new Date().toISOString().split('T')[0]` returns tomorrow's date
 * after 4pm PST (when UTC is already the next day).
 * 
 * @example
 * // Local time: Dec 7, 2024 5:00 PM PST
 * // UTC time: Dec 8, 2024 1:00 AM UTC
 * getTodayLocal() // Returns "2024-12-07" ✅ (not "2024-12-08")
 */
export function getTodayLocal(): string {
    const d = new Date();
    // getTimezoneOffset() returns minutes, convert to milliseconds
    const offset = d.getTimezoneOffset() * 60000;
    // Subtract offset to get local time representation in ISO format
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
}

/**
 * Check if a date string matches today (local timezone)
 * 
 * @param dateStr - Date in YYYY-MM-DD format
 * @returns true if the date is today
 */
export function isToday(dateStr: string): boolean {
    return dateStr === getTodayLocal();
}

/**
 * Format a date string for display
 * 
 * @param dateStr - Date in YYYY-MM-DD format
 * @returns Formatted date like "Saturday, December 7"
 */
export function formatDateDisplay(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date at midnight local time (not UTC)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Get yesterday's date in YYYY-MM-DD format (local timezone)
 */
export function getYesterdayLocal(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
}

/**
 * Get tomorrow's date in YYYY-MM-DD format (local timezone)
 */
export function getTomorrowLocal(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
}
