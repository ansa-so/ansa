/**
 * Time formatting utilities
 *
 * Consolidated from multiple implementations across the codebase
 * to provide a single source of truth for time formatting.
 */

export interface FormatRelativeTimeOptions {
	/**
	 * If true, uses compact format without "ago" suffix (e.g., "2m" instead of "2m ago")
	 * @default false
	 */
	compact?: boolean;

	/**
	 * If true, uses verbose format with full words (e.g., "2 minutes ago" instead of "2m ago")
	 * @default false
	 */
	verbose?: boolean;
}

/**
 * Format a date/timestamp as a relative time string (e.g., "just now", "2m ago", "1h ago")
 *
 * @param date - ISO date string or Unix timestamp in milliseconds
 * @param options - Formatting options
 * @returns Formatted relative time string
 *
 * @example
 * formatRelativeTime(Date.now() - 60000) // "1m ago"
 * formatRelativeTime("2024-01-01T12:00:00Z", { compact: true }) // "2d"
 * formatRelativeTime(Date.now() - 3600000, { verbose: true }) // "1 hour ago"
 */
export function formatRelativeTime(
	date: string | number,
	options: FormatRelativeTimeOptions = {},
): string {
	const { compact = false, verbose = false } = options;

	const timestamp = typeof date === "string" ? new Date(date).getTime() : date;
	const now = Date.now();
	const diffMs = now - timestamp;
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);

	// Helper to format time unit
	const formatUnit = (value: number, unit: string, unitShort: string): string => {
		if (verbose) {
			const plural = value === 1 ? "" : "s";
			return `${value} ${unit}${plural} ago`;
		}
		if (compact) {
			return `${value}${unitShort}`;
		}
		return `${value}${unitShort} ago`;
	};

	if (diffSecs < 60) {
		return verbose ? "Just now" : compact ? "now" : "Just now";
	}
	if (diffMins < 60) {
		return formatUnit(diffMins, "minute", "m");
	}
	if (diffHours < 24) {
		return formatUnit(diffHours, "hour", "h");
	}
	if (diffDays === 1 && !verbose) {
		return compact ? "1d" : "Yesterday";
	}
	if (diffDays < 7) {
		return formatUnit(diffDays, "day", "d");
	}
	if (diffWeeks < 4) {
		return formatUnit(diffWeeks, "week", "w");
	}
	if (diffMonths < 12) {
		return formatUnit(diffMonths, "month", "mo");
	}

	// Fall back to locale date for older dates
	return new Date(timestamp).toLocaleDateString();
}

export interface FormatDateOptions {
	/**
	 * Include time (hour, minute) in the output
	 * @default false
	 */
	includeTime?: boolean;

	/**
	 * Include year in the output
	 * @default true
	 */
	includeYear?: boolean;
}

/**
 * Format a date string for display
 *
 * @param date - ISO date string or null/undefined
 * @param options - Formatting options
 * @returns Formatted date string, or "—" if date is null/undefined
 *
 * @example
 * formatDate("2024-01-15T12:30:00Z") // "Jan 15, 2024"
 * formatDate("2024-01-15T12:30:00Z", { includeTime: true }) // "Jan 15, 2024, 12:30 PM"
 * formatDate("2024-01-15T12:30:00Z", { includeYear: false }) // "Jan 15"
 * formatDate(null) // "—"
 */
export function formatDate(
	date: string | null | undefined,
	options: FormatDateOptions = {},
): string {
	if (!date) return "—";

	const { includeTime = false, includeYear = true } = options;

	const formatOptions: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
	};

	if (includeYear) {
		formatOptions.year = "numeric";
	}

	if (includeTime) {
		formatOptions.hour = "2-digit";
		formatOptions.minute = "2-digit";
	}

	return new Date(date).toLocaleDateString("en-US", formatOptions);
}

/**
 * Format a date string with full date and time
 *
 * @param date - ISO date string or null/undefined
 * @returns Formatted date/time string, or "—" if date is null/undefined
 *
 * @example
 * formatDateTime("2024-01-15T12:30:00Z") // "Jan 15, 2024, 12:30 PM"
 */
export function formatDateTime(date: string | null | undefined): string {
	if (!date) return "—";

	return new Date(date).toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * Format the duration between two dates as a human-readable string
 *
 * @param startDate - Start date ISO string or null/undefined
 * @param endDate - End date ISO string or null/undefined
 * @returns Formatted duration string (e.g., "2h 30m"), or null if dates are invalid
 *
 * @example
 * formatResponseTime("2024-01-15T12:00:00Z", "2024-01-15T14:30:00Z") // "2h 30m"
 * formatResponseTime("2024-01-15T12:00:00Z", "2024-01-16T14:00:00Z") // "1d 2h"
 */
export function formatResponseTime(
	startDate: string | null | undefined,
	endDate: string | null | undefined,
): string | null {
	if (!startDate || !endDate) return null;

	const start = new Date(startDate);
	const end = new Date(endDate);
	const diffMs = end.getTime() - start.getTime();

	if (diffMs < 0) return null;

	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) {
		return `${diffDays}d ${diffHours % 24}h`;
	}
	if (diffHours > 0) {
		return `${diffHours}h ${diffMins % 60}m`;
	}
	return `${diffMins}m`;
}

/**
 * Format milliseconds duration to human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "150ms", "2.5s", "3m")
 *
 * @example
 * formatDuration(500) // "500ms"
 * formatDuration(2500) // "2.5s"
 * formatDuration(180000) // "3m"
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.round(ms / 60000)}m`;
}
